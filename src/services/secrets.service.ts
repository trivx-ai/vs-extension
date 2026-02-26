import { apiClient } from './api-client';
import { API_ROUTES } from '../constants';
import { logger } from '../utils/logger';

export interface EnvironmentGroup {
  id: string;
  projectId: string;
  name: string;
  environment?: string;
  description?: string;
  createdAt: string;
}

export interface Secret {
  id: string;
  groupId: string;
  projectId: string;
  key: string;
  version: number;
  createdBy: string;
  createdAt: string;
}

export class SecretsService {
  private static instance: SecretsService;

  private constructor() {}

  static initialize(): SecretsService {
    if (!SecretsService.instance) {
      SecretsService.instance = new SecretsService();
    }
    return SecretsService.instance;
  }

  static getInstance(): SecretsService {
    if (!SecretsService.instance) {
      throw new Error('SecretsService not initialized');
    }
    return SecretsService.instance;
  }

  async listEnvironmentGroups(projectId: string): Promise<EnvironmentGroup[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.ENV_GROUPS(projectId));
      return response.groups || response.environmentGroups || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list environment groups', error);
      return [];
    }
  }

  async createEnvironmentGroup(projectId: string, data: { name: string; environment?: string }): Promise<EnvironmentGroup | null> {
    try {
      const response = await apiClient.post<any>(API_ROUTES.ENV_GROUPS(projectId), data);
      return response.group || response.data || response;
    } catch (error) {
      logger.error('Failed to create environment group', error);
      return null;
    }
  }

  async listSecrets(projectId: string, groupId: string): Promise<Secret[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.SECRETS(projectId, groupId));
      return response.secrets || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list secrets', error);
      return [];
    }
  }

  async createSecrets(projectId: string, groupId: string, secrets: Array<{ key: string; value: string }>): Promise<boolean> {
    try {
      await apiClient.post(API_ROUTES.SECRETS(projectId, groupId), { secrets });
      logger.info(`Created ${secrets.length} secrets for project ${projectId}`);
      return true;
    } catch (error) {
      logger.error('Failed to create secrets', error);
      return false;
    }
  }
}
