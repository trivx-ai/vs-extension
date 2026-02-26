import * as vscode from 'vscode';
import { getBaseHtml, getWebviewOptions } from './webview-utils';
import { AIService } from '../services/ai.service';

export class AIChatPanel {
  public static currentPanel: AIChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (AIChatPanel.currentPanel) {
      AIChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'trivxAIChat',
      'Trivx AI Chat',
      column || vscode.ViewColumn.Beside,
      getWebviewOptions(extensionUri)
    );

    AIChatPanel.currentPanel = new AIChatPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'sendMessage':
            await this._handleSendMessage(message.text, message.sessionId);
            break;
          case 'newSession':
            this._panel.webview.postMessage({ type: 'sessionCreated', sessionId: Date.now().toString() });
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private async _handleSendMessage(text: string, sessionId?: string): Promise<void> {
    const aiService = AIService.getInstance();

    // Post user message back for display
    this._panel.webview.postMessage({
      type: 'userMessage',
      text,
    });

    // Start streaming response
    this._panel.webview.postMessage({
      type: 'streamStart',
    });

    try {
      await aiService.streamMessage(text, sessionId, {
        onToken: (token: string) => {
          this._panel.webview.postMessage({
            type: 'streamToken',
            token,
          });
        },
        onComplete: (fullResponse: string) => {
          this._panel.webview.postMessage({
            type: 'streamEnd',
            fullResponse,
          });
        },
        onError: (error: Error) => {
          this._panel.webview.postMessage({
            type: 'streamError',
            error: error.message,
          });
        },
      });
    } catch (error: any) {
      this._panel.webview.postMessage({
        type: 'streamError',
        error: error.message,
      });
    }
  }

  private _update(): void {
    this._panel.title = 'Trivx AI Chat';
    this._panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'trivx-icon.svg');
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    const bodyContent = `
    <div id="chat-container" style="display: flex; flex-direction: column; height: calc(100vh - 32px);">
      <div id="chat-header" style="padding: 12px 0; border-bottom: 1px solid var(--vscode-panel-border); display: flex; align-items: center; gap: 8px;">
        <h2 style="margin: 0; flex: 1;">🤖 Trivx AI Assistant</h2>
        <button class="secondary" onclick="newSession()">New Chat</button>
      </div>

      <div id="messages" style="flex: 1; overflow-y: auto; padding: 16px 0; display: flex; flex-direction: column; gap: 12px;">
        <div class="message ai-message">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <p>Hello! I'm your Trivx AI DevOps assistant. I can help you with:</p>
            <ul>
              <li>Deployment configurations and troubleshooting</li>
              <li>CI/CD pipeline optimization</li>
              <li>Infrastructure and monitoring questions</li>
              <li>Code review and security analysis</li>
              <li>General DevOps best practices</li>
            </ul>
            <p>How can I help you today?</p>
          </div>
        </div>
      </div>

      <div id="input-area" style="padding: 12px 0; border-top: 1px solid var(--vscode-panel-border);">
        <div style="display: flex; gap: 8px;">
          <textarea
            id="message-input"
            placeholder="Ask Trivx AI anything..."
            rows="3"
            style="flex: 1; resize: vertical; min-height: 40px;"
            onkeydown="handleKeyDown(event)"
          ></textarea>
          <button onclick="sendMessage()" id="send-btn" style="align-self: flex-end;">Send</button>
        </div>
      </div>
    </div>
    <style>
      .message {
        display: flex;
        gap: 10px;
        animation: fadeIn 0.2s ease-in;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 18px;
      }
      .message-content {
        flex: 1;
        line-height: 1.5;
      }
      .message-content p { margin: 4px 0; }
      .message-content ul { margin: 4px 0; padding-left: 20px; }
      .message-content pre {
        background: var(--vscode-textCodeBlock-background);
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        font-family: var(--vscode-editor-font-family);
        font-size: var(--vscode-editor-font-size);
      }
      .message-content code {
        background: var(--vscode-textCodeBlock-background);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family);
      }
      .user-message .message-content {
        background: var(--vscode-input-background);
        padding: 8px 12px;
        border-radius: 8px;
      }
      .ai-message .message-content {
        padding: 8px 0;
      }
      .typing-indicator {
        display: inline-block;
      }
      .typing-indicator span {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--trivx-brand);
        margin: 0 2px;
        animation: bounce 1.4s infinite ease-in-out;
      }
      .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
      .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    </style>`;

    const scriptContent = `
      const vscode = acquireVsCodeApi();
      let currentSessionId = Date.now().toString();
      let currentAiMessage = null;
      let isStreaming = false;

      function sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        if (!text || isStreaming) return;
        
        input.value = '';
        input.style.height = 'auto';
        vscode.postMessage({ type: 'sendMessage', text, sessionId: currentSessionId });
      }

      function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }

      function newSession() {
        currentSessionId = Date.now().toString();
        const messages = document.getElementById('messages');
        messages.innerHTML = '<div class="message ai-message"><div class="message-avatar">🤖</div><div class="message-content"><p>New conversation started. How can I help?</p></div></div>';
      }

      function appendMessage(role, content) {
        const messages = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = 'message ' + (role === 'user' ? 'user-message' : 'ai-message');
        div.innerHTML = '<div class="message-avatar">' + (role === 'user' ? '👤' : '🤖') + '</div><div class="message-content">' + content + '</div>';
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Simple Markdown-to-HTML for AI responses
      function markdownToHtml(text) {
        return text
          .replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, '<pre><code class="language-$1">$2</code></pre>')
          .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
          .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
          .replace(/\\*([^*]+)\\*/g, '<em>$1</em>')
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/^- (.+)$/gm, '<li>$1</li>')
          .replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
          .replace(/\\n/g, '<br>');
      }

      window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.type) {
          case 'userMessage':
            appendMessage('user', '<p>' + escapeHtml(msg.text) + '</p>');
            break;
          
          case 'streamStart':
            isStreaming = true;
            document.getElementById('send-btn').disabled = true;
            currentAiMessage = appendMessage('ai', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
            break;
          
          case 'streamToken':
            if (currentAiMessage) {
              const content = currentAiMessage.querySelector('.message-content');
              if (content.querySelector('.typing-indicator')) {
                content.innerHTML = '';
              }
              content.innerHTML += escapeHtml(msg.token);
              const messages = document.getElementById('messages');
              messages.scrollTop = messages.scrollHeight;
            }
            break;
          
          case 'streamEnd':
            if (currentAiMessage) {
              const content = currentAiMessage.querySelector('.message-content');
              content.innerHTML = markdownToHtml(msg.fullResponse || content.textContent);
            }
            currentAiMessage = null;
            isStreaming = false;
            document.getElementById('send-btn').disabled = false;
            break;
          
          case 'streamError':
            if (currentAiMessage) {
              const content = currentAiMessage.querySelector('.message-content');
              content.innerHTML = '<p style="color: var(--vscode-errorForeground);">Error: ' + escapeHtml(msg.error) + '</p>';
            }
            currentAiMessage = null;
            isStreaming = false;
            document.getElementById('send-btn').disabled = false;
            break;
        }
      });
    `;

    return getBaseHtml(this._panel.webview, this._extensionUri, 'Trivx AI Chat', bodyContent, scriptContent);
  }

  public dispose(): void {
    AIChatPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
