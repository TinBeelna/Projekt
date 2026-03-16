import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import AdminExecuteRefund from "@/app/components/ConfirmRefundButton";

export default async function AdminRefundsPage() {
  // Dohvaćamo sve zahtjeve za povrat
  const refundRequests = await prisma.paymentIntents.findMany({
    where: {
      status: "REQUESTED_REFUND",
    },
    orderBy: {
      id: 'desc',
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Zahtjevi za povrat (Admin)</h1>
      
      {refundRequests.length === 0 ? (
        <p className="text-gray-500">Trenutno nema otvorenih zahtjeva.</p>
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
                const originalEuro = ((req.amount || 0) / 100).toFixed(2);
                const requestedEuro = ((req.refundAmount || 0) / 100).toFixed(2);

                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{req.email}</div>
                      <div className="text-xs text-gray-400 font-mono">{req.stripeId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{originalEuro} EUR</td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600">
                      {requestedEuro} EUR
                    </td>
                    <td className="px-6 py-4">
                      {isPartial ? (
                        <span className="px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full uppercase">
                          Djelomični
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-[10px] font-bold bg-red-100 text-red-700 rounded-full uppercase">
                          Puni
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                        {/* Koristimo tvoju novu klijentsku komponentu */}
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
  );
}
