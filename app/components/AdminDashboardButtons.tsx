"use client";

import { useState } from "react";
import { capturePayment } from "@/app/lib/manual-payment";
import { cancelPayment } from "@/app/lib/manual-payment"; 

export default function CaptureButtons({ paymentIntentId, fullAmount }: { paymentIntentId: string, fullAmount: number }) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (type: 'full' | 'partial' | 'cancel') => {
    if (!confirm("Jeste li sigurni?")) return;
    setLoading(true);

    let res;
    if (type === 'full') res = await capturePayment(paymentIntentId);
    if (type === 'partial') res = await capturePayment(paymentIntentId, fullAmount / 5); 
    if (type === 'cancel') res = await cancelPayment(paymentIntentId);

    if (!res?.success) alert("Greška: " + res?.error);
    setLoading(false);
  };

  return (
    <div className="flex gap-2">
      <button 
        disabled={loading}
        onClick={() => handleAction('full')}
        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
      >
        Capture (100%)
      </button>

      <button 
        disabled={loading}
        onClick={() => handleAction('partial')}
        className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 disabled:opacity-50"
      >
        Partial Capture (20%)
      </button>

      <button 
        disabled={loading}
        onClick={() => handleAction('cancel')}
        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
      >
        Unauthorize payment
      </button>
    </div>
  );
}
