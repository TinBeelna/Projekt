"use client";

import { useState } from "react";
import { requestRefundAction } from "@/app/lib/refund";

export default function FullRefundButton({ 
  stripeId, 
  amountCents 
}: { 
  stripeId: string, 
  amountCents: number 
}) {
  const [loading, setLoading] = useState(false);

  const handleFullRefundRequest = async () => {
    if (!confirm(`Zatražiti puni povrat od ${(amountCents / 100).toFixed(2)} EUR?`)) return;

    setLoading(true);
    try {
      await requestRefundAction(stripeId, amountCents);
      window.location.reload(); // za prikaz novog statusa
    } catch (err) {
      alert("Greška pri slanju zahtjeva.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFullRefundRequest}
      disabled={loading}
      className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Slanje..." : "Puni povrat"}
    </button>
  );
}
