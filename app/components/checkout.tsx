"use client";

import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements
} from '@stripe/react-stripe-js';
import { loadStripe, StripePaymentElementOptions } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();

  //RECOVERY FLOW useffect fja
  React.useEffect(() => { 

    if(!stripe) return; //je li stripe sdk budan
    const secretFromUrl = new URLSearchParams(window.location.search)
      .get("payment_intent_client_secret"); //citaj tajni kljuc iz urla

    if (!secretFromUrl) return;
    //switch da se vidi sto se tocno dogodilo u checkoutu; 
    stripe.retrievePaymentIntent(secretFromUrl).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          window.location.href = `/user/success?payment_intent=${paymentIntent.id}`; //success stranica sa uspjehom 
          break;
        case "processing":
          window.location.href = `/user/success?payment_intent=${paymentIntent.id}`; //success stranica sa failom
          break;
        case "requires_payment_method":
          if (paymentIntent.last_payment_error) {
            setMessage("Payment didn't succeed during reload."); 
          }
          break;

         case "requires_action":
          setMessage("Ponovno pokrećem provjeru banke..."); //porukica dok se otvara
          setIsLoading(true); //blokira se gumb paynow (otvoren proces u pozadini)

          // PONOVNO OTVARANJE 3DS PROZORA
          stripe.handleNextAction({
          clientSecret: secretFromUrl, //otvara se prozor 3DSa prema urlu
          }).then(({ error, paymentIntent }) => { //kada se zavrsi s prozorom
          if (error) { //hendlanje errora
          setMessage(error.message ?? "Autentifikacija nije uspjela.");
          setIsLoading(false);
           } else if (paymentIntent?.status === "succeeded") { //ako uspije ide se na success
           // Ako uspije nakon modala, šalji na success
            window.location.href = `/user/success?payment_intent=${paymentIntent.id}`;
           }
          });
           break;

        default:
          setMessage("Nešto je pošlo po krivu.");
          break;
      }
    });
  }, [stripe]);

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "http://localhost:3000/user/success",
      },
    });

    if (error) { 
      setMessage(error.message ?? "Error during payment");
      console.log("Stripe error type:", error.type);
      console.log("Stripe error code:", error.code);
}


  setIsLoading(false);
};

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "accordion",
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <button 
        disabled={isLoading || !stripe || !elements} 
        id="submit"
        className="mt-4 w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
      >
        <span id="button-text">
          {isLoading ? "Obrađujem..." : "Pay now"}
        </span>
      </button>
      {}
      {message && <div id="payment-message" className="text-red-500 mt-2 text-sm">{message}</div>}
    </form>
  );
}

interface CheckoutFormProps {
  clientSecret: string;
}

export default function CheckoutForm({ clientSecret }: CheckoutFormProps) {
  const appearance: { theme: 'stripe' } = {
    theme: 'stripe',
  };

  return (
    <Elements stripe={stripePromise} options={{ appearance, clientSecret }}>
      <PaymentForm />
    </Elements>
  );
}
