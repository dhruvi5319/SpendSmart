import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { expenses } from './schema';

const USER_ID = 'd1afbfc3-a960-4b6d-9039-87c2023601bf';

const febExpenses = [
  { date: '2026-02-02', amount: 6.38, description: 'Credit Buy' },
  { date: '2026-02-03', amount: 14.76, description: 'Uber (Namitha + Neha)', is_household: true },
  { date: '2026-02-03', amount: 1, description: 'Uber' },
  { date: '2026-02-04', amount: 4.4, description: 'Uber' },
  { date: '2026-02-05', amount: 8.89, description: 'Cab' },
  { date: '2026-02-06', amount: 19.95, description: 'Cab' },
  { date: '2026-02-07', amount: 16.64, description: 'Uber Split' },
  { date: '2026-02-08', amount: 8.5, description: 'Food' },
  { date: '2026-02-08', amount: 20, description: 'Food (D.N.S.A)' },
  { date: '2026-02-09', amount: 5.50, description: 'DL' },
  { date: '2026-02-09', amount: 12.76, description: 'Misc' },
  { date: '2026-02-10', amount: 100, description: 'Apple' },
  { date: '2026-02-14', amount: 6.76, description: 'Shopping' },
  { date: '2026-02-14', amount: 5.99, description: 'Shopping' },
  { date: '2026-02-14', amount: 15.12, description: 'Shopping' },
  { date: '2026-02-14', amount: 6.16, description: 'Shopping' },
  { date: '2026-02-14', amount: 6.25, description: 'Shopping' },
  { date: '2026-02-14', amount: 6.76, description: 'Shopping' },
  { date: '2026-02-14', amount: 12.19, description: 'Shopping' },
  { date: '2026-02-14', amount: 9.74, description: 'Shopping' },
  { date: '2026-02-14', amount: 15.24, description: 'Shopping' },
  { date: '2026-02-14', amount: 6.93, description: 'Shopping' },
  { date: '2026-02-15', amount: 4.5, description: 'CVS' },
  { date: '2026-02-16', amount: 5.11, description: 'Cab' },
  { date: '2026-02-16', amount: 30.85, description: 'American Eagle' },
  { date: '2026-02-20', amount: 2.66, description: 'Amazon' },
  { date: '2026-02-20', amount: 30.19, description: 'Amazon' },
  { date: '2026-02-20', amount: 7.04, description: 'Amazon' },
  { date: '2026-02-20', amount: 28.31, description: 'Amazon' },
  { date: '2026-02-22', amount: 5.63, description: 'Walgreens', is_household: true },
  { date: '2026-02-22', amount: 7.3, description: 'TA', is_household: true },
  { date: '2026-02-23', amount: 9.99, description: 'Uber One' },
  { date: '2026-02-24', amount: 8.83, description: 'Cab' },
  { date: '2026-02-25', amount: 19.22, description: 'Cab' },
  { date: '2026-02-25', amount: 4.81, description: 'Cab' },
  { date: '2026-02-27', amount: 10, description: 'Misc' },
  { date: '2026-02-28', amount: 9.06, description: 'Cab (Namitha + I)', is_household: true },
  { date: '2026-02-28', amount: 12, description: 'Amazon' },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log('Connecting to database...');
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  console.log('Adding February expenses...');

  for (const exp of febExpenses) {
    const userShare = exp.is_household ? exp.amount / 2 : exp.amount;
    
    await db.insert(expenses).values({
      userId: USER_ID,
      amount: exp.amount.toString(),
      userShare: userShare.toString(),
      description: exp.description,
      expenseDate: exp.date,
      isHousehold: exp.is_household || false,
      householdSize: exp.is_household ? 2 : 1,
      currency: 'USD',
      exchangeRate: '1',
      source: 'manual',
      isRecurring: false,
    });
    
    console.log(`  ✓ ${exp.date}: $${exp.amount} - ${exp.description}`);
  }

  console.log(`\nAdded ${febExpenses.length} February expenses!`);
  
  await client.end();
  process.exit(0);
}

seed().catch(console.error);
