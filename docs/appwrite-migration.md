# Appwrite Migration

ThinkDesk now uses Appwrite for authentication, workspace persistence, and Gmail sync when the `VITE_APPWRITE_*` variables are configured. If those variables are missing, the app still opens with the bundled demo workspace so local development is not blocked.

## Appwrite MCP

The Appwrite MCP server is `io.github.appwrite/mcp-for-api` from `appwrite/mcp-for-api`. It runs with:

```bash
uvx mcp-server-appwrite
```

Configure the MCP server with these environment variables:

```bash
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-server-api-key
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
```

The API key must stay outside client code and Git. Use it only in your local shell, MCP client config, or deployment secrets.

## Project Environment

Add these public client-side values to `.env` for the Vite app:

```bash
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=thinkdesk
VITE_APPWRITE_WORKSPACES_TABLE_ID=workspaces
```

Add these server-side values only when provisioning Appwrite resources or deploying the Gmail function:

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-server-api-key
APPWRITE_DATABASE_ID=thinkdesk
APPWRITE_WORKSPACES_TABLE_ID=workspaces
FRONTEND_URL=https://your-site.appwrite.network
```

## Provision Resources

After exporting the server-side variables above, run:

```bash
npm run appwrite:setup
```

The setup creates:

- Database: `thinkdesk`
- Table: `workspaces`
- Row security enabled
- User create permission on the table
- Per-user read/update/delete permissions on each workspace row
- Columns: `ownerId`, `name`, `schemaVersion`, `pages`, `tasks`, `goals`, `events`
- Index: `owner_lookup`

## Gmail Sync Architecture

ThinkDesk no longer depends on the old localhost Gmail OAuth server or a `gmail_tokens` table.

The current Gmail flow is:

1. Enable the Google provider in Appwrite Auth.
2. Use Google login with Gmail scopes so sign-in and Gmail connection complete in one pass.
3. Start `Connect Gmail Account` only when the user signed in with email/password or wants to link an extra Gmail inbox.
4. Return to ThinkDesk with Appwrite OAuth token parameters.
5. Finish the Appwrite session in the browser callback step.
6. Execute the `gmail-api` Appwrite Function with the signed-in user's Appwrite session.
7. Read connected Google identities from Appwrite and use their provider access token or refresh token for Gmail API calls.

This keeps Gmail access tied to the Appwrite-authenticated user and fixes the mobile redirect/session race that could leave users stuck after Google sign-in.

## Google Verification

Google login now requests Gmail scopes so the inbox is connected immediately after Google sign-in.

Because Gmail scopes are sensitive, Google can still show a warning screen until the OAuth app is fully approved in Google Cloud. During testing, add the Gmail accounts you use to the Google OAuth consent screen test-user list and make sure the consent screen declares the exact Gmail scopes requested by ThinkDesk.

## Mobile Login Fix

Older builds relied on Appwrite's direct OAuth session redirect behavior. That was unreliable on some phone browsers because the browser returned to the app before the Appwrite session was fully visible to the SPA.

The current flow uses:

- `createOAuth2Token(...)` instead of direct session creation
- a callback handoff inside ThinkDesk
- `account.createSession({ userId, secret })` after redirect
- a short retry loop before routing to the dashboard

The callback now returns through the app root with query params, so the login flow does not depend on a separate deep route being served by the hosting platform.

## Runtime Behavior

- Email/password login and signup use Appwrite Account.
- Google sign-in uses Appwrite OAuth and requires the Google provider to be enabled in the Appwrite console.
- Gmail sync is automatic for any Google identity linked through Appwrite.
- On first login, the app seeds the user's Appwrite workspace from the existing demo workspace.
- Workspace pages, tasks, goals, and calendar events are saved back to Appwrite with a short debounce after edits.
