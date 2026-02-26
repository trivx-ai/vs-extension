import * as vscode from 'vscode';
import { ProjectService } from '../services/project.service';
import { OrganizationService } from '../services/organization.service';
import { AuthService } from '../services/auth.service';
import { COMMANDS } from '../constants';

export function registerProjectCommands(
  context: vscode.ExtensionContext,
  refreshCallback: () => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.CREATE_PROJECT, async () => {
      const orgService = OrganizationService.getInstance();
      const orgId = orgService.getCurrentOrgId();
      if (!orgId) {
        vscode.window.showWarningMessage('Please select an organization first.');
        await vscode.commands.executeCommand(COMMANDS.SWITCH_ORG);
        return;
      }

      const authService = AuthService.getInstance();
      const user = authService.currentUser;
      if (!user) {
        vscode.window.showWarningMessage('Please login first.');
        return;
      }

      const projectService = ProjectService.getInstance();

      // Step 1: Project name
      const name = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'my-awesome-project',
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim().length < 2) {
            return 'Project name must be at least 2 characters';
          }
          if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
            return 'Only letters, numbers, hyphens and underscores allowed';
          }
          return undefined;
        },
      });
      if (!name) { return; }

      // Step 2: Select GitHub Installation
      const installations = await projectService.listInstallations(user.id);
      if (installations.length === 0) {
        const openSetup = await vscode.window.showWarningMessage(
          'No GitHub installations found. Please install the Trivx GitHub App first.',
          'Open GitHub Setup'
        );
        if (openSetup === 'Open GitHub Setup') {
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/apps/trivx-ai'));
        }
        return;
      }

      const installation = await vscode.window.showQuickPick(
        installations.map((i) => ({
          label: `$(github) ${i.accountLogin}`,
          description: i.accountType,
          installationId: i.installationId,
        })),
        { placeHolder: 'Select GitHub installation' }
      );
      if (!installation) { return; }

      // Step 3: Select repository
      const repos = await projectService.listRepos(installation.installationId);
      const repo = await vscode.window.showQuickPick(
        repos.map((r) => ({
          label: `$(repo) ${r.full_name}`,
          description: r.private ? 'Private' : 'Public',
          detail: r.description || '',
          repoId: r.id,
          fullName: r.full_name,
          defaultBranch: r.default_branch,
          githubUrl: r.html_url,
          isPrivate: r.private,
        })),
        { placeHolder: 'Select repository' }
      );
      if (!repo) { return; }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Creating project...',
            cancellable: false,
          },
          async () => {
            // Create project first
            const project = await projectService.createProject({
              name: name.trim(),
              organizationId: orgId,
            });

            // Then link the repository
            if (project) {
              await projectService.linkRepository(project.id, {
                installationId: installation.installationId,
                repositoryId: repo.repoId,
                repositoryName: repo.fullName.split('/')[1] || repo.fullName,
                repositoryFullName: repo.fullName,
                githubUrl: repo.githubUrl,
                defaultBranch: repo.defaultBranch || 'main',
                isPrivate: repo.isPrivate || false,
              });
            }
          }
        );

        vscode.window.showInformationMessage(`Project "${name.trim()}" created successfully!`);
        refreshCallback();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create project: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_PROJECT, async () => {
      const orgService = OrganizationService.getInstance();
      const orgId = orgService.getCurrentOrgId();
      if (!orgId) {
        vscode.window.showWarningMessage('Please select an organization first.');
        return;
      }

      const projectService = ProjectService.getInstance();
      const projects = await projectService.listProjects(orgId);

      if (projects.length === 0) {
        const create = await vscode.window.showInformationMessage(
          'No projects found. Would you like to create one?',
          'Create Project'
        );
        if (create) {
          vscode.commands.executeCommand(COMMANDS.CREATE_PROJECT);
        }
        return;
      }

      const selected = await vscode.window.showQuickPick(
        projects.map(p => ({
          label: `$(package) ${p.name}`,
          description: p.framework || '',
          detail: p.repositoryFullName || '',
          projectId: p.id,
        })),
        { placeHolder: 'Select project' }
      );

      if (selected) {
        await projectService.setCurrentProject(selected.projectId);
        vscode.window.showInformationMessage(`Switched to project: ${selected.label.replace('$(package) ', '')}`);
        refreshCallback();
      }
    }),

    vscode.commands.registerCommand(COMMANDS.REFRESH, () => {
      refreshCallback();
    })
  );
}
