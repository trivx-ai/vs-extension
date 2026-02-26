import * as vscode from 'vscode';
import { OrganizationService, Organization, Member } from '../services/organization.service';
import { AuthService } from '../services/auth.service';

export class OrganizationProvider implements vscode.TreeDataProvider<OrganizationTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<OrganizationTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: OrganizationTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: OrganizationTreeItem): Promise<OrganizationTreeItem[]> {
    const authService = AuthService.getInstance();
    if (!authService.isLoggedIn) {
      return [];
    }

    const orgService = OrganizationService.getInstance();

    if (!element) {
      // Root level: show current organization
      const orgId = orgService.getCurrentOrgId();
      if (!orgId) {
        return [
          new OrganizationTreeItem(
            'No Organization Selected',
            'Click to select',
            vscode.TreeItemCollapsibleState.None,
            'select-org',
            { command: 'trivx.switchOrg', title: 'Switch Organization' }
          ),
        ];
      }

      const org = await orgService.getOrganization(orgId);
      if (!org) {
        return [
          new OrganizationTreeItem(
            'Organization not found',
            '',
            vscode.TreeItemCollapsibleState.None,
            'error'
          ),
        ];
      }

      return [
        new OrganizationTreeItem(
          org.name,
          `${org.plan} Plan`,
          vscode.TreeItemCollapsibleState.Expanded,
          'organization',
          undefined,
          org
        ),
      ];
    }

    // Children of organization
    if (element.contextValue === 'organization' && element.org) {
      const members = await orgService.getMembers(element.org.id);
      const items: OrganizationTreeItem[] = [
        new OrganizationTreeItem(
          `Owner: ${element.org.adminEmail}`,
          '',
          vscode.TreeItemCollapsibleState.None,
          'owner',
          undefined,
          undefined,
          '$(person)'
        ),
        new OrganizationTreeItem(
          `Plan: ${element.org.plan}`,
          '',
          vscode.TreeItemCollapsibleState.None,
          'plan',
          undefined,
          undefined,
          '$(star)'
        ),
        new OrganizationTreeItem(
          `Members (${members.length})`,
          '',
          vscode.TreeItemCollapsibleState.Collapsed,
          'members-group',
          undefined,
          element.org,
          '$(organization)'
        ),
        new OrganizationTreeItem(
          'Switch Organization',
          '',
          vscode.TreeItemCollapsibleState.None,
          'switch-org',
          { command: 'trivx.switchOrg', title: 'Switch Organization' },
          undefined,
          '$(arrow-swap)'
        ),
      ];
      return items;
    }

    // Member list
    if (element.contextValue === 'members-group' && element.org) {
      const members = await orgService.getMembers(element.org.id);
      return members.map(m => new OrganizationTreeItem(
        m.email,
        m.role,
        vscode.TreeItemCollapsibleState.None,
        'member',
        undefined,
        undefined,
        m.status === 'ACTIVE' ? '$(person)' : '$(mail)'
      ));
    }

    return [];
  }
}

export class OrganizationTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly desc: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly command?: vscode.Command,
    public readonly org?: Organization,
    iconId?: string
  ) {
    super(label, collapsibleState);
    this.description = desc;
    this.contextValue = contextValue;

    if (iconId) {
      this.iconPath = new vscode.ThemeIcon(iconId.replace('$(', '').replace(')', ''));
    } else {
      switch (contextValue) {
        case 'organization':
          this.iconPath = new vscode.ThemeIcon('home');
          break;
        case 'select-org':
          this.iconPath = new vscode.ThemeIcon('add');
          break;
        case 'error':
          this.iconPath = new vscode.ThemeIcon('error');
          break;
      }
    }
  }
}
