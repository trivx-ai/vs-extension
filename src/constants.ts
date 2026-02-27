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
  CREATE_ORG: 'trivx.createOrg',
  CREATE_PROJECT: 'trivx.createProject',
  SWITCH_PROJECT: 'trivx.switchProject',
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

// ─── API Gateway Route Prefixes ─────────────────────────────────────────────
// These match the SERVICE_ROUTES in api-gateway/src/config/index.ts
// Gateway proxies: prefix → upstream with rewritePrefix: ''
// So the full path = GW prefix + service-internal route

const GW = {
  auth: '/api/v1/auth',
  org: '/api/v1/organizations',
  project: '/api/v1/projects',
  infra: '/api/v1/infra',
  ai: '/api/v1/ai',
  workflow: '/api/v1/workflows',
  secrets: '/api/v1/env-secrets',
  sre: '/api/v1/sre',
  billing: '/api/v1/billing',
  notify: '/api/v1/notifications',
  repo: '/api/v1/repo',
} as const;

// ─── Clean API Routes ───────────────────────────────────────────────────────

export const API = {
  // ── Auth Service ──
  // Gateway prefix /api/v1/auth → auth-service (routes: /auth/user/:id etc.)
  auth: {
    user: (id: string) => `${GW.auth}/user/${id}`,
    validate: `${GW.auth}/validate`,
    extToken: `${GW.auth}/extension/token`,
    sessions: (id: string) => `${GW.auth}/sessions/${id}`,
  },

  // ── Organization Service (internal routes: /api/organization/...) ──
  org: {
    create: `${GW.org}/api/organization/create`,
    get: (id: string) => `${GW.org}/api/organization/${id}`,
    getSlug: (slug: string) => `${GW.org}/api/organization/slug/${slug}`,
    list: (userId: string) => `${GW.org}/api/organization/list/${userId}`,
    update: (id: string) => `${GW.org}/api/organization/${id}/update`,
    members: (id: string) => `${GW.org}/api/organization/${id}/members`,
    invite: (id: string) => `${GW.org}/api/organization/${id}/invite`,
  },

  // ── Project Service (internal routes: /api/projects/...) ──
  project: {
    create: `${GW.project}/api/projects`,
    get: (id: string) => `${GW.project}/api/projects/${id}`,
    list: (orgId: string) => `${GW.project}/api/projects/organization/${orgId}`,
    update: (id: string) => `${GW.project}/api/projects/${id}`,
    delete: (id: string) => `${GW.project}/api/projects/${id}`,
    deploy: (id: string) => `${GW.project}/api/projects/${id}/deploy`,
    analyze: (id: string) => `${GW.project}/api/projects/${id}/analyze`,
    linkRepo: (id: string) => `${GW.project}/api/projects/${id}/link-repository-app`,
    ghInstall: `${GW.project}/api/projects/github-app`,
    ghRepos: (iid: string) => `${GW.project}/api/projects/github-app/${iid}/repositories`,
  },

  // ── Infra Service ──
  // Gateway prefix /api/v1/infra
  infra: {
    deployExec: `${GW.infra}/deployments/execute`,
    deployStatus: (eid: string) => `${GW.infra}/deployments/execute/${eid}/status`,
    deployList: `${GW.infra}/deployments`,
    deployGet: (id: string) => `${GW.infra}/deployments/${id}`,
    deployCancel: (id: string) => `${GW.infra}/deployments/${id}/cancel`,
    deployRollback: (id: string) => `${GW.infra}/deployments/${id}/rollback`,
  },

  // ── AI Service ──
  // Gateway prefix /api/v1/ai
  ai: {
    chat: `${GW.ai}/chat`,
    chatStream: `${GW.ai}/chat/stream`,
    sessions: `${GW.ai}/sessions`,
    session: (sid: string) => `${GW.ai}/sessions/${sid}`,
    context: (pid: string) => `${GW.ai}/context/${pid}`,
  },

  // ── Workflow Service ──
  // Gateway prefix /api/v1/workflows
  workflow: {
    list: (pid: string) => `${GW.workflow}/${pid}`, // Assuming internal route is /:pid
    run: (id: string) => `${GW.workflow}/${id}/run`,
    pipelineList: (pid: string) => `${GW.workflow}/pipelines/project/${pid}`,
    pipelineLogs: (id: string) => `${GW.workflow}/pipelines/${id}/logs`,
    pipelineCancel: (id: string) => `${GW.workflow}/pipelines/${id}/cancel`,
  },

  // ── Env Secrets Service ──
  // Gateway prefix /api/v1/env-secrets
  secrets: {
    groups: (pid: string) => `${GW.secrets}/env-groups/${pid}`,
    list: (pid: string, gid: string) => `${GW.secrets}/secrets/${pid}/${gid}`,
  },

  // ── SRE Service ──
  // Gateway prefix /api/v1/sre
  sre: {
    incidents: `${GW.sre}/incidents`,
    logs: `${GW.sre}/logs`,
    metrics: `${GW.sre}/metrics/query`,
    dashboard: `${GW.sre}/dashboard`,
  },

  // ── Billing Service ──
  // Gateway prefix /api/v1/billing
  billing: {
    account: (orgId: string) => `${GW.billing}/organizations/${orgId}/billing`,
    usage: (orgId: string) => `${GW.billing}/organizations/${orgId}/usage`,
  },

  // ── Notification Service ──
  // Gateway prefix /api/v1/notifications
  notifications: {
    list: (uid: string) => `${GW.notify}/${uid}`,
  },

  // ── Repo Analyzer ──
  // Gateway prefix /api/v1/repo
  repo: {
    analyze: `${GW.repo}/analyze`,
    analysis: (pid: string) => `${GW.repo}/analysis/${pid}`,
  },
} as const;

// ─── Legacy compat — keep old API_ROUTES pointing to same paths ─────────────
// This allows a gradual migration. Remove once all consumers use `API.*`.
export const API_ROUTES = {
  AUTH_USER: API.auth.user,
  AUTH_VALIDATE: API.auth.validate,
  AUTH_EXTENSION_TOKEN: API.auth.extToken,
  AUTH_SESSIONS: API.auth.sessions,
  ORG_CREATE: API.org.create,
  ORG_GET: API.org.get,
  ORG_GET_SLUG: API.org.getSlug,
  ORG_LIST: API.org.list,
  ORG_MEMBERS: API.org.members,
  ORG_INVITE: API.org.invite,
  ORG_UPDATE: API.org.update,
  PROJECT_CREATE: API.project.create,
  PROJECT_GET: API.project.get,
  PROJECT_LIST_ORG: API.project.list,
  PROJECT_UPDATE: API.project.update,
  PROJECT_DELETE: API.project.delete,
  PROJECT_LINK_REPO: API.project.linkRepo,
  PROJECT_DEPLOY: API.project.deploy,
  PROJECT_ANALYZE: API.project.analyze,
  GITHUB_INSTALLATIONS: API.project.ghInstall,
  GITHUB_REPOS: API.project.ghRepos,
  DEPLOY_EXECUTE: API.infra.deployExec,
  DEPLOY_STATUS: API.infra.deployStatus,
  DEPLOY_LIST: API.infra.deployList,
  DEPLOY_CANCEL: API.infra.deployCancel,
  DEPLOY_ROLLBACK: API.infra.deployRollback,
  AI_CHAT: API.ai.chat,
  AI_CHAT_STREAM: API.ai.chatStream,
  AI_SESSIONS: API.ai.sessions,
  AI_SESSION: API.ai.session,
  AI_CONTEXT: API.ai.context,
  WORKFLOW_LIST: API.workflow.list,
  WORKFLOW_RUN: API.workflow.run,
  PIPELINE_LIST: API.workflow.pipelineList,
  PIPELINE_LOGS: API.workflow.pipelineLogs,
  PIPELINE_CANCEL: API.workflow.pipelineCancel,
  ENV_GROUPS: API.secrets.groups,
  SECRETS: API.secrets.list,
  SRE_INCIDENTS: API.sre.incidents,
  SRE_LOGS: API.sre.logs,
  SRE_METRICS: API.sre.metrics,
  SRE_DASHBOARD: API.sre.dashboard,
  BILLING_ACCOUNT: API.billing.account,
  BILLING_USAGE: API.billing.usage,
  NOTIFICATIONS: API.notifications.list,
  REPO_ANALYZE: API.repo.analyze,
  REPO_ANALYSIS: API.repo.analysis,
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
