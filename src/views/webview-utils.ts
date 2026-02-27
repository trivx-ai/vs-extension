import * as vscode from 'vscode';

export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(extensionUri, 'media'),
      vscode.Uri.joinPath(extensionUri, 'dist'),
    ],
  };
}

export function getBaseHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  title: string,
  bodyContent: string,
  scriptContent?: string
): string {
  const nonce = getNonce();
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview.css'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
  <title>${title}</title>
  <link href="${styleUri}" rel="stylesheet">
  <style nonce="${nonce}">
    :root {
      --trivx-brand: var(--vscode-focusBorder);
      --trivx-brand-light: var(--vscode-textLink-foreground);
      --trivx-brand-dark: var(--vscode-textLink-activeForeground);
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 0;
      margin: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .container {
      padding: 0;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    h1, h2, h3 {
      color: var(--vscode-foreground);
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    button {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: 1px solid transparent;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-family: var(--vscode-font-family);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background-color 0.1s;
    }
    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    button.secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }
    input, textarea, select {
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 8px 10px;
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
      transition: border-color 0.1s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    /* Layout & Messaging (Copilot Theme) */
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .chat-header {
      padding: 12px 20px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .chat-header h2 {
      margin: 0;
      font-size: 14px;
      font-weight: normal;
    }
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .empty-state {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      margin-top: 40px;
    }
    .message {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 100%;
    }
    .message-role {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-editorInfo-foreground);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .message-role::before {
      content: '';
      display: inline-block;
      width: 16px;
      height: 16px;
      background-size: contain;
      background-repeat: no-repeat;
    }
    .message.user .message-role {
      color: var(--vscode-foreground);
    }
    .message-content {
      font-size: 13px;
      line-height: 1.6;
      word-wrap: break-word;
      color: var(--vscode-foreground);
    }
    .message-content p {
      margin: 0 0 8px 0;
    }
    .message-content p:last-child {
      margin-bottom: 0;
    }
    .message-content pre, .message-content code {
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      border-radius: 4px;
    }
    .message-content pre {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 12px;
      overflow-x: auto;
      border: 1px solid var(--vscode-panel-border);
    }
    .message-content code {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 2px 4px;
    }
    .chat-input-area {
      padding: 16px 20px;
      border-top: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
      background-color: var(--vscode-editor-background);
      position: relative;
    }
    .chat-input-area textarea {
      width: 100%;
      border-radius: 6px;
      padding: 10px 12px;
      min-height: 48px;
      max-height: 200px;
      background-color: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
    }
    .chat-input-area textarea:focus {
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder) inset;
    }
    .chat-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyContent}
  </div>
  ${scriptContent ? `<script nonce="${nonce}">${scriptContent}</script>` : ''}
</body>
</html>`;
}
