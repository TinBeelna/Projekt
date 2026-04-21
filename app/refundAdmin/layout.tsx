import { isRefundAdmin } from '@/app/lib/authentication';
import { logoutUser } from '../actions';
import {RefundAdminNavbar } from '../components/Navbars';
export default async function RefundAdminLayout({ children }: { children: React.ReactNode }) {

    await isRefundAdmin(); 

    return (
        <div className="flex">
            {}
            <RefundAdminNavbar />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}