import { apiClient } from './api-client';
import { API_ROUTES } from '../constants';
import { logger } from '../utils/logger';

export interface BillingAccount {
  id: string;
  organizationId: string;
  currentPlan: string;
  status: string;
  billingCycle: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

export interface UsageSummary {
  deployments: { used: number; limit: number };
  buildMinutes: { used: number; limit: number };
  storage: { used: number; limit: number };
  projects: { used: number; limit: number };
  members: { used: number; limit: number };
}

export class BillingService {
  private static instance: BillingService;

  private constructor() { }

  static initialize(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService();
    }
    return BillingService.instance;
  }

  static getInstance(): BillingService {
    if (!BillingService.instance) {
      throw new Error('BillingService not initialized');
    }
    return BillingService.instance;
  }

  async getBillingAccount(orgId: string): Promise<BillingAccount | null> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.BILLING_ACCOUNT(orgId));
      return response.account || response.billingAccount || response.data || response;
    } catch (error) {
      logger.error('Failed to get billing account', error);
      return null;
    }
  }

  async getUsageSummary(orgId: string): Promise<UsageSummary | null> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.BILLING_USAGE(orgId));
      return response.usage || response.summary || response.data || response;
    } catch (error) {
      logger.error('Failed to get usage summary', error);
      return null;
    }
  }
}
