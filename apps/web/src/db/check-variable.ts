import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { expenses, categories } from './schema';
import { desc, sql, gte, and } from 'drizzle-orm';

const USER_ID = 'd1afbfc3-a960-4b6d-9039-87c2023601bf';

async function check() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.ddbnbqnqophiatguylxr:***REMOVED***@aws-1-us-west-2.pooler.supabase.com:5432/postgres';
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  // Get ALL expenses for IQR calculation
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const allExpenses = await db
    .select({
      description: expenses.description,
      userShare: expenses.userShare,
      date: expenses.expenseDate,
      categoryId: expenses.categoryId,
    })
    .from(expenses)
    .where(and(
      sql`${expenses.userId} = ${USER_ID}`,
      gte(expenses.expenseDate, ninetyDaysAgo.toISOString().split('T')[0])
    ))
    .orderBy(desc(expenses.userShare));

  // Calculate IQR
  const amounts = allExpenses.map(e => parseFloat(e.userShare as string)).sort((a, b) => a - b);
  const n = amounts.length;
  const q1 = amounts[Math.floor(n / 4)];
  const q3 = amounts[Math.floor(3 * n / 4)];
  const iqr = q3 - q1;
  const upperBound = q3 + 1.5 * iqr;

  console.log(`\n=== IQR Analysis ===`);
  console.log(`Total expenses: ${n}`);
  console.log(`Q1 (25th percentile): $${q1.toFixed(2)}`);
  console.log(`Q3 (75th percentile): $${q3.toFixed(2)}`);
  console.log(`IQR: $${iqr.toFixed(2)}`);
  console.log(`Upper bound (Q3 + 1.5*IQR): $${upperBound.toFixed(2)}`);
  console.log(`\nExpenses ABOVE upper bound (excluded as outliers):`);

  let outlierTotal = 0;
  let normalTotal = 0;

  for (const e of allExpenses) {
    const amount = parseFloat(e.userShare as string);
    if (amount > upperBound) {
      console.log(`  $${amount} - ${e.description}`);
      outlierTotal += amount;
    } else {
      normalTotal += amount;
    }
  }

  console.log(`\n=== Totals ===`);
  console.log(`Outliers total: $${outlierTotal.toFixed(2)}`);
  console.log(`Normal expenses total: $${normalTotal.toFixed(2)}`);
  console.log(`Monthly average (normal only): $${(normalTotal / 3).toFixed(2)}`);

  await client.end();
}

check();
