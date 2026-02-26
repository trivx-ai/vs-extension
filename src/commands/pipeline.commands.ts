import * as vscode from 'vscode';
import { WorkflowService } from '../services/workflow.service';
import { ProjectService } from '../services/project.service';
import { COMMANDS } from '../constants';

export function registerPipelineCommands(
  context: vscode.ExtensionContext,
  refreshCallback: () => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.RUN_PIPELINE, async () => {
      const projectId = ProjectService.getInstance().getCurrentProjectId();
      if (!projectId) {
        vscode.window.showWarningMessage('Please select a project first.');
        return;
      }

      const workflowService = WorkflowService.getInstance();
      const workflows = await workflowService.listWorkflows(projectId);

      if (workflows.length === 0) {
        vscode.window.showWarningMessage('No pipelines found for this project.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        workflows.map(w => ({
          label: `$(symbol-event) ${w.name}`,
          description: w.type,
          detail: w.status,
          workflowId: w.id,
        })),
        { placeHolder: 'Select pipeline to run' }
      );
      if (!selected) { return; }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Triggering pipeline...',
            cancellable: false,
          },
          async () => {
            await workflowService.triggerRun(selected.workflowId);
          }
        );

        vscode.window.showInformationMessage('Pipeline triggered successfully!');
        refreshCallback();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to trigger pipeline: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.VIEW_PIPELINE, async () => {
      const projectId = ProjectService.getInstance().getCurrentProjectId();
      if (!projectId) {
        vscode.window.showWarningMessage('Please select a project first.');
        return;
      }

      const workflowService = WorkflowService.getInstance();
      const runs = await workflowService.listPipelineRuns(projectId);

      if (runs.length === 0) {
        vscode.window.showInformationMessage('No pipeline runs found.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        runs.map(r => ({
          label: `${r.status === 'success' ? '✅' : r.status === 'failed' ? '❌' : '🔄'} Run #${r.id.slice(0, 8)}`,
          description: `${r.branch || 'main'} • ${r.status}`,
          detail: r.duration ? `Duration: ${Math.round(r.duration / 1000)}s` : 'In progress...',
          runId: r.id,
        })),
        { placeHolder: 'Select pipeline run to view' }
      );

      if (!selected) { return; }

      const outputChannel = vscode.window.createOutputChannel('Trivx Pipeline');
      outputChannel.show(true);
      outputChannel.appendLine(`Pipeline Run: ${selected.runId}`);
      outputChannel.appendLine(`Status: ${selected.description}`);
      outputChannel.appendLine(`---`);

      try {
        const logs = await workflowService.getPipelineLogs(selected.runId);
        if (logs) {
          outputChannel.appendLine(logs);
        } else {
          outputChannel.appendLine('No logs available.');
        }
      } catch (error: any) {
        outputChannel.appendLine(`Error loading logs: ${error.message}`);
      }
    })
  );
}
