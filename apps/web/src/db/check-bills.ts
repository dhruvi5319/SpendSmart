import 'dotenv/config';
import postgres from 'postgres';

const USER_ID = 'd1afbfc3-a960-4b6d-9039-87c2023601bf';

async function checkBills() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });

  const result = await client`SELECT name, amount, frequency, due_date, is_active FROM bills WHERE user_id = ${USER_ID}`;

  console.log('Your Bills:');
  for (const bill of result) {
    console.log(`  - ${bill.name}: $${bill.amount} (${bill.frequency}) - Due: ${bill.due_date}`);
  }

  const totalMonthly = result.reduce((sum, b) => {
    let monthly = parseFloat(b.amount);
    if (b.frequency === 'yearly') monthly /= 12;
    if (b.frequency === 'quarterly') monthly /= 3;
    if (b.frequency === 'weekly') monthly *= 4;
    if (b.frequency === 'biweekly') monthly *= 2;
    return sum + monthly;
  }, 0);

  console.log(`\nTotal Monthly Bills: $${totalMonthly.toFixed(2)}`);

  await client.end();
}

checkBills();
