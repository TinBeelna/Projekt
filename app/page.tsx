"use client";

import { loginUser } from './actions'
import Link from 'next/link'
import { useState } from 'react';

export default function LoginPage() { // koristi se loginUser za logiranje, svo uredenje auto generirano :)
      const [errorMessage, setErrorMessage] = useState<string | null>(null);

      async function handleLogin(formData: FormData) {
        setErrorMessage(null); // resetiraj error prije svakog pokušaja logiranja
        const result = await loginUser(formData);

        if (result?.error) {
          setErrorMessage(result.error); // postavi error poruku ako postoji
        }
      }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
                {errorMessage && (
                    <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">
                        {errorMessage}
                    </div>
                )}
                <form action={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" id="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" name="password" id="password" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Login
                        </button>

                        {/* Link to registration page */}
                        <p className="text-sm text-gray-600 mt-4 text-center">
                         Nemaš account?{' '}
                        <Link href="/register" className="text-blue-500 hover:text-blue-700 font-medium">
                         Register
                       </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}
