import * as vscode from 'vscode';
import { SREService } from '../services/sre.service';
import { OrganizationService } from '../services/organization.service';
import { ProjectService } from '../services/project.service';
import { COMMANDS } from '../constants';

export function registerMonitoringCommands(
  context: vscode.ExtensionContext,
  refreshCallback: () => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.VIEW_LOGS, async () => {
      const projectId = ProjectService.getInstance().getCurrentProjectId();

      const sreService = SREService.getInstance();
      const outputChannel = vscode.window.createOutputChannel('Trivx Logs');
      outputChannel.show(true);

      const level = await vscode.window.showQuickPick(
        ['all', 'error', 'warn', 'info', 'debug'],
        { placeHolder: 'Filter by log level' }
      );

      try {
        const logs = await sreService.queryLogs({
          projectId,
          level: level === 'all' ? undefined : level,
          limit: 100,
        });

        if (logs.length === 0) {
          outputChannel.appendLine('No logs found.');
          return;
        }

        for (const log of logs) {
          const ts = new Date(log.timestamp).toISOString();
          outputChannel.appendLine(`[${ts}] [${log.level.toUpperCase()}] ${log.source || ''}: ${log.message}`);
        }
      } catch (error: any) {
        outputChannel.appendLine(`Error loading logs: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.VIEW_METRICS, async () => {
      const projectId = ProjectService.getInstance().getCurrentProjectId();

      const sreService = SREService.getInstance();

      const metric = await vscode.window.showQuickPick(
        [
          { label: '$(dashboard) CPU Usage', value: 'cpu_usage' },
          { label: '$(database) Memory Usage', value: 'memory_usage' },
          { label: '$(globe) Request Rate', value: 'request_rate' },
          { label: '$(warning) Error Rate', value: 'error_rate' },
          { label: '$(clock) Response Time', value: 'response_time' },
        ],
        { placeHolder: 'Select metric to view' }
      );
      if (!metric) { return; }

      try {
        const samples = await sreService.queryMetrics({
          projectId,
          metricName: metric.value,
        });

        const outputChannel = vscode.window.createOutputChannel('Trivx Metrics');
        outputChannel.show(true);
        outputChannel.appendLine(`=== ${metric.label.replace(/\$\([^)]+\)\s*/, '')} ===\n`);

        if (samples.length === 0) {
          outputChannel.appendLine('No data available.');
          return;
        }

        for (const sample of samples) {
          const ts = new Date(sample.timestamp).toLocaleTimeString();
          const bar = '█'.repeat(Math.min(50, Math.round(sample.value)));
          outputChannel.appendLine(`${ts} | ${bar} ${sample.value.toFixed(2)}${sample.unit || ''}`);
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load metrics: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_DASHBOARD, async () => {
      const orgId = OrganizationService.getInstance().getCurrentOrgId();
      if (!orgId) {
        vscode.window.showWarningMessage('Please select an organization first.');
        return;
      }

      try {
        const sreService = SREService.getInstance();
        const dashboard = await sreService.getDashboard(orgId);

        const outputChannel = vscode.window.createOutputChannel('Trivx Dashboard');
        outputChannel.show(true);
        outputChannel.appendLine('========================================');
        outputChannel.appendLine('         TRIVX SRE DASHBOARD            ');
        outputChannel.appendLine('========================================\n');

        if (dashboard && dashboard.overview) {
          outputChannel.appendLine('Overview');
          outputChannel.appendLine(`   Total Services:  ${dashboard.overview.totalServices || '-'}`);
          outputChannel.appendLine(`   Healthy:         ${dashboard.overview.healthy || '-'}`);
          outputChannel.appendLine(`   Degraded:        ${dashboard.overview.degraded || '-'}`);
          outputChannel.appendLine(`   Down:            ${dashboard.overview.down || '-'}`);
          outputChannel.appendLine('');
        }

        if (dashboard && dashboard.incidents) {
          outputChannel.appendLine(`Open Incidents: ${dashboard.incidents.open || 0}`);
          outputChannel.appendLine(`   Investigating:   ${dashboard.incidents.investigating || 0}`);
          outputChannel.appendLine(`   Resolved (24h):  ${dashboard.incidents.resolvedLast24h || 0}`);
          outputChannel.appendLine('');
        }

        if (dashboard && dashboard.uptime) {
          outputChannel.appendLine(`Uptime (30d): ${dashboard.uptime.percent || '-'}%`);
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load dashboard: ${error.message}`);
      }
    })
  );
}
