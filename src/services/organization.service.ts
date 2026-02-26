import * as vscode from 'vscode';
import { apiClient } from './api-client';
import { API_ROUTES, STATE_KEYS, CONTEXT_KEYS } from '../constants';
import { logger } from '../utils/logger';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string;
  companySize: string;
  description?: string;
  adminName: string;
  adminEmail: string;
  primaryRegion: string;
  deploymentType: string;
  ownerId: string;
  plan: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  organizationId: string;
  userId?: string;
  email: string;
  role: 'DEVELOPER' | 'ADMIN' | 'VIEWER';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  invitedBy?: string;
  createdAt: string;
}

export class OrganizationService {
  private static instance: OrganizationService;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  static initialize(context: vscode.ExtensionContext): OrganizationService {
    if (!OrganizationService.instance) {
      OrganizationService.instance = new OrganizationService(context);
    }
    return OrganizationService.instance;
  }

  static getInstance(): OrganizationService {
    if (!OrganizationService.instance) {
      throw new Error('OrganizationService not initialized');
    }
    return OrganizationService.instance;
  }

  getCurrentOrgId(): string | undefined {
    return this.context.globalState.get<string>(STATE_KEYS.CURRENT_ORG_ID);
  }

  getCurrentOrgSlug(): string | undefined {
    return this.context.globalState.get<string>(STATE_KEYS.CURRENT_ORG_SLUG);
  }

  async setCurrentOrg(org: Organization): Promise<void> {
    await this.context.globalState.update(STATE_KEYS.CURRENT_ORG_ID, org.id);
    await this.context.globalState.update(STATE_KEYS.CURRENT_ORG_SLUG, org.slug);
    await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.HAS_ORGANIZATION, true);
    logger.info(`Switched to organization: ${org.name}`);
  }

  async listOrganizations(userId: string): Promise<Organization[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.ORG_LIST(userId));
      return response.organizations || response.data || response || [];
    } catch (error) {
      logger.error('Failed to list organizations', error);
      return [];
    }
  }

  async getOrganization(id: string): Promise<Organization | null> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.ORG_GET(id));
      return response.organization || response.data || response;
    } catch (error) {
      logger.error('Failed to get organization', error);
      return null;
    }
  }

  async getMembers(orgId: string): Promise<Member[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.ORG_MEMBERS(orgId));
      return response.members || response.data || response || [];
    } catch (error) {
      logger.error('Failed to get members', error);
      return [];
    }
  }

  async inviteMember(orgId: string, email: string, role: string): Promise<boolean> {
    try {
      await apiClient.post(API_ROUTES.ORG_INVITE(orgId), { email, role });
      logger.info(`Invited ${email} as ${role} to org ${orgId}`);
      return true;
    } catch (error) {
      logger.error('Failed to invite member', error);
      return false;
    }
  }

  async createOrganization(data: {
    name: string;
    slug?: string;
    industry: string;
    companySize: string;
    adminName: string;
    adminEmail: string;
    primaryRegion: string;
    deploymentType: string;
    ownerId: string;
  }): Promise<Organization | null> {
    try {
      const response = await apiClient.post<any>(API_ROUTES.ORG_CREATE, data);
      const org = response.organization || response.data || response;
      await this.setCurrentOrg(org);
      return org;
    } catch (error) {
      logger.error('Failed to create organization', error);
      return null;
    }
  }
}
