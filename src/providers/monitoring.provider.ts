import * as vscode from 'vscode';
import { SREService, Incident } from '../services/sre.service';
import { OrganizationService } from '../services/organization.service';
import { AuthService } from '../services/auth.service';

export class MonitoringProvider implements vscode.TreeDataProvider<MonitoringTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<MonitoringTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: MonitoringTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MonitoringTreeItem): Promise<MonitoringTreeItem[]> {
    const authService = AuthService.getInstance();
    if (!authService.isLoggedIn) { return []; }

    const sreService = SREService.getInstance();

    if (!element) {
      const orgId = OrganizationService.getInstance().getCurrentOrgId();
      const incidents = await sreService.listIncidents({ orgId });
      const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating');

      return [
        new MonitoringTreeItem(
          `Incidents (${openIncidents.length} open)`,
          '',
          vscode.TreeItemCollapsibleState.Collapsed,
          'incidents-group',
          undefined,
          undefined,
          openIncidents
        ),
        new MonitoringTreeItem(
          'View Logs',
          '',
          vscode.TreeItemCollapsibleState.None,
          'logs-action',
          { command: 'trivx.viewLogs', title: 'View Logs' }
        ),
        new MonitoringTreeItem(
          'View Dashboard',
          '',
          vscode.TreeItemCollapsibleState.None,
          'dashboard-action',
          { command: 'trivx.openDashboard', title: 'Open Dashboard' }
        ),
      ];
    }

    // Incidents list
    if (element.contextValue === 'incidents-group' && element.incidents) {
      if (element.incidents.length === 0) {
        return [
          new MonitoringTreeItem(
            'No open incidents',
            'All systems operational',
            vscode.TreeItemCollapsibleState.None,
            'no-incidents'
          ),
        ];
      }

      return element.incidents.map(incident => {
        const icon = this.getSeverityIcon(incident.severity);
        return new MonitoringTreeItem(
          `${icon} ${incident.summary}`,
          `${incident.severity} • ${incident.status}`,
          vscode.TreeItemCollapsibleState.None,
          'incident',
          undefined,
          incident
        );
      });
    }

    return [];
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }
}

export class MonitoringTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly desc: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly command?: vscode.Command,
    public readonly incident?: Incident,
    public readonly incidents?: Incident[]
  ) {
    super(label, collapsibleState);
    this.description = desc;
    this.contextValue = contextValue;

    switch (contextValue) {
      case 'incidents-group':
        this.iconPath = new vscode.ThemeIcon('warning');
        break;
      case 'logs-action':
        this.iconPath = new vscode.ThemeIcon('output');
        break;
      case 'dashboard-action':
        this.iconPath = new vscode.ThemeIcon('dashboard');
        break;
      case 'no-incidents':
        this.iconPath = new vscode.ThemeIcon('check');
        break;
    }
  }
}
