"use client";
import { useState, useEffect } from "react";

export function useFXRates() {
  const [rates, setRates] = useState<Record<string, number>>({ eur: 1, usd: 1.08, gbp: 0.85 });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("https://api.frankfurter.dev/");
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setRates(prev => ({
          ...prev,
          usd: data.rates?.USD ?? prev.usd,
          gbp: data.rates?.GBP ?? prev.gbp,
        }));
      } catch (err) {
        console.error("Neuspjesan dohvat FX vrijednosti sa frankfurter stranice: ", err);
      }
    };
    fetchRates();
  }, []);

  return rates;
}
