import { pgTable, uuid, varchar, boolean, decimal, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { expenses } from './expenses';

/**
 * Categories table
 * Based on Technical Documentation
 *
 * Default categories have user_id = NULL
 * Custom categories have user_id set to the owner
 */
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  isDefault: boolean('is_default').default(false),
  budgetAmount: decimal('budget_amount', { precision: 12, scale: 2 }),
  budgetCurrency: varchar('budget_currency', { length: 3 }).default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  expenses: many(expenses),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

/**
 * Default categories to seed
 */
export const defaultCategories = [
  { name: 'Groceries', icon: 'shopping-cart', color: '#10b981' },
  { name: 'Dining', icon: 'utensils', color: '#f59e0b' },
  { name: 'Transport', icon: 'car', color: '#3b82f6' },
  { name: 'Housing', icon: 'home', color: '#8b5cf6' },
  { name: 'Utilities', icon: 'zap', color: '#6366f1' },
  { name: 'Entertainment', icon: 'film', color: '#ec4899' },
  { name: 'Health', icon: 'heart', color: '#ef4444' },
  { name: 'Education', icon: 'graduation-cap', color: '#f97316' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#14b8a6' },
  { name: 'Travel', icon: 'plane', color: '#06b6d4' },
  { name: 'Other', icon: 'more-horizontal', color: '#6b7280' },
] as const;
