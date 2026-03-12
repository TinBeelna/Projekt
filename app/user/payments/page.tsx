import { prisma } from "@/app/lib/prisma";
import { cookies } from "next/headers";

export default async function PaymentsPage() {

    const cookie = await cookies();
    const mail = cookie.get("userEmail")?.value;

    const user = await prisma.user.findUnique({ //user po mailu iz cookies
      where: {email: mail}
    });

    if (!mail) {
    return <div className="p-10 text-red-600">Niste prijavljeni.</div>;
  }
  
  const userPayments = await prisma.paymentIntents.findMany({
    where: {
      email: mail
    },
    orderBy: {
      id: 'desc'
    },
  });

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Moja Plaćanja</h1>
        <p className="text-gray-500">Povijest svih vaših transakcija za {mail}</p>
      </div>

      {userPayments.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed rounded-xl p-12 text-center text-gray-400">
          Još niste izvršili nijedno plaćanje.
        </div>
      ) : (
        <div className="bg-white shadow-sm border rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Proizvod</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Iznos</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {userPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-gray-400 text-xs">
                    #{payment.id}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {payment.items || "Usluga"} 
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {/* Stripe iznos dijeliš sa 100 za eure */}
                    {payment.amount ? (payment.amount / 100).toFixed(2) : "0.00"} EUR
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.status === 'Succeeded' 
                        ? 'bg-green-100 text-green-800' 
                        : payment.status === 'Failed' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {payment.status === 'Succeeded' ? 'Plaćeno' : payment.status === 'Failed' ? 'Neuspjelo' : 'U obradi'}
                    </span>
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