import * as vscode from 'vscode';

export interface TrivxConfig {
  /** Base URL of the Trivx API Gateway. All HTTP + WebSocket traffic flows through here. */
  apiBaseUrl: string;
  /** @deprecated Socket.IO now routes through apiBaseUrl/api/v1/infra/socket.io. Kept for legacy overrides. */
  wsUrl: string;
  notificationWsUrl: string;
  autoDetectProject: boolean;
  showDeployNotifications: boolean;
  aiModel: string;
  logLevel: string;
}

export function getConfig(): TrivxConfig {
  const config = vscode.workspace.getConfiguration('trivx');
  const apiBaseUrl = config.get<string>('apiBaseUrl', 'http://localhost:3000');
  return {
    apiBaseUrl,
    // wsUrl is kept for manual overrides, but Socket.IO now goes through apiBaseUrl.
    wsUrl: config.get<string>('wsUrl', apiBaseUrl),
    notificationWsUrl: config.get<string>('notificationWsUrl', apiBaseUrl.replace(/^http/, 'ws')),
    autoDetectProject: config.get<boolean>('autoDetectProject', true),
    showDeployNotifications: config.get<boolean>('showDeployNotifications', true),
    aiModel: config.get<string>('aiModel', 'claude-sonnet'),
    logLevel: config.get<string>('logLevel', 'info'),
  };
}
