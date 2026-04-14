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
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Payment Methods</h1>
            
            {message && (
                <div className={`p-4 mb-6 rounded-md ${
                    message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                    {message.text}
                </div>
            )}
            
            {showAddForm ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Add New Payment Method</h2>
                    <AddPaymentMethodForm
                        userId={userId}
                        onSuccess={handleAddSuccess}
                        onError={handleAddError}
                    />
                    <button
                        onClick={() => setShowAddForm(false)}
                        className="mt-4 text-gray-600 hover:underline"
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
