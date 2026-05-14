
"use client";

import React, { useState, useEffect } from "react";
import CheckoutForm from "../../components/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { useFXRates } from "@/app/lib/useFXRates";
import { convertPrice, displayPrice } from "@/app/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);


export default function BuyPayPage() {

const [odabraniItem, setItem] = useState<string | null>(null);
const [clientSecret, setClientSecret] = useState<string>("");
const [FXcurrency, setCurrency] = useState('eur'); //dodano za fx; eur kao standardna
const [hasDefaultCard, setDefaultCard] = useState<boolean | null>(null); //default payment 
const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false); //default payment 3ds handling
const [rateLimitError, setRateLimitError] = useState<string | null>(null);
const rates = useFXRates();

useEffect(() => { //ZA RECOVERY
  const urlParams = new URLSearchParams(window.location.search);
  const secretFromUrl = urlParams.get("payment_intent_client_secret"); //pamti url i nakon refresha

  if (secretFromUrl) { //ako nema secreta korisnik je tek dosao
    setClientSecret(secretFromUrl); //ponovno checkoutform ako je refresh!
  }
}, []); // "cim se stranica upali"


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
    <div id="checkout" className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Kupi & Plati</h1>
      <p className="text-sm text-gray-500 mb-8">Klikni na ono sto zelis kupiti: novine (automatski) ili knjigu (ceka se na manual capture admina)</p>
      <div className="space-y-6">

        {/* FX: Gumbovi za biranje valute */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Odaberi valutu</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency('usd')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${FXcurrency === 'usd' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('eur')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${FXcurrency === 'eur' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              EUR (€)
            </button>
            <button
              onClick={() => setCurrency('gbp')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${FXcurrency === 'gbp' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              GBP (£)
            </button>
          </div>
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
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => initiatePayment("Novine", convertPrice(200, FXcurrency, rates), FXcurrency)}
                  className="w-full flex justify-between items-center bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-900 px-5 py-4 rounded-xl font-semibold text-sm transition group"
                >
                  <span>Kupi novine</span>
                  <span className="text-blue-600 font-bold">{displayPrice(200, FXcurrency, rates)}</span>
                </button>

                <button
                  onClick={() => initiatePayment("Knjiga", convertPrice(500, FXcurrency, rates), FXcurrency)}
                  className="w-full flex justify-between items-center bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-900 px-5 py-4 rounded-xl font-semibold text-sm transition group"
                >
                  <span>Kupi knjigu</span>
                  <span className="text-blue-600 font-bold">{displayPrice(500, FXcurrency, rates)}</span>
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
