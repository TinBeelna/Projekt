
"use client";

import React, { useState, useEffect } from "react";
import CheckoutForm from "../../components/checkout";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);


export default function BuyPayPage() {

const [odabraniItem, setItem] = useState<string | null>(null);
const [clientSecret, setClientSecret] = useState<string>("");
const [FXcurrency, setCurrency] = useState('eur'); //dodano za fx; eur kao standardna
const [hasDefaultCard, setDefaultCard] = useState<boolean | null>(null); //default payment 
const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false); //default payment 3ds handling
const [rateLimitError, setRateLimitError] = useState<string | null>(null);
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

  if (secretFromUrl) { //ako nema secreta korisnik je tek dosao
    setClientSecret(secretFromUrl); //ponovno checkoutform ako je refresh!
  }
}, []); // "cim se stranica upali"

const displayPrice = (amountEurCents: number) => {
  const rate = rates[FXcurrency] || 1;
  const converted = (amountEurCents / 100) * rate;
  
  // formatiranje u 2-decimalni broj sa znakom valute
  return `${currencySymbols[FXcurrency as keyof typeof currencySymbols]}${converted.toFixed(2)}`;
};

const convertPrice = (amountEurCents: number) => {
  const rate = rates[FXcurrency] || 1;
  const converted = (amountEurCents / 100) * rate;
  const rounded = Math.round(converted * 100)
  
  // formatiranje u 2-decimalni broj sa znakom valute
  return rounded;
};


const initiatePayment = async (item: string, amount: number, currency: string) => {
  setItem(item);
  setIsAuthorizing(true);
  setRateLimitError(null);

  try {
    const response = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount,
        itemName: item,
        currency: FXcurrency,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setRateLimitError(data.error || "Doslo je do greske. Pokusaj ponovo.");
      setIsAuthorizing(false);
      return;
    }

    const { clientSecret, hasDefaultCard } = data;
    const stripe = await stripePromise;
    setDefaultCard(hasDefaultCard);

    // automatski flow ako imamo default karticu
    if (hasDefaultCard && stripe) {
      // provjera statusa
      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") {
        window.location.href = `/user/success?payment_intent=${paymentIntent.id}`;
        return; // idemo na success stranicu ako prode 
      } 
      
      if (paymentIntent?.status === "requires_action") {
        // handleNextAction za 3ds 
        const { error, paymentIntent: updatedIntent } = await stripe.handleNextAction({ clientSecret });

        if (!error && updatedIntent) {
          window.location.href = `/user/success?payment_intent=${updatedIntent.id}`;
          return;
        } else {
          alert(error?.message || "Autentikacija nije prošla.");
          setIsAuthorizing(false);
          return;
        }
      }
    }

    // "manual" flow ako nema default kartice    
    setClientSecret(clientSecret); //clientsecret da ga dobije checkoutform
    setIsAuthorizing(false); //mice se loading tekst

    const newUrl = `${window.location.pathname}?payment_intent_client_secret=${clientSecret}`; //update url za recovery
    window.history.pushState({}, '', newUrl);

  } catch (err) {
    console.error("Error prilikom placanja: ", err);
    setIsAuthorizing(false); //ako dode do errora stavlja se loading u false 
  }
};



    return (
    <div id="checkout" className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold mb-5"> Klikni na ono sto zelis kupiti: novine (automatski) ili knjigu (ceka se na manual capture admina) </h1>
      <div className="space-y-4">

        {/* FX: Gumbovi za biranje valute */}
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

        {/* Ako se kartica autorizira prikazi tekst */}
        {isAuthorizing ? (
          <div className="text-center py-10">
            <p className="animate-pulse text-blue-600 font-bold">Učitavanje...</p>
          </div>
        ) : (
          <>
            {/* Poruka o rate limitu */}
            {rateLimitError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {rateLimitError}
              </div>
            )}

            {/* Gumbovi za kupnju (dok nema client secreta) */}
            {!clientSecret && (
              <div className="space-y-4 flex flex-col">
                <button 
                  onClick={() => initiatePayment("Novine", convertPrice(200), FXcurrency)} 
                  className="bg-blue-600 text-white p-3 rounded"
                >
                  Kupi novine (Cijena: {displayPrice(200)})
                </button>

                <button 
                  onClick={() => initiatePayment("Knjiga", convertPrice(500), FXcurrency)}
                  className="bg-blue-600 text-white p-3 rounded"
                >
                  Kupi knjigu (Cijena: {displayPrice(500)})
                </button>
              </div>
            )}

            {/* Ako ne autoriziramo automatski i ako imamo clientsecret pprikaz checkout forme */}
            {clientSecret && <CheckoutForm clientSecret={clientSecret} />} 
          </>
        )}
      </div>
    </div>
  );
}
