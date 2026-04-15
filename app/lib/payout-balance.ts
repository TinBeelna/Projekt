
import { revalidatePath } from "next/cache";
import { stripe } from "@/app/lib/stripe";

export async function listPayouts() {

    //stripe ne pokazuje payoute u test mode: napraviti payout svaki put kada se zove funkcija
    //dodana "test banka" na stripe stranicu da bi se mogao napraviti payout
    //const min = 100;
    //const max = 10000;

    // const payout = await stripe.payouts.create({
    //     amount: Math.floor(Math.random() * (max - min + 1)) + min, //nasumicno od 1 do 100 eura
    //     currency: 'eur',
    //     });

    // const charge = await stripe.charges.create({
    // amount: 200, 
    // currency: 'usd',
    // source: 'tok_bypassPending', // Test token that always succeeds
    // description: 'Test charge to increase balance',
    // });

    const payoutsList = await stripe.payouts.list({})

    return payoutsList;
}

export async function getWalletBalance(walletCurrency: string) {
    try {

        const balance = await stripe.balance.retrieve();
        
        const available = balance.available.find( b => b.currency === walletCurrency);
        const pending = balance.pending.find( b => b.currency === walletCurrency);
        return {
            available: available ? available.amount : 0,
            pending: pending ? pending.amount : 0,
            currency: walletCurrency
            };
    } catch (err) {
        console.error('Error tijekom uzimanja wallet infa: ', err)
    }

    
}