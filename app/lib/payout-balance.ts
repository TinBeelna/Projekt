
import { revalidatePath } from "next/cache";
import { stripe } from "@/app/lib/stripe";

export async function listPayouts() {

    //stripe ne pokazuje payoute u test mode: napraviti payout svaki put kada se zove funkcija
    //dodana "test banka" na stripe stranicu da bi se mogao napraviti payout
    const min = 100;
    const max = 10000;

    //const payout = await stripe.payouts.create({
      //  amount: Math.floor(Math.random() * (max - min + 1)) + min, //nasumicno od 1 do 100 eura
      //  currency: 'eur',
       // });

    const payoutsList = await stripe.payouts.list({})

    return payoutsList;
}

export async function showAvailableBalance() {

    const balance = await stripe.balance.retrieve();

    return balance.available;
}

export async function showPendingBalance() {

    const balance = await stripe.balance.retrieve();

    return balance.pending;
}