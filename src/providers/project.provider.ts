import * as vscode from 'vscode';
import { ProjectService, Project } from '../services/project.service';
import { OrganizationService } from '../services/organization.service';
import { AuthService } from '../services/auth.service';

export class ProjectProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ProjectTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    const authService = AuthService.getInstance();
    if (!authService.isLoggedIn) {
      return [];
    }

    const orgService = OrganizationService.getInstance();
    const orgId = orgService.getCurrentOrgId();
    if (!orgId) {
      return [
        new ProjectTreeItem(
          'Select an organization first',
          '',
          vscode.TreeItemCollapsibleState.None,
          'info',
          { command: 'trivx.switchOrg', title: 'Switch Organization' }
        ),
      ];
    }

    const projectService = ProjectService.getInstance();

    if (!element) {
      // Root level: list projects
      const projects = await projectService.listProjects(orgId);

      if (projects.length === 0) {
        return [
          new ProjectTreeItem(
            'No projects yet',
            'Create your first project',
            vscode.TreeItemCollapsibleState.None,
            'empty',
            { command: 'trivx.createProject', title: 'Create Project' }
          ),
        ];
      }

      return projects.map(project => new ProjectTreeItem(
        project.name,
        this.getProjectDescription(project),
        vscode.TreeItemCollapsibleState.Collapsed,
        'project',
        undefined,
        project
      ));
    }

    // Children of a project
    if (element.contextValue === 'project' && element.project) {
      const p = element.project;
      const items: ProjectTreeItem[] = [];

      if (p.repositoryFullName) {
        items.push(new ProjectTreeItem(
          p.repositoryFullName,
          '',
          vscode.TreeItemCollapsibleState.None,
          'repo-link',
          p.githubUrl ? {
            command: 'vscode.open',
            title: 'Open Repository',
            arguments: [vscode.Uri.parse(p.githubUrl)],
          } : undefined,
          undefined,
          '$(github)'
        ));
      }

      if (p.framework || p.language) {
        items.push(new ProjectTreeItem(
          `${p.framework || 'Unknown'} • ${p.language || 'Unknown'}`,
          '',
          vscode.TreeItemCollapsibleState.None,
          'tech-stack',
          undefined,
          undefined,
          '$(symbol-method)'
        ));
      }

      if (p.defaultBranch) {
        items.push(new ProjectTreeItem(
          `Branch: ${p.defaultBranch}`,
          '',
          vscode.TreeItemCollapsibleState.None,
          'branch',
          undefined,
          undefined,
          '$(git-branch)'
        ));
      }

      items.push(new ProjectTreeItem(
        'Deploy',
        '',
        vscode.TreeItemCollapsibleState.None,
        'deploy-action',
        { command: 'trivx.deploy', title: 'Deploy Project' },
        p,
        '$(rocket)'
      ));

      items.push(new ProjectTreeItem(
        'AI Chat',
        '',
        vscode.TreeItemCollapsibleState.None,
        'ai-action',
        { command: 'trivx.openAIChat', title: 'Open AI Chat' },
        undefined,
        '$(comment-discussion)'
      ));

      return items;
    }

    return [];
  }

  private getProjectDescription(project: Project): string {
    const parts: string[] = [];
    if (project.framework) { parts.push(project.framework); }
    if (project.language) { parts.push(project.language); }
    if (project.analysisStatus) { parts.push(project.analysisStatus); }
    return parts.join(' • ');
  }
}

export class ProjectTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly desc: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly command?: vscode.Command,
    public readonly project?: Project,
    iconId?: string
  ) {
    super(label, collapsibleState);
    this.description = desc;
    this.contextValue = contextValue;

    if (iconId) {
      this.iconPath = new vscode.ThemeIcon(iconId.replace('$(', '').replace(')', ''));
    } else {
      switch (contextValue) {
        case 'project':
          this.iconPath = new vscode.ThemeIcon('package');
          break;
        case 'empty':
          this.iconPath = new vscode.ThemeIcon('add');
          break;
        case 'info':
          this.iconPath = new vscode.ThemeIcon('info');
          break;
      }
    }
  }
}
