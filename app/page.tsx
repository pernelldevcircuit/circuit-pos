export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">Circuit POS</h1>
        <p className="text-2xl mb-8">Modern Point of Sale SaaS Platform</p>
        <p className="text-gray-400 max-w-2xl">
          Built with Next.js 14, Supabase, Stripe, and Tailwind CSS.
          Multi-tenant architecture with real-time analytics.
        </p>
        <div className="mt-12 flex gap-4 justify-center">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Merchant Dashboard</h3>
            <p className="text-sm text-gray-400">Coming Soon</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Checkout</h3>
            <p className="text-sm text-gray-400">Coming Soon</p>
          </div>
        </div>
      </div>
    </main>
  )
}
