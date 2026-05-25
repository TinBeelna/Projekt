"use client";
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe,useElements,} from '@stripe/react-stripe-js';
import { setupIntentForPaymentMethod, savePaymentMethod } from '@/app/lib/payment-methods';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

interface CardFormProps {
    userId: string;
    onSuccess: () => void;
    onError: (error: string) => void;
}

//card form komponenta
function CardForm({ userId, onSuccess, onError}: CardFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [cardholderName, setCardholderName] = useState('');

    useEffect(() => {
    async function getSetupIntent() { //dobivanje client secreta iz kojega se pravi payment method
        try {
            const { clientSecret } = await setupIntentForPaymentMethod(userId);
            setClientSecret(clientSecret);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Nepoznati error tijekom izrade setup intenta!!');
        }
}

    getSetupIntent();
}, [userId, onError]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if(!elements || !stripe || !clientSecret) {
            return;
        }

        setLoading(true);

        try {
            const cardElement = elements.getElement(CardElement);

            if(!cardElement) {
                throw new Error('Nema broja kartice!!');
            }
            //potvrda kartice; dobivanje paymentMethodId od Stripea
            const result = await stripe.confirmCardSetup(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: cardholderName,
                    }
                }
            });

            if(result.error) {
                throw new Error(result.error.message || 'Card setup nije prosao!!');
            }

            if(!result.setupIntent || result.setupIntent.status !== 'succeeded') {
                throw new Error('Card setup nije prosao!!');
            }

            const paymentMethodId = result.setupIntent.payment_method; //stripe method id

            if(!paymentMethodId || typeof paymentMethodId !== 'string') {
                throw new Error('Nema pravilnog PaymentMethodId!!');
            }

            const saveResult = await savePaymentMethod(userId, paymentMethodId); //fja za spremanje kartice + varijabla za check

            if (!saveResult.success) { //dodano brisanje polja u slucaju da je kartica duplikat!
               cardElement.clear();
               setCardholderName('');
               setClientSecret(''); //reset client secreta na kraju bloka
               setTimeout(onSuccess, 100); //za card issue
               throw new Error(saveResult.error || 'Nepoznati error tijekom spremanja metode placanja!');

            }

            cardElement.clear();
            setCardholderName('');
            setClientSecret(''); //reset client secreta na kraju bloka
            setTimeout(onSuccess, 100); // za card issue

        } catch (err) {
            onError(err instanceof Error ? err.message : 'Nepoznati error prilikom sejvanja kartice!!');
        } finally {
            setLoading(false);
        }
    };

    return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
          Cardholder Name
        </label>
        <input
          id="cardholderName"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Name on card"
          disabled={loading}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="card-element" className="block text-sm font-medium text-gray-700 mb-1">
          Card Details
        </label>
        <div className="p-3 border border-gray-300 rounded-md">
          <CardElement
            id="card-element"
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#32325d',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#fa755a',
                  iconColor: '#fa755a',
                },
              },
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || !clientSecret || loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Add Card'}
      </button>
    </form>
  );
}

// Eksportana komponenta
export default function AddPaymentMethodForm({ userId, onSuccess, onError }: CardFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <CardForm userId={userId} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
