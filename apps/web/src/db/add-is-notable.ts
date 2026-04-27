import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  console.log('Adding is_notable column to expenses table...');

  try {
    await db.execute(sql`
      ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "is_notable" boolean DEFAULT false
    `);
    console.log('Column added successfully!');
  } catch (error) {
    console.error('Error:', error);
  }

  await client.end();
}

migrate();
