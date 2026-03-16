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
          await RefundAction(stripeId, amountCents); 
          alert("Novac vraćen!");
        } catch (err) {
          alert("Greška pri isplati.");
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending ? "Vraćam novac..." : "Izvrši povrat"}
    </button>
  );
}
