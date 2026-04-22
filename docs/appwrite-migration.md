# Appwrite Migration

ThinkDesk now uses Appwrite for authentication and workspace persistence when the `VITE_APPWRITE_*` variables are configured. If those variables are missing, the app still opens with the bundled demo workspace so local development is not blocked.

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

Add these server-side values only when provisioning Appwrite resources:

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-server-api-key
APPWRITE_DATABASE_ID=thinkdesk
APPWRITE_WORKSPACES_TABLE_ID=workspaces
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

## Runtime Behavior

- Login and signup use Appwrite Account.
- Google sign-in uses Appwrite OAuth and requires Google OAuth to be enabled in the Appwrite console.
- On first login, the app seeds the user's Appwrite workspace from the existing demo workspace.
- Workspace pages, tasks, goals, and calendar events are saved back to Appwrite with a short debounce after edits.
