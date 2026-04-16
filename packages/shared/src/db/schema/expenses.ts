import { pgTable, uuid, varchar, decimal, text, date, boolean, integer, bigint, timestamp, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { categories } from './categories';

/**
 * Expense source types
 */
export const expenseSourceEnum = ['manual', 'receipt_scan', 'csv_import', 'splitwise'] as const;
export type ExpenseSource = (typeof expenseSourceEnum)[number];

/**
 * Expenses table
 * Based on Technical Documentation
 *
 * Key features:
 * - amount: Full amount paid
 * - user_share: User's actual share (amount / household_size for household expenses)
 * - is_household: Whether this is a shared household expense
 * - household_size: Number of people sharing the expense
 */
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

  // Amount fields
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  userShare: decimal('user_share', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1.0'),

  // Details
  description: varchar('description', { length: 255 }).notNull(),
  notes: text('notes'),
  expenseDate: date('expense_date').notNull(),

  // Household sharing
  isHousehold: boolean('is_household').default(false),
  householdSize: integer('household_size').default(1),

  // Recurring
  isRecurring: boolean('is_recurring').default(false),
  recurringId: uuid('recurring_id'),

  // Receipt
  receiptUrl: varchar('receipt_url', { length: 500 }),

  // Source & ML
  source: varchar('source', { length: 20 }).default('manual'),
  mlCategoryConfidence: decimal('ml_category_confidence', { precision: 5, scale: 4 }),

  // Card reference (Phase 4)
  cardId: uuid('card_id'),

  // Splitwise reference (Phase 3)
  splitwiseExpenseId: bigint('splitwise_expense_id', { mode: 'number' }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
}));

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
