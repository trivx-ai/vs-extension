import * as vscode from 'vscode';
import { AIService, StreamCallbacks, ChatMessage } from '../services/ai.service';
import { AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';
import { ProjectService } from '../services/project.service';
import { getBaseHtml, getWebviewOptions } from './webview-utils';
import { CONTEXT_KEYS } from '../constants';

export class AIChatPanel {
  public static currentPanel: AIChatPanel | undefined;
  private static readonly viewType = 'trivxAIChat';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _messages: ChatMessage[] = [];
  private _sessionId: string | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.onDidChangeViewState(() => {
      if (this._panel.visible) {
        this._update();
      }
    }, null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'sendMessage':
            await this._handleSendMessage(message.text);
            break;
          case 'cancelStream':
            AIService.getInstance().cancelStream();
            break;
          case 'clear':
            this._messages = [];
            this._sessionId = undefined;
            this._update();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (AIChatPanel.currentPanel) {
      AIChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      AIChatPanel.viewType,
      'Trivx AI Chat',
      column || vscode.ViewColumn.Beside,
      getWebviewOptions(extensionUri)
    );

    AIChatPanel.currentPanel = new AIChatPanel(panel, extensionUri);
    vscode.commands.executeCommand('setContext', CONTEXT_KEYS.AI_CHAT_OPEN, true);
  }

  public dispose(): void {
    AIChatPanel.currentPanel = undefined;
    vscode.commands.executeCommand('setContext', CONTEXT_KEYS.AI_CHAT_OPEN, false);

    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }

  private async _handleSendMessage(text: string): Promise<void> {
    const authService = AuthService.getInstance();
    const user = authService.currentUser;
    if (!user) {
      this._panel.webview.postMessage({
        type: 'error',
        message: 'Please login first.',
      });
      return;
    }

    const orgId = OrganizationService.getInstance().getCurrentOrgId() || '';
    const projectId = ProjectService.getInstance().getCurrentProjectId();

    // Add user message
    this._messages.push({ role: 'user', content: text });
    this._panel.webview.postMessage({
      type: 'userMessage',
      content: text,
    });

    // Start streaming
    this._panel.webview.postMessage({ type: 'streamStart' });

    const aiService = AIService.getInstance();
    let fullResponse = '';

    try {
      await aiService.streamMessage(
        {
          message: text,
          userId: user.id,
          organizationId: orgId,
          projectId,
          sessionId: this._sessionId,
        },
        {
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            this._panel.webview.postMessage({
              type: 'streamChunk',
              content: chunk,
            });
          },
          onIntent: (intent: string) => {
            this._panel.webview.postMessage({
              type: 'intent',
              content: intent,
            });
          },
          onDone: () => {
            this._messages.push({ role: 'assistant', content: fullResponse });
            this._panel.webview.postMessage({ type: 'streamEnd' });
          },
          onError: (error: string) => {
            this._panel.webview.postMessage({
              type: 'error',
              message: error,
            });
          },
        }
      );
    } catch (error: any) {
      this._panel.webview.postMessage({
        type: 'error',
        message: error.message || 'AI request failed',
      });
    }
  }

  private _update(): void {
    const webview = this._panel.webview;
    const messagesHtml = this._messages
      .map(
        (m) =>
          `<div class="message ${m.role}">
            <div class="message-role">${m.role === 'user' ? '👤 You' : '✨ Trivx AI'}</div>
            <div class="message-content">${this._escapeHtml(m.content)}</div>
          </div>`
      )
      .join('');

    const bodyContent = `
      <div class="container chat-container">
        <div class="chat-header">
          <h2>✨ Trivx AI Chat</h2>
          <button class="secondary" title="Clear Chat" onclick="clearChat()">
            <span style="font-size: 16px;">↺</span> Clear
          </button>
        </div>
        <div id="messages" class="messages-area">
          ${messagesHtml || '<div class="empty-state">Ask me anything about your project, deployments, or DevOps!</div>'}
          <div id="streaming" style="display:none;">
            <div class="message assistant">
              <div class="message-role">✨ Trivx AI</div>
              <div class="message-content" id="streamContent"></div>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <textarea id="messageInput" placeholder="Ask Trivx AI..." rows="1"></textarea>
          <div class="chat-actions">
            <button id="cancelBtn" class="secondary" style="display:none;" onclick="cancelStream()">Cancel</button>
            <button id="sendBtn" onclick="sendMessage()">Send</button>
          </div>
        </div>
      </div>
    `;

    const scriptContent = `
      const vscode = acquireVsCodeApi();
      const messagesDiv = document.getElementById('messages');
      const streamingDiv = document.getElementById('streaming');
      const streamContent = document.getElementById('streamContent');
      const messageInput = document.getElementById('messageInput');
      const sendBtn = document.getElementById('sendBtn');
      const cancelBtn = document.getElementById('cancelBtn');

      function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        vscode.postMessage({ command: 'sendMessage', text });
        messageInput.value = '';
        messageInput.style.height = 'auto';
      }

      function cancelStream() {
        vscode.postMessage({ command: 'cancelStream' });
      }

      function clearChat() {
        vscode.postMessage({ command: 'clear' });
      }

      messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
          sendBtn.style.opacity = '1';
        } else {
          sendBtn.style.opacity = '0.7';
        }
      });

      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.type) {
          case 'userMessage': {
            const div = document.createElement('div');
            div.className = 'message user';
            div.innerHTML = '<div class="message-role">👤 You</div><div class="message-content">' + escapeHtml(msg.content) + '</div>';
            messagesDiv.insertBefore(div, streamingDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            break;
          }
          case 'streamStart':
            streamContent.textContent = '';
            streamingDiv.style.display = 'block';
            sendBtn.style.display = 'none';
            cancelBtn.style.display = 'flex';
            break;
          case 'streamChunk':
            streamContent.textContent += msg.content;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            break;
          case 'streamEnd': {
            streamingDiv.style.display = 'none';
            const div = document.createElement('div');
            div.className = 'message assistant';
            div.innerHTML = '<div class="message-role">✨ Trivx AI</div><div class="message-content">' + escapeHtml(streamContent.textContent) + '</div>';
            messagesDiv.insertBefore(div, streamingDiv);
            sendBtn.style.display = 'flex';
            cancelBtn.style.display = 'none';
            break;
          }
          case 'intent':
            break;
          case 'error': {
            const div = document.createElement('div');
            div.className = 'message error';
            div.textContent = 'Error: ' + msg.message;
            messagesDiv.insertBefore(div, streamingDiv);
            streamingDiv.style.display = 'none';
            sendBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'none';
            break;
          }
        }
      });

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
    `;

    this._panel.webview.html = getBaseHtml(
      webview,
      this._extensionUri,
      'Trivx AI Chat',
      bodyContent,
      scriptContent
    );
  }

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
