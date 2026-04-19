import { pgTable, uuid, varchar, text, numeric, date, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Debts table - Owe & Lent Tracker
 * Phase 3 - Financial Planning
 */
export const debts = pgTable('debts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Debt details
  personName: varchar('person_name', { length: 100 }).notNull(),
  description: text('description'),

  // Amount tracking
  originalAmount: numeric('original_amount', { precision: 12, scale: 2 }).notNull(),
  remainingAmount: numeric('remaining_amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),

  // Type: "owed_to_me" (someone owes me) or "owed_by_me" (I owe someone)
  debtType: varchar('debt_type', { length: 20 }).notNull(),

  // Dates
  createdDate: date('created_date').notNull().defaultNow(),
  dueDate: date('due_date'),

  // Status
  isSettled: boolean('is_settled').default(false),
  settledAt: timestamp('settled_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;

/**
 * Debt Payments table - Tracks partial payments
 */
export const debtPayments = pgTable('debt_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  debtId: uuid('debt_id').notNull().references(() => debts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Payment details
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  note: text('note'),
  paymentDate: date('payment_date').notNull().defaultNow(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type DebtPayment = typeof debtPayments.$inferSelect;
export type NewDebtPayment = typeof debtPayments.$inferInsert;
