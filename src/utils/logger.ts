import * as vscode from 'vscode';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private outputChannel: vscode.OutputChannel;
  private minLevel: number = LOG_LEVELS.info;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Trivx AI');
  }

  setLevel(level: LogLevel): void {
    this.minLevel = LOG_LEVELS[level];
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (LOG_LEVELS[level] < this.minLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const formattedArgs = args.length > 0 ? ' ' + args.map(a => {
      if (a instanceof Error) { return a.message; }
      if (typeof a === 'object') { return JSON.stringify(a); }
      return String(a);
    }).join(' ') : '';

    this.outputChannel.appendLine(`${prefix} ${message}${formattedArgs}`);
  }
}

export const logger = new Logger();
