// app/user/subscriptions/page.tsx
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import SubscriptionButtons from "@/app/components/SubButtons";

export default async function MySubscriptionsPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get("userEmail")?.value;

  const user = await prisma.user.findUnique({
    where: { email: email || "" },
  });

  const activeSubscriptions = await prisma.subscriptions.findMany({
    where: { userStripeId: user?.stripeId || "no_id" },
    orderBy: { stripePaymentId: 'desc' }
  });

  const latestSubId = activeSubscriptions[0]?.stripePaymentId;
  const latestSubPlan = activeSubscriptions[0]?.plan;
  return (
    <div className="max-w-2xl mx-auto p-10 space-y-10">
      <section>
        <h1 className="text-3xl font-bold mb-6">Moja Pretplata</h1>
        
        {activeSubscriptions.length === 0 ? (
          <p className="text-gray-500 bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            Trenutno nemate aktivnih pretplata.
          </p>
        ) : (
          <div className="space-y-4">
            {activeSubscriptions.map((sub) => (
              <div key={sub.stripePaymentId} className="p-4 border rounded-xl bg-white shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-blue-600 uppercase">{sub.plan}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{sub.stripePaymentId}</p>
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                  Aktivno
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-gray-100" />

      <section>
        <h2 className="text-xl font-bold mb-4">Otkazivanje pretplata:</h2>
        <SubscriptionButtons 
        activeSubId ={latestSubId}
        currentPlan={latestSubPlan}/>
      </section>
    </div>
  );
}
