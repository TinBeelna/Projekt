import { prisma } from "@/app/lib/prisma";
import AdminExecuteRefund from "@/app/components/ConfirmRefundButton";

// Forces the admin to always see fresh data from the DB
export const dynamic = 'force-dynamic';

export default async function AdminRefundsPage() {
  // 1. Fetch active refund requests
  const refundRequests = await prisma.paymentIntents.findMany({
    where: {
      status: "REQUESTED_REFUND",
    },
    orderBy: {
      id: 'desc',
    },
  });

  // 2. Fetch history of all successful refunds
  const completedRefunds = await prisma.refunds.findMany({
    orderBy: {
      id: 'desc', 
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-12 font-sans">
      {/* AKTIVNI ZAHTJEVI */}
      <div>
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Zahtjevi za povrat</h1>
                <p className="text-gray-500 text-sm">Popis korisnika koji traže povrat novca na karticu.</p>
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Na čekanju: {refundRequests.length}
            </div>
        </div>

        {refundRequests.length === 0 ? (
          <div className="text-gray-500 bg-gray-50 p-10 rounded-xl border-2 border-dashed text-center">
            Trenutno nema otvorenih zahtjeva za povrat.
          </div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">Korisnik</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-blue-600">Preostalo na kartici</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-red-600">Traženi Povrat</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">Tip</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-600">Akcija</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {refundRequests.map((req) => {
                  // LOGIC: Remaining = Original Capture - Total already refunded
                  // Using your schema logic where capturedAmount is the base
                  const totalTaken = req.capturedAmount ?? (req.amount || 0);
                  // refundAmount in this row currently acts as the PENDING request
                  const currentRemaining = totalTaken; 

                  const isPartial = (req.refundAmount || 0) < totalTaken;

                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{req.email}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-1">{req.stripeId}</div>
                      </td>
                      
                      <td className="px-6 py-4 text-sm font-bold text-blue-700">
                        {(currentRemaining / 100).toFixed(2)} EUR
                      </td>

                      <td className="px-6 py-4 text-sm font-black text-red-600">
                        {((req.refundAmount || 0) / 100).toFixed(2)} EUR
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                          isPartial ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isPartial ? 'Djelomični' : 'Puni'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                          <AdminExecuteRefund 
                            stripeId={req.stripeId!} 
                            amountCents={req.refundAmount || 0} 
                          />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POVIJEST IZVRŠENIH REFUNDOVA */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Povijest svih isplata</h2>
        {completedRefunds.length === 0 ? (
          <p className="text-gray-400 bg-gray-50 p-6 rounded-lg text-center">Nema evidentiranih izvršenih povrata.</p>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-400">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">Kupac</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-green-600">Vraćeno</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">Stripe ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {completedRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-green-50/30 transition">
                    <td className="px-6 py-4 text-[10px] font-mono text-gray-400">#{refund.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {refund.firstName} {refund.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{refund.email}</td>
                    <td className="px-6 py-4 text-sm font-black text-green-700">
                      {(refund.amount / 100).toFixed(2)} EUR
                    </td>
                    <td className="px-6 py-4 text-[10px] font-mono text-gray-400 truncate max-w-[120px]">
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
