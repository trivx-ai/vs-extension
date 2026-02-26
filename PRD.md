# Trivx AI — VS Code Extension: Product Requirements Document (PRD)

**Version**: 1.0.0  
**Date**: February 26, 2026  
**Product**: Trivx AI VS Code Extension  
**Author**: Trivx Engineering Team

---

## 1. Executive Summary

The **Trivx AI VS Code Extension** brings the full power of the Trivx AI-powered DevOps platform directly into the developer's editor. Instead of context-switching to a web dashboard, developers can authenticate, create projects, connect GitHub repositories, deploy applications, manage environments/secrets, monitor infrastructure, run CI/CD pipelines, and interact with the Trivx AI assistant — all without leaving VS Code.

---

## 2. Problem Statement

Current workflow requires developers to:
1. Switch between VS Code and the Trivx web dashboard constantly
2. Copy-paste project details, environment variables, and deployment configs
3. Lose context when moving from coding to DevOps tasks
4. Wait for deployment feedback in a separate browser tab
5. Manually navigate multiple screens for common operations

**Solution**: A native VS Code extension that integrates the entire Trivx platform into the editor, providing a seamless developer experience with AI-powered DevOps automation.

---

## 3. Target Users

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **Developer** | Writes code, wants fast deployments | One-click deploy, real-time logs, AI chat |
| **DevOps Engineer** | Manages infrastructure and CI/CD | Pipeline management, monitoring, secrets |
| **Tech Lead** | Oversees projects and team | Project overview, team management, billing |
| **SRE** | Responsible for reliability | Incident monitoring, metrics, health checks |

---

## 4. Feature Requirements

### 4.1 Authentication & Account Management (P0 — Must Have)

| Feature | Description |
|---------|-------------|
| **Login/Signup** | Authenticate via Clerk (email/password, Google OAuth, GitHub OAuth) |
| **Session Management** | Persistent auth token storage in VS Code SecretStorage |
| **Account Info** | View profile, current organization, plan tier in status bar |
| **Logout** | Clear tokens and reset session |
| **Auto-refresh** | Automatic token refresh before expiry |

### 4.2 Organization Management (P0 — Must Have)

| Feature | Description |
|---------|-------------|
| **View Organizations** | List user's organizations in sidebar TreeView |
| **Switch Organization** | Quick-switch between organizations |
| **Organization Details** | View name, slug, plan, member count |
| **Team Members** | View member list with roles |
| **Invite Members** | Invite by email with role selection (Admin/Developer/Viewer) |

### 4.3 Project Management (P0 — Must Have)

| Feature | Description |
|---------|-------------|
| **List Projects** | TreeView of all projects in current organization |
| **Create Project** | Multi-step project creation wizard via QuickPick |
| **Project Details** | View framework, language, repo, deployment status |
| **Link Repository** | Connect GitHub repository to project |
| **Auto-Detect Project** | Auto-detect current workspace as a Trivx project |
| **Delete Project** | Delete with confirmation dialog |

### 4.4 Deployment (P0 — Must Have)

| Feature | Description |
|---------|-------------|
| **One-Click Deploy** | Deploy current project from command palette or button |
| **Real-Time Progress** | WebView panel showing deployment steps with Socket.IO |
| **Deployment Logs** | Live log streaming in Output Channel |
| **Deployment History** | View past deployments with status, URL, timestamps |
| **Cancel Deployment** | Cancel in-progress deployment |
| **Rollback** | Rollback to previous deployment |
| **Deploy Status Bar** | Status bar indicator showing current deployment state |

### 4.5 AI Assistant (P0 — Must Have)

| Feature | Description |
|---------|-------------|
| **AI Chat Panel** | WebView-based chat panel with SSE streaming |
| **Context-Aware** | Uses project RAG context for intelligent responses |
| **Intent Actions** | AI can trigger deploys, scaling, diagnostics from chat |
| **Quick Actions** | Pre-built buttons: Deploy, Build, Pipeline Status, Scale |
| **Session History** | View and resume past AI chat sessions |
| **Code Context** | Send selected code to AI for analysis |
| **Markdown Rendering** | Rich markdown rendering in chat responses |

### 4.6 CI/CD Pipelines (P1 — Should Have)

| Feature | Description |
|---------|-------------|
| **View Workflows** | List project workflows/pipelines |
| **Trigger Pipeline** | Run pipeline from command palette |
| **Pipeline Status** | Real-time pipeline execution status |
| **Pipeline Logs** | View build logs in Output Channel |
| **Cancel Pipeline** | Cancel running pipeline |

### 4.7 Environment & Secrets Management (P1 — Should Have)

| Feature | Description |
|---------|-------------|
| **Environment Groups** | View/create environment groups (dev/staging/prod) |
| **Manage Secrets** | Add/update/delete secrets (masked values) |
| **Copy from .env** | Import secrets from local `.env` file |
| **Audit Log** | View secret access audit trail |

### 4.8 Monitoring & SRE (P1 — Should Have)

| Feature | Description |
|---------|-------------|
| **Service Health** | View health status of all services |
| **Incidents** | View open incidents with severity badges |
| **Metrics Dashboard** | Basic metrics display in WebView |
| **Logs Viewer** | Query and view application logs |
| **Notifications** | Real-time notification popup via WebSocket |

### 4.9 Billing & Usage (P2 — Nice to Have)

| Feature | Description |
|---------|-------------|
| **Current Plan** | View current plan and limits |
| **Usage Stats** | View deployment count, build minutes, storage usage |
| **Upgrade Plan** | Open Polar checkout in browser for plan upgrade |

### 4.10 Repository Analysis (P2 — Nice to Have)

| Feature | Description |
|---------|-------------|
| **Trigger Analysis** | Analyze repository from command palette |
| **Analysis Results** | View framework, language, build tools, dependencies |
| **AI Summary** | View AI-generated project summary |

---

## 5. User Flows

### 5.1 First-Time Setup

```
Install Extension → Login Command → Clerk Auth (browser) → Token stored
→ Auto-fetch organizations → Select/create organization
→ If workspace matches a project → auto-link
→ Ready to use
```

### 5.2 Deploy Project

```
Open Command Palette → "Trivx: Deploy Project"
→ Select environment (dev/staging/prod)
→ Confirm deployment
→ Deployment Progress WebView opens
→ Real-time logs stream to Output Channel
→ Success: deployment URL shown with "Open in Browser" button
→ Failure: error details + AI-suggested fix
```

### 5.3 AI Chat

```
Click Trivx AI icon in sidebar → Chat panel opens
→ Type message (e.g., "Deploy my app to production")
→ AI classifies intent → Executes deployment
→ Real-time streaming response in chat
→ Deployment progress shown alongside chat
```

---

## 6. UI/UX Design

### 6.1 Sidebar (Activity Bar)

Trivx icon in Activity Bar revealing a TreeView with sections:
- **Organization** — Current org name, switch button
- **Projects** — Project list with status indicators
- **Deployments** — Recent deployment history
- **Pipelines** — CI/CD pipeline status
- **Monitoring** — Health status summary

### 6.2 Status Bar

Left-to-right:
- Trivx icon + organization name
- Current project name (if auto-detected)
- Deploy status indicator (idle/deploying/live/failed)

### 6.3 WebView Panels

| Panel | Purpose |
|-------|---------|
| **AI Chat** | Full chat interface with markdown, code blocks, quick actions |
| **Deployment Progress** | Step-by-step deployment progress with animated indicators |
| **Project Dashboard** | Project details, stats, and quick actions |
| **Metrics Viewer** | Charts and metrics visualization |

### 6.4 Command Palette Commands

| Command | Description |
|---------|-------------|
| `Trivx: Login` | Authenticate with Trivx |
| `Trivx: Logout` | Sign out |
| `Trivx: Switch Organization` | Change active organization |
| `Trivx: Create Project` | Create new project |
| `Trivx: Deploy` | Deploy current project |
| `Trivx: Cancel Deployment` | Cancel active deployment |
| `Trivx: Rollback Deployment` | Rollback to previous version |
| `Trivx: Open AI Chat` | Open AI assistant panel |
| `Trivx: View Deployments` | Show deployment history |
| `Trivx: Run Pipeline` | Trigger CI/CD pipeline |
| `Trivx: Manage Secrets` | Open secrets manager |
| `Trivx: View Incidents` | Show open incidents |
| `Trivx: View Logs` | Open log viewer |
| `Trivx: Show Dashboard` | Open project dashboard |
| `Trivx: View Usage` | View usage and billing |
| `Trivx: Analyze Repository` | Trigger repo analysis |
| `Trivx: Open Settings` | Extension settings |

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Startup Time** | < 500ms extension activation |
| **API Latency** | < 200ms for cached data |
| **Token Security** | VS Code SecretStorage (OS keychain) |
| **Offline Mode** | Graceful degradation with cached data |
| **Auto-Update** | Extension auto-updates via VS Code marketplace |
| **Telemetry** | Opt-in usage analytics |
| **Accessibility** | Full keyboard navigation, screen reader support |
| **Min VS Code Version** | 1.85.0+ |

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| **Install-to-first-deploy time** | < 5 minutes |
| **Context switches reduced** | 80% fewer browser switches |
| **Deployment trigger speed** | < 3 clicks from editor to deploy |
| **AI chat response time** | < 2s first token |
| **Daily active users** | 60% of Trivx users use extension |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth token security | High | Use VS Code SecretStorage (OS keychain) |
| API rate limiting | Medium | Client-side caching, debounce requests |
| WebSocket reliability | Medium | Auto-reconnection with exponential backoff |
| Extension size | Low | Tree-shake dependencies, lazy loading |
| Clerk auth in VS Code | Medium | Browser-based OAuth flow with callback URI handler |

---

## 10. Release Phases

### Phase 1 — MVP (Weeks 1-3)
- Authentication (login/logout)
- Organization & project listing
- One-click deployment with real-time progress
- AI chat panel with SSE streaming
- Deploy status in status bar

### Phase 2 — Enhanced (Weeks 4-6)
- CI/CD pipeline management
- Environment & secrets management
- Deployment history and rollback
- Monitoring & incidents view
- Notifications

### Phase 3 — Advanced (Weeks 7-9)
- Advanced AI actions (scale, diagnose)
- Metrics dashboard WebView
- Billing & usage display
- Repository analysis
- Multi-workspace support

---

## 11. Appendix: API Endpoints Consumed

The extension communicates with the Trivx backend through the **API Gateway** (port 3000) or directly to services:

| Service | Base Path | Key Endpoints |
|---------|-----------|---------------|
| Auth | `/api/v1/auth` | login, user profile, validate token |
| Organization | `/api/v1/organizations` | CRUD, members, invitations |
| Project | `/api/v1/projects` | CRUD, GitHub linking, deploy trigger |
| Infra | `/api/v1/infra` | Deploy execute, status, environments |
| AI | `/api/v1/ai` | Chat, stream, context, sessions |
| Workflow | `/api/v1/workflows` | List, trigger, logs, cancel |
| Billing | `/api/v1/billing` | Account, usage, checkout |
| Secrets | `/api/v1/env-secrets` | Groups, secrets, audit |
| SRE | `/api/v1/sre` | Metrics, logs, incidents |
| Notifications | `/api/v1/notifications` | List, mark read |
| Repo Analyzer | `/api/v1/repo` | Trigger analysis, get results |
