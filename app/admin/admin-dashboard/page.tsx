import { prisma } from "@/app/lib/prisma";
import CaptureButtons from "@/app/components/AdminDashboardButtons";
import { AutoRefresh } from "@/app/components/AutoRefresh";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const pendingOrders = await prisma.paymentIntents.findMany({
    where: { 
      status: "Capture_required",
    },
    orderBy: { createdAt: 'desc' }
  });

  // const ordersToFinish = await prisma.paymentIntents.findMany({ //izvuci paymente koji su imali capture
  //   where: { 
  //     status: "Final_capture_required",
  //   },
  //   orderBy: { createdAt: 'desc' }
  // });

  return (
    <div className="p-8">
      <AutoRefresh />
      <h1 className="text-2xl font-bold mb-1 text-gray-900">Autorizirana plaćanja (Na čekanju)</h1>
      <p className="text-sm text-gray-500 mb-8">Plaćanja koja čekaju potvrdu naplate.</p>

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
                      paymentIntentId={order.stripeId!} // opcionalan u bazi
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
  );
}
