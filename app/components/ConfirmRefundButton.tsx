"use client";

import { useState } from "react";
import { RefundAction } from "@/app/lib/refund"; 

export default function AdminExecuteRefund({ stripeId, amountCents }: { stripeId: string, amountCents: number }) {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      disabled={isPending}
      className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-800 disabled:opacity-50"
      onClick={async () => {
        if (!confirm("Sigurno želiš izvršiti isplatu na karticu korisnika?")) return;

        setIsPending(true);
        try {
          // 1. Capture the result of the action
          const result = await RefundAction(stripeId, amountCents); 
          
          // 2. Check if it was a real refund or just a sync
          if (result?.message?.includes("Chargeback") || result?.message?.includes("Already")) {
            alert("Sinkronizirano: Transakcija je već obrađena na Stripe-u (Povrat ili Dispute).");
          } else {
            alert("Novac uspješno vraćen!");
          }
        } catch (err: any) {
          // This only runs for REAL errors (network, wrong API keys, etc.)
          alert("Greška pri isplati: " + err.message);
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending ? "Vraćam novac..." : "Izvrši povrat"}
    </button>
  );
}
