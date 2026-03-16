import Link from "next/link";
import { logoutUser } from "../actions";

export function AdminNavbar() {
    return (
    <aside className="w-80 bg-slate-900 text-white min-h-screen p-6 flex flex-col shadow-xl">
        <nav className="flex flex-col gap-12 flex-1">
            <Link href="/admin/admin-dashboard" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    🏠 Dashboard
  </Link>
    <Link href="/admin/subscriptions" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    📦 Subscriptions
    </Link>
    <Link href="/admin/users" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    👥 Users
    </Link>
    <Link href="/admin/webhooks" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    🕒 Webhooks
    </Link>
    <Link href="/admin/refunds" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    🔄 Refunds
    </Link>
</nav>
<div className="mt-auto">
    <form action={logoutUser}>
        <button type = "submit" className="mt-6 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition">
            Logout
        </button>
    </form>
</div>
</aside>
);
}

export function UserNavbar() {
    return (
    <aside className="w-80 bg-slate-900 text-white min-h-screen p-6 flex flex-col shadow-xl">
        <nav className="flex flex-col gap-12 flex-1">
            <Link href="/user/user-dashboard" className="p-3 hover:bg-slate-800 rounded transition font-medium">
      Dashboard
    </Link>
    <Link href="/user/buypay" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    📦 Buypay
    </Link>
    <Link href="/user/payments" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    $ Payments
    </Link>
    <Link href="/user/refunds" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    🔄 Refunds
    </Link>
    <Link href="/user/mysubscriptions" className="p-3 hover:bg-slate-800 rounded transition font-medium">
    � My Subscriptions
    </Link>
</nav>
<div className="mt-auto">
    <form action={logoutUser}>
        <button type = "submit" className="mt-6 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition">
            Logout
        </button>
    </form>
</div>
</aside>
);
}
