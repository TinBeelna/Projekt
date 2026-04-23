import Link from "next/link";

export default function Custom404() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-500 mb-8 text-lg">Stranica ne postoji ili vam nije dostupna</p>
      <Link
        href="/user/user-dashboard"
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition text-sm"
      >
        Vrati se na User Dashboard
      </Link>
    </div>
  );
}
