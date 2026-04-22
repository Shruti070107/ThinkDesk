import {
  Account,
  Client,
  ID,
  OAuthProvider,
  Permission,
  Query,
  Role,
  TablesDB,
} from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT?.trim() || 'https://sgp.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID?.trim() || '';
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID?.trim() || 'thinkdesk';
const workspacesTableId =
  import.meta.env.VITE_APPWRITE_WORKSPACES_TABLE_ID?.trim() ||
  import.meta.env.VITE_APPWRITE_WORKSPACES_COLLECTION_ID?.trim() ||
  'workspaces';

export const appwriteConfig = {
  endpoint,
  projectId,
  databaseId,
  workspacesTableId,
  isConfigured: Boolean(projectId && endpoint && databaseId && workspacesTableId),
};

export const appwriteClient = new Client().setEndpoint(endpoint);

if (projectId) {
  appwriteClient.setProject(projectId);
}

export const appwriteAccount = new Account(appwriteClient);
export const appwriteTablesDB = new TablesDB(appwriteClient);

export { ID, OAuthProvider, Permission, Query, Role };
