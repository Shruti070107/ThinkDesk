# ThinkDesk AI

ThinkDesk AI is a productivity workspace for email triage, scheduling, tasks, and follow-ups.

## Current Architecture

- Frontend: React, Vite, TypeScript, Tailwind, shadcn/ui
- Auth and persistence: Appwrite Account, TablesDB, and Sites
- Gmail sync: Appwrite Google OAuth plus the `gmail-api` Appwrite Function
- Legacy local backend: kept in `backend/` only as a reference for older experiments

## Gmail Sync

ThinkDesk now syncs Gmail through Appwrite instead of the old localhost OAuth server.

1. The user signs in with Google through Appwrite Auth.
2. ThinkDesk finishes the Appwrite session after the OAuth redirect, including mobile browsers.
3. The `gmail-api` function uses the signed-in user's Appwrite Google identity to read or send Gmail.
4. Connected Gmail identities appear automatically in the inbox account switcher.

No `gmail_tokens` table or local Google client secret flow is required for the Appwrite path.

## Environment

Client-side Vite config:

```bash
VITE_GOOGLE_AI_API_KEY=your-google-ai-api-key
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-appwrite-project-id
VITE_APPWRITE_DATABASE_ID=thinkdesk
VITE_APPWRITE_WORKSPACES_TABLE_ID=workspaces
```

Server-side Appwrite config used for provisioning or deployments:

```bash
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-appwrite-project-id
APPWRITE_API_KEY=your-appwrite-api-key
APPWRITE_DATABASE_ID=thinkdesk
APPWRITE_WORKSPACES_TABLE_ID=workspaces
FRONTEND_URL=https://your-thinkdesk-site.appwrite.network
```

## Local Development

```bash
npm install
npm run build
npm run dev
```

When Appwrite is configured, the app uses Appwrite for auth, workspace sync, and Gmail sync in both local and deployed environments.
