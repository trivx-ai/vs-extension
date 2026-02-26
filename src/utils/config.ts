import * as vscode from 'vscode';

export interface TrivxConfig {
  apiBaseUrl: string;
  wsUrl: string;
  notificationWsUrl: string;
  autoDetectProject: boolean;
  showDeployNotifications: boolean;
  aiModel: string;
  logLevel: string;
}

export function getConfig(): TrivxConfig {
  const config = vscode.workspace.getConfiguration('trivx');
  return {
    apiBaseUrl: config.get<string>('apiBaseUrl', 'http://localhost:3000'),
    wsUrl: config.get<string>('wsUrl', 'http://localhost:4006'),
    notificationWsUrl: config.get<string>('notificationWsUrl', 'ws://localhost:3005'),
    autoDetectProject: config.get<boolean>('autoDetectProject', true),
    showDeployNotifications: config.get<boolean>('showDeployNotifications', true),
    aiModel: config.get<string>('aiModel', 'claude-sonnet'),
    logLevel: config.get<string>('logLevel', 'info'),
  };
}
