import { listPayouts, getWalletBalance } from "@/app/lib/payout-balance";

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency.toUpperCase(), // Dynamically use EUR, GBP, or USD
  }).format(amount / 100);
};

export default async function BalancePage() {
  const [eur, gbp, usd, payouts] = await Promise.all([
    getWalletBalance("eur"),
    getWalletBalance("gbp"),
    getWalletBalance("usd"),
    listPayouts(),
  ]);


  return (
  <div className="p-8 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
    <header className="mb-10">
      <h1 className="text-3xl font-extrabold text-gray-900">Balance Check</h1>
      <p className="text-gray-500">Overview of your multi-currency wallets and recent payouts.</p>
    </header>

    {/* Currency Wallets Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {[eur, gbp, usd].map((wallet) => (
        <div key={wallet?.currency} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-lg font-bold uppercase text-gray-700">{wallet?.currency}</span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Available</p>
              <h2 className="text-3xl font-black text-green-600">
                {formatCurrency(wallet?.available as number, wallet?.currency as string)}
              </h2>
            </div>
            
            <div className="pt-4 border-t border-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Pending</p>
              <h2 className="text-xl font-bold text-blue-500">
                {formatCurrency(wallet?.pending as number, wallet?.currency as string)}
              </h2>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Payouts Table */}
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-gray-800">Recent Payouts</h2>
    </div>

    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="p-4 font-semibold text-gray-600 text-sm">Amount</th>
            <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
            <th className="p-4 font-semibold text-gray-600 text-sm">Arrival Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payouts.data.map((payout) => (
            <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4">
                <span className="font-bold text-gray-900">
                  {formatCurrency(payout.amount, payout.currency)}
                </span>
              </td>
              <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  payout.status === 'paid' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {payout.status === 'paid' ? 'Plaćeno' : 'U obradi'}
                </span>
              </td>
              <td className="p-4 text-sm text-gray-500">
                {new Date(payout.arrival_date * 1000).toLocaleDateString('hr-HR')}
              </td>
            </tr>
          ))}
          {payouts.data.length === 0 && (
            <tr>
              <td colSpan={3} className="p-8 text-center text-gray-400">No payouts found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);


}
