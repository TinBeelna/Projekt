"use client";

import React, { useState, useEffect} from "react";
import CheckoutForm from "../../components/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { useFXRates } from "@/app/lib/useFXRates";
import { convertPrice, displayPrice} from "@/app/lib/utils";
import { SELLERS } from "@/app/lib/sellers"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

export default function MarketplaceProductsPage() {

    const [clientSecret, setClientSecret] = useState<string>("");
    const [FXcurrency, setCurrency] = useState('eur'); //dodano za fx; eur kao standardna
    const [hasDefaultCard, setDefaultCard] = useState<boolean | null>(null); //default payment 
    const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false); //default payment 3ds handling
    const [rateLimitError, setRateLimitError] = useState<string | null>(null);
    const [checkoutAmount, setCheckoutAmount] = useState<number | null>(null); //za apple pay
    const rates = useFXRates(); 

    useEffect(() => { //ZA RECOVERY
      const urlParams = new URLSearchParams(window.location.search);
      const secretFromUrl = urlParams.get("payment_intent_client_secret"); //pamti url i nakon refresha
    
      if (secretFromUrl) { //ako nema secreta korisnik je tek dosao
        setClientSecret(secretFromUrl); //ponovno checkoutform ako je refresh!
      }
    }, []); // "cim se stranica upali"

    const initiatePayment = async (item: string, amount: number, currency: string, sellerId: string) => {
        setIsAuthorizing(true);
        setRateLimitError(null);

        try {
            const response = await fetch("/api/create-marketplace-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: amount,
                    itemName: item,
                    currency: FXcurrency,
                    sellerId: sellerId, //dodan sellerId 
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

            // manual flow ako nema default kartice
            setClientSecret(clientSecret);
            setIsAuthorizing(false);
            setCheckoutAmount(amount);

            const newUrl = `${window.location.pathname}?payment_intent_client_secret=${clientSecret}`;
            window.history.pushState({}, '', newUrl);

        } catch (err) {
            console.error("Error prilikom placanja: ", err);
            setIsAuthorizing(false);
        }
    };
    return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Marketplace</h1>
      <p className="text-sm text-gray-500 mb-8">Kupi proizvode od prodavaca</p>
      <div className="space-y-6">

        {/* Odabir valute */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Odaberi valutu</p>
          <div className="flex gap-2">
            {["usd", "eur", "gbp"].map((c) => (
              <button key={c} onClick={() => setCurrency(c)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${FXcurrency === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {isAuthorizing ? (
          <div className="text-center py-10">
            <p className="animate-pulse text-blue-600 font-bold">Učitavanje...</p>
          </div>
        ) : (
          <>
            {rateLimitError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {rateLimitError}
              </div>
            )}

            {!clientSecret && SELLERS.map((seller) => (
              <div key={seller.accountId}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{seller.name}</p>
                <div className="flex flex-col gap-3">
                  {seller.products.map((product) => (
                    <button key={product.name}
                      onClick={() => initiatePayment(product.name, convertPrice(product.priceEurCents, FXcurrency, rates), FXcurrency, seller.accountId)}
                      className="w-full flex justify-between items-center bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-900 px-5 py-4 rounded-xl font-semibold text-sm transition">
                      <span>{product.name}</span>
                      <span className="text-blue-600 font-bold">{displayPrice(product.priceEurCents, FXcurrency, rates)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {clientSecret && <CheckoutForm clientSecret={clientSecret} amount = {checkoutAmount ?? undefined} currency = {FXcurrency}/>}
          </>
        )}
      </div>
    </div>
  );
}
