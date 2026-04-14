import { logoutUser } from "@/app/actions";
import { UserNavbar } from "../components/Navbars";
export default async function UserLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            {}
            <UserNavbar />
            <main className="flex-1">
                <form action ={logoutUser}>                   
                </form>
                {children}
            </main>
        </div>
    );
}