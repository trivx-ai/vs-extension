import * as vscode from 'vscode';
import { SecretsService } from '../services/secrets.service';
import { ProjectService } from '../services/project.service';
import { OrganizationService } from '../services/organization.service';
import { COMMANDS } from '../constants';

export function registerSecretsCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.MANAGE_SECRETS, async () => {
      const orgId = OrganizationService.getInstance().getCurrentOrgId();
      const projectId = ProjectService.getInstance().getCurrentProjectId();
      if (!orgId || !projectId) {
        vscode.window.showWarningMessage('Please select an organization and project first.');
        return;
      }

      const secretsService = SecretsService.getInstance();
      const groups = await secretsService.listEnvironmentGroups(projectId);

      // Pick or create environment group
      const items: vscode.QuickPickItem[] = groups.map(g => ({
        label: `$(folder) ${g.name}`,
        description: `${g.environment} • ${g.secretCount || 0} secrets`,
      }));
      items.push({ label: '$(add) Create New Environment Group', description: '' });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select environment group',
      });
      if (!selected) { return; }

      if (selected.label.includes('Create New')) {
        const name = await vscode.window.showInputBox({
          prompt: 'Environment group name',
          placeHolder: 'production',
        });
        if (!name) { return; }

        const env = await vscode.window.showQuickPick(
          ['production', 'staging', 'development', 'test'],
          { placeHolder: 'Select environment' }
        );
        if (!env) { return; }

        try {
          await secretsService.createEnvironmentGroup(projectId, { name: name.trim(), environment: env });
          vscode.window.showInformationMessage(`Environment group "${name}" created.`);
        } catch (error: any) {
          vscode.window.showErrorMessage(`Failed to create group: ${error.message}`);
        }
        return;
      }

      // Show secrets management for selected group
      const groupName = selected.label.replace('$(folder) ', '');
      const group = groups.find(g => g.name === groupName);
      if (!group) { return; }

      const secrets = await secretsService.listSecrets(projectId, group.id);

      const action = await vscode.window.showQuickPick(
        [
          { label: '$(add) Add Secret', value: 'add' },
          { label: '$(eye) View Secrets', value: 'view' },
          { label: '$(trash) Delete Secret', value: 'delete' },
        ],
        { placeHolder: `Manage secrets for "${groupName}"` }
      );
      if (!action) { return; }

      switch (action.value) {
        case 'add': {
          const key = await vscode.window.showInputBox({
            prompt: 'Secret key (e.g., DATABASE_URL)',
            placeHolder: 'SECRET_KEY',
            validateInput: (v) => v && /^[A-Z0-9_]+$/.test(v.trim()) ? undefined : 'Use UPPER_SNAKE_CASE',
          });
          if (!key) { return; }

          const value = await vscode.window.showInputBox({
            prompt: `Value for ${key}`,
            password: true,
            ignoreFocusOut: true,
          });
          if (value === undefined) { return; }

          try {
            await secretsService.createSecret(projectId, group.id, { key: key.trim(), value });
            vscode.window.showInformationMessage(`Secret "${key}" added.`);
          } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to add secret: ${error.message}`);
          }
          break;
        }

        case 'view': {
          if (secrets.length === 0) {
            vscode.window.showInformationMessage('No secrets in this group.');
            return;
          }
          const doc = await vscode.workspace.openTextDocument({
            content: secrets.map(s => `${s.key} = ********`).join('\n'),
            language: 'properties',
          });
          vscode.window.showTextDocument(doc);
          break;
        }

        case 'delete': {
          if (secrets.length === 0) {
            vscode.window.showInformationMessage('No secrets to delete.');
            return;
          }
          const toDelete = await vscode.window.showQuickPick(
            secrets.map(s => ({ label: s.key, secretId: s.id })),
            { placeHolder: 'Select secret to delete' }
          );
          if (!toDelete) { return; }

          const confirm = await vscode.window.showWarningMessage(
            `Delete secret "${toDelete.label}"?`,
            { modal: true },
            'Delete'
          );
          if (confirm === 'Delete') {
            try {
              await secretsService.deleteSecret(projectId, group.id, toDelete.secretId);
              vscode.window.showInformationMessage(`Secret "${toDelete.label}" deleted.`);
            } catch (error: any) {
              vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
            }
          }
          break;
        }
      }
    })
  );
}
