import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { categories, expenses } from './schema';
import { eq } from 'drizzle-orm';

const USER_ID = 'd1afbfc3-a960-4b6d-9039-87c2023601bf';

async function addCategory() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.ddbnbqnqophiatguylxr:***REMOVED***@aws-1-us-west-2.pooler.supabase.com:5432/postgres';
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  // Create "Big Purchases" category (as a default category so all users can use it)
  console.log('Creating "Big Purchases" category...');

  const newCategory = await db.insert(categories).values({
    name: 'Big Purchases',
    icon: 'shopping-bag',
    color: '#9333ea', // Purple
    isDefault: true,
    userId: null, // Default category available to all users
  }).returning();

  console.log('✓ Created category:', newCategory[0]);

  // Update the $3,500 Car expense to use this category
  const carExpenses = await db.select().from(expenses).where(eq(expenses.description, 'Car'));

  if (carExpenses.length > 0) {
    console.log(`\nFound ${carExpenses.length} "Car" expense(s). Updating to "Big Purchases" category...`);

    await db.update(expenses)
      .set({ categoryId: newCategory[0].id })
      .where(eq(expenses.description, 'Car'));

    console.log('✓ Updated Car expense to Big Purchases category');
  }

  await client.end();
  console.log('\nDone!');
}

addCategory();
