"use client";
import { requestSubscription, updateSubscription, cancelSubscription } from "@/app/lib/subscriptions";
import { useRouter } from "next/navigation";

export default function SubscriptionButtons({ activeSubId, currentPlan }: { activeSubId?: string, currentPlan?: string }) {
  const router = useRouter();

  const plans = [
    { id: 'weekly', label: 'Tjedno', price: 1.5, weight: 1 },
    { id: 'monthly', label: 'Mjesečno', price: 5, weight: 2 },
    { id: 'three_months', label: '3-mjesečno', price: 13.5, weight: 3 },
    { id: 'yearly', label: 'Godišnje', price: 50, weight: 4 },
  ];

  // 1. Nađemo težinu trenutnog plana
  const currentWeight = plans.find(p => p.id === currentPlan)?.weight || 0;
  
  // 2. Filtriramo: makni planove koji su ISTI kao trenutni
  const otherPlans = plans.filter(p => p.id !== currentPlan);

  // 3. Razvrstaj u Upgrade i Downgrade
  const upgrades = otherPlans.filter(p => p.weight > currentWeight);
  const downgrades = otherPlans.filter(p => p.weight < currentWeight);

  return (
    <div className="flex flex-col gap-8">
      
      {/* --- SEKCIJA 1: TRENUTNI PLAN I OTKAZIVANJE --- */}
      {activeSubId && (
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Trenutni paket:</p>
            <p className="text-xl font-bold text-gray-900 capitalize">{currentPlan?.replace('_', ' ')}</p>
          </div>
          <button 
            onClick={async () => {
              if (confirm("Trajno otkazati pretplatu?")) {
                await cancelSubscription(activeSubId);
                router.refresh();
              }
            }}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition border border-red-100"
          >
            OTKAŽI
          </button>
        </div>
      )}

      {/* --- SEKCIJA 2: UPGRADE (Samo skuplji planovi) --- */}
      {activeSubId && upgrades.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-green-600 uppercase px-1 tracking-widest">Nadogradnja ↑</h3>
          {upgrades.map((plan) => (
            <button 
              key={plan.id}
              // PROSLIJEDI ID PRETPLATE I NOVI PLAN
              onClick={() => updateSubscription(activeSubId, plan.id as any)} //id pretplate i tip pretplate (npr monthly)
              className="w-full flex justify-between items-center p-4 bg-white border-2 border-green-50 rounded-xl hover:border-green-500 transition shadow-sm group"
            >
              <span className="font-bold text-gray-800">{plan.label} ({plan.price} €)</span>
              <span className="bg-green-500 text-white text-[10px] px-3 py-1 rounded-lg font-black group-hover:scale-105 transition uppercase">Nadogradi</span>
            </button>
          ))}
        </div>
      )}

      {/* --- SEKCIJA 3: DOWNGRADE (Samo jeftiniji planovi) --- */}
      {activeSubId && downgrades.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase px-1 tracking-widest">Smanjenje paketa ↓</h3>
          {downgrades.map((plan) => (
            <button 
              key={plan.id}
              // PROSLIJEDI ID PRETPLATE I NOVI PLAN
              onClick={() => updateSubscription(activeSubId, plan.id as any)}
              className="w-full flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-400 transition group"
            >
              <span className="font-medium text-gray-500">{plan.label} ({plan.price} €)</span>
              <span className="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-lg font-black group-hover:bg-gray-200 transition uppercase">Smanji</span>
            </button>
          ))}
        </div>
      )}

      {/* --- SEKCIJA 4: NOVA KUPNJA (Samo ako nema pretplate) --- */}
      {!activeSubId && (
        <div className="grid grid-cols-1 gap-3">
          <h2 className="text-2xl font-black mb-2">Odaberi svoj plan:</h2>
          {plans.map((plan) => (
            <button 
              key={plan.id}
              onClick={() => requestSubscription(plan.id as any)}
              className="flex justify-between items-center p-6 border-2 border-gray-100 rounded-3xl hover:border-blue-600 bg-white transition shadow-sm"
            >
              <div className="text-left font-bold text-lg">{plan.label}</div>
              <div className="text-xl font-black">{plan.price} €</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
