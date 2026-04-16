import Link from 'next/link';
import { PiggyBank } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <PiggyBank className="h-10 w-10 text-primary-600" />
        <span className="text-2xl font-bold text-gray-900">SpendSmart</span>
      </Link>
      {children}
    </div>
  );
}
