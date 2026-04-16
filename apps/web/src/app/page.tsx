import Link from 'next/link';
import { ArrowRight, PiggyBank, TrendingUp, Receipt, Brain } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">SpendSmart</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Smart Finance,
            <span className="text-primary-600"> Smarter You</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Track expenses, manage savings goals, and get AI-powered insights for smarter
            financial decisions. Open source and self-hostable.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-lg font-medium text-white hover:bg-primary-700"
            >
              Start Free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="https://github.com/yourusername/spendsmart"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              View on GitHub
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Receipt className="h-8 w-8" />}
            title="Smart Expense Tracking"
            description="Scan receipts, import bank statements, or add manually. AI categorizes everything automatically."
          />
          <FeatureCard
            icon={<PiggyBank className="h-8 w-8" />}
            title="Savings Goals"
            description="Set goals with visual progress tracking. Get AI coaching to stay on track."
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8" />}
            title="Investment Insights"
            description="Calculate your investable surplus and get allocation suggestions based on your portfolio."
          />
          <FeatureCard
            icon={<Brain className="h-8 w-8" />}
            title="AI-Powered Insights"
            description="Get personalized spending analysis and actionable recommendations in plain language."
          />
        </div>

        {/* Household Feature */}
        <div className="mt-24 rounded-2xl bg-white p-8 shadow-lg">
          <div className="flex flex-col items-center gap-8 lg:flex-row">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900">
                Household Expense Sharing
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Living with roommates or family? SpendSmart automatically calculates your true
                share of household expenses. Tag any expense as &quot;household&quot; and we&apos;ll split it
                by your configured household size.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    ✓
                  </span>
                  Auto-calculate your share (1/N)
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    ✓
                  </span>
                  Custom split ratios supported
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    ✓
                  </span>
                  ML learns your patterns over time
                </li>
              </ul>
            </div>
            <div className="flex-1">
              <div className="rounded-lg bg-gray-100 p-6">
                <div className="text-sm text-gray-500">Example</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">Rent: $2,800</div>
                <div className="mt-1 text-gray-600">Household of 7 people</div>
                <div className="mt-4 border-t pt-4">
                  <div className="text-sm text-gray-500">Your share</div>
                  <div className="text-3xl font-bold text-primary-600">$400</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 text-center text-gray-600">
          <p>Open source under MIT License. Built with Next.js, FastAPI, and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 inline-flex rounded-lg bg-primary-100 p-3 text-primary-600">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}
