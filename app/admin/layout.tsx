import { isAdmin } from '@/app/lib/authentication';
import { logoutUser } from '../actions';
import { AdminNavbar } from '../components/Navbars';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // Ovo "zaključava" sve stranice unutar /admin/ grupe
    await isAdmin(); 

    return (
        <div className="flex">
            {}
            <AdminNavbar />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}