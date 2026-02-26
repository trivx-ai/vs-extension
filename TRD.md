# Trivx AI — VS Code Extension: Technical Requirements Document (TRD)

**Version**: 1.0.0  
**Date**: February 26, 2026  
**Product**: Trivx AI VS Code Extension  
**Author**: Trivx Engineering Team

---

## 1. Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Extension Runtime** | VS Code Extension API (TypeScript) | Native VS Code integration |
| **Language** | TypeScript 5.x (strict mode) | Type safety, matches backend/frontend |
| **Build Tool** | esbuild | Fast bundling, small output |
| **Package Manager** | pnpm | Consistent with monorepo |
| **HTTP Client** | axios | HTTP requests with interceptors |
| **WebSocket** | socket.io-client | Real-time deployment updates (matches infra-service) |
| **SSE** | eventsource-parser | AI chat streaming |
| **WebView** | HTML/CSS/JS (inline) | AI Chat and Deployment panels |
| **Auth** | Clerk (browser OAuth flow) with URI handler | Standard VS Code auth pattern |
| **Secret Storage** | VS Code SecretStorage API | OS keychain (secure token storage) |
| **State Persistence** | VS Code Memento (globalState/workspaceState) | Lightweight key-value storage |
| **Testing** | Vitest + @vscode/test-electron | Unit + integration tests |
| **Linting** | ESLint + Prettier | Code quality |

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                   │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Extension    │  │   Command    │  │    TreeView      │ │
│  │  Activation   │  │   Registry   │  │    Providers     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘ │
│         │                 │                  │             │
│  ┌──────▼─────────────────▼──────────────────▼───────────┐ │
│  │                  Service Layer                         │ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌────────────┐  ┌────────────────┐ │ │
│  │  │ AuthService  │  │ ApiClient  │  │ WebSocketMgr   │ │ │
│  │  │ (Clerk+JWT)  │  │ (axios)    │  │ (socket.io)    │ │ │
│  │  └─────────────┘  └────────────┘  └────────────────┘ │ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌────────────┐  ┌────────────────┐ │ │
│  │  │ ProjectSvc   │  │ DeploySvc  │  │ AIChatSvc      │ │ │
│  │  └─────────────┘  └────────────┘  └────────────────┘ │ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌────────────┐  ┌────────────────┐ │ │
│  │  │ WorkflowSvc  │  │ SecretsSvc │  │ SRESvc         │ │ │
│  │  └─────────────┘  └────────────┘  └────────────────┘ │ │
│  └───────────────────────┬───────────────────────────────┘ │
│                          │                                 │
│  ┌───────────────────────▼───────────────────────────────┐ │
│  │                  WebView Layer                         │ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌──────────────────────────────┐   │ │
│  │  │ AI Chat     │  │ Deployment Progress           │   │ │
│  │  │ Panel       │  │ Panel                         │   │ │
│  │  └─────────────┘  └──────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
  ┌─────────────┐ ┌──────────┐  ┌──────────────┐
  │ API Gateway │ │ Infra    │  │ Notification │
  │ :3000       │ │ Socket.IO│  │ WebSocket    │
  └─────────────┘ └──────────┘  └──────────────┘
```

---

## 3. Project Structure

```
Extension/
├── .vscode/
│   ├── launch.json              # Extension debug config
│   └── settings.json
├── .vscodeignore                # Files excluded from VSIX package
├── .gitignore
├── package.json                 # Extension manifest + contributes
├── tsconfig.json               # TypeScript configuration
├── esbuild.js                  # Build script
├── README.md                   # Marketplace README
├── CHANGELOG.md
├── LICENSE
├── PRD.md                      # Product Requirements Document
├── TRD.md                      # Technical Requirements Document
├── media/
│   ├── trivx-icon.svg          # Extension icon
│   └── trivx-dark.svg          # Dark theme icon
├── src/
│   ├── extension.ts            # Entry point (activate/deactivate)
│   ├── constants.ts            # Shared constants, config keys
│   │
│   ├── commands/               # VS Code command handlers
│   │   ├── auth.commands.ts    # Login, logout, switch org
│   │   ├── project.commands.ts # Create, delete, link projects
│   │   ├── deploy.commands.ts  # Deploy, cancel, rollback
│   │   ├── ai.commands.ts      # Open AI chat, send message
│   │   ├── pipeline.commands.ts# Run, cancel pipelines
│   │   ├── secrets.commands.ts # Manage environment secrets
│   │   └── monitoring.commands.ts # View incidents, logs
│   │
│   ├── services/               # Business logic & API clients
│   │   ├── api-client.ts       # Base HTTP client (axios)
│   │   ├── auth.service.ts     # Clerk auth, token management
│   │   ├── organization.service.ts # Organization API
│   │   ├── project.service.ts  # Project API
│   │   ├── deploy.service.ts   # Deployment API + Socket.IO
│   │   ├── ai.service.ts       # AI chat API + SSE streaming
│   │   ├── workflow.service.ts # Workflow/pipeline API
│   │   ├── secrets.service.ts  # Env-Secrets API
│   │   ├── sre.service.ts      # SRE/monitoring API
│   │   ├── billing.service.ts  # Billing API
│   │   └── notification.service.ts # Notification API + WebSocket
│   │
│   ├── providers/              # VS Code TreeView data providers
│   │   ├── organization.provider.ts # Organization tree
│   │   ├── project.provider.ts      # Projects tree
│   │   ├── deployment.provider.ts   # Deployments tree
│   │   ├── pipeline.provider.ts     # Pipelines tree
│   │   └── monitoring.provider.ts   # Monitoring tree
│   │
│   ├── views/                  # WebView panel implementations
│   │   ├── ai-chat.view.ts     # AI chat WebView panel
│   │   ├── deploy-progress.view.ts # Deployment progress panel
│   │   └── webview-utils.ts    # Shared WebView utilities
│   │
│   ├── statusbar/              # Status bar items
│   │   └── statusbar.manager.ts # Manage all status bar items
│   │
│   └── utils/                  # Utility functions
│       ├── logger.ts           # OutputChannel logging
│       ├── config.ts           # Extension configuration
│       └── errors.ts           # Error handling utilities
│
└── test/
    ├── suite/
    │   ├── extension.test.ts
    │   └── services.test.ts
    └── runTest.ts
```

---

## 4. Extension Manifest (package.json)

### Activation Events

```json
{
  "activationEvents": [
    "onStartupFinished",
    "onView:trivx-projects",
    "onCommand:trivx.login"
  ]
}
```

### Contributes

#### Commands (18 total)

| Command ID | Title | Category | Icon |
|------------|-------|----------|------|
| `trivx.login` | Login to Trivx | Trivx | sign-in |
| `trivx.logout` | Logout | Trivx | sign-out |
| `trivx.switchOrg` | Switch Organization | Trivx | organization |
| `trivx.createProject` | Create Project | Trivx | add |
| `trivx.deploy` | Deploy Project | Trivx | rocket |
| `trivx.cancelDeploy` | Cancel Deployment | Trivx | close |
| `trivx.rollback` | Rollback Deployment | Trivx | discard |
| `trivx.openAIChat` | Open AI Chat | Trivx | comment-discussion |
| `trivx.viewDeployments` | View Deployments | Trivx | list-tree |
| `trivx.runPipeline` | Run Pipeline | Trivx | play |
| `trivx.cancelPipeline` | Cancel Pipeline | Trivx | debug-stop |
| `trivx.manageSecrets` | Manage Secrets | Trivx | lock |
| `trivx.viewIncidents` | View Incidents | Trivx | warning |
| `trivx.viewLogs` | View Logs | Trivx | output |
| `trivx.openDashboard` | Open Dashboard | Trivx | dashboard |
| `trivx.viewUsage` | View Usage | Trivx | graph |
| `trivx.analyzeRepo` | Analyze Repository | Trivx | search |
| `trivx.refreshAll` | Refresh All | Trivx | refresh |

#### Views Container (Activity Bar)

```json
{
  "viewsContainers": {
    "activitybar": [{
      "id": "trivx-sidebar",
      "title": "Trivx AI",
      "icon": "media/trivx-icon.svg"
    }]
  }
}
```

#### Views (TreeViews)

```json
{
  "views": {
    "trivx-sidebar": [
      { "id": "trivx-welcome", "name": "Welcome", "when": "!trivx.isLoggedIn" },
      { "id": "trivx-organization", "name": "Organization", "when": "trivx.isLoggedIn" },
      { "id": "trivx-projects", "name": "Projects", "when": "trivx.isLoggedIn" },
      { "id": "trivx-deployments", "name": "Deployments", "when": "trivx.isLoggedIn" },
      { "id": "trivx-pipelines", "name": "Pipelines", "when": "trivx.isLoggedIn" },
      { "id": "trivx-monitoring", "name": "Monitoring", "when": "trivx.isLoggedIn" }
    ]
  }
}
```

#### Configuration

```json
{
  "configuration": {
    "title": "Trivx AI",
    "properties": {
      "trivx.apiBaseUrl": {
        "type": "string",
        "default": "http://localhost:3000",
        "description": "Trivx API Gateway URL"
      },
      "trivx.wsUrl": {
        "type": "string",
        "default": "http://localhost:4006",
        "description": "Infra Service WebSocket URL"
      },
      "trivx.autoDetectProject": {
        "type": "boolean",
        "default": true,
        "description": "Auto-detect Trivx project from workspace"
      },
      "trivx.showDeployNotifications": {
        "type": "boolean",
        "default": true,
        "description": "Show deployment status notifications"
      },
      "trivx.aiModel": {
        "type": "string",
        "default": "claude-sonnet",
        "description": "AI model for chat"
      }
    }
  }
}
```

---

## 5. Service Layer Design

### 5.1 ApiClient (Base HTTP Client)

```typescript
class ApiClient {
  private baseUrl: string;
  private token: string | null;
  private axiosInstance: AxiosInstance;

  setToken(token: string): void;
  clearToken(): void;
  get<T>(path: string, params?: Record<string, any>): Promise<T>;
  post<T>(path: string, data?: any): Promise<T>;
  patch<T>(path: string, data?: any): Promise<T>;
  put<T>(path: string, data?: any): Promise<T>;
  delete<T>(path: string): Promise<T>;
  stream(path: string, data: any, onChunk: (chunk: string) => void): Promise<void>;
}
```

Interceptors handle:
- Auto-inject Bearer token
- Error normalization (ApiError class)
- Request/response logging to OutputChannel
- Timeout handling (30s default, 120s for deploys)

### 5.2 AuthService

```typescript
class AuthService {
  // Token stored in VS Code SecretStorage (OS keychain)
  login(): Promise<void>;               // Opens browser for Clerk OAuth
  logout(): Promise<void>;              // Clears all stored tokens
  getToken(): Promise<string | null>;   // Retrieves stored JWT
  refreshToken(): Promise<string>;      // Refresh token flow
  getCurrentUser(): Promise<User>;      // Fetch user profile
  isLoggedIn(): boolean;                // Check auth state
  onAuthStateChanged: Event<boolean>;   // Event emitter for auth changes
}
```

**Auth Flow (Browser-based):**
1. Extension registers a URI handler (`vscode://trivx.trivx-ai/auth/callback`)
2. Opens default browser to Clerk login page with redirect URI
3. After login, Clerk redirects to URI handler
4. Extension receives token via URI handler
5. Token stored in VS Code SecretStorage

### 5.3 DeployService (Socket.IO Integration)

```typescript
class DeployService {
  deploy(projectId: string, config: DeployConfig): Promise<string>;
  cancelDeployment(deploymentId: string): Promise<void>;
  rollback(deploymentId: string): Promise<void>;
  listDeployments(projectId: string): Promise<Deployment[]>;
  getDeployment(deploymentId: string): Promise<Deployment>;
  
  // Socket.IO real-time
  subscribeToDeployment(deploymentId: string): void;
  unsubscribeFromDeployment(deploymentId: string): void;
  onDeploymentStatus: Event<DeploymentStatus>;
  onDeploymentLogs: Event<DeploymentLog>;
  onDeploymentProgress: Event<DeploymentProgress>;
}
```

### 5.4 AIService (SSE Streaming)

```typescript
class AIService {
  sendMessage(data: ChatRequest): Promise<ChatResponse>;
  streamMessage(data: ChatRequest, callbacks: StreamCallbacks): Promise<void>;
  getSessions(userId: string, orgId: string): Promise<ChatSession[]>;
  getSession(sessionId: string): Promise<ChatSession>;
  deleteSession(sessionId: string): Promise<void>;
  getProjectContext(projectId: string): Promise<AIContext>;
  
  // SSE event callbacks
  interface StreamCallbacks {
    onIntent: (intent: string) => void;
    onChunk: (text: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  }
}
```

---

## 6. TreeView Provider Design

### 6.1 Organization Provider

```
Trivx AI
├── 🏢 My Organization (Pro Plan)
│   ├── 👤 Owner: john@example.com
│   ├── 👥 Members (5)
│   │   ├── John Smith (Owner)
│   │   ├── Jane Doe (Admin)
│   │   └── Bob Dev (Developer)
│   └── ⚡ Switch Organization
```

### 6.2 Projects Provider

```
Projects
├── 📦 my-webapp (React • Deploying...)
│   ├── 🔗 github.com/user/my-webapp
│   ├── 🚀 Last Deploy: 2h ago (Live)
│   └── ⚙️ Framework: Next.js
├── 📦 api-server (Node.js • Live)
│   ├── 🔗 github.com/user/api-server
│   └── 🚀 Last Deploy: 1d ago (Live)
└── ➕ Create New Project
```

### 6.3 Deployments Provider

```
Deployments
├── 🟢 Production - my-webapp (Live)
│   ├── URL: https://app.example.com
│   ├── Deployed: 2h ago
│   └── Commit: abc1234
├── 🟡 Staging - api-server (Deploying)
│   ├── Phase: Installing Dependencies (65%)
│   └── Started: 3m ago
└── 🔴 Dev - my-webapp (Failed)
    ├── Error: Build failed
    └── 1d ago
```

---

## 7. WebView Design

### 7.1 AI Chat WebView

**Communication Protocol:**
```
Extension ←→ WebView via postMessage/onDidReceiveMessage

Messages from WebView → Extension:
  { type: 'sendMessage', text: string, sessionId?: string }
  { type: 'cancelStream' }
  { type: 'loadSession', sessionId: string }
  { type: 'newSession' }
  { type: 'quickAction', action: 'deploy' | 'build' | 'status' | 'scale' }

Messages from Extension → WebView:
  { type: 'streamChunk', text: string }
  { type: 'streamIntent', intent: string }
  { type: 'streamDone' }
  { type: 'streamError', error: string }
  { type: 'sessions', sessions: ChatSession[] }
  { type: 'sessionLoaded', messages: ChatMessage[] }
  { type: 'authState', isLoggedIn: boolean, user?: User }
```

**Styling**: Dark theme matching Trivx brand (`#0C0C0C` background, `#F2613F` accent, Geist Mono font).

### 7.2 Deployment Progress WebView

**Visual Design:**
- Step list with checkmarks/spinners/x-marks
- Progress percentage bar
- Real-time log output area
- Action buttons (Cancel, Open URL)

**Steps displayed:**
1. ⬜ Provisioning Infrastructure
2. ⬜ Allocating IP Address
3. ⬜ Establishing SSH Connection
4. ⬜ Setting Up Server
5. ⬜ Installing Runtime
6. ⬜ Configuring Nginx
7. ⬜ Cloning Repository
8. ⬜ Installing Dependencies
9. ⬜ Building Application
10. ⬜ Starting Application
11. ⬜ Running Health Check
12. ⬜ Complete

---

## 8. Event & Communication Flow

### 8.1 Deployment Real-Time Flow

```
User triggers deploy
  │
  ├─ DeployService.deploy(projectId, config)
  │   └─ POST /api/v1/infra/deployments/execute → returns executionId
  │
  ├─ DeployService.subscribeToDeployment(executionId)
  │   └─ Socket.IO connect to infra-service
  │       ├─ Auth: { userId, organizationId }
  │       └─ Subscribe: deployment:{executionId}
  │
  ├─ DeployProgressWebView opens
  │
  └─ Socket.IO Events:
      ├─ deployment:status → Update WebView steps
      ├─ deployment:progress → Update progress bar
      ├─ deployment:logs → Append to Output Channel + WebView
      └─ (on completion) → Show success notification + URL
```

### 8.2 AI Chat SSE Flow

```
User sends message
  │
  ├─ AIService.streamMessage(request, callbacks)
  │   └─ POST /api/v1/ai/chat/stream
  │       Content-Type: text/event-stream
  │
  └─ SSE Events:
      ├─ event: intent → callbacks.onIntent(data)
      ├─ event: chunk → callbacks.onChunk(data)
      │   └─ WebView: append text token incrementally
      ├─ event: done → callbacks.onDone()
      └─ event: error → callbacks.onError(data)
```

---

## 9. State Management

### 9.1 Global State (Memento)

| Key | Type | Description |
|-----|------|-------------|
| `trivx.currentOrgId` | string | Active organization ID |
| `trivx.currentOrgSlug` | string | Active organization slug |
| `trivx.currentProjectId` | string | Active project ID |
| `trivx.lastDeployments` | Deployment[] | Cached recent deployments |
| `trivx.aiSessions` | string[] | Recent AI session IDs |

### 9.2 Secret Storage

| Key | Description |
|-----|-------------|
| `trivx.authToken` | JWT authentication token |
| `trivx.refreshToken` | Token refresh credential |
| `trivx.userId` | Current user ID |
| `trivx.clerkSessionId` | Clerk session identifier |

### 9.3 Workspace State

| Key | Type | Description |
|-----|------|-------------|
| `trivx.linkedProjectId` | string | Project linked to this workspace |
| `trivx.envFile` | string | Path to `.env` file used |

### 9.4 Context Keys (for `when` clauses)

| Key | Type | Description |
|-----|------|-------------|
| `trivx.isLoggedIn` | boolean | User is authenticated |
| `trivx.hasOrganization` | boolean | User has an organization |
| `trivx.hasProject` | boolean | Active project selected |
| `trivx.isDeploying` | boolean | Deployment in progress |
| `trivx.aiChatOpen` | boolean | AI chat panel is open |

---

## 10. Error Handling Strategy

### 10.1 Error Types

```typescript
class TrivxError extends Error {
  code: string;
  statusCode?: number;
  details?: any;
}

class AuthError extends TrivxError { }    // 401, token expired
class ForbiddenError extends TrivxError { } // 403, RBAC denied
class NotFoundError extends TrivxError { }  // 404, resource not found
class RateLimitError extends TrivxError { } // 429, too many requests
class NetworkError extends TrivxError { }   // Connection failed
```

### 10.2 Error Recovery

| Error | Action |
|-------|--------|
| 401 Unauthorized | Attempt token refresh → if fails, prompt re-login |
| 403 Forbidden | Show "Insufficient permissions" notification |
| 404 Not Found | Remove from cache, refresh tree view |
| 429 Rate Limited | Queue request with exponential backoff |
| Network Error | Show offline indicator, use cached data |
| Socket Disconnect | Auto-reconnect with backoff (1s, 2s, 4s, 8s, 16s max) |

---

## 11. Security Considerations

| Concern | Solution |
|---------|----------|
| Token storage | VS Code SecretStorage (OS keychain) — never plaintext |
| Token in memory | Cleared on deactivation, never logged |
| API communication | HTTPS in production, token in Authorization header |
| Secret values | Never displayed in TreeView; masked in WebView |
| URI handler | Validate state parameter to prevent CSRF |
| WebView XSS | CSP headers, nonce-based script loading |
| Extension permissions | Minimal required: workspace.fs, authentication |

---

## 12. Performance Targets

| Metric | Target | Implementation |
|--------|--------|----------------|
| Extension activation | < 300ms | Lazy service initialization |
| TreeView refresh | < 500ms | Cached data with background refresh |
| Deploy trigger to first log | < 3s | Direct API + immediate Socket.IO |
| AI first token latency | < 2s | SSE stream, no buffering |
| Memory usage | < 50MB | Cleanup subscriptions, limit cached items |
| Bundle size | < 500KB | esbuild tree-shaking, minimal dependencies |

---

## 13. Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.7.x | HTTP client |
| `socket.io-client` | ^4.7.x | Real-time deployment updates |
| `eventsource-parser` | ^3.0.x | SSE stream parsing |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/vscode` | ^1.85.0 | VS Code API types |
| `typescript` | ^5.4.x | TypeScript compiler |
| `esbuild` | ^0.20.x | Bundler |
| `@vscode/test-electron` | ^2.3.x | Integration testing |
| `vitest` | ^1.x | Unit testing |
| `eslint` | ^8.x | Linting |
| `prettier` | ^3.x | Formatting |

---

## 14. Build & Package

### Build Commands

```bash
pnpm build        # Production build (esbuild --minify)
pnpm watch        # Development build with watch mode
pnpm package      # Create .vsix package
pnpm test         # Run all tests
pnpm lint         # ESLint check
```

### esbuild Configuration

```javascript
{
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: isProduction
}
```

### VSIX Package

```
trivx-ai-{version}.vsix
├── extension/
│   ├── dist/extension.js        # Bundled extension
│   ├── dist/extension.js.map    # Source maps
│   ├── media/                   # Icons
│   ├── package.json             # Manifest
│   └── README.md                # Marketplace listing
```

---

## 15. Testing Strategy

### Unit Tests

- Service layer: Mock axios, verify API calls
- Command handlers: Mock VS Code API, verify behavior
- Providers: Verify TreeItem generation
- Utils: Pure function tests

### Integration Tests

- Auth flow: Login → token storage → API calls
- Deploy flow: Trigger → Socket.IO events → WebView updates
- AI chat: Send message → SSE chunks → WebView rendering

### Manual Testing Checklist

- [ ] Login with email/password
- [ ] Login with Google OAuth
- [ ] Login with GitHub OAuth
- [ ] View organizations
- [ ] Switch organization
- [ ] View projects
- [ ] Create project
- [ ] Deploy project
- [ ] View deployment progress in real-time
- [ ] Open AI chat
- [ ] Send AI message with streaming
- [ ] AI-triggered deployment
- [ ] View pipeline status
- [ ] Manage secrets
- [ ] View incidents
- [ ] Logout

---

## 16. API Configuration & Endpoint Mapping

All requests go through the API Gateway unless noted:

```typescript
const API_ROUTES = {
  // Auth Service (via gateway)
  AUTH_USER: '/api/v1/auth/user',
  AUTH_VALIDATE: '/api/v1/auth/validate',
  AUTH_SESSIONS: '/api/v1/auth/sessions',
  
  // Organization Service (via gateway)
  ORG_CREATE: '/api/v1/organizations/api/organization/create',
  ORG_GET: '/api/v1/organizations/api/organization',
  ORG_LIST: '/api/v1/organizations/api/organization/list',
  ORG_MEMBERS: '/api/v1/organizations/api/organization/{id}/members',
  ORG_INVITE: '/api/v1/organizations/api/organization/{id}/invite',
  
  // Project Service (via gateway)
  PROJECT_CREATE: '/api/v1/projects/api/projects',
  PROJECT_GET: '/api/v1/projects/api/projects/{id}',
  PROJECT_LIST_ORG: '/api/v1/projects/api/projects/organization/{orgId}',
  PROJECT_LINK_REPO: '/api/v1/projects/api/projects/{id}/link-repository-app',
  PROJECT_DEPLOY: '/api/v1/projects/api/projects/{id}/deploy',
  PROJECT_ANALYZE: '/api/v1/projects/api/projects/{id}/analyze',
  GITHUB_INSTALLATIONS: '/api/v1/projects/api/github/installations/{userId}',
  GITHUB_REPOS: '/api/v1/projects/api/github/installations/{id}/repos',
  
  // Infra Service (via gateway)
  DEPLOY_EXECUTE: '/api/v1/infra/deployments/execute',
  DEPLOY_STATUS: '/api/v1/infra/deployments/execute/{id}/status',
  DEPLOY_LIST: '/api/v1/infra/deployments',
  DEPLOY_CANCEL: '/api/v1/infra/deployments/{id}/cancel',
  DEPLOY_ROLLBACK: '/api/v1/infra/deployments/{id}/rollback',
  
  // AI Service (via gateway)
  AI_CHAT: '/api/v1/ai/chat',
  AI_CHAT_STREAM: '/api/v1/ai/chat/stream',
  AI_SESSIONS: '/api/v1/ai/sessions',
  AI_CONTEXT: '/api/v1/ai/context/{projectId}',
  
  // Workflow Service (via gateway)
  WORKFLOW_LIST: '/api/v1/workflows/api/workflows/{projectId}',
  WORKFLOW_RUN: '/api/v1/workflows/api/workflows/{id}/run',
  PIPELINE_LIST: '/api/v1/workflows/api/pipelines/project/{projectId}',
  PIPELINE_CANCEL: '/api/v1/workflows/api/pipelines/{id}/cancel',
  PIPELINE_LOGS: '/api/v1/workflows/api/pipelines/{id}/logs',
  
  // Env-Secrets Service (via gateway)
  ENV_GROUPS: '/api/v1/env-secrets/api/v1/env-groups/{projectId}',
  SECRETS: '/api/v1/env-secrets/api/v1/secrets/{projectId}/{groupId}',
  
  // SRE Service 
  SRE_INCIDENTS: '/api/v1/sre/api/sre/v1/incidents',
  SRE_LOGS: '/api/v1/sre/api/sre/v1/logs',
  SRE_METRICS: '/api/v1/sre/api/sre/v1/metrics/query',
  SRE_DASHBOARD: '/api/v1/sre/api/sre/v1/dashboard',
  
  // Billing Service (via gateway)
  BILLING_ACCOUNT: '/api/v1/billing/organizations/{orgId}/billing',
  BILLING_USAGE: '/api/v1/billing/organizations/{orgId}/usage',
  
  // Notification Service
  NOTIFICATIONS: '/api/v1/notifications/api/v1/notifications/{userId}',
};
```

### WebSocket Endpoints

| Connection | URL | Auth |
|-----------|-----|------|
| Deployment Socket.IO | `ws://{infraUrl}` + `/socket.io/` | `{ userId, organizationId }` in auth |
| Notification WebSocket | `ws://{notifUrl}:3005/ws` | `{ userId }` in connection params |
