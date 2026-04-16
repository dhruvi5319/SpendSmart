// Types (for frontend/API contracts)
export * from './types/user';
export * from './types/category';
export * from './types/expense';

// API
export * from './api/client';
export * from './api/expenses';
export * from './api/categories';

// Utils
export * from './utils/currency';
export * from './utils/date';

// Note: Database (Drizzle) is NOT exported here to avoid bundling postgres in the browser
// For server-side DB access, import directly: import { createDb } from '@spendsmart/shared/db'
