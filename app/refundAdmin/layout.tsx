import { isRefundAdmin } from '@/app/lib/authentication';
import { RefundAdminNavbar } from '../components/Navbars';

export default async function RefundAdminLayout({ children }: { children: React.ReactNode }) {
  await isRefundAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <RefundAdminNavbar />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
