import * as vscode from 'vscode';
import { apiClient } from './api-client';
import { SECRET_KEYS, STATE_KEYS, CONTEXT_KEYS, API_ROUTES } from '../constants';
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

export class AuthService {
  private static instance: AuthService;
  private context: vscode.ExtensionContext;
  private _isLoggedIn: boolean = false;
  private _currentUser: User | null = null;
  private _onAuthStateChanged = new vscode.EventEmitter<boolean>();
  public readonly onAuthStateChanged = this._onAuthStateChanged.event;

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

      // Validate token by fetching user
      const userId = await this.context.secrets.get(SECRET_KEYS.USER_ID);
      if (userId) {
        try {
          const response = await apiClient.get<any>(API_ROUTES.AUTH_USER(userId));
          this._currentUser = response.user || response;
          this._isLoggedIn = true;
          await this.updateContextKeys();
          this._onAuthStateChanged.fire(true);
          logger.info(`Session restored for ${this._currentUser?.email}`);
          return true;
        } catch {
          logger.warn('Stored token is invalid, clearing session');
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

  /**
   * Login via token input (user provides API token or JWT)
   */
  async login(): Promise<void> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: '$(key) Enter API Token', description: 'Paste your Trivx API token', value: 'token' },
        { label: '$(globe) Login via Browser', description: 'Open browser to login', value: 'browser' },
      ],
      { placeHolder: 'Choose login method', title: 'Trivx AI - Login' }
    );

    if (!choice) { return; }

    if (choice.value === 'token') {
      await this.loginWithToken();
    } else {
      await this.loginViaBrowser();
    }
  }

  private async loginWithToken(): Promise<void> {
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your Trivx API token',
      password: true,
      placeHolder: 'Paste your JWT token here',
      title: 'Trivx AI - API Token',
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
        title: 'Trivx AI: Logging in...',
        cancellable: false,
      },
      async () => {
        apiClient.setToken(token.trim());

        // Validate by making an API call
        try {
          const response = await apiClient.post<any>(API_ROUTES.AUTH_VALIDATE, { token: token.trim() });
          const user = response.user || response;

          this._currentUser = user;
          this._isLoggedIn = true;

          // Store credentials
          await this.context.secrets.store(SECRET_KEYS.AUTH_TOKEN, token.trim());
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
          // If validate fails, try fetching user with clerkId pattern
          try {
            // Try using token directly and fetching a generic user endpoint
            const userId = await vscode.window.showInputBox({
              prompt: 'Enter your Trivx User ID or Clerk ID',
              placeHolder: 'user_xxxxx or cuid',
              title: 'Trivx AI - User ID',
            });

            if (!userId) { throw error; }

            apiClient.setToken(token.trim());
            const userResponse = await apiClient.get<any>(API_ROUTES.AUTH_USER(userId));
            const user = userResponse.user || userResponse;

            this._currentUser = user;
            this._isLoggedIn = true;

            await this.context.secrets.store(SECRET_KEYS.AUTH_TOKEN, token.trim());
            await this.context.secrets.store(SECRET_KEYS.USER_ID, userId);
            await this.context.globalState.update(STATE_KEYS.USER_EMAIL, user.email);
            await this.context.globalState.update(STATE_KEYS.USER_NAME, user.name || user.email);

            await this.updateContextKeys();
            this._onAuthStateChanged.fire(true);

            vscode.window.showInformationMessage(`Trivx AI: Logged in as ${user.email}`);
            logger.info(`Logged in as ${user.email}`);
          } catch {
            vscode.window.showErrorMessage('Trivx AI: Invalid token or user ID. Please check your credentials.');
            logger.error('Login failed', error);
            throw new AuthError('Login failed');
          }
        }
      }
    );
  }

  private async loginViaBrowser(): Promise<void> {
    const config = getConfig();
    const loginUrl = `${config.apiBaseUrl.replace(/:\d+$/, '')}:3000/login`;

    await vscode.env.openExternal(vscode.Uri.parse(loginUrl));

    vscode.window.showInformationMessage(
      'Trivx AI: Complete login in your browser, then use "Enter API Token" to paste your token.',
      'Enter Token'
    ).then(async (selection) => {
      if (selection === 'Enter Token') {
        await this.loginWithToken();
      }
    });
  }

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

  async getToken(): Promise<string | null> {
    return await this.context.secrets.get(SECRET_KEYS.AUTH_TOKEN) || null;
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
