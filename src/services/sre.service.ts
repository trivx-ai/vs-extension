import { apiClient } from './api-client';
import { API_ROUTES } from '../constants';
import { logger } from '../utils/logger';

export interface Incident {
  id: string;
  projectId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  summary: string;
  details?: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface LogEntry {
  id: string;
  projectId: string;
  source: string;
  level: string;
  message: string;
  metadata?: any;
  timestamp: string;
}

export interface MetricSample {
  metricName: string;
  value: number;
  unit: string;
  labels?: Record<string, string>;
  timestamp: string;
}

export class SREService {
  private static instance: SREService;

  private constructor() {}

  static initialize(): SREService {
    if (!SREService.instance) {
      SREService.instance = new SREService();
    }
    return SREService.instance;
  }

  static getInstance(): SREService {
    if (!SREService.instance) {
      throw new Error('SREService not initialized');
    }
    return SREService.instance;
  }

  async listIncidents(params?: { orgId?: string; projectId?: string; status?: string }): Promise<Incident[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.SRE_INCIDENTS, params);
      return response.incidents || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list incidents', error);
      return [];
    }
  }

  async queryLogs(params?: { projectId?: string; level?: string; limit?: number }): Promise<LogEntry[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.SRE_LOGS, params);
      return response.logs || response.data || response || [];
    } catch (error) {
      logger.error('Failed to query logs', error);
      return [];
    }
  }

  async queryMetrics(params?: { projectId?: string; metricName?: string }): Promise<MetricSample[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.SRE_METRICS, params);
      return response.metrics || response.data || response || [];
    } catch (error) {
      logger.error('Failed to query metrics', error);
      return [];
    }
  }

  async getDashboard(orgId: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.SRE_DASHBOARD, { orgId });
      return response.dashboard || response.data || response;
    } catch (error) {
      logger.error('Failed to get SRE dashboard', error);
      return null;
    }
  }
}
