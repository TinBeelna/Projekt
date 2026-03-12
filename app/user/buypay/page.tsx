
"use client";

import React, { useState, useEffect } from "react";
import CheckoutForm from "../../components/checkout";


export default function BuyPayPage() {

// Dodaj <string | null> da TS zna da item može biti tekst
const [odabraniItem, setItem] = useState<string | null>(null);
const [clientSecret, setClientSecret] = useState<string>("");

React.useEffect(() => { //ZA RECOVERY
  const urlParams = new URLSearchParams(window.location.search);
  const secretFromUrl = urlParams.get("payment_intent_client_secret"); //pamti url i nakon refresha

  if (secretFromUrl) { //ako nema secreta korisnik je tek dosao
    setClientSecret(secretFromUrl); //ponovno checkoutform ako je refresh!
  }
}, []); // "cim se stranica upali"


const initiatePayment = async (item: string, amount: number) => {
  setItem(item); 

  // Poziv backend API-ja za kreiranje Payment Intenta
  const response = await fetch("/api/create-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      amount: amount,
      itemName: item,
    }), // salje se iznos za naplatu i ime proizvoda!
  });
  const { clientSecret } = await response.json();
  setClientSecret(clientSecret);

  //URL UPDATE 
  const newUrl = `${window.location.pathname}?payment_intent_client_secret=${clientSecret}`;
  window.history.pushState({}, '', newUrl);

}



  return (
    <div id = "checkout" className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold mb-5"> Klikni na ono sto zelis kupiti</h1>
      <div className="space-y-4">
         {/* gumbovi */}
        <button 
          onClick={() => initiatePayment("Novine", 200)}
          className="bg-blue-600 text-white"
        >
          Kupi novine (2€)
        </button>

      <button 
          onClick={() => initiatePayment("Knjiga", 500)}
          className="bg-blue-600 text-white"
        >
          Kupi knjigu (5€)
        </button>

        {/*checkoutform kada initiate payment dobije tajni kljuc (na dodir gumba) */}
        {clientSecret && <CheckoutForm clientSecret={clientSecret} />} 
      </div>
    </div>
  );
}
