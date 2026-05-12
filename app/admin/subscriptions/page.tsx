import { prisma } from "@/app/lib/prisma";
import {cancelSubscription} from "@/app/lib/subscriptions";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {

  const subscriptions = await prisma.subscriptions.findMany({
    include: {
      invoices: true,
    },
    orderBy: { stripePaymentId: 'desc' }
  });

  const users = await prisma.user.findMany();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900">Pregled svih pretplata</h1>
      <p className="text-sm text-gray-500 mb-8">Sve aktivne pretplate i ukupno plaćeni iznosi po korisniku.</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Korisnik (Email)</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subscription ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total paid</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cancel subscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subscriptions.map((sub) => {
              const user = users.find(u => u.stripeId === sub.userStripeId); //spajanje pretplate i usera (stripeId)

              const totalPaidCents = sub.invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
              const totalPaidEuro = (totalPaidCents / 100).toFixed(2); //ukupno placeno

              return (
                <tr key={sub.stripePaymentId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user?.email || "Nema emaila"}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{sub.userStripeId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">
                    {sub.stripePaymentId}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {totalPaidEuro} {sub.currency}
                  </td>
                {/* CANCEL BUTTON */}
                <td className="px-6 py-4">
                  <form action={async () => {
                    "use server";
                    await cancelSubscription(sub.stripePaymentId);
                    redirect("/admin/subscriptions");
                  }}>
                    <button
                      type="submit"
                      className="text-sm font-medium text-red-600 hover:text-red-700 transition"
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

