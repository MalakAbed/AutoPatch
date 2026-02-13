# Auto-Patch

Auto-Patch is an AI-driven security automation service designed to perform commit-level security analysis for Node.js repositories.

The system integrates with GitHub using webhooks, analyzes newly pushed commits, computes a security score, and automatically generates corrective Pull Requests when security risks are detected.

---

## Overview

Auto-Patch operates as an autonomous third-party service that:

- Listens to GitHub push events
- Retrieves modified commit files
- Performs AI-based security analysis
- Computes an overall security score (0–100)
- Generates automated patches for insecure JavaScript/TypeScript files
- Creates or updates a dedicated `auto-patch` branch
- Opens Pull Requests when remediation is required
- Stores analysis results in a persistent database
- Provides a web-based dashboard for monitoring and reporting

---

## Project Structure

```
auto-patch-project/
├── README.md
└── backend/
    ├── package.json
    ├── knexfile.js
    ├── public/
    │   └── index.html          # Dashboard UI
    ├── data/
    │   └── migrations/         # Database migrations
    └── src/
        ├── index.js            # Express server entry point
        ├── githubWebhook.js    # Webhook handler + signature verification
        ├── pushHandler.js      # Commit processing + PR automation
        ├── securityAnalysis.js # AI integration and scoring logic
        └── store.js            # Database access layer (Knex)
```

---

## Architecture

The system follows a modular MVC-style structure:

- **Model:** Commit analyses, detected issues, security scores, and PR metadata stored in a relational database  
- **View:** Web-based dashboard interface  
- **Controller:** Webhook handler, commit processing logic, AI integration, and Pull Request automation  

---

## Technology Stack

- Node.js (Backend)
- Express.js
- GitHub REST API (via @octokit/rest)
- OpenAI API (AI-based analysis)
- PostgreSQL (Production database)
- SQLite (Development database)
- Knex.js (Database migrations and query builder)

---

## Key Features

- Real-time commit monitoring via GitHub Webhooks
- AI-based vulnerability detection
- Automated security scoring
- Automatic Pull Request generation for insecure commits
- Manual synchronization of missed commits
- Contributor-level security reporting
- Dashboard visualization of analysis metrics

---

## Environment Configuration

The system requires the following environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GITHUB_ACCESS_TOKEN`
- `GITHUB_WEBHOOK_SECRET`
- `DATABASE_URL` (for production)
- `SECURITY_THRESHOLD`
- `PORT`

---

## Running Locally

```bash
cd backend
npm install
npm run dev
```

By default, the backend runs on:

```
http://localhost:4000
```

---

## Deployment

Auto-Patch can be deployed as a cloud-based backend service.  
In production, it uses PostgreSQL for persistent storage and applies database migrations automatically on startup.

---

## Notes

Auto-Patch focuses primarily on JavaScript and Node.js security patterns.  
Automated patch generation is applied only when safe and applicable fixes can be produced.

This project was developed as part of a graduation research project.