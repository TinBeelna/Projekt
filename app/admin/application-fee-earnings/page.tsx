import { prisma } from "@/app/lib/prisma"
import { SELLERS } from "@/app/lib/sellers"
import { getAccFeeEarningsInCurr } from "@/app/lib/fee"

export const dynamic = 'force-dynamic';

const formatCurrency = (cents: number, currency: string) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export default async function ApplicationFeeEarningsPage() {

    const [totalEUR, totalGBP, totalUSD, allAppFees] = await Promise.all([
        getAccFeeEarningsInCurr("eur"),
        getAccFeeEarningsInCurr("gbp"),
        getAccFeeEarningsInCurr("usd"),
        prisma.applicationFee.findMany({
            orderBy: { createdAt: 'desc' },
        }),
    ])

    return (
        <div className="p-8">

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Earnings from 3PS</h1>
                <p className="text-sm text-gray-500 mt-1">Overview of your multi-currency application fee earnings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[
                    { label: "EUR", total: totalEUR },
                    { label: "GBP", total: totalGBP },
                    { label: "USD", total: totalUSD },
                ].map(({ label, total }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-tight mb-1">{label}</p>
                        <p className="text-3xl font-black text-green-600">{formatCurrency(total, label)}</p>
                    </div>
                ))}
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-4">Fee History</h2>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Seller</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Refunded</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Payment Intent</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {allAppFees.map((fee) => {
                            const seller = SELLERS.find(s => s.accountId === fee.sellerId);
                            return (
                                <tr key={fee.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{seller?.name ?? fee.sellerId}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-green-700">{formatCurrency(fee.amount, fee.currency)}</td>
                                    <td className="px-6 py-4 text-sm text-red-500">{fee.amountRefunded > 0 ? formatCurrency(fee.amountRefunded, fee.currency) : <span className="text-gray-300">—</span>}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{fee.IntentStripeId}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(fee.createdAt).toLocaleDateString("hr-HR")}</td>
                                </tr>
                            );
                        })}
                        {allAppFees.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400">No fee records found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
