import * as vscode from 'vscode';
import { logger } from './utils/logger';
import { COMMANDS, VIEWS, CONTEXT_KEYS } from './constants';

// Services
import { AuthService } from './services/auth.service';
import { OrganizationService } from './services/organization.service';
import { ProjectService } from './services/project.service';
import { DeployService } from './services/deploy.service';
import { AIService } from './services/ai.service';
import { WorkflowService } from './services/workflow.service';
import { SecretsService } from './services/secrets.service';
import { SREService } from './services/sre.service';
import { BillingService } from './services/billing.service';
import { NotificationService } from './services/notification.service';

// Providers
import { OrganizationProvider } from './providers/organization.provider';
import { ProjectProvider } from './providers/project.provider';
import { DeploymentProvider } from './providers/deployment.provider';
import { PipelineProvider } from './providers/pipeline.provider';
import { MonitoringProvider } from './providers/monitoring.provider';

// Commands
import { registerAuthCommands } from './commands/auth.commands';
import { registerOrgCommands } from './commands/org.commands';
import { registerProjectCommands } from './commands/project.commands';
import { registerDeployCommands } from './commands/deploy.commands';
import { registerAICommands } from './commands/ai.commands';
import { registerPipelineCommands } from './commands/pipeline.commands';
import { registerSecretsCommands } from './commands/secrets.commands';
import { registerMonitoringCommands } from './commands/monitoring.commands';

// Views
import { AIChatPanel } from './views/ai-chat.view';
import { DeployProgressPanel } from './views/deploy-progress.view';

// Status Bar
import { StatusBarManager } from './statusbar/statusbar.manager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info('Trivx AI Extension activating...');

  // ─── Initialize Services ───────────────────────────────────────────────────
  const authService = AuthService.initialize(context);
  const orgService = OrganizationService.initialize(context);
  const projectService = ProjectService.initialize(context);
  const deployService = DeployService.initialize(context);
  AIService.initialize();
  WorkflowService.initialize();
  SecretsService.initialize();
  SREService.initialize();
  BillingService.initialize();
  NotificationService.initialize();

  // ─── Set Initial Context ───────────────────────────────────────────────────
  await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.IS_LOGGED_IN, false);
  await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.HAS_ORGANIZATION, false);
  await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.HAS_PROJECT, false);
  await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.IS_DEPLOYING, false);

  // ─── Create Tree View Providers ────────────────────────────────────────────
  const orgProvider = new OrganizationProvider();
  const projectProvider = new ProjectProvider();
  const deploymentProvider = new DeploymentProvider();
  const pipelineProvider = new PipelineProvider();
  const monitoringProvider = new MonitoringProvider();

  // Refresh all providers helper
  const refreshAll = () => {
    orgProvider.refresh();
    projectProvider.refresh();
    deploymentProvider.refresh();
    pipelineProvider.refresh();
    monitoringProvider.refresh();
    statusBarManager.updateAll();
  };

  // ─── Register Tree Views ──────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(VIEWS.ORGANIZATION, orgProvider),
    vscode.window.registerTreeDataProvider(VIEWS.PROJECTS, projectProvider),
    vscode.window.registerTreeDataProvider(VIEWS.DEPLOYMENTS, deploymentProvider),
    vscode.window.registerTreeDataProvider(VIEWS.PIPELINES, pipelineProvider),
    vscode.window.registerTreeDataProvider(VIEWS.MONITORING, monitoringProvider)
  );

  // ─── Register Commands ─────────────────────────────────────────────────────
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

  // Additional commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.REFRESH_ALL, () => {
      refreshAll();
      vscode.window.showInformationMessage('Trivx: Refreshed all views');
    }),

    vscode.commands.registerCommand(COMMANDS.CANCEL_DEPLOY, async () => {
      try {
        await deployService.cancelDeployment();
        vscode.window.showInformationMessage('Trivx: Deployment cancelled');
        refreshAll();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to cancel deployment: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.ROLLBACK, async () => {
      const projectId = projectService.getCurrentProjectId();
      if (!projectId) {
        vscode.window.showWarningMessage('Please select a project first.');
        return;
      }

      const deployments = await deployService.listDeployments(projectId);
      if (deployments.length < 2) {
        vscode.window.showWarningMessage('No previous deployment to rollback to.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        deployments.slice(1).map(d => ({
          label: `$(history) ${d.environment || 'production'} - ${new Date(d.createdAt).toLocaleString()}`,
          description: d.status,
          deployId: d.id,
        })),
        { placeHolder: 'Select deployment to rollback to' }
      );

      if (!selected) { return; }

      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to rollback?',
        { modal: true },
        'Rollback'
      );
      if (confirm !== 'Rollback') { return; }

      try {
        await deployService.rollbackDeployment(selected.deployId);
        vscode.window.showInformationMessage('Trivx: Rollback initiated');
        refreshAll();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Rollback failed: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.VIEW_DEPLOYMENTS, () => {
      DeployProgressPanel.createOrShow(context.extensionUri);
    }),

    vscode.commands.registerCommand(COMMANDS.CANCEL_PIPELINE, async () => {
      const projectId = projectService.getCurrentProjectId();
      if (!projectId) { return; }

      const workflowService = WorkflowService.getInstance();
      const runs = await workflowService.listPipelineRuns(projectId);
      const activeRuns = runs.filter(r => r.status === 'running' || r.status === 'pending');

      if (activeRuns.length === 0) {
        vscode.window.showInformationMessage('No active pipeline runs to cancel.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        activeRuns.map(r => ({
          label: `$(x) Run #${r.id.slice(0, 8)}`,
          description: r.status,
          runId: r.id,
        })),
        { placeHolder: 'Select pipeline run to cancel' }
      );

      if (!selected) { return; }

      try {
        await workflowService.cancelPipeline(selected.runId);
        vscode.window.showInformationMessage('Pipeline cancelled');
        refreshAll();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to cancel pipeline: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.VIEW_INCIDENTS, async () => {
      const orgId = orgService.getCurrentOrgId();
      const projectId = projectService.getCurrentProjectId();

      try {
        const sreService = SREService.getInstance();
        const incidents = await sreService.listIncidents({
          orgId,
          projectId,
          status: 'open',
        });

        if (incidents.length === 0) {
          vscode.window.showInformationMessage('No open incidents. All clear! 🎉');
          return;
        }

        const selected = await vscode.window.showQuickPick(
          incidents.map(i => ({
            label: `$(warning) ${i.summary}`,
            description: `${i.severity} • ${i.status}`,
            detail: i.details || '',
            incidentId: i.id,
          })),
          { placeHolder: 'Open incidents' }
        );

        if (selected) {
          const outputChannel = vscode.window.createOutputChannel('Trivx Incident');
          outputChannel.show(true);
          outputChannel.appendLine(`Incident: ${selected.label.replace('$(warning) ', '')}`);
          outputChannel.appendLine(`Severity: ${selected.description}`);
          outputChannel.appendLine(`Details: ${selected.detail}`);
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load incidents: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.VIEW_USAGE, async () => {
      const orgId = orgService.getCurrentOrgId();
      if (!orgId) {
        vscode.window.showWarningMessage('Please select an organization first.');
        return;
      }

      try {
        const billingService = BillingService.getInstance();
        const usage = await billingService.getUsageSummary(orgId);

        const outputChannel = vscode.window.createOutputChannel('Trivx Usage');
        outputChannel.show(true);
        outputChannel.appendLine('=== Trivx Usage Report ===\n');

        if (usage && typeof usage === 'object') {
          for (const [key, value] of Object.entries(usage)) {
            outputChannel.appendLine(`${key}: ${JSON.stringify(value)}`);
          }
        } else {
          outputChannel.appendLine('No usage data available.');
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load usage: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.ANALYZE_REPO, async () => {
      const projectId = projectService.getCurrentProjectId();
      if (!projectId) {
        vscode.window.showWarningMessage('Please select a project first.');
        return;
      }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing repository...',
            cancellable: false,
          },
          async () => {
            await projectService.analyzeRepository(projectId);
          }
        );
        vscode.window.showInformationMessage('Repository analysis completed!');
      } catch (error: any) {
        vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
      }
    })
  );

  // ─── Status Bar ────────────────────────────────────────────────────────────
  const statusBarManager = new StatusBarManager();
  context.subscriptions.push({ dispose: () => statusBarManager.dispose() });

  // ─── Restore Session ──────────────────────────────────────────────────────
  try {
    const restored = await authService.restoreSession();
    if (restored) {
      logger.info('Session restored on activation');
      refreshAll();
    }
  } catch (error) {
    logger.warn('Failed to restore session', error);
  }

  // ─── Auth State Change Handler ─────────────────────────────────────────────
  context.subscriptions.push(
    authService.onAuthStateChanged((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        refreshAll();
      } else {
        refreshAll();
      }
    })
  );

  // ─── Deploy event for progress view ────────────────────────────────────────
  context.subscriptions.push(
    deployService.onDeploymentStatus(() => {
      deploymentProvider.refresh();
    }),
    deployService.onDeploymentComplete(() => {
      deploymentProvider.refresh();
      refreshAll();
    })
  );

  logger.info('Trivx AI Extension activated successfully!');
}

export function deactivate(): void {
  logger.info('Trivx AI Extension deactivating...');

  try {
    const deployService = DeployService.getInstance();
    deployService.dispose();
  } catch {
    // service may not have been initialized
  }
}
