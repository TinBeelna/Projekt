"use client";
import React from "react";
import { requestSubscription, updateSubscription, cancelSubscriptionAtPeriodEnd, cancelSubscription, createCustomerPortal} from "@/app/lib/subscriptions";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

export default function SubscriptionButtons({ activeSubId, currentPlan, status, cancelAtPeriodEnd, endDate }: { activeSubId?: string, currentPlan?: string, status?: string, cancelAtPeriodEnd: boolean, endDate?: Date }) {
  const router = useRouter();

  const plans = [
    { id: 'weekly',
      label: 'Tjedno', 
      price:{
        eur: 1.5,
        gbp: 1.30,
        usd: 1.77
     }, 
      weight: 1 
    },
    { id: 'monthly',
      label: 'Mjesečno', 
      price:{
        eur: 5,
        gbp: 4.35,
        usd: 5.89
     }, 
      weight: 2 
    },
    { id: 'three_months',
      label: '3-mjesečno', 
      price:{
        eur: 13.5,
        gbp: 11.74,
        usd: 15.90
     }, 
      weight: 3
    },
    { id: 'yearly',
      label: 'Godišnje', 
      price:{
        eur: 50,
        gbp: 43.46,
        usd: 58.88
     }, 
      weight: 4
    },
  ];

  // 1. Nađemo težinu trenutnog plana
  const currentWeight = plans.find(p => p.id === currentPlan)?.weight || 0;
  
  // 2. Filtriramo: makni planove koji su ISTI kao trenutni
  const otherPlans = plans.filter(p => p.id !== currentPlan);

  // 3. Razvrstaj u Upgrade i Downgrade
  const upgrades = otherPlans.filter(p => p.weight > currentWeight);
  const downgrades = otherPlans.filter(p => p.weight < currentWeight);

  const [selectedCurrency, setSelectedCurrency] = React.useState("eur"); //dodano za odabir valute

  const getPrice = (plan: typeof plans[0]) => { //dodatna funkcija za odabir prikazane cijene
    return plan.price[selectedCurrency as keyof typeof plan.price] || plan.price.eur;
  };

  return (
    <div className="flex flex-col gap-8">
      {/* biranje valute*/}
            <div className="flex flex-col items-end">
              <label className="text-[10px] font-bold text-gray-400 uppercase mr-1">Valuta</label>
              <select 
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-gray-100 border-none rounded-lg px-3 py-1 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="eur">EUR</option>
                <option value="usd">USD</option>
                <option value="gbp">GBP</option>
              </select>
            </div>
      {/* --- SEKCIJA 1: TRENUTNI PLAN I OTKAZIVANJE --- */}
      {activeSubId && (
        <div className={`p-5 border rounded-2xl flex justify-between items-center shadow-sm ${
          status === 'past_due' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${
              status === 'past_due' ? 'text-red-500' : 'text-blue-500'
            }`}>
              {status === 'past_due' ? '!!Problem s plaćanjem!! Trenutni paket:' : 'Trenutni paket:'}
            </p>
            <p className="text-xl font-bold text-gray-900 capitalize">{currentPlan?.replace('_', ' ')}</p>
          </div>

          <div className="flex flex-col gap-2">
            {status === 'past_due' ? (
              <div className="flex gap-2">
                <button 
                  onClick={async () => { await createCustomerPortal(); }}
                  className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition"
                >
                  PLATI RUČNO OPET (STRIPE portal)
                </button>
                
                <button 
                  onClick={async () => {
                    if (confirm("Vaša pretplata nije plaćena. Želite li je odmah prekinuti?")) {
                      await cancelSubscription(activeSubId); 
                      router.refresh();
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition"
                >
                  OTKAŽI ODMAH
                </button>
              </div>
            ) : cancelAtPeriodEnd ? (
  <div className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl">
    Otkazano — završava:{" "}
    <span className="text-gray-800">
      {endDate
        ? new Date(endDate).toLocaleDateString("hr-HR")
        : "Nepoznato"}
    </span>
  </div>
      ) : (
        <button 
          onClick={async () => {
            if (confirm("Trajno otkazati pretplatu do kraja perioda?")) {
              await cancelSubscriptionAtPeriodEnd(activeSubId);
              router.refresh();
            }
          }}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition border border-red-100"
        >
          OTKAŽI (na kraju perioda)
        </button>
      )}
          </div>
    </div>
    )}

      {/* Upgrade */}
      {activeSubId && !cancelAtPeriodEnd && upgrades.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-green-600 uppercase px-1 tracking-widest">
            Nadogradnja ↑
          </h3>

          {upgrades.map((plan) => (
            <button
              key={plan.id}
              onClick={() => updateSubscription(activeSubId, plan.id as any)}
              className="w-full flex justify-between items-center p-4 bg-white border-2 border-green-50 rounded-xl hover:border-green-500 transition shadow-sm group"
            >
              <span className="font-bold text-gray-800">
                {plan.label} {getPrice(plan)} {selectedCurrency.toUpperCase()}
              </span>
              <span className="bg-green-500 text-white text-[10px] px-3 py-1 rounded-lg font-black group-hover:scale-105 transition uppercase">
                : Nadogradi
              </span>
            </button>
          ))}
        </div>
      )}

      {/* downgrade */}
      {activeSubId && !cancelAtPeriodEnd && downgrades.length > 0 && (
  <div className="space-y-3">
    <h3 className="text-xs font-bold text-gray-400 uppercase px-1 tracking-widest">
      Smanjenje paketa ↓
    </h3>

    {downgrades.map((plan) => (
        <button
          key={plan.id}
          onClick={() => updateSubscription(activeSubId, plan.id as any)}
          className="w-full flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-400 transition group"
        >
          <span className="font-medium text-gray-500">
            {plan.label} {getPrice(plan)} {selectedCurrency.toUpperCase()}
          </span>
          <span className="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-lg font-black group-hover:bg-gray-200 transition uppercase">
            : Smanji
          </span>
        </button>
      ))}
    </div>
  )}

      {/* kupi (+ odabir valute) */}
      {!activeSubId && (
        <div className="grid grid-cols-1 gap-3">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-2xl font-black">Odaberi svoj plan:</h2>
          </div>

          {plans.map((plan) => (
            <button 
              key={plan.id}
              // Proslijeđujemo i plan.id i odabranu valutu
              onClick={() => requestSubscription(plan.id as any, selectedCurrency)}
              className="flex justify-between items-center p-6 border-2 border-gray-100 rounded-3xl hover:border-blue-600 bg-white transition shadow-sm group text-left"
            >
              <div className="font-bold text-lg">{plan.label}</div>
              <div className="text-xl font-black">
                {getPrice(plan)} <span className="text-sm uppercase text-blue-600">{selectedCurrency}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}