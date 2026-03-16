import { prisma } from "@/app/lib/prisma";
import { cookies } from "next/headers";
import PartialRefundButton from "@/app/components/PartialRefundButton"; 
import FullRefundButton from "@/app/components/RefundButton";

export default async function RefundsPage() {
  const cookie = await cookies();
  const mail = cookie.get("userEmail")?.value;

  if (!mail) {
    return <div className="p-10 text-red-600">Niste prijavljeni.</div>;
  }

  const userPayments = await prisma.paymentIntents.findMany({
    where: {
      email: mail,
      status: {
        // DODANO: REQUESTED_REFUND mora biti tu da red ne nestane dok admin ne klikne
        in: ["Succeeded", "Partially captured", "REQUESTED_REFUND"]
      }
    },
    orderBy: { id: 'desc' },
  });

  const refundablePayments = userPayments.filter((payment) => {
    // Gledamo preostali iznos (capturedAmount), ako je null gledamo početni amount
    const currentBalance = payment.capturedAmount !== null 
      ? payment.capturedAmount 
      : (payment.amount || 0);
    
    // Prikazujemo samo ako je ostalo više od 0 centi
    return currentBalance > 0;
  });

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Povrat sredstava (Refunds)</h1>
        <p className="text-gray-500">Popis vaših uspješnih narudžbi dostupnih za povrat.</p>
      </div>

      {refundablePayments.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed rounded-xl p-12 text-center text-gray-400">
          Nemate uspješnih plaćanja dostupnih za povrat.
        </div>
      ) : (
        <div className="bg-white shadow-sm border rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Proizvod</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Originalno</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase text-blue-600">Preostalo za povrat</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Akcija</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {refundablePayments.map((payment) => {
                // KLJUČNO: Izračun preostalog iznosa za gumbe i prikaz
                const currentBalanceCents = payment.capturedAmount !== null 
                  ? payment.capturedAmount 
                  : (payment.amount || 0);
                
                const formattedRemaining = (currentBalanceCents / 100).toFixed(2);
                const formattedOriginal = ((payment.amount || 0) / 100).toFixed(2);
                const isWaiting = payment.status === "REQUESTED_REFUND";

                return (
                  <tr 
                    key={payment.id} 
                    className={`transition ${isWaiting ? "bg-amber-50/40" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-6 py-4 font-mono text-gray-400 text-xs">#{payment.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{payment.items || "Usluga"}</td>
                    <td className="px-6 py-4 text-gray-500">{formattedOriginal} EUR</td>
                    <td className="px-6 py-4 text-blue-700 font-bold bg-blue-50/30">{formattedRemaining} EUR</td>

                    <td className="px-6 py-4 text-center">
                      {isWaiting ? (
                        <div className="flex flex-col items-center">
                          <span className="text-amber-600 font-bold text-[10px] uppercase">Čeka obradu</span>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-2">
                          <FullRefundButton 
                            stripeId={payment.stripeId || ""} 
                            amountCents={currentBalanceCents} 
                          />
                          <span className="text-gray-300">|</span>
                          <PartialRefundButton 
                            stripeId={payment.stripeId || ""} 
                            maxAmountCents={currentBalanceCents} 
                          />
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
