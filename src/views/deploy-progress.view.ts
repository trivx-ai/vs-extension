import * as vscode from 'vscode';
import { DeployService, DeploymentStatus, DeploymentLog } from '../services/deploy.service';
import { getBaseHtml, getWebviewOptions } from './webview-utils';
import { DEPLOY_PHASES } from '../constants';

export class DeployProgressPanel {
  public static currentPanel: DeployProgressPanel | undefined;
  private static readonly viewType = 'trivxDeployProgress';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _logs: string[] = [];
  private _currentPhase: string = '';
  private _currentPercent: number = 0;
  private _completed: boolean = false;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    const deployService = DeployService.getInstance();

    this._disposables.push(
      deployService.onDeploymentStatus((status: DeploymentStatus) => {
        this._currentPhase = status.phase;
        this._currentPercent = status.percent;
        this._panel.webview.postMessage({
          type: 'status',
          phase: status.phase,
          percent: status.percent,
          message: status.message,
        });
      }),

      deployService.onDeploymentLog((log: DeploymentLog) => {
        this._logs.push(`[${log.level}] ${log.message}`);
        this._panel.webview.postMessage({
          type: 'log',
          message: log.message,
          level: log.level,
        });
      }),

      deployService.onDeploymentComplete((result) => {
        this._completed = true;
        this._panel.webview.postMessage({
          type: 'complete',
          success: result.success,
          url: result.url,
          error: result.error,
        });
      })
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DeployProgressPanel.currentPanel) {
      DeployProgressPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      DeployProgressPanel.viewType,
      'Trivx Deploy',
      column || vscode.ViewColumn.Two,
      getWebviewOptions(extensionUri)
    );

    DeployProgressPanel.currentPanel = new DeployProgressPanel(panel, extensionUri);
  }

  public dispose(): void {
    DeployProgressPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }

  private _update(): void {
    const webview = this._panel.webview;

    const phasesHtml = DEPLOY_PHASES.map((phase, idx) => {
      const phaseIdx = DEPLOY_PHASES.indexOf(this._currentPhase as any);
      let cls = 'phase-pending';
      if (idx < phaseIdx) { cls = 'phase-done'; }
      else if (idx === phaseIdx) { cls = 'phase-active'; }
      return `<div class="phase ${cls}">
        <span class="phase-icon">${cls === 'phase-done' ? '✅' : cls === 'phase-active' ? '🔄' : '⬜'}</span>
        <span class="phase-name">${phase}</span>
      </div>`;
    }).join('');

    const bodyContent = `
      <div class="container deploy-container">
        <h2>🚀 Deployment Progress</h2>
        <div class="progress-bar-container">
          <div class="progress-bar" id="progressBar" style="width: ${this._currentPercent}%"></div>
        </div>
        <div class="progress-text" id="progressText">${this._currentPercent}%</div>

        <div class="phases" id="phases">${phasesHtml}</div>

        <div class="logs-section">
          <h3>Logs</h3>
          <div class="logs-output" id="logs">${this._logs.map(l => `<div class="log-line">${this._escapeHtml(l)}</div>`).join('')}</div>
        </div>

        <div id="result" style="display:none;"></div>
      </div>
    `;

    const scriptContent = `
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      const logsDiv = document.getElementById('logs');
      const resultDiv = document.getElementById('result');

      window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.type) {
          case 'status':
            progressBar.style.width = msg.percent + '%';
            progressText.textContent = msg.percent + '% - ' + msg.phase;
            break;
          case 'log': {
            const line = document.createElement('div');
            line.className = 'log-line log-' + msg.level;
            line.textContent = '[' + msg.level + '] ' + msg.message;
            logsDiv.appendChild(line);
            logsDiv.scrollTop = logsDiv.scrollHeight;
            break;
          }
          case 'complete':
            resultDiv.style.display = 'block';
            if (msg.success) {
              progressBar.style.width = '100%';
              progressText.textContent = '100% - Complete!';
              resultDiv.innerHTML = '<div class="success-banner">✅ Deployment Successful!' +
                (msg.url ? '<br><a href="' + msg.url + '">🌐 ' + msg.url + '</a>' : '') +
                '</div>';
            } else {
              resultDiv.innerHTML = '<div class="error-banner">❌ Deployment Failed' +
                (msg.error ? '<br>' + msg.error : '') +
                '</div>';
            }
            break;
        }
      });
    `;

    this._panel.webview.html = getBaseHtml(
      webview,
      this._extensionUri,
      'Trivx Deploy Progress',
      bodyContent,
      scriptContent
    );
  }

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
