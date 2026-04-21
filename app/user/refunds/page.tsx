import { prisma } from "@/app/lib/prisma";
//import { cookies } from "next/headers";
import PartialRefundButton from "@/app/components/PartialRefundButton"; 
import FullRefundButton from "@/app/components/RefundButton";
import { auth } from "@/app/lib/auth"

// sql changes instant; google preporuka
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RefundsPage() {
  const session = await auth();
  const mail = session?.user?.email;

  if (!mail) return <div className="p-10 text-red-600">Niste prijavljeni.</div>;

  //svi payment intentovi
  const userPayments = await prisma.paymentIntents.findMany({
    where: {
      email: mail,
    },
    orderBy: { id: 'desc' },
  });

  // filtriranje; ovisno o captured amount, moguce je napraviti refund sve dok nije 0
  const refundablePayments = userPayments.filter((payment) => {
   
    const currentBalance = payment.capturedAmount ?? (payment.amount || 0);
    
    return currentBalance > 0;
  });

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Povrat sredstava (Refunds)</h1>
        <p className="text-gray-500">Preostalo za povrat: {refundablePayments.length} stavki</p>
      </div>

      {refundablePayments.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed rounded-xl p-12 text-center text-gray-400">
          Nemate sredstava dostupnih za povrat.
        </div>
      ) : (
        <div className="bg-white shadow-sm border rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase text-blue-600">Preostalo</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Akcija</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {refundablePayments.map((payment) => {
                const currentBalanceCents = payment.capturedAmount ?? (payment.amount || 0);
                const isWaiting = payment.status === "REQUESTED_REFUND";

                return (
                  <tr key={payment.id} className={isWaiting ? "bg-amber-50" : ""}>
                    <td className="px-6 py-4 font-mono text-xs">#{payment.id}</td>
                    <td className="px-6 py-4 text-blue-700 font-bold">
                      {(currentBalanceCents / 100).toFixed(2)} {payment.currency}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isWaiting ? (
                        <span className="text-amber-600 font-bold text-[10px]">ČEKA OBRADU</span>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <FullRefundButton stripeId={payment.stripeId || ""} amountCents={currentBalanceCents} currency ={payment.currency}/>
                          <PartialRefundButton stripeId={payment.stripeId || ""} maxAmountCents={currentBalanceCents} currency ={payment.currency}/>
                        </div>
                      )}
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
