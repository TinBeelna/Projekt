import { listPayouts, showAvailableBalance, showPendingBalance } from "@/app/lib/payout-balance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("de-DE", { //za ljepsi prikaz u eurima
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
};

export default async function BalancePage() {
  const [availableArr, pendingArr, payouts] = await Promise.all([
    showAvailableBalance(),
    showPendingBalance(),
    listPayouts(),
  ]);

  // provjera su euri
  const availableEur = availableArr.find(b => b.currency === 'eur')?.amount || 0;
  const pendingEur = pendingArr.find(b => b.currency === 'eur')?.amount || 0;

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <h1 className="text-3xl font-extrabold mb-8">Balance check</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Available Card */}
        <div className="p-6 bg-white border-2 border-green-100 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 uppercase tracking-wider font-bold">Available:</p>
          <h2 className="text-4xl font-black text-green-600 mt-2">
            {formatCurrency(availableEur)}
          </h2>
        </div>

        {/* Pending Card */}
        <div className="p-6 bg-white border-2 border-blue-100 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 uppercase tracking-wider font-bold">Pending</p>
          <h2 className="text-4xl font-black text-blue-500 mt-2">
            {formatCurrency(pendingEur)}
          </h2>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Payouti:</h2>
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-700">Iznos</th>
              <th className="p-4 font-semibold text-gray-700">Status</th>
              <th className="p-4 font-semibold text-gray-700">Datum dolaska</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payouts.data.map((payout) => (
              <tr key={payout.id} className="hover:bg-gray-50 transition">
                <td className="p-4 font-bold">{formatCurrency(payout.amount)}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    payout.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {payout.status === 'paid' ? 'Plaćeno' : 'U obradi'}
                  </span>
                </td>
                <td className="p-4 text-gray-500">
                  {new Date(payout.arrival_date * 1000).toLocaleDateString('hr-HR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
