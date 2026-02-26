import * as vscode from 'vscode';
import { getBaseHtml, getWebviewOptions } from './webview-utils';
import { DeployService, Deployment } from '../services/deploy.service';
import { DEPLOY_PHASES } from '../constants';

export class DeployProgressPanel {
  public static currentPanel: DeployProgressPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _deployService: DeployService;

  public static createOrShow(extensionUri: vscode.Uri, deploymentId: string): void {
    const column = vscode.ViewColumn.Beside;

    if (DeployProgressPanel.currentPanel) {
      DeployProgressPanel.currentPanel._panel.reveal(column);
      DeployProgressPanel.currentPanel._updateDeployment(deploymentId);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'trivxDeployProgress',
      'Deployment Progress',
      column,
      getWebviewOptions(extensionUri)
    );

    DeployProgressPanel.currentPanel = new DeployProgressPanel(panel, extensionUri, deploymentId);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, deploymentId: string) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._deployService = DeployService.getInstance();

    this._update();
    this._updateDeployment(deploymentId);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private _updateDeployment(deploymentId: string): void {
    // Listen to deployment events
    this._deployService.onStatus((status) => {
      this._panel.webview.postMessage({
        type: 'statusUpdate',
        status: status.status,
        phase: status.phase,
        progress: status.progress,
        message: status.message,
      });
    });

    this._deployService.onLog((log) => {
      this._panel.webview.postMessage({
        type: 'log',
        message: log.message,
        level: log.level,
        timestamp: log.timestamp,
      });
    });

    this._deployService.onComplete((deployment) => {
      this._panel.webview.postMessage({
        type: 'complete',
        status: deployment.status,
        url: deployment.url,
      });
    });

    // Connect to deployment stream
    this._deployService.connectToDeployment(deploymentId);
  }

  private _update(): void {
    this._panel.title = 'Deployment Progress';
    this._panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'trivx-icon.svg');
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    const phasesHtml = DEPLOY_PHASES.map((phase, idx) => `
      <div class="phase" id="phase-${idx}" data-status="pending">
        <div class="phase-icon">⬜</div>
        <div class="phase-info">
          <div class="phase-name">${phase}</div>
          <div class="phase-status">Pending</div>
        </div>
      </div>
    `).join('');

    const bodyContent = `
    <div id="deploy-container" style="height: calc(100vh - 32px); display: flex; flex-direction: column;">
      <div style="padding: 12px 0; border-bottom: 1px solid var(--vscode-panel-border);">
        <h2 style="margin: 0;">🚀 Deployment Progress</h2>
        <div id="deploy-status" style="margin-top: 8px;">
          <span class="badge badge-info">Initializing...</span>
        </div>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 16px 0;">
        <!-- Progress Bar -->
        <div style="margin-bottom: 20px;">
          <div style="background: var(--vscode-progressBar-background, #333); border-radius: 4px; height: 8px; overflow: hidden;">
            <div id="progress-bar" style="background: var(--trivx-brand); height: 100%; width: 0%; transition: width 0.5s ease; border-radius: 4px;"></div>
          </div>
          <div id="progress-text" style="text-align: center; margin-top: 4px; font-size: 12px; opacity: 0.7;">0%</div>
        </div>

        <!-- Phases -->
        <div id="phases" style="margin-bottom: 20px;">
          ${phasesHtml}
        </div>

        <!-- Logs -->
        <div>
          <h3>Deployment Logs</h3>
          <div id="logs" style="background: var(--vscode-terminal-background); padding: 12px; border-radius: 6px; font-family: var(--vscode-editor-font-family); font-size: 12px; max-height: 300px; overflow-y: auto; white-space: pre-wrap;">
            <span style="opacity: 0.5;">Waiting for logs...</span>
          </div>
        </div>

        <!-- Result (hidden initially) -->
        <div id="result" style="display: none; margin-top: 16px; padding: 16px; border-radius: 8px; text-align: center;">
        </div>
      </div>
    </div>

    <style>
      .phase {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 4px;
      }
      .phase[data-status="active"] {
        background: var(--vscode-list-hoverBackground);
      }
      .phase[data-status="done"] {
        opacity: 0.7;
      }
      .phase-icon { font-size: 16px; width: 24px; text-align: center; }
      .phase-name { font-weight: 600; font-size: 13px; }
      .phase-status { font-size: 11px; opacity: 0.7; }
    </style>`;

    const scriptContent = `
      const vscode = acquireVsCodeApi();
      let currentPhaseIdx = -1;
      let logsStarted = false;

      const phases = ${JSON.stringify(DEPLOY_PHASES)};

      function updatePhase(phaseName) {
        const idx = phases.findIndex(p => p.toLowerCase().includes(phaseName.toLowerCase()));
        if (idx === -1) return;

        // Mark previous phases as done
        for (let i = 0; i <= idx; i++) {
          const el = document.getElementById('phase-' + i);
          if (!el) continue;
          if (i < idx) {
            el.dataset.status = 'done';
            el.querySelector('.phase-icon').textContent = '✅';
            el.querySelector('.phase-status').textContent = 'Completed';
          } else {
            el.dataset.status = 'active';
            el.querySelector('.phase-icon').textContent = '🔄';
            el.querySelector('.phase-status').textContent = 'In progress...';
          }
        }
        currentPhaseIdx = idx;
      }

      function addLog(message, level, timestamp) {
        const logs = document.getElementById('logs');
        if (!logsStarted) {
          logs.innerHTML = '';
          logsStarted = true;
        }
        const ts = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        const color = level === 'error' ? 'var(--vscode-errorForeground)' :
                     level === 'warn' ? 'var(--vscode-editorWarning-foreground)' :
                     'inherit';
        logs.innerHTML += '<span style="color: ' + color + ';">[' + ts + '] ' + message + '</span>\\n';
        logs.scrollTop = logs.scrollHeight;
      }

      window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.type) {
          case 'statusUpdate':
            document.getElementById('progress-bar').style.width = (msg.progress || 0) + '%';
            document.getElementById('progress-text').textContent = (msg.progress || 0) + '%';
            document.getElementById('deploy-status').innerHTML = '<span class="badge badge-info">' + (msg.message || msg.status) + '</span>';
            if (msg.phase) updatePhase(msg.phase);
            break;

          case 'log':
            addLog(msg.message, msg.level, msg.timestamp);
            break;

          case 'complete':
            const isSuccess = msg.status === 'LIVE' || msg.status === 'completed' || msg.status === 'success';
            document.getElementById('progress-bar').style.width = '100%';
            document.getElementById('progress-text').textContent = '100%';
            
            // Mark all phases done
            for (let i = 0; i < phases.length; i++) {
              const el = document.getElementById('phase-' + i);
              if (el) {
                el.dataset.status = 'done';
                el.querySelector('.phase-icon').textContent = isSuccess ? '✅' : '❌';
                el.querySelector('.phase-status').textContent = isSuccess ? 'Completed' : 'Failed';
              }
            }

            const statusBadge = isSuccess ? 'badge-success' : 'badge-error';
            document.getElementById('deploy-status').innerHTML = '<span class="badge ' + statusBadge + '">' + (isSuccess ? 'Deployment Successful!' : 'Deployment Failed') + '</span>';

            const result = document.getElementById('result');
            result.style.display = 'block';
            if (isSuccess && msg.url) {
              result.style.background = 'rgba(26, 127, 55, 0.1)';
              result.style.border = '1px solid #1a7f37';
              result.innerHTML = '<h3 style="color: #1a7f37;">✅ Deployed Successfully!</h3><p><a href="' + msg.url + '" style="color: var(--trivx-brand);">' + msg.url + '</a></p>';
            } else if (!isSuccess) {
              result.style.background = 'rgba(207, 34, 46, 0.1)';
              result.style.border = '1px solid #cf222e';
              result.innerHTML = '<h3 style="color: #cf222e;">❌ Deployment Failed</h3><p>Check the logs above for details.</p>';
            }
            break;
        }
      });
    `;

    return getBaseHtml(this._panel.webview, this._extensionUri, 'Deployment Progress', bodyContent, scriptContent);
  }

  public dispose(): void {
    DeployProgressPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
