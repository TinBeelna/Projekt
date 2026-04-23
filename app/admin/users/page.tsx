import { prisma } from "@/app/lib/prisma";

export default async function UsersPage() {

  const users = await prisma.user.findMany({ 
    where: {
      role: {
        in: ["USER", "REFUNDADMIN"]
      },
    },
    orderBy: {
      id: "asc"
    }
  })

  return(
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900">👥 Popis Korisnika</h1>
      <p className="text-sm text-gray-500 mb-8">Popis svih registriranih korisnika sustava.</p>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ime i Prezime</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user: any) => ( //prikaz korisnika, prouci za samostalnu izradu buducih tablica
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{user.id}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    user.role === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}