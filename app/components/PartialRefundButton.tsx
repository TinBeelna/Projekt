"use client";

import { useState } from "react";
import { requestRefundAction } from "@/app/lib/refund";

export default function PartialRefundButton({ stripeId, maxAmountCents }: { stripeId: string, maxAmountCents: number }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    const cents = Math.round(parseFloat(amount) * 100);

    if (!cents || cents <= 0 || cents > maxAmountCents) {
      alert("Neispravan iznos.");
      return;
    }

    setLoading(true);
    try {
      await requestRefundAction(stripeId, cents);
      alert("Zahtjev za djelomični povrat poslan adminu.");
      setAmount(""); // očisti input
    } catch (err) {
      alert("Greška pri slanju zahtjeva.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <input 
        type="number" 
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="EUR"
        className="border rounded px-2 py-1 text-xs w-20 outline-none focus:ring-1 focus:ring-blue-400"
      />
      <button 
        onClick={handleRequest}
        disabled={loading || !amount}
        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:bg-gray-300 transition"
      >
        {loading ? "..." : "Zatraži dio"}
      </button>
    </div>
  );
}
