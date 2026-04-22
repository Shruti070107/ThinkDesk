#!/usr/bin/env node

import 'dotenv/config';
import { Permission, Role } from 'appwrite';

const endpoint = getEnv('APPWRITE_ENDPOINT', 'VITE_APPWRITE_ENDPOINT') || 'https://cloud.appwrite.io/v1';
const projectId = getEnv('APPWRITE_PROJECT_ID', 'VITE_APPWRITE_PROJECT_ID');
const apiKey = getEnv('APPWRITE_API_KEY');
const databaseId = getEnv('APPWRITE_DATABASE_ID', 'VITE_APPWRITE_DATABASE_ID') || 'thinkdesk';
const tableId =
  getEnv(
    'APPWRITE_WORKSPACES_TABLE_ID',
    'VITE_APPWRITE_WORKSPACES_TABLE_ID',
    'APPWRITE_WORKSPACES_COLLECTION_ID',
    'VITE_APPWRITE_WORKSPACES_COLLECTION_ID'
  ) || 'workspaces';

const attributes = [
  { type: 'string', key: 'ownerId', size: 64, required: true },
  { type: 'string', key: 'name', size: 128, required: true },
  { type: 'integer', key: 'schemaVersion', required: true, min: 1, max: 99 },
  { type: 'string', key: 'pages', size: 1048576, required: true },
  { type: 'string', key: 'tasks', size: 1048576, required: true },
  { type: 'string', key: 'goals', size: 1048576, required: true },
  { type: 'string', key: 'events', size: 1048576, required: true },
];

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!projectId || !apiKey) {
    throw new Error('Missing APPWRITE_PROJECT_ID and/or APPWRITE_API_KEY. Add them to .env or your shell first.');
  }

  console.log(`Preparing Appwrite database "${databaseId}" and table "${tableId}"...`);

  await ensureDatabase();
  await ensureTable();

  for (const attribute of attributes) {
    await ensureAttribute(attribute);
  }

  await waitForAttributes(attributes.map(attribute => attribute.key));
  await ensureOwnerIndex();

  console.log('Appwrite workspace storage is ready.');
}

function getEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

async function request(path, options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message || `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function exists(path) {
  try {
    await request(path);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

async function ensureDatabase() {
  if (await exists(`/tablesdb/${databaseId}`)) {
    console.log(`Database "${databaseId}" already exists.`);
    return;
  }

  await request('/tablesdb', {
    method: 'POST',
    body: JSON.stringify({
      databaseId,
      name: 'ThinkDesk',
      enabled: true,
    }),
  });
  console.log(`Created database "${databaseId}".`);
}

async function ensureTable() {
  const path = `/tablesdb/${databaseId}/tables/${tableId}`;
  if (await exists(path)) {
    console.log(`Table "${tableId}" already exists.`);
    return;
  }

  await request(`/tablesdb/${databaseId}/tables`, {
    method: 'POST',
    body: JSON.stringify({
      tableId,
      name: 'Workspaces',
      permissions: [Permission.create(Role.users())],
      rowSecurity: true,
      enabled: true,
    }),
  });
  console.log(`Created table "${tableId}".`);
}

async function ensureAttribute(attribute) {
  const path = `/tablesdb/${databaseId}/tables/${tableId}/columns/${attribute.key}`;
  if (await exists(path)) {
    console.log(`Column "${attribute.key}" already exists.`);
    return;
  }

  const body = { ...attribute };
  delete body.type;

  await request(`/tablesdb/${databaseId}/tables/${tableId}/columns/${attribute.type}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  console.log(`Created ${attribute.type} column "${attribute.key}".`);
}

async function waitForAttributes(attributeKeys) {
  const pending = new Set(attributeKeys);
  const deadline = Date.now() + 120000;

  while (pending.size > 0) {
    for (const key of [...pending]) {
      const column = await request(`/tablesdb/${databaseId}/tables/${tableId}/columns/${key}`);
      if (column.status === 'available') {
        pending.delete(key);
      } else if (column.status === 'failed') {
        throw new Error(`Column "${key}" failed to provision.`);
      }
    }

    if (pending.size === 0) break;
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for attributes: ${[...pending].join(', ')}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2500));
  }
}

async function ensureOwnerIndex() {
  const path = `/tablesdb/${databaseId}/tables/${tableId}/indexes/owner_lookup`;
  if (await exists(path)) {
    console.log('Index "owner_lookup" already exists.');
    return;
  }

  await request(`/tablesdb/${databaseId}/tables/${tableId}/indexes`, {
    method: 'POST',
    body: JSON.stringify({
      key: 'owner_lookup',
      type: 'key',
      columns: ['ownerId'],
      orders: ['ASC'],
    }),
  });
  console.log('Created index "owner_lookup".');
}
