"use client";

import { useState } from 'react';
import PaymentMethodList from '@/app/components/PaymentMethodList';
import AddPaymentMethodForm from '@/app/components/AddPaymentMethodForm';

export default function PaymentMethodsClient({ userId }: { userId: string }) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleAddSuccess = () => {
        setMessage({ type: 'success', text: 'Uspjesno dodana kartica!' });
        setShowAddForm(false); 
    };

    const handleAddError = (error: string) => {
        setMessage({ type: 'error', text: error });
    };

    return (
        <div className="p-8 max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Methods</h1>
            <p className="text-sm text-gray-500 mb-8">Upravljajte vašim spremljenim karticama.</p>

            {message && (
                <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${
                    message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    {message.text}
                </div>
            )}

            {showAddForm ? (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-5">Add New Payment Method</h2>
                    <AddPaymentMethodForm
                        userId={userId}
                        onSuccess={handleAddSuccess}
                        onError={handleAddError}
                    />
                    <button
                        onClick={() => setShowAddForm(false)}
                        className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <PaymentMethodList
                    userId={userId}
                    onAddNewClick={() => setShowAddForm(true)}
                />
            )}
        </div>
    );
}
