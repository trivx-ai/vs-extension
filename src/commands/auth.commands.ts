import * as vscode from 'vscode';
import { AuthService } from '../services/auth.service';
import { COMMANDS } from '../constants';

export function registerAuthCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.LOGIN, async () => {
      const authService = AuthService.getInstance();
      if (authService.isLoggedIn) {
        const action = await vscode.window.showInformationMessage(
          'You are already logged in. Do you want to log out first?',
          'Logout',
          'Cancel'
        );
        if (action === 'Logout') {
          await vscode.commands.executeCommand(COMMANDS.LOGOUT);
        }
        return;
      }

      const method = await vscode.window.showQuickPick(
        [
          { label: '$(key) Paste Token', description: 'Paste your Trivx authentication token', value: 'token' },
          { label: '$(globe) Browser Login', description: 'Login via browser (opens Trivx dashboard)', value: 'browser' },
        ],
        { placeHolder: 'Choose login method' }
      );

      if (!method) { return; }

      try {
        if (method.value === 'token') {
          const token = await vscode.window.showInputBox({
            prompt: 'Paste your Trivx authentication token',
            password: true,
            placeHolder: 'eyJhbGc...',
            ignoreFocusOut: true,
            validateInput: (value) => {
              if (!value || value.trim().length < 10) {
                return 'Please enter a valid token';
              }
              return undefined;
            },
          });

          if (!token) { return; }
          await authService.loginWithToken(token.trim());
        } else {
          await authService.loginWithBrowser();
        }

        vscode.window.showInformationMessage('Successfully logged in to Trivx!');
      } catch (error: any) {
        vscode.window.showErrorMessage(`Login failed: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.LOGOUT, async () => {
      const authService = AuthService.getInstance();
      if (!authService.isLoggedIn) {
        vscode.window.showInformationMessage('You are not logged in.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to log out of Trivx?',
        { modal: true },
        'Logout'
      );

      if (confirm !== 'Logout') { return; }

      await authService.logout();
      vscode.window.showInformationMessage('Logged out of Trivx.');
    })
  );
}
