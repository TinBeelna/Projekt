"use client";

import React, { useEffect, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
  PaymentRequestButtonElement //automatski daje apple i/ili google pay ako imamo registriranu karticu
} from '@stripe/react-stripe-js';
import { loadStripe, StripePaymentElementOptions, PaymentRequest, PaymentRequestPaymentMethodEvent } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

function PaymentForm({clientsecret, amount, currency}: { clientsecret?: string; amount?: number, currency?: string;}) { //Apple pay nije pametan kao paymentelement; treba mu dati info
  const stripe = useStripe();
  const elements = useElements();

  //RECOVERY FLOW useffect fja
  //ko default card placanja 3ds flow se vrsi preko stripe stranice, tako da reload ne cini razliku; recovery isto kao i za manual!
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
            setMessage("Autorizacija banke u tijeku...");
            setIsLoading(true);

            stripe.handleNextAction({
              clientSecret: secretFromUrl,
            }).then(async ({ error }) => {

              // ako dobijemo auth error 
              if (error) {
                setMessage(error.message ?? "Autentifikacija nije uspjela.");
                setIsLoading(false);
                return;
              }

              // uzima se paymentintent
              const { paymentIntent } = await stripe.retrievePaymentIntent(secretFromUrl);

              if (!paymentIntent) {
                setMessage("PaymentIntent nije pronađen.");
                setIsLoading(false);
                return;
              }

              // ako se procesuira ili je vec uspjelo ide se na success page
              if (
                paymentIntent.status === "succeeded" ||
                paymentIntent.status === "processing"
              ) {
                window.location.replace(
                  `/user/success?payment_intent=${paymentIntent.id}`
                );
                return;
              }

              if (paymentIntent.status === "requires_payment_method") {
                setMessage("Plaćanje nije uspjelo. Pokušaj drugu karticu.");
                setIsLoading(false);
                return;
              }

              // fallback (ai preporuka)
              setMessage("Plaćanje je u obradi. Stranica će se ažurirati automatski.");
              setIsLoading(false);

              // safety redirect
              window.location.replace(
                `/user/success?payment_intent=${paymentIntent.id}&status=processing`
              );
            });

            break;

        default:
          setMessage("Nešto je pošlo po krivu.");
          break;
      }
    });
  }, [stripe]);
  //RECOVERY FLOW kraj

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [applePaymentRequest, setApplePaymentRequest] = useState<PaymentRequest | null>(null); //null ako je apple pay nedostupan u browseru
  const [googlePaymentRequest, setGooglePaymentRequest] = useState<PaymentRequest | null>(null); //null ako je google pay nedostupan u browseru


  //APPLE PAY useeffect
  useEffect(() => {
    if (!stripe || !amount || !currency) return; //ne ucitavaj ako nema infa

    const pr = stripe.paymentRequest({ //payment request (kaze se appleu koji info dati kada user dobije face ID prompt) (+ google)
      country: 'HR',
      currency: currency.toLowerCase(),
      total: { label: 'Plaćanje proizvoda', amount},
      requestPayerName: false,
      requestPayerEmail: false,
    });

    pr.canMakePayment().then((result) => { //set state ako je apple pay dostupan (+google)
      console.log('canMakePayment result:', result);
      if (result?.applePay) setApplePaymentRequest(pr);
      if (result?.googlePay) setGooglePaymentRequest(pr);
    });

    pr.on('paymentmethod', 
      async (e: PaymentRequestPaymentMethodEvent) => { //nakon apple/google pay autentikacije
      if (!clientsecret) return;
      const {error, paymentIntent} = await stripe.confirmCardPayment(
        clientsecret,
        { payment_method: e.paymentMethod.id}, //one-time payment token za placanje od applea/googlea
      );
      if (error) { //handleanje uspjeha/errora 
        e.complete('fail');
        setMessage(error.message ?? 'Plaćanje neuspjelo!!');
      } else {
        e.complete('success');
        window.location.href = `/user/success?payment_intent=${paymentIntent!.id}`;
      }
    }
  );
  }, [stripe, amount, currency]) //rerun u slucaju promjerene

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/success`,
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
  <>
    {/* Apple pay gumb */}
    {applePaymentRequest && (
      <>
        <PaymentRequestButtonElement options={{ paymentRequest: applePaymentRequest }} />
        <p className="text-center text-xs text-gray-400 my-3">ili platite karticom</p>
      </>
    )}
    {/* Apple pay gumb */}

    {/* Google pay gumb */}
    {googlePaymentRequest && (
      <>
        <PaymentRequestButtonElement options={{ paymentRequest: googlePaymentRequest }} />
        <p className="text-center text-xs text-gray-400 my-3">ili platite karticom</p>
      </>
    )}
    {/* Google pay gumb */}

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
  </>
);

}

interface CheckoutFormProps { // amount/currency dodani za apple/google pay
  clientSecret: string;
  amount?: number;
  currency?: string;
}

export default function CheckoutForm({ clientSecret, amount, currency }: CheckoutFormProps) {
  const appearance: { theme: 'stripe' } = {
    theme: 'stripe',
  };

  return (
    <Elements stripe={stripePromise} options={{ appearance, clientSecret }}>
      <PaymentForm clientsecret={clientSecret} amount = {amount} currency = {currency} />
    </Elements>
  );
}