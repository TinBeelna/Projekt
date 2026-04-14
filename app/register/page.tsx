"use client";

import { registerUser } from "../actions";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {

        const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleRegister(formData: FormData) {
        setErrorMessage(null); // resetiraj error prije svakog pokušaja registracije
        const result = await registerUser(formData);

        if (result?.error) {
          setErrorMessage(result.error); // postavi error poruku ako postoji
        }
      }
        

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-black">
                <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

                {errorMessage && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center text-sm">
                {errorMessage}
                    </div>
                                    )}
                
                <form action={handleRegister} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" id="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        <input type="text" name="firstName" id="firstName" required placeholder="First Name" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        <input type="text" name="lastName" id="lastName" required placeholder="Last Name" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" name="password" id="password" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>

                    <button 
                        type="submit" 
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Register
                    </button>
                </form>

                {/* Link je sad izvan forme, čišće je */}
                <p className="text-sm text-gray-600 mt-6 text-center">
                    Već imaš account?{' '}
                    <Link href="/" className="text-blue-500 hover:text-blue-700 font-medium underline">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    )
}
