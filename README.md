# Auto-Patch

Auto-Patch is an AI-driven security automation service that performs commit-level security analysis for Node.js repositories.

The system integrates with GitHub via webhooks, analyzes newly pushed commits, computes a security score, and automatically generates corrective Pull Requests when security risks are detected.

The backend service is deployed in a cloud environment and operates as an autonomous third-party security reviewer.

---

## Overview

Auto-Patch:

- Listens to GitHub push events
- Retrieves modified commit files
- Performs AI-based security analysis
- Computes an overall security score (0–100)
- Generates automated patches for insecure JavaScript/TypeScript files
- Maintains a dedicated `auto-patch` branch for remediation
- Creates or updates Pull Requests when required
- Stores analysis results in a relational database
- Provides a web-based dashboard for monitoring and reporting
- Supports manual synchronization of missed commits

---

## Project Structure

```
auto-patch-project/
├── README.md
└── backend/
    ├── package.json
    ├── knexfile.js
    ├── public/
    │   └── index.html
    ├── data/
    │   └── migrations/
    └── src/
        ├── index.js
        ├── githubWebhook.js
        ├── pushHandler.js
        ├── securityAnalysis.js
        └── store.js
```

---

## Architecture

The system follows a modular MVC-style structure:

- **Model:** Commit analyses, issues, scores, and Pull Request metadata stored in a relational database  
- **View:** Web-based security dashboard  
- **Controller:** Webhook handler, commit processing logic, AI integration, and automated PR generation  

---

## Technology Stack

- Node.js
- Express.js
- GitHub REST API (@octokit/rest)
- OpenAI API
- PostgreSQL (Production)
- SQLite (Development)
- Knex.js (Migrations & Query Builder)
- Render (Cloud Hosting)

---

## Deployment

Auto-Patch is deployed as a cloud-based backend service on Render.

In production:
- PostgreSQL is used for persistent storage.
- Database migrations are applied automatically on startup.
- Environment variables are used for secure configuration management.

---

## Environment Variables

Required configuration:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GITHUB_ACCESS_TOKEN`
- `GITHUB_WEBHOOK_SECRET`
- `DATABASE_URL`
- `SECURITY_THRESHOLD`
- `PORT`

---

## Notes

Auto-Patch focuses primarily on JavaScript and Node.js security patterns.  
Automated patch generation is applied only when safe and applicable fixes can be produced.

This project was developed as part of a graduation research project.