import * as vscode from 'vscode';
import { OrganizationService } from '../services/organization.service';
import { AuthService } from '../services/auth.service';
import { COMMANDS } from '../constants';

export function registerOrgCommands(
  context: vscode.ExtensionContext,
  refreshCallback: () => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SWITCH_ORG, async (orgArg?: any) => {
      const authService = AuthService.getInstance();
      if (!authService.isLoggedIn) {
        vscode.window.showWarningMessage('Please login first.');
        return;
      }

      const orgService = OrganizationService.getInstance();
      const user = authService.currentUser;
      if (!user) {
        vscode.window.showWarningMessage('User info not available. Please re-login.');
        return;
      }

      // If called with an org argument (from TreeView), switch directly
      if (orgArg && orgArg.id) {
        await orgService.setCurrentOrg(orgArg);
        vscode.window.showInformationMessage(`Switched to: ${orgArg.name}`);
        refreshCallback();
        return;
      }

      try {
        const orgs = await orgService.listOrganizations(user.id);

        if (orgs.length === 0) {
          const create = await vscode.window.showInformationMessage(
            'No organizations found. Would you like to create one?',
            'Create Organization'
          );
          if (create) {
            vscode.commands.executeCommand(COMMANDS.CREATE_ORG);
          }
          return;
        }

        const selected = await vscode.window.showQuickPick(
          orgs.map(o => ({
            label: `$(home) ${o.name}`,
            description: o.plan,
            detail: o.adminEmail,
            org: o,
          })),
          { placeHolder: 'Select organization' }
        );

        if (selected) {
          await orgService.setCurrentOrg(selected.org);
          vscode.window.showInformationMessage(`Switched to: ${selected.org.name}`);
          refreshCallback();
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load organizations: ${error.message}`);
      }
    }),

    // ─── Create Organization ──────────────────────────────────────────────
    vscode.commands.registerCommand(COMMANDS.CREATE_ORG, async () => {
      const authService = AuthService.getInstance();
      if (!authService.isLoggedIn || !authService.currentUser) {
        vscode.window.showWarningMessage('Please login first.');
        return;
      }

      const user = authService.currentUser;
      const orgService = OrganizationService.getInstance();

      // Step 1: Organization Name
      const name = await vscode.window.showInputBox({
        prompt: 'Organization Name',
        placeHolder: 'e.g. Acme Corp',
        ignoreFocusOut: true,
        validateInput: v => (!v || v.trim().length < 2) ? 'Name must be at least 2 characters' : undefined,
      });
      if (!name) { return; }

      // Step 2: Industry
      const industry = await vscode.window.showQuickPick(
        ['technology', 'finance', 'healthcare', 'ecommerce', 'education', 'manufacturing', 'other'],
        { placeHolder: 'Select industry' }
      );
      if (!industry) { return; }

      // Step 3: Company Size
      const companySize = await vscode.window.showQuickPick(
        ['1-10', '11-50', '51-200', '201-500', '501+'],
        { placeHolder: 'Select company size' }
      );
      if (!companySize) { return; }

      // Step 4: Admin Name
      const adminName = await vscode.window.showInputBox({
        prompt: 'Admin Name',
        placeHolder: 'John Doe',
        value: user.name || '',
        ignoreFocusOut: true,
        validateInput: v => (!v || v.trim().length < 1) ? 'Required' : undefined,
      });
      if (!adminName) { return; }

      // Step 5: Admin Email
      const adminEmail = await vscode.window.showInputBox({
        prompt: 'Admin Email',
        placeHolder: 'admin@company.com',
        value: user.email || '',
        ignoreFocusOut: true,
        validateInput: v => {
          if (!v || !v.includes('@')) { return 'Enter a valid email'; }
          return undefined;
        },
      });
      if (!adminEmail) { return; }

      // Step 6: Region
      const region = await vscode.window.showQuickPick(
        [
          { label: 'US East (N. Virginia)', value: 'us-east-1' },
          { label: 'US West (Oregon)', value: 'us-west-2' },
          { label: 'EU (Ireland)', value: 'eu-west-1' },
          { label: 'EU (Frankfurt)', value: 'eu-central-1' },
          { label: 'Asia Pacific (Singapore)', value: 'ap-southeast-1' },
          { label: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1' },
        ],
        { placeHolder: 'Select primary region' }
      );
      if (!region) { return; }

      // Step 7: Deployment Type
      const deploymentType = await vscode.window.showQuickPick(
        [
          { label: 'Cloud (Multi-tenant)', value: 'cloud' },
          { label: 'Dedicated Cloud', value: 'dedicated' },
          { label: 'Hybrid', value: 'hybrid' },
          { label: 'On-Premise', value: 'on-premise' },
        ],
        { placeHolder: 'Select deployment type' }
      );
      if (!deploymentType) { return; }

      // Create organization
      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Creating organization...', cancellable: false },
          async () => {
            const org = await orgService.createOrganization({
              name: name.trim(),
              industry,
              companySize,
              adminName: adminName.trim(),
              adminEmail: adminEmail.trim(),
              primaryRegion: region.value,
              deploymentType: deploymentType.value,
              ownerId: user.id,
            });

            if (org) {
              await orgService.setCurrentOrg(org);
            }
          }
        );

        vscode.window.showInformationMessage(`Organization "${name.trim()}" created!`);
        refreshCallback();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create organization: ${error.message}`);
      }
    })
  );
}

