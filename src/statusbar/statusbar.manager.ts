import * as vscode from 'vscode';
import { AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';
import { ProjectService } from '../services/project.service';
import { DeployService } from '../services/deploy.service';
import { COMMANDS } from '../constants';

export class StatusBarManager {
  private authItem: vscode.StatusBarItem;
  private orgItem: vscode.StatusBarItem;
  private projectItem: vscode.StatusBarItem;
  private deployItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Auth status item
    this.authItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.authItem.command = COMMANDS.LOGIN;
    this.authItem.tooltip = 'Trivx AI - Click to login';

    // Organization item
    this.orgItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.orgItem.command = COMMANDS.SWITCH_ORG;
    this.orgItem.tooltip = 'Trivx - Switch Organization';

    // Project item
    this.projectItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    this.projectItem.command = COMMANDS.OPEN_PROJECT;
    this.projectItem.tooltip = 'Trivx - Switch Project';

    // Deploy item
    this.deployItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
    this.deployItem.command = COMMANDS.VIEW_DEPLOY_LOGS;
    this.deployItem.tooltip = 'Trivx - Deployment Status';

    // Listen to auth changes
    const authService = AuthService.getInstance();
    this.disposables.push(
      authService.onAuthStateChanged((isLoggedIn: boolean) => {
        this.updateAll();
      })
    );

    // Listen to deployment events
    try {
      const deployService = DeployService.getInstance();
      this.disposables.push(
        deployService.onDeploymentStatus((status) => {
          this.deployItem.text = `$(rocket) ${status.phase} ${status.percent}%`;
          this.deployItem.show();
        }),
        deployService.onDeploymentComplete((result) => {
          if (result.success) {
            this.deployItem.text = '$(check) Deploy OK';
          } else {
            this.deployItem.text = '$(error) Deploy Failed';
          }
          setTimeout(() => this.updateAll(), 5000);
        })
      );
    } catch {
      // DeployService may not be initialized yet
    }

    this.updateAll();
    this.authItem.show();
  }

  updateAll(): void {
    const authService = AuthService.getInstance();

    if (authService.isLoggedIn) {
      const user = authService.currentUser;
      this.authItem.text = `$(account) ${user?.name || user?.email || 'Trivx'}`;
      this.authItem.command = COMMANDS.LOGOUT;
      this.authItem.tooltip = `Trivx AI - Logged in as ${user?.email || 'unknown'}`;
    } else {
      this.authItem.text = '$(log-in) Trivx Login';
      this.authItem.command = COMMANDS.LOGIN;
      this.authItem.tooltip = 'Trivx AI - Click to login';
      this.orgItem.hide();
      this.projectItem.hide();
      this.deployItem.hide();
      return;
    }

    // Org
    try {
      const orgService = OrganizationService.getInstance();
      const orgId = orgService.getCurrentOrgId();
      if (orgId) {
        this.orgItem.text = `$(home) org`;
        this.orgItem.show();
      } else {
        this.orgItem.text = `$(home) No Org`;
        this.orgItem.show();
      }
    } catch {
      this.orgItem.hide();
    }

    // Project
    try {
      const projectService = ProjectService.getInstance();
      const projectId = projectService.getCurrentProjectId();
      if (projectId) {
        this.projectItem.text = `$(package) project`;
        this.projectItem.show();
      } else {
        this.projectItem.hide();
      }
    } catch {
      this.projectItem.hide();
    }

    // Deploy
    try {
      const deployService = DeployService.getInstance();
      if (deployService.isDeploying) {
        this.deployItem.text = '$(sync~spin) Deploying...';
        this.deployItem.show();
      } else {
        this.deployItem.hide();
      }
    } catch {
      this.deployItem.hide();
    }
  }

  dispose(): void {
    this.authItem.dispose();
    this.orgItem.dispose();
    this.projectItem.dispose();
    this.deployItem.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
