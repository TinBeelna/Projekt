import { prisma } from "@/app/lib/prisma";
//import { cookies } from "next/headers";
import { auth } from "@/app/lib/auth";
import { SELLERS } from "@/app/lib/sellers"

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {

    const session = await auth();
    const mail = session?.user?.email;

    const user = await prisma.user.findUnique({
      where: { email: mail! }
    });

    if (!mail || !user) return null;
  
  const userPayments = await prisma.paymentIntents.findMany({
    where: {
      email: mail
    },
    orderBy: {
      id: 'desc'
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Moja Plaćanja</h1>
        <p className="text-sm text-gray-500 mt-1">Povijest svih vaših transakcija za {mail}</p>
      </div>
      {userPayments.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
          Još niste izvršili nijedno plaćanje.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Datum i vrijeme</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Izvor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Proizvod</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Iznos (ukupno)</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Iznos (plaćen)</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {userPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-gray-400 text-xs">
                    #{payment.id}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {payment.createdAt 
                    ? new Date(payment.createdAt).toLocaleString('hr-HR', {
                       day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                        })
                       : "-"}
                    </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {SELLERS.find(s => s.accountId === payment.sellerId)?.name ??  "Ova stranica"} 
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {payment.items || "Usluga"} 
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {/* Stripe iznos dijeliš sa 100 za eure */}
                    {payment.amount ? (payment.amount / 100).toFixed(2) : "0.00"} {payment.currency}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {/* Stripe iznos dijeliš sa 100 za eure */}
                    {payment.capturedAmount ? (payment.capturedAmount / 100).toFixed(2) : "0.00"} {payment.currency}
                  </td>
                  <td className="px-6 py-4">
  {(() => {
        const status = payment.status?.toLocaleLowerCase();
    // Definiramo stilove i tekstove za svaki status iz baze
    switch (payment.status) {
      case 'Succeeded':
        return <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Plaćeno</span>;
      case 'Partially captured':
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Djelomično plaćeno</span>;
      case 'Capture_required':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Autorizirano (u obradi; ćeka se capture admina)</span>;
      case 'Charge_refunded':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Refund prosao</span>;
      case 'Canceled':  
        return <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Otkazano</span>;
      case 'Failed':
        return <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Neuspjelo</span>;
      case 'PENDING':
        return <span className="bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-medium">Nedovršena autorizacija sa strane korisnika</span>;
      case 'PROCESSING':
        return <span className="bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-medium">Procesuira se</span>;
      default:
        return <span className="bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-medium">Nepoznato</span>;
    }
  })()}
</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}