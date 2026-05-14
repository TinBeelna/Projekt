import Link from "next/link";
import { logoutUser } from "../actions";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm font-medium text-slate-200 hover:text-white"
    >
      {children}
    </Link>
  );
}

function LogoutButton() {
  return (
    <div className="px-3 pb-4">
      <form action={logoutUser}>
        <button
          type="submit"
          className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition"
        >
          ⬅ Logout
        </button>
      </form>
    </div>
  );
}

export function AdminNavbar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl flex-shrink-0">
      <div className="px-6 py-5 border-b border-slate-800">
        <h1 className="text-base font-bold text-white">PayDash</h1>
        <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1 p-3">
        <NavLink href="/admin/admin-dashboard">🏠 Dashboard</NavLink>
        <NavLink href="/admin/subscriptions">📦 Subscriptions</NavLink>
        <NavLink href="/admin/users">👥 Users</NavLink>
        <NavLink href="/admin/webhooks">🕒 Webhooks</NavLink>
        <NavLink href="/admin/refunds">🔄 Refunds</NavLink>
        <NavLink href="/admin/disputes">⚠️ Disputes</NavLink>
        <NavLink href="/admin/balance">💰 Balance & Payouts</NavLink>
        <NavLink href="/admin/application-fee-earnings">💸 Application fee earnings</NavLink>
      </nav>
      <LogoutButton />
    </aside>
  );
}

export function UserNavbar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl flex-shrink-0">
      <div className="px-6 py-5 border-b border-slate-800">
        <h1 className="text-base font-bold text-white">PayDash</h1>
        <p className="text-xs text-slate-400 mt-0.5">User Portal</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1 p-3">
        <NavLink href="/user/user-dashboard">🏠 Dashboard</NavLink>
        <NavLink href="/user/buypay">🛒 Buy & Pay</NavLink>
        <NavLink href="/user/marketplace-products"> 👠 Marketplace (3PS)</NavLink>
        <NavLink href="/user/payments">💳 Payments</NavLink>
        <NavLink href="/user/refunds">🔄 Refunds</NavLink>
        <NavLink href="/user/mysubscriptions">📋 My Subscriptions</NavLink>
        <NavLink href="/user/paymentmethods">💵 Payment Methods</NavLink>
      </nav>
      <LogoutButton />
    </aside>
  );
}

export function RefundAdminNavbar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl flex-shrink-0">
      <div className="px-6 py-5 border-b border-slate-800">
        <h1 className="text-base font-bold text-white">PayDash</h1>
        <p className="text-xs text-slate-400 mt-0.5">Refund Admin</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1 p-3">
        <NavLink href="/refundAdmin/refunds">🔄 Refunds</NavLink>
      </nav>
      <LogoutButton />
    </aside>
  );
}
