
"use client";

import React, { useState, useEffect } from "react";
import CheckoutForm from "../../components/checkout";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

export default function BuyPayPage() {

// Dodaj <string | null> da TS zna da item može biti tekst
const [odabraniItem, setItem] = useState<string | null>(null);
const [clientSecret, setClientSecret] = useState<string>("");
const [FXcurrency, setCurrency] = useState('eur'); //dodano za fx; eur kao standardna
const [hasDefaultCard, setHasDefaultCard] = useState<boolean | null>(null); //za default card placanje
const [rates, setRates] = useState<{ [key: string]: number}>({eur: 1, usd: 1.08, gbp: 0.85}); //default fallback fx
const currencySymbols = {
    usd: '$',
    eur: '€',
    gbp: '£'
  };

useEffect(() => { //lovljenje FX vrijednosti sa frankfurter stranice
  const fetchRates = async () => {
    try {

      const res = await fetch("https://api.frankfurter.dev/"); //iz nekog razloga ova radi; .app i /latest ne
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

React.useEffect(() => { //ZA RECOVERY
  const urlParams = new URLSearchParams(window.location.search);
  const secretFromUrl = urlParams.get("payment_intent_client_secret"); //pamti url i nakon refresha

  // if (secretFromUrl) { //ako nema secreta korisnik je tek dosao
  //   setClientSecret(secretFromUrl); //ponovno checkoutform ako je refresh!
  // }
}, []); // "cim se stranica upali"

const displayPrice = (amountEurCents: number) => {
  const rate = rates[FXcurrency] || 1;
  const converted = (amountEurCents / 100) * rate;
  
  // formatiranje u 2-decimalni broj sa znakom valute
  return `${currencySymbols[FXcurrency as keyof typeof currencySymbols]}${converted.toFixed(2)}`;
};

// const convertPrice = (amountEurCents: number) => {
//   const rate = rates[FXcurrency] || 1;
//   const converted = (amountEurCents / 100) * rate;
//   const rounded = Math.round(converted * 100)
  
//   // formatiranje u 2-decimalni broj sa znakom valute
//   return rounded;
// };


const initiatePayment = async (
  item: string,
  amountEurCents: number,
  currency: string
) => {
  setItem(item); 

  // Poziv backend API-ja za kreiranje Payment Intenta
  const response = await fetch("/api/create-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      amountEurCents: amountEurCents, //amount (u euru)
      itemName: item,
      currency: currency, //dodana valuta
    }), // salje se iznos za naplatu i ime proizvoda!
  });
  const { clientSecret, hasDefaultCard } = await response.json(); //dodan default card check da vidim jel' je ima
  setClientSecret(clientSecret);
  setHasDefaultCard(hasDefaultCard);

  if (hasDefaultCard) {
    const stripe = await stripePromise;

    if (!stripe) return;

    const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

    if (paymentIntent?.status === "succeeded") {
      window.location.href = `/user/success?payment_intent=${paymentIntent.id}`;
    } else if (paymentIntent?.status === "requires_action") {
      await stripe.handleNextAction({clientSecret})
    }
  }

  //URL UPDATE 
  const newUrl = `${window.location.pathname}?payment_intent_client_secret=${clientSecret}&redirect=1`;
  window.history.pushState({}, '', newUrl);

}

  return (
    <div id = "checkout" className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold mb-5"> Klikni na ono sto zelis kupiti</h1>
      <div className="space-y-4">

        {/* FX: Gumbovi za biranje valute*/}
      <div className="flex gap-2 mb-8">
        <button 
          onClick={() => setCurrency('usd')}
          className={`px-4 py-2 border rounded ${FXcurrency === 'usd' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
        >
          USD ($)
        </button>
        <button 
          onClick={() => setCurrency('eur')}
          className={`px-4 py-2 border rounded ${FXcurrency === 'eur' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
        >
          EUR (€)
        </button>
        <button 
          onClick={() => setCurrency('gbp')}
          className={`px-4 py-2 border rounded ${FXcurrency === 'gbp' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
        >
          GBP (£)
        </button>
      </div>

         {/* gumbovi */}
        <button 
          onClick={() => initiatePayment("Novine", 200, FXcurrency)} 
          className="bg-blue-600 text-white"
        >
          Kupi novine (Cijena: {displayPrice(200)})
        </button>

      <button 
          onClick={() => initiatePayment("Knjiga", 500, FXcurrency)}
          className="bg-blue-600 text-white"
        >
          Kupi knjigu (Cijena: {displayPrice(500)})
        </button>

        {/*checkoutform kada initiate payment dobije tajni kljuc (na dodir gumba) */}
        {clientSecret && hasDefaultCard === false && (
          <CheckoutForm clientSecret={clientSecret} />
        )}
      </div>
    </div>
  );
}
