import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import TransferForm from "@/app/components/TransferForm";
import { transferFundsSEPA, balanceInquiry } from "@/app/lib/transfer";

export const dynamic = 'force-dynamic';

export default async function UserDashboardPage() {
  const session = await auth();
  const email = session?.user?.email;

  const user = await prisma.user.findUnique({
    where: {
      email: email!
    }
  });

  if (!email || !user) return null;

  const balance = await balanceInquiry(user.id);

  const sentTransfers = await prisma.transfer.findMany({ 
    where: {
      senderId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    }
    });

  const receivedTransfers =  user.IBAN ? await prisma.transfer.findMany({
    where: {
      recipientIBAN: user.IBAN!,
    },
    orderBy: {
      createdAt: 'desc',
    }
  }): [];

  const allTransfers = [
    ...sentTransfers.map(t => ({ ...t, type: 'sent' as const })),
    ...receivedTransfers.map(t => ({ ...t, type: 'received' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // sortiranje svih transfera po datumu
  
  const recipientIBANs = sentTransfers.map(t => t.recipientIBAN); // mapiranje transfera i imena korisnika koji su ih primili
  const recipients = await prisma.user.findMany({
    where: { 
      IBAN: { 
        in: recipientIBANs 
      } 
    },
    select: { IBAN: true, firstName: true, lastName: true }
  });
  const recipientMap = Object.fromEntries(recipients.map(r => [r.IBAN, r]));

  const senderIds = receivedTransfers.map(t => t.senderId); //mapiranje tko je poslao korisniku novac
  const senders = await prisma.user.findMany({
    where: {
      id: { 
        in: senderIds
      }
    },
    select: { id: true, firstName: true, lastName: true, IBAN: true }
  })
  const senderMap = Object.fromEntries(senders.map(s => [s.id, s]));

  async function handleTransfer(formData: FormData): Promise<{ error?: string}> {
    "use server";
    const IBAN = formData.get('IBAN') as string;
    const amountCentsString = formData.get('amount') as string;
    const amountCents = Number(amountCentsString)

    if(!Number.isInteger(amountCents) || amountCents <= 0) {
      return {
        error: "Iznos mora biti pozivitan cijeli broj (u centima)!"
      };
    }

    const session = await auth();
    const email = session?.user?.email;
    
    if (!email) {
      return {
        error: "Nisi prijavljen!"
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      }
    });

    if (!user) {
      return {
        error: "Nema korisnika sa ovim mailom!"
      };
    }

    try {
      await transferFundsSEPA(user.id, IBAN, amountCents);
      return {};
    } catch (err: any) {
      return {
        error: err.message
      };
    }
  }

  return (
    <div className="p-8 space-y-10">

      {/* STANJE RAČUNA */}
      <div className="bg-white border rounded-xl p-6">
        <p className="text-sm text-gray-500 uppercase font-semibold tracking-wide">Stanje računa</p>
        <p className="text-4xl font-bold text-gray-900 mt-1">{balance?.toFixed(2)} EUR</p>
      </div>

      {/* FORMA ZA TRANSFER */}
      <TransferForm action={handleTransfer} />

      {/* POVIJEST TRANSFERA */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Povijest transfera</h2>
        {allTransfers.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed rounded-xl p-10 text-center text-gray-400">
            Još nema transfera.
          </div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vrsta</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Korisnik</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IBAN</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Iznos</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Datum i vrijeme</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {allTransfers.map((t) => {
                  const isSent = t.type === 'sent';
                  const person = isSent ? recipientMap[t.recipientIBAN] : senderMap[t.senderId];
                  const personName = person ? `${person.firstName} ${person.lastName}` : 'Nepoznat';

                  return (
                    <tr key={`${t.type}-${t.id}`} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSent ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {isSent ? 'Poslano' : 'Primljeno'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{personName}</td>
                      <td className="px-6 py-4 font-mono text-gray-500 text-xs">
                        {isSent ? t.recipientIBAN : (senderMap[t.senderId]?.IBAN ?? '—')}
                      </td>
                      <td className={`px-6 py-4 font-bold ${t.status === 'failed' ? 'text-gray-400' : isSent ? 'text-red-600' : 'text-green-600'}`}>
                        {isSent ? '-' : '+'}{(t.amount / 100).toFixed(2)} EUR
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(t.createdAt).toLocaleString('hr-HR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          t.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                          t.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                                                     'bg-red-100 text-red-700'
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