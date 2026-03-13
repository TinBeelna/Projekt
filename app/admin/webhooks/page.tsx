import { prisma } from "@/app/lib/prisma";

export default async function WebhooksPage() {
const logs = await prisma.webhook.findMany({
    orderBy: { createdAt: 'desc' }, 
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Stripe Webhook Logovi</h1>
      <div className="bg-white shadow border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip Eventa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vrijeme</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalji (JSON)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm text-blue-600">{log.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(log.createdAt).toLocaleString('hr-HR')}
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">
                  <details>
                    <summary className="cursor-pointer text-blue-400">Vidi Payload</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-w-xs">
                      {log.payload}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}