import { prisma } from "@/app/lib/prisma";
import AdminExecuteRefund from "@/app/components/ConfirmRefundButton";

export default async function AdminRefundsPage() {
  // Dohvat akvitnih zahtjeva
  const refundRequests = await prisma.paymentIntents.findMany({
    where: {
      status: "REQUESTED_REFUND",
    },
    orderBy: {
      id: 'desc',
    },
  });

  // Dohvat svih izvrsenih refundova
  const completedRefunds = await prisma.refunds.findMany({
    orderBy: {
      id: 'desc', 
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-12">
      {/*AKTIVNI ZAHTJEVI */}
      <div>
        <h1 className="text-3xl font-bold mb-6">Zahtjevi za povrat (Admin)</h1>
        {refundRequests.length === 0 ? (
          <p className="text-gray-500 bg-gray-50 p-4 rounded-lg border border-dashed text-center">Trenutno nema otvorenih zahtjeva.</p>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Korisnik</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Originalni Iznos</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-red-600">Traženi Povrat</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Tip</th>
                  <th className="px-6 py-3 text-center text-xs font-bold uppercase">Akcija</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {refundRequests.map((req) => {
                  const isPartial = req.refundAmount! < (req.amount || 0);
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{req.email}</div>
                        <div className="text-xs text-gray-400 font-mono">{req.stripeId}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{((req.amount || 0) / 100).toFixed(2)} EUR</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-600">
                        {((req.refundAmount || 0) / 100).toFixed(2)} EUR
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${isPartial ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {isPartial ? 'Djelomični' : 'Puni'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                          <AdminExecuteRefund stripeId={req.stripeId!} amountCents={req.refundAmount || 0} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/*POVIJEST IZVRŠENIH REFUNDOVA */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Povijest svih refundova</h2>
        {completedRefunds.length === 0 ? (
          <p className="text-gray-500">Nema evidentiranih izvršenih povrata.</p>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">Kupac</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">Vraćeno</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">Stripe ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {completedRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-green-50/50 transition">
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">#{refund.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {refund.firstName} {refund.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{refund.email}</td>
                    <td className="px-6 py-4 text-sm font-bold text-green-700">
                      {(refund.amount / 100).toFixed(2)} EUR
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400 truncate max-w-[150px]">
                      {refund.stripePaymentId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
