import * as vscode from 'vscode';
import { apiClient } from './api-client';
import { API_ROUTES, STATE_KEYS, CONTEXT_KEYS } from '../constants';
import { logger } from '../utils/logger';

export interface Project {
  id: string;
  name: string;
  organizationId: string;
  repositoryId?: string;
  repositoryName?: string;
  repositoryFullName?: string;
  githubInstallationId?: string;
  githubUrl?: string;
  defaultBranch?: string;
  isPrivate?: boolean;
  framework?: string;
  language?: string;
  hasTests?: boolean;
  hasCi?: boolean;
  hasDocker?: boolean;
  buildCommand?: string;
  startCommand?: string;
  deploymentType?: string;
  analysisStatus?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GitHubInstallation {
  id: string;
  installationId: string;
  accountLogin: string;
  accountType: string;
  isActive: boolean;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
}

export class ProjectService {
  private static instance: ProjectService;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  static initialize(context: vscode.ExtensionContext): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService(context);
    }
    return ProjectService.instance;
  }

  static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      throw new Error('ProjectService not initialized');
    }
    return ProjectService.instance;
  }

  getCurrentProjectId(): string | undefined {
    return this.context.globalState.get<string>(STATE_KEYS.CURRENT_PROJECT_ID);
  }

  async setCurrentProject(projectId: string): Promise<void> {
    await this.context.globalState.update(STATE_KEYS.CURRENT_PROJECT_ID, projectId);
    await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.HAS_PROJECT, true);
  }

  async listProjects(orgId: string): Promise<Project[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.PROJECT_LIST_ORG(orgId));
      return response.projects || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list projects', error);
      return [];
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.PROJECT_GET(id));
      return response.project || response.data || response;
    } catch (error) {
      logger.error('Failed to get project', error);
      return null;
    }
  }

  async createProject(data: { name: string; organizationId: string }): Promise<Project | null> {
    try {
      const response = await apiClient.post<any>(API_ROUTES.PROJECT_CREATE, data);
      const project = response.project || response.data || response;
      logger.info(`Created project: ${project.name}`);
      return project;
    } catch (error) {
      logger.error('Failed to create project', error);
      return null;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      await apiClient.delete(API_ROUTES.PROJECT_DELETE(id));
      logger.info(`Deleted project: ${id}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete project', error);
      return false;
    }
  }

  async linkRepository(projectId: string, data: {
    installationId: string;
    repositoryId: number;
    repositoryName: string;
    repositoryFullName: string;
    githubUrl: string;
    defaultBranch: string;
    isPrivate: boolean;
  }): Promise<boolean> {
    try {
      await apiClient.post(API_ROUTES.PROJECT_LINK_REPO(projectId), data);
      logger.info(`Linked repository to project: ${projectId}`);
      return true;
    } catch (error) {
      logger.error('Failed to link repository', error);
      return false;
    }
  }

  async listInstallations(userId: string): Promise<GitHubInstallation[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.GITHUB_INSTALLATIONS, { userId });
      return response.installations || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list GitHub installations', error);
      return [];
    }
  }

  async listRepos(installationId: string): Promise<GitHubRepository[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.GITHUB_REPOS(installationId));
      return response.repositories || response.repos || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list repos', error);
      return [];
    }
  }

  async deployProject(projectId: string, data: {
    userId: string;
    organizationId: string;
    branch?: string;
    environment?: string;
  }): Promise<string | null> {
    try {
      const response = await apiClient.post<any>(API_ROUTES.PROJECT_DEPLOY(projectId), data);
      const executionId = response.executionId || response.deploymentId || response.id;
      logger.info(`Deploy triggered for project ${projectId}: ${executionId}`);
      return executionId;
    } catch (error) {
      logger.error('Failed to deploy project', error);
      return null;
    }
  }

  async analyzeRepository(projectId: string): Promise<boolean> {
    try {
      await apiClient.post(API_ROUTES.PROJECT_ANALYZE(projectId));
      logger.info(`Analysis triggered for project: ${projectId}`);
      return true;
    } catch (error) {
      logger.error('Failed to analyze repository', error);
      return false;
    }
  }
}
