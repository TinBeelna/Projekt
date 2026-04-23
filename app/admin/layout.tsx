import { isAdmin } from '@/app/lib/authentication';
import { AdminNavbar } from '../components/Navbars';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await isAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
