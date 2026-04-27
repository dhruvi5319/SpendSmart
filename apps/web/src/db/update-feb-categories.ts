import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { expenses, categories } from './schema';
import { eq, and, like, or, isNull } from 'drizzle-orm';

const USER_ID = 'd1afbfc3-a960-4b6d-9039-87c2023601bf';

// Mapping of expense descriptions to category names
const categoryMappings: Record<string, string> = {
  // Transport
  'Uber': 'Transport',
  'Cab': 'Transport',
  'Uber Split': 'Transport',
  'Uber One': 'Transport',

  // Shopping
  'Shopping': 'Shopping',
  'American Eagle': 'Shopping',
  'Amazon': 'Shopping',
  'CVS': 'Shopping',
  'Walgreens': 'Shopping',
  'Apple': 'Shopping',

  // Food
  'Food': 'Dining',

  // Other/Misc
  'Credit Buy': 'Other',
  'DL': 'Other',
  'Misc': 'Other',
  'TA': 'Other',
};

async function updateCategories() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.ddbnbqnqophiatguylxr:***REMOVED***@aws-1-us-west-2.pooler.supabase.com:5432/postgres';

  console.log('Connecting to database...');
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  // Get all default categories
  console.log('Fetching categories...');
  const allCategories = await db.select().from(categories).where(isNull(categories.userId));

  console.log('Available categories:');
  const categoryMap = new Map<string, string>();
  for (const cat of allCategories) {
    console.log(`  - ${cat.name} (${cat.id})`);
    categoryMap.set(cat.name, cat.id);
  }

  // Get all February expenses without categories
  console.log('\nFetching February expenses...');
  const febExpenses = await db.select().from(expenses).where(
    and(
      eq(expenses.userId, USER_ID),
      isNull(expenses.categoryId),
    )
  );

  console.log(`Found ${febExpenses.length} uncategorized expenses\n`);

  let updated = 0;
  for (const expense of febExpenses) {
    let categoryName: string | null = null;

    // Find matching category based on description
    for (const [keyword, catName] of Object.entries(categoryMappings)) {
      if (expense.description.includes(keyword)) {
        categoryName = catName;
        break;
      }
    }

    if (categoryName) {
      const categoryId = categoryMap.get(categoryName);
      if (categoryId) {
        await db.update(expenses)
          .set({ categoryId })
          .where(eq(expenses.id, expense.id));
        console.log(`  ✓ "${expense.description}" → ${categoryName}`);
        updated++;
      } else {
        console.log(`  ✗ "${expense.description}" - Category "${categoryName}" not found`);
      }
    } else {
      console.log(`  ? "${expense.description}" - No mapping found, setting to "Other"`);
      const otherId = categoryMap.get('Other');
      if (otherId) {
        await db.update(expenses)
          .set({ categoryId: otherId })
          .where(eq(expenses.id, expense.id));
        updated++;
      }
    }
  }

  console.log(`\nUpdated ${updated} expenses with categories!`);

  await client.end();
  process.exit(0);
}

updateCategories().catch(console.error);
