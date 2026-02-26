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

      try {
        await authService.login();
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
    })
  );
}
