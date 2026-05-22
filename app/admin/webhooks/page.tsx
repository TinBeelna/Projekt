import { prisma } from "@/app/lib/prisma";
import { AutoRefresh } from "@/app/components/AutoRefresh";

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(0, parseInt(pageParam ?? "0") || 0);

  const [logs, total] = await Promise.all([
    prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    }),
    prisma.webhook.count(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8">
      <AutoRefresh intervalMs={10000} />
      <h1 className="text-2xl font-bold mb-1 text-gray-900">Stripe Webhook Logovi</h1>
      <p className="text-sm text-gray-500 mb-8">Prikaz svih primljenih Stripe webhook evenata.</p>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tip Eventa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vrijeme</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Detalji (JSON)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-blue-600">{log.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(log.createdAt).toLocaleString('hr-HR')}
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">
                  <details>
                    <summary className="cursor-pointer text-blue-500 hover:text-blue-600 font-medium">Vidi Payload</summary>
                    <pre className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 overflow-auto max-w-xs text-xs leading-relaxed">
                      {log.payload}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>
          Stranica {page + 1} od {totalPages} &nbsp;·&nbsp; {total} ukupno
        </span>
        <div className="flex gap-2">
          {page > 0 && (
            <a
              href={`?page=${page - 1}`}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
            >
              ← Prethodna
            </a>
          )}
          {page + 1 < totalPages && (
            <a
              href={`?page=${page + 1}`}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
            >
              Sljedeća →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
