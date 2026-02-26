import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { apiClient } from './api-client';
import { SECRET_KEYS, STATE_KEYS, CONTEXT_KEYS, API_ROUTES, EXTENSION_ID } from '../constants';
import { logger } from '../utils/logger';
import { AuthError } from '../utils/errors';
import { getConfig } from '../utils/config';

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  profileImageUrl?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export class AuthService implements vscode.UriHandler {
  private static instance: AuthService;
  private context: vscode.ExtensionContext;
  private _isLoggedIn: boolean = false;
  private _currentUser: User | null = null;
  private _onAuthStateChanged = new vscode.EventEmitter<boolean>();
  public readonly onAuthStateChanged = this._onAuthStateChanged.event;

  // Deep-link auth state
  private pendingAuthState: string | null = null;
  private pendingAuthResolve: (() => void) | null = null;
  private pendingAuthReject: ((err: Error) => void) | null = null;
  private pendingAuthTimeout: ReturnType<typeof setTimeout> | null = null;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  static initialize(context: vscode.ExtensionContext): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(context);
    }
    return AuthService.instance;
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      throw new Error('AuthService not initialized. Call initialize() first.');
    }
    return AuthService.instance;
  }

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  get currentUser(): User | null {
    return this._currentUser;
  }

  // ─── URI Handler (deep-link callback) ────────────────────────────────────

  /**
   * Called by VS Code when a `vscode://trivx.trivx-ai/...` URI is opened.
   */
  handleUri(uri: vscode.Uri): void {
    logger.info(`URI handler invoked: ${uri.toString()}`);

    if (uri.path === '/auth-callback') {
      this.handleAuthCallback(uri);
    } else {
      logger.warn(`Unknown URI path: ${uri.path}`);
    }
  }

  private async handleAuthCallback(uri: vscode.Uri): Promise<void> {
    const params = new URLSearchParams(uri.query);
    const token = params.get('token');
    const state = params.get('state');
    const retry = params.get('retry');

    // On retry without token, just notify the user
    if (retry && !token) {
      vscode.window.showWarningMessage(
        'Trivx: Token not included in retry. Please try "Login via Browser" again.'
      );
      return;
    }

    // Validate state matches what we generated
    if (!state || state !== this.pendingAuthState) {
      logger.warn('Auth callback state mismatch');
      vscode.window.showErrorMessage(
        'Trivx: Authentication failed — state mismatch. Please try again.'
      );
      this.rejectPendingAuth(new Error('State mismatch'));
      return;
    }

    if (!token) {
      this.rejectPendingAuth(new Error('No token received'));
      vscode.window.showErrorMessage('Trivx: No token received from browser.');
      return;
    }

    // Capture resolve/reject before clearing
    const resolve = this.pendingAuthResolve;
    const reject = this.pendingAuthReject;
    this.clearPendingAuth();

    try {
      await this.completeLogin(token);
      resolve?.();
    } catch (error: any) {
      reject?.(error);
      vscode.window.showErrorMessage(`Trivx: Login failed — ${error.message}`);
    }
  }

  // ─── Session Restore ─────────────────────────────────────────────────────

  /**
   * Attempt to restore session from stored tokens on activation
   */
  async restoreSession(): Promise<boolean> {
    try {
      const token = await this.context.secrets.get(SECRET_KEYS.AUTH_TOKEN);
      if (!token) {
        logger.debug('No stored auth token found');
        return false;
      }

      apiClient.setToken(token);

      // Validate token by fetching user profile
      const userId = await this.context.secrets.get(SECRET_KEYS.USER_ID);
      if (userId) {
        try {
          const response = await apiClient.get<any>(API_ROUTES.AUTH_USER(userId));
          this._currentUser = this.normalizeUser(response);
          this._isLoggedIn = true;
          await this.updateContextKeys();
          this._onAuthStateChanged.fire(true);
          logger.info(`Session restored for ${this._currentUser?.email}`);
          return true;
        } catch {
          logger.warn('Stored token is invalid or expired, clearing session');
          await this.clearStoredAuth();
          return false;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to restore session', error);
      return false;
    }
  }

  // ─── Login Entry Point ───────────────────────────────────────────────────

  /**
   * Main login flow — shows QuickPick with available methods
   */
  async login(): Promise<void> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: '$(globe) Login via Browser',
          description: 'Recommended — sign in with your browser',
          value: 'browser',
        },
        {
          label: '$(key) Enter API Token',
          description: 'Paste a Trivx extension token manually',
          value: 'token',
        },
      ],
      { placeHolder: 'Choose login method', title: 'Trivx AI — Login' }
    );

    if (!choice) { return; }

    if (choice.value === 'browser') {
      await this.loginViaBrowser();
    } else {
      await this.loginWithToken();
    }
  }

  // ─── Browser-Based Login (deep link) ─────────────────────────────────────

  /**
   * Opens the frontend auth page in the user's default browser.
   * After sign-in, the page redirects to `vscode://trivx.trivx-ai/auth-callback`
   * with the extension JWT, which is caught by handleUri().
   */
  private async loginViaBrowser(): Promise<void> {
    const config = getConfig();
    const state = crypto.randomUUID();
    this.pendingAuthState = state;

    const authUrl = `${config.frontendUrl}/extension/auth?state=${encodeURIComponent(state)}`;

    logger.info(`Opening browser for auth: ${authUrl}`);
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    // Show progress while waiting for the callback
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Trivx AI: Waiting for browser sign-in...',
          cancellable: true,
        },
        async (_progress, cancellationToken) => {
          return new Promise<void>((resolve, reject) => {
            this.pendingAuthResolve = resolve;
            this.pendingAuthReject = reject;

            // Timeout after 5 minutes
            this.pendingAuthTimeout = setTimeout(() => {
              if (this.pendingAuthState === state) {
                this.clearPendingAuth();
                reject(new Error('Login timed out. Please try again.'));
              }
            }, 5 * 60 * 1000);

            // Handle cancellation
            cancellationToken.onCancellationRequested(() => {
              this.clearPendingAuth();
              reject(new Error('Login cancelled'));
            });
          });
        }
      );
    } catch (error: any) {
      if (error?.message !== 'Login cancelled') {
        vscode.window.showErrorMessage(`Trivx AI: ${error?.message || 'Login failed'}`);
      }
    }
  }

  // ─── Token-Based Login (manual paste) ────────────────────────────────────

  /**
   * Prompts the user to paste an extension token directly.
   */
  private async loginWithToken(): Promise<void> {
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your Trivx extension token',
      password: true,
      placeHolder: 'Paste your token here',
      title: 'Trivx AI — Extension Token',
      validateInput: (value) => {
        if (!value || value.trim().length < 10) {
          return 'Please enter a valid token';
        }
        return null;
      },
    });

    if (!token) { return; }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Trivx AI: Verifying token...',
        cancellable: false,
      },
      async () => {
        await this.completeLogin(token.trim());
      }
    );
  }

  // ─── Shared Login Completion ─────────────────────────────────────────────

  /**
   * Finishes the login flow regardless of how the token was obtained.
   */
  private async completeLogin(token: string): Promise<void> {
    apiClient.setToken(token);

    try {
      // Decode JWT payload to get userId (our extension JWTs embed it as `sub`)
      const userId = this.decodeTokenUserId(token);

      let user: User;

      if (userId) {
        // Fetch full user profile via the auth-service
        const response = await apiClient.get<any>(API_ROUTES.AUTH_USER(userId));
        user = this.normalizeUser(response);
      } else {
        // Fallback: validate token and extract user info
        const response = await apiClient.post<any>(API_ROUTES.AUTH_VALIDATE, { token });
        user = this.normalizeUser(response);
      }

      this._currentUser = user;
      this._isLoggedIn = true;

      // Persist credentials
      await this.context.secrets.store(SECRET_KEYS.AUTH_TOKEN, token);
      await this.context.secrets.store(SECRET_KEYS.USER_ID, user.id || user.clerkId);

      // Store user info in global state
      await this.context.globalState.update(STATE_KEYS.USER_EMAIL, user.email);
      await this.context.globalState.update(STATE_KEYS.USER_NAME, user.name || user.email);

      await this.updateContextKeys();
      this._onAuthStateChanged.fire(true);

      vscode.window.showInformationMessage(`Trivx AI: Logged in as ${user.email}`);
      logger.info(`Logged in as ${user.email}`);
    } catch (error: any) {
      apiClient.clearToken();
      logger.error('Login failed', error);
      throw new AuthError(error.message || 'Login failed — invalid token');
    }
  }

  // ─── Logout ──────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    this._currentUser = null;
    this._isLoggedIn = false;
    apiClient.clearToken();

    await this.clearStoredAuth();
    await this.updateContextKeys();
    this._onAuthStateChanged.fire(false);

    vscode.window.showInformationMessage('Trivx AI: Logged out successfully');
    logger.info('Logged out');
  }

  // ─── Token Access ────────────────────────────────────────────────────────

  async getToken(): Promise<string | null> {
    return await this.context.secrets.get(SECRET_KEYS.AUTH_TOKEN) || null;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Decode the JWT payload (without verification) to extract userId.
   */
  private decodeTokenUserId(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) { return null; }
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload.sub || payload.userId || null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize various response shapes into our User interface
   */
  private normalizeUser(response: any): User {
    const raw = response.user || response;
    return {
      id: raw.id || raw.userId || '',
      clerkId: raw.clerkId || '',
      email: raw.email || '',
      name: raw.name,
      profileImageUrl: raw.profileImageUrl,
      role: raw.role || 'USER',
      isActive: raw.isActive !== false,
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  private clearPendingAuth(): void {
    this.pendingAuthState = null;
    this.pendingAuthResolve = null;
    this.pendingAuthReject = null;
    if (this.pendingAuthTimeout) {
      clearTimeout(this.pendingAuthTimeout);
      this.pendingAuthTimeout = null;
    }
  }

  private rejectPendingAuth(error: Error): void {
    const reject = this.pendingAuthReject;
    this.clearPendingAuth();
    this.pendingAuthReject = null;
    this.pendingAuthResolve = null;
    reject?.(error);
  }

  private async clearStoredAuth(): Promise<void> {
    await this.context.secrets.delete(SECRET_KEYS.AUTH_TOKEN);
    await this.context.secrets.delete(SECRET_KEYS.REFRESH_TOKEN);
    await this.context.secrets.delete(SECRET_KEYS.USER_ID);
    await this.context.secrets.delete(SECRET_KEYS.CLERK_SESSION);
    await this.context.globalState.update(STATE_KEYS.CURRENT_ORG_ID, undefined);
    await this.context.globalState.update(STATE_KEYS.CURRENT_ORG_SLUG, undefined);
    await this.context.globalState.update(STATE_KEYS.CURRENT_PROJECT_ID, undefined);
    await this.context.globalState.update(STATE_KEYS.USER_EMAIL, undefined);
    await this.context.globalState.update(STATE_KEYS.USER_NAME, undefined);
  }

  private async updateContextKeys(): Promise<void> {
    await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.IS_LOGGED_IN, this._isLoggedIn);
    const orgId = this.context.globalState.get<string>(STATE_KEYS.CURRENT_ORG_ID);
    await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.HAS_ORGANIZATION, !!orgId);
  }
}
