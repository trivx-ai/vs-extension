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
  <style nonce="${nonce}">
    :root {
      --trivx-brand: #F2613F;
      --trivx-brand-light: #FF7F5F;
      --trivx-brand-dark: #D94C2B;
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 0;
      margin: 0;
    }
    .container {
      padding: 16px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1, h2, h3 {
      color: var(--vscode-foreground);
      font-weight: 600;
    }
    button {
      background-color: var(--trivx-brand);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-family: var(--vscode-font-family);
    }
    button:hover {
      background-color: var(--trivx-brand-light);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    button.secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    input, textarea, select {
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 8px;
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
    }
    input:focus, textarea:focus {
      outline: 1px solid var(--trivx-brand);
      border-color: var(--trivx-brand);
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success { background: #1a7f37; color: white; }
    .badge-warning { background: #9a6700; color: white; }
    .badge-error { background: #cf222e; color: white; }
    .badge-info { background: #0969da; color: white; }
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
