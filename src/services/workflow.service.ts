import { apiClient } from './api-client';
import { API_ROUTES } from '../constants';
import { logger } from '../utils/logger';

export interface Workflow {
  id: string;
  projectId: string;
  name: string;
  type: string;
  status: string;
  yamlContent?: string;
  runnerType?: string;
  createdAt: string;
}

export interface PipelineRun {
  id: string;
  workflowId: string;
  projectId: string;
  status: string;
  branch?: string;
  commit?: string;
  duration?: number;
  triggeredBy?: string;
  errorMessage?: string;
  createdAt: string;
}

export class WorkflowService {
  private static instance: WorkflowService;

  private constructor() { }

  static initialize(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      throw new Error('WorkflowService not initialized');
    }
    return WorkflowService.instance;
  }

  async listWorkflows(projectId: string): Promise<Workflow[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.WORKFLOW_LIST(projectId));
      return response.workflows || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list workflows', error);
      return [];
    }
  }

  async triggerRun(workflowId: string): Promise<PipelineRun | null> {
    try {
      const response = await apiClient.post<any>(API_ROUTES.WORKFLOW_RUN(workflowId));
      return response.run || response.pipeline || response.data || response;
    } catch (error) {
      logger.error('Failed to trigger pipeline run', error);
      return null;
    }
  }

  async listPipelineRuns(projectId: string): Promise<PipelineRun[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.PIPELINE_LIST(projectId));
      return response.runs || response.pipelines || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list pipeline runs', error);
      return [];
    }
  }

  async getPipelineLogs(pipelineId: string): Promise<string> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.PIPELINE_LOGS(pipelineId));
      return response.logs || response.data || '';
    } catch (error) {
      logger.error('Failed to get pipeline logs', error);
      return '';
    }
  }

  async cancelPipeline(pipelineId: string): Promise<boolean> {
    try {
      await apiClient.post(API_ROUTES.PIPELINE_CANCEL(pipelineId));
      logger.info(`Cancelled pipeline: ${pipelineId}`);
      return true;
    } catch (error) {
      logger.error('Failed to cancel pipeline', error);
      return false;
    }
  }
}
