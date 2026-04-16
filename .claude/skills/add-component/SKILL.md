---
name: add-component
description: Create a new React component with TypeScript, Tailwind CSS, and proper structure. Use when building UI components, pages, or features for the web app.
allowed-tools: Read Write Edit Glob Grep
---

# Add React Component

Create a new React component following SpendSmart's frontend architecture.

## Steps to Follow

### 1. Determine Component Type
Ask the user:
- **UI Component** (reusable): `apps/web/src/components/`
- **Feature Component**: `apps/web/src/features/{feature}/components/`
- **Page Component**: `apps/web/src/app/{route}/page.tsx`

### 2. Component Structure

#### Basic Component Template
Location: `apps/web/src/components/{ComponentName}.tsx`

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface {ComponentName}Props {
  className?: string;
  // Add props here
}

export function {ComponentName}({ className, ...props }: {ComponentName}Props) {
  return (
    <div className={cn('', className)}>
      {/* Component content */}
    </div>
  );
}
```

#### Feature Component Template
Location: `apps/web/src/features/{feature}/components/{ComponentName}.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface {ComponentName}Props {
  className?: string;
}

export function {ComponentName}({ className }: {ComponentName}Props) {
  const queryClient = useQueryClient();

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['{feature}'],
    queryFn: () => api.{feature}.getAll(),
  });

  // Mutation for create/update/delete
  const mutation = useMutation({
    mutationFn: api.{feature}.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{feature}'] });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return (
    <Card className={cn('p-6', className)}>
      {/* Component content */}
    </Card>
  );
}
```

#### Page Component Template
Location: `apps/web/src/app/{route}/page.tsx`

```tsx
import { Metadata } from 'next';
import { {Feature}Page } from '@/features/{feature}/components/{Feature}Page';

export const metadata: Metadata = {
  title: '{Page Title} | SpendSmart',
  description: '{Page description}',
};

export default function Page() {
  return <{Feature}Page />;
}
```

### 3. Form Component Pattern

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

const formSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category_id: z.string().uuid('Select a category'),
  date: z.string(),
  is_household: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface {ComponentName}FormProps {
  onSuccess?: () => void;
  initialData?: Partial<FormData>;
}

export function {ComponentName}Form({ onSuccess, initialData }: {ComponentName}FormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const mutation = useMutation({
    mutationFn: api.{feature}.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{feature}'] });
      reset();
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          type="number"
          step="0.01"
          placeholder="Amount"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
        )}
      </div>

      <div>
        <Input
          placeholder="Description"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

### 4. List Component Pattern

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { {Item}Card } from './{Item}Card';

export function {ComponentName}List() {
  const { data: items, isLoading } = useQuery({
    queryKey: ['{feature}'],
    queryFn: () => api.{feature}.getAll(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <Card className="p-8 text-center text-gray-500">
        No items found. Add your first one!
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <{Item}Card key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### 5. Chart/Visualization Component

```tsx
'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function {ComponentName}Chart() {
  const { data: summary } = useQuery({
    queryKey: ['{feature}', 'summary'],
    queryFn: () => api.{feature}.getSummary(),
  });

  const chartData = useMemo(() => {
    if (!summary) return [];
    return summary.categories.map((cat) => ({
      name: cat.name,
      value: cat.total,
    }));
  }, [summary]);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
```

### 6. Animation with Framer Motion

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
}

export function AnimatedCard({ children, delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
}

// For lists
export function AnimatedList({ items }: { items: any[] }) {
  return (
    <AnimatePresence>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: index * 0.05 }}
        >
          {/* Render item */}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

## File Structure
```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── layout.tsx
├── components/            # Shared UI components
│   ├── ui/               # Base UI (Button, Input, Card)
│   └── layout/           # Layout components (Sidebar, Header)
├── features/             # Feature modules
│   ├── expenses/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── goals/
│   ├── investments/
│   └── dashboard/
├── hooks/                # Global custom hooks
├── lib/                  # Utilities, API client
└── stores/               # Zustand stores
```

## Checklist
- [ ] Component created with TypeScript types
- [ ] Props interface defined
- [ ] Tailwind CSS for styling
- [ ] React Query for data fetching (if needed)
- [ ] Form validation with Zod (if form)
- [ ] Loading and error states handled
- [ ] Responsive design considered
- [ ] Accessibility (aria labels, keyboard nav)
