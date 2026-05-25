import { prisma } from "@/app/lib/prisma";
import { auth } from "@/app/lib/auth";
import { AutoRefresh } from "@/app/components/AutoRefresh";

export const dynamic = 'force-dynamic';

export default async function UserDisputesPage() {
    const session = await auth();
    const mail = session?.user?.email;

    const user = await prisma.user.findUnique({
        where: { email: mail! },
    });

    if (!mail || !user) return null;

    const userDisputes = await prisma.disputes.findMany({
        where: {
            paymentIntent: { email: mail },
        },
        include: { paymentIntent: true },
        orderBy: { id: "desc" },
    });

    const statusColor = (status: string) => {
        switch (status) {
            case "won":
                return "#22c55e";
            case "lost":
                return "#ef4444";
            default:
                return "#9ca3af";
        }
    };

    return (
        <div className="p-8">
            <AutoRefresh />
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Moji Sporovi</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Pregled svih vaših sporova za {mail}
                </p>
            </div>

            {userDisputes.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
                    Nemate aktivnih sporova.
                </div>
            ) : (
                <div className="space-y-6">
                    {userDisputes.map((dispute) => {
                        const color = statusColor(dispute.status);
                        return (
                            <div
                                key={dispute.disputeId}
                                className="border rounded-lg p-5 bg-gray-100 border-gray-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                        <strong className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                                            Dispute ID: {dispute.disputeId}
                                        </strong>
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                                                Status:
                                            </span>
                                            <p className="font-bold uppercase text-sm text-gray-500">
                                                {dispute.status.replace(/_/g, " ")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                                            Iznos:
                                        </span>
                                        <p className="text-lg font-bold text-gray-900">
                                            {dispute.paymentIntent?.currency?.toUpperCase()}{" "}
                                            {((dispute.amount ?? 0) / 100).toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-gray-400 capitalize">
                                            {dispute.reason?.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-2 text-sm text-gray-600 border-t border-gray-300 pt-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 font-medium">
                                        <span
                                            className="h-2 w-2 rounded-full inline-block"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span style={{ color }}>
                                            {dispute.status === "under_review"
                                                ? "Dokazi predani. Čeka se odluka banke."
                                                : dispute.status === "won"
                                                  ? "Spor riješen u vašu korist."
                                                  : dispute.status === "lost"
                                                    ? "Spor izgubljen."
                                                    : `Status: ${dispute.status.replace(/_/g, " ")}`}
                                        </span>
                                    </div>

                                    {dispute.evidence && (
                                        <div className="mt-2 text-sm text-gray-600 border-t border-gray-300 pt-3 flex flex-col gap-2">
                                            &ldquo;{dispute.evidence}&rdquo;
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
