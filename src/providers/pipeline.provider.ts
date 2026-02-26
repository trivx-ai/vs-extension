import * as vscode from 'vscode';
import { WorkflowService, Workflow, PipelineRun } from '../services/workflow.service';
import { ProjectService } from '../services/project.service';
import { AuthService } from '../services/auth.service';

export class PipelineProvider implements vscode.TreeDataProvider<PipelineTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PipelineTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: PipelineTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: PipelineTreeItem): Promise<PipelineTreeItem[]> {
    const authService = AuthService.getInstance();
    if (!authService.isLoggedIn) { return []; }

    const projectId = ProjectService.getInstance().getCurrentProjectId();
    if (!projectId) {
      return [
        new PipelineTreeItem(
          'Select a project first',
          '',
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
      ];
    }

    const workflowService = WorkflowService.getInstance();

    if (!element) {
      const workflows = await workflowService.listWorkflows(projectId);

      if (workflows.length === 0) {
        return [
          new PipelineTreeItem(
            'No pipelines found',
            'Analyze your repository to generate pipelines',
            vscode.TreeItemCollapsibleState.None,
            'empty'
          ),
        ];
      }

      return workflows.map(w => new PipelineTreeItem(
        w.name,
        `${w.type} • ${w.status}`,
        vscode.TreeItemCollapsibleState.Collapsed,
        'workflow',
        undefined,
        w
      ));
    }

    // Workflow children: show recent runs
    if (element.contextValue === 'workflow' && element.workflow) {
      const runs = await workflowService.listPipelineRuns(projectId);
      const workflowRuns = runs.filter(r => r.workflowId === element.workflow!.id).slice(0, 5);

      const items: PipelineTreeItem[] = [
        new PipelineTreeItem(
          'Run Pipeline',
          '',
          vscode.TreeItemCollapsibleState.None,
          'run-action',
          {
            command: 'trivx.runPipeline',
            title: 'Run Pipeline',
          }
        ),
      ];

      if (workflowRuns.length > 0) {
        for (const run of workflowRuns) {
          const icon = this.getStatusIcon(run.status);
          items.push(new PipelineTreeItem(
            `${icon} ${run.branch || 'main'} - ${run.status}`,
            run.duration ? `${Math.round(run.duration / 1000)}s` : '',
            vscode.TreeItemCollapsibleState.None,
            'pipeline-run',
            undefined,
            undefined,
            run
          ));
        }
      }

      return items;
    }

    return [];
  }

  private getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed': return '✅';
      case 'running':
      case 'pending': return '🔄';
      case 'failed': return '❌';
      case 'cancelled': return '⏹️';
      default: return '⬜';
    }
  }
}

export class PipelineTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly desc: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly command?: vscode.Command,
    public readonly workflow?: Workflow,
    public readonly run?: PipelineRun
  ) {
    super(label, collapsibleState);
    this.description = desc;
    this.contextValue = contextValue;

    switch (contextValue) {
      case 'workflow':
        this.iconPath = new vscode.ThemeIcon('symbol-event');
        break;
      case 'run-action':
        this.iconPath = new vscode.ThemeIcon('play');
        break;
      case 'empty':
        this.iconPath = new vscode.ThemeIcon('symbol-event');
        break;
      case 'info':
        this.iconPath = new vscode.ThemeIcon('info');
        break;
    }
  }
}
