// app/user/subscriptions/page.tsx
//import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import SubscriptionButtons from "@/app/components/SubButtons";
import { auth } from "@/app/lib/auth"

export default async function MySubscriptionsPage() {
  const session = await auth();
  const email = session?.user?.email;

  const user = await prisma.user.findUnique({
    where: { email: email || "" },
  });

  const activeSubscriptions = await prisma.subscriptions.findMany({
    where: { userStripeId: user?.stripeId || "no_id" },
    orderBy: { stripePaymentId: 'desc' }
  });

  const latestSubId = activeSubscriptions[0]?.stripePaymentId;
  const latestSubPlan = activeSubscriptions[0]?.plan;
  
  //invoice handling
  const invoices = await prisma.invoice.findMany({
      where: { 
        userId: user?.id || 0,
        subscription: { 
          isNot: null //prikaz racuna samo za aktivnu pretplatu (ako je aktivna)
        }

      },
      orderBy: { createdAt: 'desc' },
      include: { subscription: true} //za naziv plana
  });

  const latestInvoice = invoices?.[0];
  const endDate = latestInvoice?.periodEnd;
  const isCancelScheduled = activeSubscriptions[0]?.cancelAtPeriodEnd;


  return (
    <div className="p-8 max-w-3xl space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Moja Pretplata</h1>
        <p className="text-sm text-gray-500 mb-4">Upravljajte svojom pretplatom i pregledajte račune.</p>
        <div className="text-xs text-gray-400 space-y-0.5 mb-6">
          <p>Note 1: U slučaju downgradea, daje se "kredit" za buduce pretplate</p>
          <p>Note 2: U slučaju ažuriranja pretplate (upgrade/downgrade) valuta plaćanja se ne može mijenjati</p>
        </div>
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
                <span className="text-xs font-bold uppercase text-gray-600">
                  {sub.status || 'Nepoznato'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-gray-200" />
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Otkazivanje pretplata:</h2>

        <SubscriptionButtons 
          activeSubId={latestSubId}
          currentPlan={latestSubPlan}
          status={activeSubscriptions[0]?.status}
          cancelAtPeriodEnd={isCancelScheduled}
          endDate={endDate as Date}
        />

        {/* cancel status info*/}
        {isCancelScheduled && (
          <div className="mt-4 p-4 rounded-xl border border-orange-200 bg-orange-50">
            {/* <p className="text-xs font-bold uppercase text-orange-700">
              Otkazivanje je zakazano
            </p> */}

            <p className="text-sm font-semibold text-gray-800 mt-1">
              Završava:{" "}
              {endDate
                ? new Date(endDate).toLocaleDateString("hr-HR")
                : "Nepoznato"}
            </p>
          </div>
        )}
      </section>
      {/* racuni */}
      <hr className="border-gray-200" />
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Račun pretplate:</h2>
        
        {invoices.length === 0 ? (
          <p className="text-gray-500 bg-gray-50 p-4 rounded-lg border border-dashed text-center italic text-sm">
            Još nemate izdanih računa.
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-4 border rounded-xl bg-white shadow-sm hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  {/* broj racuna */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-700">{inv.invoiceNumber || "Račun"}</p>
                  </div>

                  {/* od kada do kada vrijedi pretplata; prikazi prema placenim racunima za taj period */}
                  <div className="text-[11px] text-gray-500 font-medium">
                    <p>📅 Razdoblje: <span className="text-gray-700">{new Date(inv.periodStart!).toLocaleDateString('hr-HR')}</span> — <span className="text-gray-700">{new Date(inv.periodEnd!).toLocaleDateString('hr-HR')}</span></p>
                    {inv.paidAt && (
                      <p>Datum placanja: {new Date(inv.paidAt).toLocaleString('hr-HR')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                    {((inv.total ?? 0) / 100).toFixed(2)} {(inv.currency ?? "EUR").toUpperCase()}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      inv.status === 'paid' ? 'text-green-600' : 'text-orange-500'
                    }`}>
                      Status: {inv.status}
                    </span>
                  </div>
                  
                  {inv.invoicePdfUrl && (
                    <a 
                      href={inv.invoicePdfUrl} 
                      target="_blank" 
                      className="text-xl hover:scale-110 transition-transform"
                    >
                      📄
                    </a>
                  )}
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </section>
    </div> 
  );
}
