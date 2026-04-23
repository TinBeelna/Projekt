"use client";
import { useState, useEffect } from "react";
import { getPaymentMethods, setAsDefaultMethod, deletePaymentMethod } from "../lib/payment-methods";

// define types
interface PaymentMethod {
    id: string;
    paymentMethodId: string;
    LastFour: string;
    CardBrand: string;
    ExpMonth: number;
    ExpYear: number;
    isDefault: boolean;
}

interface PaymentMethodListProps {
    userId: string;
    onAddNewClick?: () => void;
}

export default function PaymentMethodList({ userId, onAddNewClick}: PaymentMethodListProps) {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]); //pocetna stanja/forma
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ucitaj metode placanja
    const showPaymentMethods = async () => {
        try {
            setLoading(true);
            const methods = await getPaymentMethods(userId); //poziv fje za dobiti metode placanja
            setPaymentMethods(methods);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error tijekom ucitavanja metodi placanja nepoznat!!!');
        } finally {
            setLoading(false);
        }
    }

    //ucitaj metode placanja na komponentu
    useEffect(() => {
        showPaymentMethods();
    }, [userId]);

    //postavljanje metode kao default
    const handleSetDefault = async (paymentMethodId: string) => {
        try {
            await setAsDefaultMethod(userId, paymentMethodId);

            //UI refresh (ovisno koja kartica je sad default)
            setPaymentMethods(methods =>
                methods.map(method => ({
                    ...method,
                    isDefault: method.paymentMethodId === paymentMethodId, //ako je method id jednak onome koji smo postavili kao default dobivamo true; za prikaz default kartice
                }))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nepoznati error tijekom postavljanja metode placanja kao default!!!');
        }
    }

    //brisanje kartice
    const handleDelete = async (paymentMethodId: string) => {
        try {
           const result = await deletePaymentMethod(userId, paymentMethodId);

            //UI refresh nakon brisanja ovisno koja kartica je obrisana
            setPaymentMethods(methods => {
                const filtered = methods.filter(method => method.paymentMethodId !== paymentMethodId);

                //ako server kaze da ima novog defaulta, postavi ga u UI
                if(result.newDefaultId) {
                    return filtered.map(method => ({
                        ...method,
                        isDefault: method.paymentMethodId === result.newDefaultId,
                    }));
                }
                return filtered;
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nepoznati error prilikom brisanja kartice!!!');
        }
    };

    //formatiranje brenda kartice za prikaz (prvo slovo u veliko)
    const formatCardBrand = (brand: string) => {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
    }

    if (loading) { //estetika za ucitavanje
        return <div className="p-6 text-sm text-gray-400">Ucitavam metode placanja....</div>
    }
    return ( //onAddNewClick iz parent komponente za otvaranje forme za dodavanje nove kartice
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-900">METODE PLACANJA</h2>
        <button
          onClick={onAddNewClick}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          Add New Card
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {paymentMethods.length === 0 ? ( // ako nema metoda placanja pokazi to
        <div className="text-center py-10 bg-white border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm mb-3">Nema spremljenih metoda placanja.</p>
          <button
            onClick={onAddNewClick}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
          >
            Dodaj prvu metodu placanja
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {paymentMethods.map(method => (
            <li
              key={method.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex justify-between items-center shadow-sm hover:border-gray-300 transition"
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl">💳</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCardBrand(method.CardBrand)} •••• {method.LastFour} {/*Prikaz brenda/zadnja 4 broja*/}
                    {method.isDefault && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full font-medium">
                        Default {/*Ako je default*/}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Expiration date: {method.ExpMonth}/{method.ExpYear}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!method.isDefault && (
                  <button
                    onClick={() => handleSetDefault(method.paymentMethodId)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(method.paymentMethodId)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                >
                  Izbrisi
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}