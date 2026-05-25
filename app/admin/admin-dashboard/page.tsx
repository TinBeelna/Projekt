import { prisma } from "@/app/lib/prisma";
import CaptureButtons from "@/app/components/AdminDashboardButtons";
import { AutoRefresh } from "@/app/components/AutoRefresh";
import { getSellers } from "@/app/lib/sellers";

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(0, parseInt(pageParam ?? "0") || 0);

  const [pendingOrders, allPayments, total, sellers] = await Promise.all([
    prisma.paymentIntents.findMany({
      where: { status: "Capture_required" },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.paymentIntents.findMany({
      orderBy: { id: 'desc' },
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    }),
    prisma.paymentIntents.count(),
    getSellers(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function StatusBadge({ status }: { status: string | null }) { //prikaz po bojama ovisno o statusu
    switch (status) {
      case 'Succeeded':
        return <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Plaćeno</span>;
      case 'Partially captured':
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Djelomično plaćeno</span>;
      case 'Capture_required':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Na čekanju (capture)</span>;
      case 'Charge_refunded':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Refund prošao</span>;
      case 'REQUESTED_REFUND':
        return <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Tražen povrat</span>;
      case 'DECLINED':
        return <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Odbijeno</span>;
      case 'Canceled':
        return <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Otkazano</span>;
      case 'Failed':
        return <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Neuspjelo</span>;
      case 'PENDING':
        return <span className="bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-medium">Nedovršena autorizacija</span>;
      case 'PROCESSING':
        return <span className="bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-medium">Procesuira se</span>;
      default:
        return <span className="bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-medium">{status ?? 'Nepoznato'}</span>;
    }
  }

  return (
    <div className="p-8 space-y-10">
      <AutoRefresh />

      {/* PENDING ORDERS */}
      <div>
        <h1 className="text-2xl font-bold mb-1 text-gray-900">Autorizirana plaćanja (Na čekanju)</h1>
        <p className="text-sm text-gray-500 mb-6">Plaćanja koja čekaju potvrdu naplate.</p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kupac (Email)</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Proizvod / Item</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Iznos</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">#{order.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">ID: {order.userId || "Gost"}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{order.firstName} {order.lastName}</span>
                      <span className="text-xs text-gray-400">{order.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 italic text-sm text-gray-600">
                    {order.items || "Nije navedeno"}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-700">
                    {((order.amount || 0) / 100).toFixed(2)} ({order.currency as string})
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <CaptureButtons
                        paymentIntentId={order.stripeId!}
                        fullAmount={order.amount || 0}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingOrders.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              Trenutno nema narudžbi koje čekaju potvrdu naplate.
            </div>
          )}
        </div>
      </div>

      {/* Svi payment intentovi */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sva plaćanja</h2>
            <p className="text-sm text-gray-500 mt-1">Svi payment intenti svih korisnika.</p>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Ukupno: {total}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Datum i vrijeme</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kupac</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Izvor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Proizvod</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Iznos (ukupno)</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Iznos (plaćen)</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {allPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">#{payment.id}</td>
                  <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                    {payment.createdAt
                      ? new Date(payment.createdAt).toLocaleString('hr-HR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{payment.firstName} {payment.lastName}</span>
                      <span className="text-xs text-gray-400">{payment.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {sellers.find(s => s.stripeAccountId === payment.sellerId)?.name ?? "Ova stranica"}
                  </td>
                  <td className="px-6 py-4 italic text-gray-600">
                    {payment.items || "Usluga"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {payment.amount ? (payment.amount / 100).toFixed(2) : "0.00"} {payment.currency}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {payment.capturedAmount ? (payment.capturedAmount / 100).toFixed(2) : "0.00"} {payment.currency}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allPayments.length === 0 && (
            <div className="p-12 text-center text-gray-400">Nema zabilježenih plaćanja.</div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Stranica {page + 1} od {totalPages} &nbsp;·&nbsp; {total} ukupno
          </span>
          <div className="flex gap-2">
            {page > 0 && (
              <a
                href={`?page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
              >
                ← Prethodna
              </a>
            )}
            {page + 1 < totalPages && (
              <a
                href={`?page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
              >
                Sljedeća →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
