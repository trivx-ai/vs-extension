import * as vscode from 'vscode';
import { AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';
import { ProjectService } from '../services/project.service';
import { COMMANDS } from '../constants';

export class StatusBarManager {
  private _authItem: vscode.StatusBarItem;
  private _orgItem: vscode.StatusBarItem;
  private _projectItem: vscode.StatusBarItem;
  private _deployItem: vscode.StatusBarItem;
  private _disposables: vscode.Disposable[] = [];

  constructor() {
    // Auth status (far left)
    this._authItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this._authItem.command = COMMANDS.LOGIN;
    this._authItem.tooltip = 'Trivx: Click to login';

    // Org (next)
    this._orgItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this._orgItem.command = COMMANDS.SWITCH_ORG;
    this._orgItem.tooltip = 'Trivx: Switch Organization';

    // Project
    this._projectItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    this._projectItem.command = COMMANDS.OPEN_PROJECT;
    this._projectItem.tooltip = 'Trivx: Switch Project';

    // Deploy (right side)
    this._deployItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this._deployItem.command = COMMANDS.DEPLOY;
    this._deployItem.tooltip = 'Trivx: Deploy';

    this.update();
  }

  update(): void {
    const authService = AuthService.getInstance();

    if (!authService.isLoggedIn) {
      this._authItem.text = '$(plug) Trivx: Login';
      this._authItem.command = COMMANDS.LOGIN;
      this._authItem.show();

      this._orgItem.hide();
      this._projectItem.hide();
      this._deployItem.hide();
      return;
    }

    // Auth - logged in
    const user = authService.currentUser;
    this._authItem.text = `$(check) Trivx`;
    this._authItem.tooltip = `Logged in as ${user?.email || 'user'}`;
    this._authItem.command = COMMANDS.LOGOUT;
    this._authItem.show();

    // Organization
    const orgService = OrganizationService.getInstance();
    const orgId = orgService.getCurrentOrgId();
    if (orgId) {
      this._orgItem.text = `$(home) ${orgId.slice(0, 8)}...`;
      this._orgItem.show();
    } else {
      this._orgItem.text = '$(home) No Org';
      this._orgItem.show();
    }

    // Project
    const projectService = ProjectService.getInstance();
    const projectId = projectService.getCurrentProjectId();
    if (projectId) {
      this._projectItem.text = `$(package) ${projectId.slice(0, 8)}...`;
      this._projectItem.show();
    } else {
      this._projectItem.text = '$(package) No Project';
      this._projectItem.show();
    }

    // Deploy button
    this._deployItem.text = '$(rocket) Deploy';
    this._deployItem.backgroundColor = undefined;
    this._deployItem.show();
  }

  showDeploying(): void {
    this._deployItem.text = '$(sync~spin) Deploying...';
    this._deployItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this._deployItem.command = COMMANDS.VIEW_DEPLOY_LOGS;
  }

  showDeploySuccess(): void {
    this._deployItem.text = '$(check) Deploy Success';
    this._deployItem.backgroundColor = undefined;
    this._deployItem.command = COMMANDS.DEPLOY;

    // Reset after 5 seconds
    setTimeout(() => {
      this._deployItem.text = '$(rocket) Deploy';
    }, 5000);
  }

  showDeployFailed(): void {
    this._deployItem.text = '$(error) Deploy Failed';
    this._deployItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this._deployItem.command = COMMANDS.VIEW_DEPLOY_LOGS;

    // Reset after 10 seconds
    setTimeout(() => {
      this._deployItem.text = '$(rocket) Deploy';
      this._deployItem.backgroundColor = undefined;
      this._deployItem.command = COMMANDS.DEPLOY;
    }, 10000);
  }

  dispose(): void {
    this._authItem.dispose();
    this._orgItem.dispose();
    this._projectItem.dispose();
    this._deployItem.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
  }
}
