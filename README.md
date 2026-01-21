# Auto-Patch – Minimal Reference Implementation

This repository contains a minimal end-to-end prototype of **Auto-Patch**, a third‑party service that:

- Listens to **GitHub push webhooks**.
- Fetches the changed files of each commit.
- Sends them to an **OpenAI model** for security analysis.
- Computes a **security score**.
- If the score is below a configurable threshold, automatically creates a **GitHub Pull Request** with AI‑generated patches.
- Exposes a small **dashboard UI** to show recent analyses and PR links.

> ⚠️ This is a prototype intended for a graduation project. You should treat it as a starting point and harden it before using in production.

## 1. Project structure

```
auto-patch-project/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── public/
│   │   └── index.html         # Simple dashboard UI
│   └── src/
│       ├── index.js           # Express server entry point
│       ├── githubWebhook.js   # Webhook router + signature verification
│       ├── pushHandler.js     # Handles push events, calls AI, creates PRs
│       ├── securityAnalysis.js# OpenAI integration and result parsing
│       └── store.js           # In‑memory storage for dashboard
└── README.md
```

## 2. Required keys and configuration

Copy the example environment file and fill in your real values:

```bash
cd backend
cp .env.example .env
```

Then edit `.env`:

- **OPENAI_API_KEY**: Your key from the OpenAI dashboard.
- **OPENAI_MODEL**: Model name (e.g. `gpt-4.1-mini`). You can change it if you have access to other models.
- **GITHUB_ACCESS_TOKEN**: GitHub **personal access token (classic)** with at least:
  - `repo` scope (read/write to repositories).
- **GITHUB_WEBHOOK_SECRET**: Any random secret string. Use the same value when creating the webhook in GitHub.
- **PUBLIC_BASE_URL**: Base URL where GitHub can reach your backend. For local testing you can use a tunneling service and put its HTTPS URL here (not strictly required for the core logic but useful in PR text).
- **SECURITY_THRESHOLD**: Number from 0–100. If the AI score for a commit is **below** this value, Auto‑Patch tries to open a PR (default = 80).
- **PORT**: Port to run the backend on (default = 4000).

## 3. Running the backend locally

1. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Start the server:

   ```bash
   npm run start
   # or during development
   npm run dev
   ```

   By default it listens on `http://localhost:4000`.

3. Open the dashboard in your browser:

   - Go to `http://localhost:4000/`
   - You will see a table of recent commit analyses once webhooks start arriving.

## 4. Connecting GitHub (webhooks)

1. Make sure your backend is reachable from the internet:
   - For local development you can use a tunneling service (e.g. `https://xyz.ngrok.io`) that forwards to `http://localhost:4000`.
   - Put that URL in GitHub when configuring the webhook.

2. In your **GitHub repository** (the one whose commits you want to scan):

   - Go to **Settings → Webhooks → Add webhook**.
   - **Payload URL**: `https://YOUR-PUBLIC-URL/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: The same value as `GITHUB_WEBHOOK_SECRET` in your `.env`.
   - **Which events?**: Choose **"Just the push event"**.
   - Save.

3. Push a commit to that repository:
   - GitHub will send a `push` event to your backend.
   - The server:
     - Verifies the signature.
     - Fetches changed files for each commit.
     - Sends them to OpenAI for analysis.
     - Computes a score and, if needed, opens a PR with patches.
   - The dashboard table will update with:
     - Repository name.
     - Commit hash.
     - Score.
     - Number of issues.
     - Link to the created PR (if any).

## 5. How the security analysis works (high level)

1. **`pushHandler.js`**:
   - Receives the push payload.
   - For each commit:
     - Collects the list of added + modified files.
     - Uses the GitHub API to download their contents at that commit.
     - Calls `analyzeCommitWithAI` with repository/commit metadata and file contents.

2. **`securityAnalysis.js`**:
   - Builds a detailed prompt describing the commit and changed files.
   - Calls the OpenAI **Chat Completions** API with your `OPENAI_API_KEY`.
   - Asks the model to respond with **strict JSON** containing:
     - `overall_score` (0–100).
     - `issues[]` (title, severity, description, filePath, line).
     - `patches[]` (filePath, patchedContent).
   - Parses the JSON and converts it into an internal analysis object.

3. **`AnalysisStore` (`store.js`)**:
   - Keeps the last 100 analysis entries in memory so that:
     - `/api/analyses` can return them to the dashboard.
     - Each entry can later be updated with the PR URL.

4. **Automatic Pull Request** (`createPatchPullRequest` in `pushHandler.js`):
   - If `overallScore` < `SECURITY_THRESHOLD` and there are patches:
     - Creates a new branch: `auto-patch/<short-commit-id>`.
     - Uses the **Contents API** to overwrite the affected files on that branch with `patchedContent` from the AI.
     - Opens a PR from the new branch into the default branch.
     - Adds a summary of issues into the PR description.
     - Stores the PR URL in the analysis entry so it appears in the dashboard.

## 6. Notes & limitations

- The code is intentionally simple and does **not** include:
  - Persistent storage (everything is in memory).
  - Authentication for the dashboard.
  - Complex rate limiting or retry logic.
- The OpenAI part assumes a **Chat Completions** compatible model and a relatively small commit size.
  - For large repos/commits you would want to:
    - Slice files.
    - Batch requests.
    - Possibly stream analysis.
- GitHub PAT is used instead of a GitHub App for simplicity (sufficient for a graduation project prototype).

## 7. Summary of required keys

| Key name            | Where to get it / what it is                                      |
|---------------------|--------------------------------------------------------------------|
| `OPENAI_API_KEY`    | From your OpenAI account dashboard                               |
| `OPENAI_MODEL`      | Name of the model (e.g. `gpt-4.1-mini`)                          |
| `GITHUB_ACCESS_TOKEN` | GitHub PAT (classic) with `repo` scope                        |
| `GITHUB_WEBHOOK_SECRET` | Any random secret string; repeat it in the GitHub webhook  |
| `PUBLIC_BASE_URL`   | Public URL of this backend (or `http://localhost:4000` locally) |
| `SECURITY_THRESHOLD`| Score threshold (0–100) to decide when to open a PR             |
| `PORT`              | Local port for the backend (default `4000`)                     |

With this code + configuration you have a full, runnable prototype that matches your project description:
- Follows GitHub commits via webhooks.
- Uses AI to evaluate security and compute a score.
- Shows results in a simple UI.
- Automatically opens PRs with patches when the commit is not secure enough.
