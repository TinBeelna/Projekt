import { prisma } from "@/app/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function UserProvisionsPage() {

  const transfers = await prisma.transfer.findMany({
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { email: true } } },
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

  const totalEarnedCents = transfers.length * 50;

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
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pošiljatelj</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Primatelj</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Iznos</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Datum i vrijeme</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {transfers.map((t) => {
                  const senderEmail = t.sender?.email ?? 'Nepoznat';
                  const recipientEmail = recipientMap[t.recipientIBAN]?.email ?? 'Nepoznat';

                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{senderEmail}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{recipientEmail}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{(t.amount / 100).toFixed(2)} EUR</td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(t.createdAt).toLocaleString('hr-HR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          t.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
