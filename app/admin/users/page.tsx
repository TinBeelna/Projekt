import { prisma } from "@/app/lib/prisma";

export default async function UsersPage() {

  const users = await prisma.user.findMany({
    orderBy: {
      id: "asc"
    }
  })

  return(
    <div className="p-8 text-black">
      <h1 className="text-3xl font-bold mb-8 italic">👥 Popis Korisnika</h1>
      <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
        <table className="w-full text-left bg-white">
          <thead className="bg-slate-900 text-white uppercase text-sm">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Ime i Prezime</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user: any) => ( //prikaz korisnika, prouci za samostalnu izradu buducih tablica
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="p-4 text-gray-500 font-mono text-sm">{user.id}</td>
                <td className="p-4 font-semibold">{user.firstName} {user.lastName}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    user.role === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-center">
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );;
}