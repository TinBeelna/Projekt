"use client";

import React, { useRef, useState } from "react";
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

  const hasRun = useRef(false);

  React.useEffect(() => {
  if (!stripe || hasRun.current) return;
  hasRun.current = true;

  const search = window.location.search;

  const params = new URLSearchParams(window.location.search);

  const clientSecret = params.get("payment_intent_client_secret");
  if (!clientSecret) return;

  stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
    if (!paymentIntent) return;

    if (paymentIntent.status === "requires_payment_method" && !window.location.search.includes("payment_intent")) {
      return;
    } //fix for kartica odbijena issue
    console.log("RECOVERY STATUS:", paymentIntent.status);
    switch (paymentIntent.status) {
      case "succeeded":
        window.history.replaceState({}, '', window.location.pathname);
        window.location.href = `/user/success?payment_intent=${paymentIntent.id}`;
        break;

      case "processing":
        setMessage("Plaćanje se obrađuje...");

        setTimeout(() => {
          window.location.href = `/user/success?payment_intent=${paymentIntent.id}`;
        }, 2000);
        break;

      case "requires_action":
        setMessage("Potrebna autentifikacija...");

        stripe.handleNextAction({ clientSecret }).then(({ error, paymentIntent }) => {
          if (error) {
            setMessage(error.message ?? "Greška");
            return;
          }

          if (paymentIntent?.status === "succeeded") {
            window.location.href = `/user/success?payment_intent=${paymentIntent.id}`;
          }
        });
        break;

      case "requires_payment_method":
        setMessage("Kartica nije prošla. Pokušajte ponovno.");
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
          {isLoading ? "Obrađujem..." : "Authorize payment"}
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