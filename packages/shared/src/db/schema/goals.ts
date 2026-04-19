import { pgTable, uuid, varchar, text, numeric, date, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Goals table - Savings Goals
 * Phase 3 - Financial Planning
 */
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Goal details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 10 }),
  color: varchar('color', { length: 7 }).default('#10b981'),

  // Target tracking
  targetAmount: numeric('target_amount', { precision: 12, scale: 2 }).notNull(),
  currentAmount: numeric('current_amount', { precision: 12, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('USD'),

  // Dates
  targetDate: date('target_date'),

  // Priority (lower = higher priority)
  priority: integer('priority').default(0),

  // Status
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

/**
 * Goal Contributions table - Tracks contribution history
 */
export const goalContributions = pgTable('goal_contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Contribution details
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  note: text('note'),

  // Timestamps
  contributedAt: timestamp('contributed_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type GoalContribution = typeof goalContributions.$inferSelect;
export type NewGoalContribution = typeof goalContributions.$inferInsert;
