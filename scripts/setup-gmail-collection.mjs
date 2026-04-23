/**
 * Setup script: creates the gmail_tokens collection in Appwrite
 * Run: node scripts/setup-gmail-collection.mjs
 */
import { Client, Databases, Permission, Role } from 'node-appwrite';
import 'dotenv/config';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'thinkdesk';
const COLLECTION_ID = 'gmail_tokens';

async function setup() {
  console.log('Setting up gmail_tokens collection...');

  try {
    // Try to delete existing collection first (idempotent)
    try { await db.deleteCollection(DATABASE_ID, COLLECTION_ID); console.log('Deleted old collection.'); }
    catch (_) { /* doesn't exist */ }

    // Create collection
    await db.createCollection(DATABASE_ID, COLLECTION_ID, 'Gmail Tokens', [
      Permission.read(Role.any()),
      Permission.write(Role.any()),
    ]);
    console.log('✅ Collection created.');

    // Create attributes
    await db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'email', 254, true);
    await db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'access_token', 2048, true);
    await db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'refresh_token', 512, false);
    await db.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'expiry_date', false);
    await db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'token_type', 32, false);
    console.log('✅ Attributes created.');

    // Wait for attributes to be ready, then create index
    await new Promise(r => setTimeout(r, 3000));
    await db.createIndex(DATABASE_ID, COLLECTION_ID, 'email_idx', 'key', ['email'], ['ASC']);
    console.log('✅ Index created.');

    console.log('\n🎉 gmail_tokens collection is ready!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

setup();
