import { prisma } from "@/app/lib/prisma";
import AdminExecuteRefund from "@/app/components/ConfirmRefundButton";
import CancelRefundButton from "@/app/components/CancelRefundButton";
import { AutoRefresh } from "@/app/components/AutoRefresh";

// Forces the admin to always see fresh data from the DB
export const dynamic = 'force-dynamic';

export default async function RefundAdminPage() {
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

  // Mapiranje stripePaymentId → paymentIntents.id za konzistennto pokazivanje IDeva
  const stripeIds = completedRefunds.map(r => r.stripePaymentId).filter(Boolean) as string[];
  const paymentIntentsForRefunds = await prisma.paymentIntents.findMany({
    where: { stripeId: { in: stripeIds } },
    select: { id: true, stripeId: true },
  });
  const stripeToPaymentIntentId = new Map(paymentIntentsForRefunds.map(p => [p.stripeId, p.id]));

  // 3. Fetch declined refund requests
  const declinedRefunds = await prisma.paymentIntents.findMany({
    where: { status: "DECLINED" },
    orderBy: { id: 'desc' },
  });

  return (
    <div className="p-8 space-y-10">
      <AutoRefresh />
      {/* AKTIVNI ZAHTJEVI */}
      <div>
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Zahtjevi za povrat</h1>
                <p className="text-sm text-gray-500 mt-1">Popis korisnika koji traže povrat novca na karticu.</p>
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Korisnik</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-500 uppercase">Preostalo na kartici</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-red-500 uppercase">Traženi Povrat</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tip</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Akcija</th>
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
                        {(currentRemaining / 100).toFixed(2)} {req.currency}
                      </td>

                      <td className="px-6 py-4 text-sm font-black text-red-600">
                        {((req.refundAmount || 0) / 100).toFixed(2)} {req.currency}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                          isPartial ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isPartial ? 'Djelomični' : 'Puni'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <AdminExecuteRefund
                            stripeId={req.stripeId!}
                            amountCents={req.refundAmount || 0}
                            currency={req.currency}
                          />
                          <CancelRefundButton stripeId={req.stripeId!} />
                        </div>
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
      {(() => {
        const history = [
          ...completedRefunds.map(r => ({
            key: `r-${r.id}`, id: stripeToPaymentIntentId.get(r.stripePaymentId) ?? r.id, firstName: r.firstName, lastName: r.lastName,
            email: r.email, stripeId: r.stripePaymentId, createdAt: r.createdAt,
            declined: false, amount: r.amount, currency: r.currency,
          })),
          ...declinedRefunds.map(r => ({
            key: `d-${r.id}`, id: r.id, firstName: r.firstName, lastName: r.lastName,
            email: r.email, stripeId: r.stripeId, createdAt: r.createdAt,
            declined: true, amount: 0, currency: r.currency,
          })),
        ].sort((a, b) => b.id - a.id);

        return (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Povijest svih isplata</h2>
            {history.length === 0 ? (
              <p className="text-gray-400 bg-gray-50 p-6 rounded-lg text-center">Nema evidentiranih izvršenih povrata.</p>
            ) : (
              <div className="bg-white border rounded-xl overflow-x-auto shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID (payment intenta)</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kupac</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-green-600 uppercase">Vraćeno</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stripe ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vrijeme:</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.map((row) => (
                      <tr key={row.key} className={row.declined ? "hover:bg-red-50/30 bg-red-50/20 transition" : "hover:bg-green-50/30 transition"}>
                        <td className="px-6 py-4 text-[10px] font-mono text-gray-400">#{row.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.firstName} {row.lastName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{row.email}</td>
                        <td className={`px-6 py-4 text-sm font-black ${row.declined ? "text-red-600" : "text-green-700"}`}>
                          {row.declined ? "Otkazano" : `${(row.amount / 100).toFixed(2)} ${row.currency}`}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-mono text-gray-400 truncate max-w-[120px]">{row.stripeId}</td>
                        <td className="px-6 py-4 text-[10px] font-mono text-gray-400 whitespace-nowrap">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
