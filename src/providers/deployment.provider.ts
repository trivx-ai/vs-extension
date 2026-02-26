import * as vscode from 'vscode';
import { DeployService, Deployment } from '../services/deploy.service';
import { OrganizationService } from '../services/organization.service';
import { ProjectService } from '../services/project.service';
import { AuthService } from '../services/auth.service';

export class DeploymentProvider implements vscode.TreeDataProvider<DeploymentTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<DeploymentTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: DeploymentTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DeploymentTreeItem): Promise<DeploymentTreeItem[]> {
    const authService = AuthService.getInstance();
    if (!authService.isLoggedIn) { return []; }

    const deployService = DeployService.getInstance();

    if (!element) {
      const projectId = ProjectService.getInstance().getCurrentProjectId();
      const deployments = await deployService.listDeployments(projectId);

      if (deployments.length === 0) {
        return [
          new DeploymentTreeItem(
            'No deployments yet',
            'Deploy your first project',
            vscode.TreeItemCollapsibleState.None,
            'empty'
          ),
        ];
      }

      return deployments.slice(0, 20).map(d => {
        const statusIcon = this.getStatusIcon(d.status);
        return new DeploymentTreeItem(
          `${statusIcon} ${d.environment || 'production'} - ${d.status}`,
          this.formatDate(d.createdAt),
          vscode.TreeItemCollapsibleState.Collapsed,
          'deployment',
          undefined,
          d
        );
      });
    }

    // Deployment details
    if (element.contextValue === 'deployment' && element.deployment) {
      const d = element.deployment;
      const items: DeploymentTreeItem[] = [];

      if (d.url) {
        items.push(new DeploymentTreeItem(
          `URL: ${d.url}`,
          '',
          vscode.TreeItemCollapsibleState.None,
          'deployment-url',
          {
            command: 'vscode.open',
            title: 'Open URL',
            arguments: [vscode.Uri.parse(d.url)],
          }
        ));
      }

      if (d.branch) {
        items.push(new DeploymentTreeItem(
          `Branch: ${d.branch}`,
          '',
          vscode.TreeItemCollapsibleState.None,
          'deployment-branch'
        ));
      }

      items.push(new DeploymentTreeItem(
        `Status: ${d.status}`,
        '',
        vscode.TreeItemCollapsibleState.None,
        'deployment-status'
      ));

      items.push(new DeploymentTreeItem(
        `Created: ${this.formatDate(d.createdAt)}`,
        '',
        vscode.TreeItemCollapsibleState.None,
        'deployment-date'
      ));

      return items;
    }

    return [];
  }

  private getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'live':
      case 'completed':
      case 'success':
        return '🟢';
      case 'deploying':
      case 'provisioning':
      case 'pending':
      case 'running':
        return '🟡';
      case 'failed':
      case 'error':
        return '🔴';
      case 'cancelled':
        return '⚪';
      default:
        return '⚫';
    }
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMin < 1) { return 'Just now'; }
      if (diffMin < 60) { return `${diffMin}m ago`; }
      if (diffHours < 24) { return `${diffHours}h ago`; }
      return `${diffDays}d ago`;
    } catch {
      return dateStr;
    }
  }
}

export class DeploymentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly desc: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly command?: vscode.Command,
    public readonly deployment?: Deployment
  ) {
    super(label, collapsibleState);
    this.description = desc;
    this.contextValue = contextValue;

    switch (contextValue) {
      case 'empty':
        this.iconPath = new vscode.ThemeIcon('cloud');
        break;
      case 'deployment-url':
        this.iconPath = new vscode.ThemeIcon('link-external');
        break;
      case 'deployment-branch':
        this.iconPath = new vscode.ThemeIcon('git-branch');
        break;
      case 'deployment-status':
        this.iconPath = new vscode.ThemeIcon('pulse');
        break;
      case 'deployment-date':
        this.iconPath = new vscode.ThemeIcon('calendar');
        break;
    }
  }
}
