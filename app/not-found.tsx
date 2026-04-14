import Link from "next/link";

export default function Custom404() {
  return ( 
  <div >
    <h1>404 - Stranica ne postoji ili vam nije dostupna</h1>
    <Link 
        href="/user/user-dashboard" 
        className="mt-6 text-blue-600 hover:text-blue-800 font-medium underline transition"
      >
        Vrati se na User Dashboard
      </Link>
    </div>
  );
}