import * as vscode from 'vscode';
import { io, Socket } from 'socket.io-client';
import { apiClient } from './api-client';
import { API_ROUTES, CONTEXT_KEYS, DEPLOY_PHASES } from '../constants';
import { getConfig } from '../utils/config';
import { logger } from '../utils/logger';

export interface Deployment {
  id: string;
  projectId?: string;
  environment?: string;
  status: string;
  url?: string;
  branch?: string;
  provider?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DeploymentStatus {
  status: string;
  phase: string;
  percent: number;
  message: string;
  publicUrl?: string;
}

export interface DeploymentLog {
  message: string;
  level: string;
  timestamp: string;
}

export class DeployService {
  private static instance: DeployService;
  private context: vscode.ExtensionContext;
  private socket: Socket | null = null;
  private _isDeploying: boolean = false;
  private currentDeploymentId: string | null = null;

  private _onDeploymentStatus = new vscode.EventEmitter<DeploymentStatus>();
  private _onDeploymentLog = new vscode.EventEmitter<DeploymentLog>();
  private _onDeploymentComplete = new vscode.EventEmitter<{ success: boolean; url?: string; error?: string }>();

  public readonly onDeploymentStatus = this._onDeploymentStatus.event;
  public readonly onDeploymentLog = this._onDeploymentLog.event;
  public readonly onDeploymentComplete = this._onDeploymentComplete.event;

  private outputChannel: vscode.OutputChannel;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Trivx Deployments');
  }

  static initialize(context: vscode.ExtensionContext): DeployService {
    if (!DeployService.instance) {
      DeployService.instance = new DeployService(context);
    }
    return DeployService.instance;
  }

  static getInstance(): DeployService {
    if (!DeployService.instance) {
      throw new Error('DeployService not initialized');
    }
    return DeployService.instance;
  }

  get isDeploying(): boolean {
    return this._isDeploying;
  }

  async deploy(projectId: string, config: {
    userId: string;
    organizationId: string;
    branch?: string;
    environment?: string;
  }): Promise<string | null> {
    try {
      this._isDeploying = true;
      await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.IS_DEPLOYING, true);

      this.outputChannel.show(true);
      this.outputChannel.appendLine(`\n${'='.repeat(60)}`);
      this.outputChannel.appendLine(`🚀 Deploying project: ${projectId}`);
      this.outputChannel.appendLine(`   Branch: ${config.branch || 'main'}`);
      this.outputChannel.appendLine(`   Environment: ${config.environment || 'production'}`);
      this.outputChannel.appendLine(`${'='.repeat(60)}\n`);

      const response = await apiClient.post<any>(API_ROUTES.DEPLOY_EXECUTE, {
        projectId,
        userId: config.userId,
        organizationId: config.organizationId,
        branch: config.branch || 'main',
        environment: config.environment || 'production',
      });

      const executionId = response.executionId || response.deploymentId || response.id;
      this.currentDeploymentId = executionId;

      // Subscribe to real-time updates
      this.subscribeToDeployment(executionId, config.userId, config.organizationId);

      logger.info(`Deployment started: ${executionId}`);
      return executionId;
    } catch (error) {
      this._isDeploying = false;
      await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.IS_DEPLOYING, false);
      logger.error('Deploy failed', error);
      throw error;
    }
  }

  subscribeToDeployment(deploymentId: string, userId: string, organizationId: string): void {
    const config = getConfig();

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(config.wsUrl, {
      auth: { userId, organizationId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      logger.info(`Socket connected for deployment: ${deploymentId}`);
      this.socket?.emit('subscribe', { deploymentId });
    });

    this.socket.on('deployment:status', (data: DeploymentStatus) => {
      this._onDeploymentStatus.fire(data);
      this.outputChannel.appendLine(`[${data.phase}] ${data.message} (${data.percent}%)`);

      if (data.status === 'live' || data.status === 'completed' || data.status === 'LIVE') {
        this.handleDeployComplete(true, data.publicUrl);
      } else if (data.status === 'failed' || data.status === 'FAILED') {
        this.handleDeployComplete(false, undefined, data.message);
      }
    });

    this.socket.on('deployment:progress', (data: { phase: string; percent: number }) => {
      this._onDeploymentStatus.fire({
        status: 'deploying',
        phase: data.phase,
        percent: data.percent,
        message: `${data.phase} (${data.percent}%)`,
      });
    });

    this.socket.on('deployment:logs', (data: { logs?: string; message?: string; level?: string }) => {
      const logEntry: DeploymentLog = {
        message: data.logs || data.message || '',
        level: data.level || 'info',
        timestamp: new Date().toISOString(),
      };
      this._onDeploymentLog.fire(logEntry);
      this.outputChannel.appendLine(`  [${logEntry.level}] ${logEntry.message}`);
    });

    this.socket.on('disconnect', () => {
      logger.info('Socket disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      logger.error('Socket connection error', error);
    });
  }

  private async handleDeployComplete(success: boolean, url?: string, error?: string): Promise<void> {
    this._isDeploying = false;
    this.currentDeploymentId = null;
    await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.IS_DEPLOYING, false);

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this._onDeploymentComplete.fire({ success, url, error });

    if (success) {
      this.outputChannel.appendLine(`\n✅ Deployment completed successfully!`);
      if (url) {
        this.outputChannel.appendLine(`🌐 URL: ${url}`);
      }

      const config = getConfig();
      if (config.showDeployNotifications) {
        const action = url ? await vscode.window.showInformationMessage(
          `Trivx: Deployment successful! ${url ? `URL: ${url}` : ''}`,
          'Open URL',
          'View Logs'
        ) : await vscode.window.showInformationMessage(
          'Trivx: Deployment successful!',
          'View Logs'
        );

        if (action === 'Open URL' && url) {
          vscode.env.openExternal(vscode.Uri.parse(url));
        } else if (action === 'View Logs') {
          this.outputChannel.show();
        }
      }
    } else {
      this.outputChannel.appendLine(`\n❌ Deployment failed: ${error || 'Unknown error'}`);
      vscode.window.showErrorMessage(`Trivx: Deployment failed. ${error || 'Check logs for details.'}`, 'View Logs')
        .then(action => {
          if (action === 'View Logs') {
            this.outputChannel.show();
          }
        });
    }
  }

  async cancelDeployment(deploymentId?: string): Promise<void> {
    const id = deploymentId || this.currentDeploymentId;
    if (!id) {
      vscode.window.showWarningMessage('No active deployment to cancel');
      return;
    }

    try {
      await apiClient.post(API_ROUTES.DEPLOY_CANCEL(id));
      await this.handleDeployComplete(false, undefined, 'Cancelled by user');
      logger.info(`Cancelled deployment: ${id}`);
    } catch (error) {
      logger.error('Failed to cancel deployment', error);
    }
  }

  async rollbackDeployment(deploymentId: string): Promise<void> {
    try {
      await apiClient.post(API_ROUTES.DEPLOY_ROLLBACK(deploymentId));
      logger.info(`Rollback triggered for: ${deploymentId}`);
      vscode.window.showInformationMessage('Trivx: Rollback initiated');
    } catch (error) {
      logger.error('Failed to rollback deployment', error);
    }
  }

  async listDeployments(projectId?: string): Promise<Deployment[]> {
    try {
      const params = projectId ? `?projectId=${projectId}` : '';
      const response = await apiClient.get<any>(`${API_ROUTES.DEPLOY_LIST}${params}`);
      return response.deployments || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list deployments', error);
      return [];
    }
  }

  dispose(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.outputChannel.dispose();
    this._onDeploymentStatus.dispose();
    this._onDeploymentLog.dispose();
    this._onDeploymentComplete.dispose();
  }
}
