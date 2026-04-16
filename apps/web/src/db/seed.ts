import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { categories, defaultCategories } from './schema';

async function seed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  console.log('Seeding default categories...');

  try {
    // Insert default categories
    for (const category of defaultCategories) {
      await db
        .insert(categories)
        .values({
          userId: null, // null = default category
          name: category.name,
          icon: category.icon,
          color: category.color,
          isDefault: true,
        })
        .onConflictDoNothing();

      console.log(`  ✓ ${category.name}`);
    }

    console.log('\nSeeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }

  await client.end();
  process.exit(0);
}

seed();
