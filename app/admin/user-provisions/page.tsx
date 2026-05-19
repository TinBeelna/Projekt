import { prisma } from "@/app/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function UserProvisionsPage() {

  const transfers = await prisma.transfer.findMany({
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { email: true } } },
  });

  const successfulTransfers = await prisma.transfer.findMany({
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { email: true } } },
    where: {status: "succeeded" },
  });

  const recipientIBANs = transfers.map(t => t.recipientIBAN);
  const recipients = await prisma.user.findMany({
    where: { 
        IBAN: { 
            in: recipientIBANs, 
        } 
    },
    select: { 
        IBAN: true, 
        email: true, 
    },
  });
  const recipientMap = Object.fromEntries(recipients.map(r => [r.IBAN, r]));

  const totalEarnedCents = successfulTransfers.length * 50;

  return (
    <div className="p-8 space-y-10">

      {/* TOTAL EARNED */}
      <div className="bg-white border rounded-xl p-6">
        <p className="text-sm text-gray-500 uppercase font-semibold tracking-wide">Ukupna zarada od podržavanja SEPA instant debit transfera (naknade)</p>
        <p className="text-4xl font-bold text-gray-900 mt-1">{(totalEarnedCents / 100).toFixed(2)} EUR</p>
        <p className="text-sm text-gray-400 mt-1">{transfers.length} transfera × 0.50 EUR</p>
      </div>
      {/* ALL TRANSFERS */}
<div>
  <h2 className="text-2xl font-bold text-gray-800 mb-6">Svi transferi</h2>
  {transfers.length === 0 ? (
    <div className="bg-gray-50 border-2 border-dashed rounded-xl p-10 text-center text-gray-400">
      Nema SEPA transfera.
    </div>
  ) : (
    <div className="space-y-4">
      {transfers.map((t) => {
        const senderEmail = t.sender?.email ?? 'Nepoznat';
        const recipientEmail = recipientMap[t.recipientIBAN]?.email ?? 'Nepoznat';

        return (
          <div key={t.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">

            <div className="px-6 py-4 flex flex-wrap gap-6 items-center text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Pošiljatelj</p>
                <p className="font-medium text-gray-900">{senderEmail}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Primatelj</p>
                <p className="font-medium text-gray-900">{recipientEmail}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Iznos</p>
                <p className="font-bold text-gray-800">{(t.amount / 100).toFixed(2)} EUR</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Datum</p>
                <p className="text-gray-500">
                  {new Date(t.createdAt).toLocaleString('hr-HR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  t.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                  t.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-700'
                }`}>
                  {t.status}
                </span>
              </div>
            </div>

            <details className="border-t">
              <summary className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-50 select-none">
                ISO 20022 poruke
              </summary>
              <div className="grid grid-cols-2 divide-x border-t bg-gray-50">
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">pain.001 — Payment Initiation</p>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap break-all">
                    {t.pain001Xml ?? 'Nema poruke'}
                  </pre>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">pain.002 — Status Report</p>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap break-all">
                    {t.pain002Xml ?? 'Nema poruke'}
                  </pre>
                </div>
              </div>
            </details>

          </div>
        );
      })}
    </div>
  )}
</div>
</div>
  );
}
