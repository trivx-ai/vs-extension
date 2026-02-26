# Trivx AI – VS Code Extension

**Your AI-powered DevOps platform, right inside VS Code.**

Trivx AI brings the full power of the Trivx AI DevOps platform to your editor. Deploy apps, manage projects, chat with AI, run CI/CD pipelines, manage secrets, and monitor infrastructure — all without leaving VS Code.

![Trivx AI](media/trivx-icon.svg)

---

## Features

### 🔐 Authentication

- **Token-based login** — paste your Trivx JWT token
- **Browser login** — authenticate via the Trivx dashboard
- Secure token storage using VS Code SecretStorage

### 🏢 Organization Management

- Switch between organizations
- View organization details and members
- See plan and billing info

### 📦 Project Management

- Create projects linked to GitHub repositories
- Browse projects in the sidebar TreeView
- Auto-detect project from workspace folder
- View tech stack, branch, and repo info

### 🚀 One-Click Deployment

- Deploy to production, staging, or development
- **Real-time deployment progress** via Socket.IO
- Live deployment logs in an OutputChannel
- Progress WebView panel with 12-step phase tracker
- Status bar indicator during deployments

### 🤖 AI Chat Assistant

- Full AI chat panel with SSE streaming
- Context-aware responses based on your project
- **Code actions**: Explain, Refactor, Find Bugs, Security Review, Generate Tests, Add Documentation
- Quick question command from the command palette

### ⚙️ CI/CD Pipelines

- View and trigger workflow pipelines
- Monitor pipeline run status
- View pipeline logs

### 🔑 Secrets & Environment Variables

- Create and manage environment groups
- Add, view, and delete secrets per environment
- Secure handling of sensitive values

### 📊 Monitoring & SRE

- View open incidents with severity indicators
- Query application logs by level
- View performance metrics with ASCII charts
- SRE dashboard with service health overview

---

## Getting Started

1. **Install the extension** from VS Code Marketplace
2. Click the **Trivx icon** in the Activity Bar (sidebar)
3. **Login** using `Trivx: Login` command (Ctrl+Shift+P → "Trivx: Login")
4. **Select an organization** and start managing your projects

---

## Commands

| Command                      | Description                    |
| ---------------------------- | ------------------------------ |
| `Trivx: Login`               | Authenticate with Trivx        |
| `Trivx: Logout`              | Sign out of Trivx              |
| `Trivx: Switch Organization` | Change active organization     |
| `Trivx: Create Project`      | Create a new project           |
| `Trivx: Open Project`        | Switch active project          |
| `Trivx: Deploy`              | Deploy current project         |
| `Trivx: View Deploy Logs`    | Show deployment output         |
| `Trivx: Open AI Chat`        | Open AI chat panel             |
| `Trivx: AI Suggest`          | AI actions on selected code    |
| `Trivx: Run Pipeline`        | Trigger a CI/CD pipeline       |
| `Trivx: View Pipeline`       | View pipeline run details      |
| `Trivx: Manage Secrets`      | Manage env variables & secrets |
| `Trivx: View Logs`           | Query application logs         |
| `Trivx: View Metrics`        | View performance metrics       |
| `Trivx: Open Dashboard`      | Open SRE dashboard             |
| `Trivx: Refresh`             | Refresh all views              |

---

## Configuration

| Setting                         | Default                 | Description                        |
| ------------------------------- | ----------------------- | ---------------------------------- |
| `trivx.apiBaseUrl`              | `http://localhost:3000` | Trivx API Gateway URL              |
| `trivx.wsUrl`                   | `http://localhost:4006` | WebSocket URL for deployments      |
| `trivx.notificationWsUrl`       | `http://localhost:3005` | Notification WebSocket URL         |
| `trivx.autoDetectProject`       | `true`                  | Auto-detect project from workspace |
| `trivx.showDeployNotifications` | `true`                  | Show deploy status notifications   |
| `trivx.aiModel`                 | `gpt-4`                 | AI model for chat                  |
| `trivx.logLevel`                | `info`                  | Extension log level                |

---

## Architecture

```
src/
├── extension.ts          # Entry point
├── constants.ts          # Shared constants, routes, commands
├── utils/                # Logger, config, error handling
├── services/             # API communication layer (11 services)
├── providers/            # TreeView data providers (5 providers)
├── commands/             # Command handlers (8 handlers)
├── views/                # WebView panels (AI chat, deploy progress)
└── statusbar/            # Status bar management
```

---

## Requirements

- VS Code 1.85.0+
- Node.js 18+
- Active Trivx AI account
- GitHub integration for project creation

---

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Watch mode
pnpm run watch

# Package
pnpm run package
```

Press **F5** to launch the Extension Development Host for debugging.

---

## License

Proprietary — Trivx AI © 2024

---

## Support

- Documentation: [docs.trivx.ai](https://docs.trivx.ai)
- Issues: [GitHub Issues](https://github.com/trivx-ai/vscode-extension/issues)
- Community: [Discord](https://discord.gg/trivx)
