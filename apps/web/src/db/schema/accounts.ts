import { pgTable, uuid, varchar, decimal, boolean, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Account types for net worth tracking
 */
export const accountTypeEnum = [
  'checking',
  'savings',
  'investment',
  'loan',
  'mortgage',
  'credit_card',
  'cash',
  'other',
] as const;
export type AccountType = (typeof accountTypeEnum)[number];

/**
 * Accounts table - for basic net worth tracking
 * Based on Technical Documentation
 */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  balance: decimal('balance', { precision: 14, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  institution: varchar('institution', { length: 100 }),
  isAsset: boolean('is_asset').default(true),
  notes: text('notes'),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
