import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { expenses, categories } from './schema';
import { eq, isNull } from 'drizzle-orm';

const USER_ID = 'd1afbfc3-a960-4b6d-9039-87c2023601bf';

// Cab expenses (22 entries) - spread across March
const cabAmounts = [
  14.05, 15.64, 14.21, 15.29, 15.12, 13.90, 16.70, 14.36,
  15.19, 13.52, 15.46, 12.74, 13.85, 8.00, 13.74, 0.41, 13.85,
  13.96, 35.87, 7.49, 3, 24
];

// Other March expenses
const otherExpenses = [
  { date: '2026-03-01', amount: 390, description: 'Tamisha', category: 'Other' },
  { date: '2026-03-02', amount: 10, description: "Zohri's Deli Gift", category: 'Dining' },
  { date: '2026-03-02', amount: 3.85, description: "Zohri's Deli Gift", category: 'Dining' },
  { date: '2026-03-05', amount: 77.98, description: 'Kate Spade (Swara & Shamith)', category: 'Shopping' },
  { date: '2026-03-08', amount: 100, description: 'Claude', category: 'Other' },
  { date: '2026-03-10', amount: 20, description: 'Gift', category: 'Shopping' },
  { date: '2026-03-01', amount: 580, description: 'Rent', category: 'Housing' },
  { date: '2026-03-15', amount: 35.44, description: 'Ambi Bday', category: 'Shopping' },
  { date: '2026-03-20', amount: 10, description: 'Ride', category: 'Transport' },
  { date: '2026-03-25', amount: 21, description: 'Discover', category: 'Other' },
  { date: '2026-03-28', amount: 19, description: 'Discover', category: 'Other' },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log('Connecting to database...');
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  // Get category IDs
  const allCategories = await db.select().from(categories).where(isNull(categories.userId));
  const categoryMap = new Map<string, string>();
  for (const cat of allCategories) {
    categoryMap.set(cat.name, cat.id);
  }

  console.log('Adding March expenses...\n');

  // Add cab expenses spread across March (22 entries over ~30 days)
  console.log('Adding 22 cab expenses...');
  const cabDates = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 27, 28];
  const transportCategoryId = categoryMap.get('Transport');

  for (let i = 0; i < cabAmounts.length; i++) {
    const day = cabDates[i];
    const dateStr = `2026-03-${day.toString().padStart(2, '0')}`;

    await db.insert(expenses).values({
      userId: USER_ID,
      amount: cabAmounts[i].toString(),
      userShare: cabAmounts[i].toString(),
      description: 'Cab',
      expenseDate: dateStr,
      categoryId: transportCategoryId,
      isHousehold: false,
      householdSize: 1,
      currency: 'USD',
      exchangeRate: '1',
      source: 'manual',
      isRecurring: false,
    });

    console.log(`  ✓ ${dateStr}: $${cabAmounts[i]} - Cab`);
  }

  // Add other expenses
  console.log('\nAdding other expenses...');
  for (const exp of otherExpenses) {
    const categoryId = categoryMap.get(exp.category);

    await db.insert(expenses).values({
      userId: USER_ID,
      amount: exp.amount.toString(),
      userShare: exp.amount.toString(),
      description: exp.description,
      expenseDate: exp.date,
      categoryId: categoryId,
      isHousehold: false,
      householdSize: 1,
      currency: 'USD',
      exchangeRate: '1',
      source: 'manual',
      isRecurring: false,
    });

    console.log(`  ✓ ${exp.date}: $${exp.amount} - ${exp.description} (${exp.category})`);
  }

  const totalExpenses = cabAmounts.length + otherExpenses.length;
  const cabTotal = cabAmounts.reduce((sum, a) => sum + a, 0);
  const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  console.log(`\n========================================`);
  console.log(`Added ${totalExpenses} March expenses!`);
  console.log(`  Cab total: $${cabTotal.toFixed(2)}`);
  console.log(`  Other total: $${otherTotal.toFixed(2)}`);
  console.log(`  Grand total: $${(cabTotal + otherTotal).toFixed(2)}`);
  console.log(`========================================`);

  await client.end();
  process.exit(0);
}

seed().catch(console.error);
