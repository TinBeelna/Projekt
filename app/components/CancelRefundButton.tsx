"use client";

import { useState } from "react";
import { cancelRefundAction } from "@/app/lib/refund";

export default function CancelRefundButton({ stripeId }: { stripeId: string }) {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      disabled={isPending}
      className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition disabled:opacity-50"
      onClick={async () => {
        if (!confirm("Sigurno želiš odbiti ovaj zahtjev za povrat?")) return;
        setIsPending(true);
        try {
          await cancelRefundAction(stripeId);
        } catch (err: any) {
          alert("Greška pri odbijanju: " + err.message);
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending ? "Odbijam..." : "Odbij zahtjev"}
    </button>
  );
}
