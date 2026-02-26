import * as vscode from 'vscode';
import { DeployService } from '../services/deploy.service';
import { ProjectService } from '../services/project.service';
import { OrganizationService } from '../services/organization.service';
import { COMMANDS } from '../constants';

export function registerDeployCommands(
  context: vscode.ExtensionContext,
  refreshCallback: () => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.DEPLOY, async () => {
      const orgService = OrganizationService.getInstance();
      const orgId = orgService.getCurrentOrgId();
      if (!orgId) {
        vscode.window.showWarningMessage('Please select an organization first.');
        return;
      }

      const projectService = ProjectService.getInstance();
      let projectId = projectService.getCurrentProjectId();

      // If no project selected, let user pick one
      if (!projectId) {
        const projects = await projectService.listProjects(orgId);
        if (projects.length === 0) {
          vscode.window.showWarningMessage('No projects found. Create a project first.');
          return;
        }

        const selected = await vscode.window.showQuickPick(
          projects.map(p => ({
            label: `$(package) ${p.name}`,
            description: p.framework || '',
            projectId: p.id,
          })),
          { placeHolder: 'Select project to deploy' }
        );
        if (!selected) { return; }
        projectId = selected.projectId;
      }

      // Select environment
      const environment = await vscode.window.showQuickPick(
        [
          { label: '$(rocket) Production', value: 'production' },
          { label: '$(beaker) Staging', value: 'staging' },
          { label: '$(tools) Development', value: 'development' },
        ],
        { placeHolder: 'Select deployment environment' }
      );
      if (!environment) { return; }

      // Select branch
      const branch = await vscode.window.showInputBox({
        prompt: 'Enter branch to deploy',
        value: 'main',
        placeHolder: 'main',
      });
      if (!branch) { return; }

      const confirm = await vscode.window.showWarningMessage(
        `Deploy to ${environment.value} from branch "${branch}"?`,
        { modal: true },
        'Deploy'
      );
      if (confirm !== 'Deploy') { return; }

      try {
        const deployService = DeployService.getInstance();

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Deploying to ${environment.value}...`,
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: 'Initiating deployment...' });

            const deployment = await projectService.deploy(orgId, projectId!, {
              branch,
              environment: environment.value,
            });

            progress.report({ message: 'Connecting to deployment stream...' });

            // Connect to Socket.IO for real-time updates
            deployService.connectToDeployment(deployment.id);

            return deployment;
          }
        );

        refreshCallback();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Deployment failed: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.VIEW_DEPLOY_LOGS, async () => {
      const deployService = DeployService.getInstance();
      deployService.showLogOutput();
    })
  );
}
