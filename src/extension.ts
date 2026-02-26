import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { AuthService } from './services/auth.service';
import { OrganizationService } from './services/organization.service';
import { ProjectService } from './services/project.service';
import { DeployService } from './services/deploy.service';
import { AIService } from './services/ai.service';
import { NotificationService } from './services/notification.service';

import { OrganizationProvider } from './providers/organization.provider';
import { ProjectProvider } from './providers/project.provider';
import { DeploymentProvider } from './providers/deployment.provider';
import { PipelineProvider } from './providers/pipeline.provider';
import { MonitoringProvider } from './providers/monitoring.provider';

import { StatusBarManager } from './statusbar/statusbar.manager';
import { AIChatPanel } from './views/ai-chat.view';
import { DeployProgressPanel } from './views/deploy-progress.view';

import { registerAuthCommands } from './commands/auth.commands';
import { registerOrgCommands } from './commands/org.commands';
import { registerProjectCommands } from './commands/project.commands';
import { registerDeployCommands } from './commands/deploy.commands';
import { registerAICommands } from './commands/ai.commands';
import { registerPipelineCommands } from './commands/pipeline.commands';
import { registerSecretsCommands } from './commands/secrets.commands';
import { registerMonitoringCommands } from './commands/monitoring.commands';

import { VIEWS, CONTEXT_KEYS } from './constants';

let logger: Logger;
let statusBarManager: StatusBarManager;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger = Logger.getInstance();
  logger.info('Trivx AI Extension activating...');

  // ─── Initialize Services ──────────────────────────────────────────
  const authService = AuthService.getInstance();
  authService.setContext(context);

  const orgService = OrganizationService.getInstance();
  const projectService = ProjectService.getInstance();
  const deployService = DeployService.getInstance();
  const aiService = AIService.getInstance();

  // ─── Create TreeView Providers ────────────────────────────────────
  const orgProvider = new OrganizationProvider();
  const projectProvider = new ProjectProvider();
  const deploymentProvider = new DeploymentProvider();
  const pipelineProvider = new PipelineProvider();
  const monitoringProvider = new MonitoringProvider();

  // Register TreeViews
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(VIEWS.ORGANIZATION, orgProvider),
    vscode.window.registerTreeDataProvider(VIEWS.PROJECTS, projectProvider),
    vscode.window.registerTreeDataProvider(VIEWS.DEPLOYMENTS, deploymentProvider),
    vscode.window.registerTreeDataProvider(VIEWS.PIPELINES, pipelineProvider),
    vscode.window.registerTreeDataProvider(VIEWS.MONITORING, monitoringProvider)
  );

  // ─── Create StatusBar ─────────────────────────────────────────────
  statusBarManager = new StatusBarManager();
  context.subscriptions.push(statusBarManager as any);

  // ─── Refresh All Views ────────────────────────────────────────────
  const refreshAll = (): void => {
    orgProvider.refresh();
    projectProvider.refresh();
    deploymentProvider.refresh();
    pipelineProvider.refresh();
    monitoringProvider.refresh();
    statusBarManager.update();
  };

  // ─── Register Commands ────────────────────────────────────────────
  registerAuthCommands(context);
  registerOrgCommands(context, refreshAll);
  registerProjectCommands(context, refreshAll);
  registerDeployCommands(context, refreshAll);
  registerAICommands(context, () => {
    AIChatPanel.createOrShow(context.extensionUri);
  });
  registerPipelineCommands(context, refreshAll);
  registerSecretsCommands(context);
  registerMonitoringCommands(context, refreshAll);

  // ─── Listen to Auth State Changes ─────────────────────────────────
  authService.onAuthStateChanged((loggedIn) => {
    vscode.commands.executeCommand('setContext', CONTEXT_KEYS.LOGGED_IN, loggedIn);
    refreshAll();

    if (loggedIn) {
      logger.info('User logged in, refreshing views');
    } else {
      logger.info('User logged out');
    }
  });

  // ─── Listen to Deploy Events ──────────────────────────────────────
  deployService.onStatus(() => {
    statusBarManager.showDeploying();
    deploymentProvider.refresh();
  });

  deployService.onComplete((deployment) => {
    if (deployment.status === 'LIVE' || deployment.status === 'completed') {
      statusBarManager.showDeploySuccess();
    } else {
      statusBarManager.showDeployFailed();
    }
    deploymentProvider.refresh();
  });

  // ─── Restore Session ──────────────────────────────────────────────
  try {
    await authService.restoreSession();
    if (authService.isLoggedIn) {
      logger.info('Session restored successfully');
      vscode.commands.executeCommand('setContext', CONTEXT_KEYS.LOGGED_IN, true);
    }
  } catch (err) {
    logger.warn('Failed to restore session');
  }

  // ─── Initial Refresh ──────────────────────────────────────────────
  refreshAll();

  logger.info('Trivx AI Extension activated successfully!');
}

export function deactivate(): void {
  logger?.info('Trivx AI Extension deactivating...');

  // Cleanup services
  try {
    DeployService.getInstance().dispose();
  } catch { /* ignore */ }

  try {
    AIChatPanel.currentPanel?.dispose();
  } catch { /* ignore */ }

  try {
    DeployProgressPanel.currentPanel?.dispose();
  } catch { /* ignore */ }

  logger?.info('Trivx AI Extension deactivated');
}
