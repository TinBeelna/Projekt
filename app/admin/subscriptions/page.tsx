import { prisma } from "@/app/lib/prisma";
import {cancelSubscription} from "@/app/lib/subscriptions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function SubscriptionsPage() {

  const subscriptions = await prisma.subscriptions.findMany({
    include: {
      invoices: true,
    },
    orderBy: { stripePaymentId: 'desc' }
  });

  const users = await prisma.user.findMany();

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Pregled svih pretplata</h1>
      
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Korisnik (Email)</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Plan</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Subscription ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Total paid</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Cancel subscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subscriptions.map((sub) => {
              const user = users.find(u => u.stripeId === sub.userStripeId); //spajanje pretplate i usera (stripeId) 
            
              const totalPaidCents = sub.invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
              const totalPaidEuro = (totalPaidCents / 100).toFixed(2); //ukupno placeno

              return (
                <tr key={sub.stripePaymentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{user?.email || "Nema emaila"}</div>
                    <div className="text-xs text-gray-400">{sub.userStripeId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">
                    {sub.stripePaymentId}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    {totalPaidEuro} {sub.currency}
                  </td>
                {/* CANCEL BUTTON */}
               <td className="px-6 py-4 text-sm">
                <form action={async () => {
                  "use server";
                  await cancelSubscription(sub.stripePaymentId);
                  redirect("/admin/subscriptions");
                }}>
                  <button 
                    type="submit"
                    className="font-medium"
                  >
                    Cancel
                  </button>
                </form>
              </td>
            </tr>
          );
        })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

