// ─── Constants & Config Keys ─────────────────────────────────────────────────

export const EXTENSION_ID = 'trivx.trivx-ai';
export const EXTENSION_NAME = 'Trivx AI';

// ─── Secret Storage Keys ────────────────────────────────────────────────────

export const SECRET_KEYS = {
  AUTH_TOKEN: 'trivx.authToken',
  REFRESH_TOKEN: 'trivx.refreshToken',
  USER_ID: 'trivx.userId',
  CLERK_SESSION: 'trivx.clerkSessionId',
} as const;

// ─── Global State Keys ─────────────────────────────────────────────────────

export const STATE_KEYS = {
  CURRENT_ORG_ID: 'trivx.currentOrgId',
  CURRENT_ORG_SLUG: 'trivx.currentOrgSlug',
  CURRENT_PROJECT_ID: 'trivx.currentProjectId',
  LAST_DEPLOYMENTS: 'trivx.lastDeployments',
  AI_SESSIONS: 'trivx.aiSessions',
  USER_EMAIL: 'trivx.userEmail',
  USER_NAME: 'trivx.userName',
} as const;

// ─── Workspace State Keys ──────────────────────────────────────────────────

export const WORKSPACE_KEYS = {
  LINKED_PROJECT_ID: 'trivx.linkedProjectId',
  ENV_FILE: 'trivx.envFile',
} as const;

// ─── Context Keys (for `when` clauses) ─────────────────────────────────────

export const CONTEXT_KEYS = {
  IS_LOGGED_IN: 'trivx.isLoggedIn',
  HAS_ORGANIZATION: 'trivx.hasOrganization',
  HAS_PROJECT: 'trivx.hasProject',
  IS_DEPLOYING: 'trivx.isDeploying',
  AI_CHAT_OPEN: 'trivx.aiChatOpen',
} as const;

// ─── Command IDs ────────────────────────────────────────────────────────────

export const COMMANDS = {
  LOGIN: 'trivx.login',
  LOGOUT: 'trivx.logout',
  SWITCH_ORG: 'trivx.switchOrg',
  CREATE_PROJECT: 'trivx.createProject',
  OPEN_PROJECT: 'trivx.openProject',
  DEPLOY: 'trivx.deploy',
  VIEW_DEPLOY_LOGS: 'trivx.viewDeployLogs',
  CANCEL_DEPLOY: 'trivx.cancelDeploy',
  ROLLBACK: 'trivx.rollback',
  OPEN_AI_CHAT: 'trivx.openAIChat',
  AI_SUGGEST: 'trivx.aiSuggest',
  VIEW_DEPLOYMENTS: 'trivx.viewDeployments',
  RUN_PIPELINE: 'trivx.runPipeline',
  VIEW_PIPELINE: 'trivx.viewPipeline',
  CANCEL_PIPELINE: 'trivx.cancelPipeline',
  MANAGE_SECRETS: 'trivx.manageSecrets',
  VIEW_INCIDENTS: 'trivx.viewIncidents',
  VIEW_LOGS: 'trivx.viewLogs',
  VIEW_METRICS: 'trivx.viewMetrics',
  OPEN_DASHBOARD: 'trivx.openDashboard',
  VIEW_USAGE: 'trivx.viewUsage',
  ANALYZE_REPO: 'trivx.analyzeRepo',
  REFRESH: 'trivx.refresh',
  REFRESH_ALL: 'trivx.refreshAll',
} as const;

// ─── View IDs ───────────────────────────────────────────────────────────────

export const VIEWS = {
  WELCOME: 'trivx-welcome',
  ORGANIZATION: 'trivx-organization',
  PROJECTS: 'trivx-projects',
  DEPLOYMENTS: 'trivx-deployments',
  PIPELINES: 'trivx-pipelines',
  MONITORING: 'trivx-monitoring',
} as const;

// ─── API Routes ─────────────────────────────────────────────────────────────

export const API_ROUTES = {
  // Auth
  AUTH_USER: (id: string) => `/api/v1/auth/auth/user/${id}`,
  AUTH_VALIDATE: '/api/v1/auth/auth/validate',
  AUTH_EXTENSION_TOKEN: '/api/v1/auth/auth/extension/token',
  AUTH_SESSIONS: (userId: string) => `/api/v1/auth/auth/sessions/${userId}`,

  // Organization
  ORG_CREATE: '/api/v1/organizations/api/organization/create',
  ORG_GET: (id: string) => `/api/v1/organizations/api/organization/${id}`,
  ORG_GET_SLUG: (slug: string) => `/api/v1/organizations/api/organization/slug/${slug}`,
  ORG_LIST: (userId: string) => `/api/v1/organizations/api/organization/list/${userId}`,
  ORG_MEMBERS: (orgId: string) => `/api/v1/organizations/api/organization/${orgId}/members`,
  ORG_INVITE: (orgId: string) => `/api/v1/organizations/api/organization/${orgId}/invite`,
  ORG_UPDATE: (id: string) => `/api/v1/organizations/api/organization/${id}/update`,

  // Project
  PROJECT_CREATE: '/api/v1/projects/api/projects',
  PROJECT_GET: (id: string) => `/api/v1/projects/api/projects/${id}`,
  PROJECT_LIST_ORG: (orgId: string) => `/api/v1/projects/api/projects/organization/${orgId}`,
  PROJECT_UPDATE: (id: string) => `/api/v1/projects/api/projects/${id}`,
  PROJECT_DELETE: (id: string) => `/api/v1/projects/api/projects/${id}`,
  PROJECT_LINK_REPO: (id: string) => `/api/v1/projects/api/projects/${id}/link-repository-app`,
  PROJECT_DEPLOY: (id: string) => `/api/v1/projects/api/projects/${id}/deploy`,
  PROJECT_ANALYZE: (id: string) => `/api/v1/projects/api/projects/${id}/analyze`,
  GITHUB_INSTALLATIONS: '/api/v1/projects/api/github/installations',
  GITHUB_REPOS: (installationId: string) => `/api/v1/projects/api/github/installations/${installationId}/repositories`,

  // Infra / Deployment
  DEPLOY_EXECUTE: '/api/v1/infra/api/v1/infra/deployments/execute',
  DEPLOY_STATUS: (executionId: string) => `/api/v1/infra/api/v1/infra/deployments/execute/${executionId}/status`,
  DEPLOY_LIST: '/api/v1/infra/api/v1/infra/deployments',
  DEPLOY_CANCEL: (id: string) => `/api/v1/infra/api/v1/infra/deployments/${id}/cancel`,
  DEPLOY_ROLLBACK: (id: string) => `/api/v1/infra/api/v1/infra/deployments/${id}/rollback`,

  // AI
  AI_CHAT: '/api/v1/ai/api/v1/ai/chat',
  AI_CHAT_STREAM: '/api/v1/ai/api/v1/ai/chat/stream',
  AI_SESSIONS: '/api/v1/ai/api/v1/ai/sessions',
  AI_SESSION: (sessionId: string) => `/api/v1/ai/api/v1/ai/sessions/${sessionId}`,
  AI_CONTEXT: (projectId: string) => `/api/v1/ai/api/v1/ai/context/${projectId}`,

  // Workflow
  WORKFLOW_LIST: (projectId: string) => `/api/v1/workflows/api/workflows/${projectId}`,
  WORKFLOW_RUN: (id: string) => `/api/v1/workflows/api/workflows/${id}/run`,
  PIPELINE_LIST: (projectId: string) => `/api/v1/workflows/api/pipelines/project/${projectId}`,
  PIPELINE_LOGS: (id: string) => `/api/v1/workflows/api/pipelines/${id}/logs`,
  PIPELINE_CANCEL: (id: string) => `/api/v1/workflows/api/pipelines/${id}/cancel`,

  // Secrets
  ENV_GROUPS: (projectId: string) => `/api/v1/env-secrets/api/v1/env-groups/${projectId}`,
  SECRETS: (projectId: string, groupId: string) => `/api/v1/env-secrets/api/v1/secrets/${projectId}/${groupId}`,

  // SRE
  SRE_INCIDENTS: '/api/v1/sre/api/sre/v1/incidents',
  SRE_LOGS: '/api/v1/sre/api/sre/v1/logs',
  SRE_METRICS: '/api/v1/sre/api/sre/v1/metrics/query',
  SRE_DASHBOARD: '/api/v1/sre/api/sre/v1/dashboard',

  // Billing
  BILLING_ACCOUNT: (orgId: string) => `/api/v1/billing/organizations/${orgId}/billing`,
  BILLING_USAGE: (orgId: string) => `/api/v1/billing/organizations/${orgId}/usage`,

  // Notifications
  NOTIFICATIONS: (userId: string) => `/api/v1/notifications/api/v1/notifications/${userId}`,

  // Repo Analyzer
  REPO_ANALYZE: '/api/v1/repo/api/analyze',
  REPO_ANALYSIS: (projectId: string) => `/api/v1/repo/api/analysis/${projectId}`,
} as const;

// ─── Deployment Phases ──────────────────────────────────────────────────────

export const DEPLOY_PHASES = [
  'Provisioning Infrastructure',
  'Allocating IP Address',
  'Establishing SSH Connection',
  'Setting Up Server',
  'Installing Runtime',
  'Configuring Nginx',
  'Cloning Repository',
  'Installing Dependencies',
  'Building Application',
  'Starting Application',
  'Running Health Check',
  'Complete',
] as const;
