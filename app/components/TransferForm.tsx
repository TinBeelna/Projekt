 "use client";

 import { useState } from "react";
 import { useRouter} from "next/navigation";

export default function TransferForm({ action }: { action: (formData: FormData) => Promise<{ error?: string }> }) {

    const [step, setStep] = useState<'form' | 'confirm'>('form');
    const [IBAN, setIBAN] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    function handleClick() { //Step confirm ako su ukucani iban i amount, inace error
        if (!IBAN || !amount) {
            setError("Ispuni sva polja!");
            return;
        }
        setError('');
        setStep('confirm');
    }

    async function handleConfirm() { //refresh + brisanje forme ako prode, ako ne baca se error; prvo se ceka na action sa formData
        setLoading(true);
        try {
            const formData = new FormData();
            formData.set('IBAN', IBAN);
            formData.set('amount', amount);

            const result = await action(formData);
            if(result.error) {
                setError(result.error);
                setStep('form');
            } else {
                router.refresh();
                setStep('form');
                setIBAN('');
                setAmount('');
            }
        } finally {
            setLoading(false);
        }
    }

    if (step === 'confirm') { //potrebna potvrda transfera
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
        <p className="text-gray-800 font-medium">
          Sigurno zelite poslati <span className="font-bold">{(Number(amount) / 100).toFixed(2)} EUR</span> na IBAN <span className="font-mono font-bold">{IBAN}</span>?
        </p>
        <p className="text-xs text-gray-500">Naknada za transfer: 0.50 EUR</p>
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Slanje...' : 'Potvrdi'}
          </button>
          <button
            onClick={() => setStep('form')}
            disabled={loading}
            className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
          >
            Odustani
          </button>
        </div>
      </div>
    );
  }

  return ( //forma za unos ibana/amounta
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Novi SEPA Transfer (košta 50 centi)</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IBAN primatelja</label>
          <input
            type="text"
            value={IBAN}
            onChange={e => setIBAN(e.target.value.toUpperCase())}
            placeholder="HR..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Iznos (u centima)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="npr. 500 = 5.00 EUR"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && (
          <p className="text-red-600 text-sm font-medium">{error}</p>
        )}
        <button
          onClick={handleClick}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          Pošalji
        </button>
      </div>
    </div>
  );
}
 