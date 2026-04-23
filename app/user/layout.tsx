import { UserNavbar } from "../components/Navbars";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
