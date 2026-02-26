import * as vscode from 'vscode';
import { OrganizationService } from '../services/organization.service';
import { AuthService } from '../services/auth.service';
import { COMMANDS } from '../constants';

export function registerOrgCommands(
  context: vscode.ExtensionContext,
  refreshCallback: () => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SWITCH_ORG, async () => {
      const authService = AuthService.getInstance();
      if (!authService.isLoggedIn) {
        vscode.window.showWarningMessage('Please login first.');
        return;
      }

      const orgService = OrganizationService.getInstance();

      try {
        const orgs = await orgService.listOrganizations();

        if (orgs.length === 0) {
          const create = await vscode.window.showInformationMessage(
            'No organizations found. Create one on the Trivx dashboard.',
            'Open Dashboard'
          );
          if (create) {
            vscode.env.openExternal(vscode.Uri.parse('https://app.trivx.ai/create-organization'));
          }
          return;
        }

        const selected = await vscode.window.showQuickPick(
          orgs.map(o => ({
            label: `$(home) ${o.name}`,
            description: o.plan,
            detail: o.adminEmail,
            orgId: o.id,
          })),
          { placeHolder: 'Select organization' }
        );

        if (selected) {
          orgService.setCurrentOrgId(selected.orgId);
          vscode.window.showInformationMessage(`Switched to: ${selected.label.replace('$(home) ', '')}`);
          refreshCallback();
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load organizations: ${error.message}`);
      }
    })
  );
}
