import { prisma } from "@/app/lib/prisma";
import CaptureButtons from "@/app/components/AdminDashboardButtons";

export default async function AdminDashboardPage() {
  const pendingOrders = await prisma.paymentIntents.findMany({
    where: { 
      status: "Capture_required" 
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Autorizirana plaćanja (Na čekanju)</h1>
      
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-left bg-white">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Order ID</th>
              <th className="p-4">User ID</th>
              <th className="p-4">Kupac (Email)</th>
              <th className="p-4">Proizvod / Item</th>
              <th className="p-4">Iznos (EUR)</th>
              <th className="p-4 text-center">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {pendingOrders.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-mono text-sm text-gray-500">#{order.id}</td>
                <td className="p-4 text-sm">ID: {order.userId || "Gost"}</td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{order.firstName} {order.lastName}</span>
                    <span className="text-xs text-gray-400">{order.email}</span>
                  </div>
                </td>
                <td className="p-4 italic text-sm">
                  {order.items || "Nije navedeno"}
                </td>
                <td className="p-4 font-bold text-green-700">
                  {((order.amount || 0) / 100).toFixed(2)} €
                </td>
                <td className="p-4">
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
          <div className="p-12 text-center text-gray-500 bg-gray-50">
            Trenutno nema narudžbi koje čekaju potvrdu naplate.
          </div>
        )}
      </div>
    </div>
  );
}
