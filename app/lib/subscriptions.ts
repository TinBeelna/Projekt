"use server";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card } from "../ui/dashboard/cards";
import { revalidatePath } from "next/cache";


const PRICE_IDS = {
  weekly: "price_1TBtA6LrpwzLPald0XAcYc2W",
  monthly: "price_1TBtA6LrpwzLPalde3oLQBid",
  three_months: "price_1TBtA6LrpwzLPald60ILheZK",
  yearly: "price_1TBtA6LrpwzLPalduovKrRMV",
};

type Duration = keyof typeof PRICE_IDS;


export async function requestSubscription(duration: Duration) {
    const priceId = PRICE_IDS[duration];
    const cookieStore = await cookies(); 
    const userEmail = cookieStore.get('userEmail')?.value;

   const user = await prisma.user.findUnique({
        where: { 
            email: userEmail,
        }
    });

    if(!user) throw new Error("No user!");

    const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'paypal', 'sepa_debit'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: user?.stripeId || undefined, 
    customer_email: !user?.stripeId ? userEmail : undefined, // mail ako nema IDa
    subscription_data: {
        //trial_period_days: 0,
    },
    success_url: `http://localhost:3000/user/success?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `http://localhost:3000/user/success?status=cancel`,
    metadata: { //za webhook
        plan: duration,
        userEmail: userEmail || "unknown",
    }
  });

//   await prisma.subscriptions.create({
//         data: {
//             stripePaymentId: session.id, // Ovdje privremeno čuvamo session ID
//             plan: duration,
//             userStripeId: user.stripeId || "pending", // Ako još nema Stripe ID, pišemo pending
//         }
//     });



  if (session.url) {
    redirect(session.url);
  }

//     const subscription = await stripe.subscriptions.create({
//     customer: user?.stripeId as string,
//     items: [
//     {
//       price: amount,
//     },
//   ],
//   collection_method: "charge_automatically",
//   payment_settings: {
//     payment_method_options: Card,
//   },

//     });

} 

export async function cancelSubscription(subId: string) {
    const subcription = await stripe.subscriptions.cancel(subId);

    await prisma.subscriptions.delete({
        where: {
            stripePaymentId: subId,
        }
    })
}

export async function updateSubscription(subId: string, plan: Duration){

    const newPriceId = PRICE_IDS[plan];
    const subscription = await stripe.subscriptions.retrieve(subId);
    const itemId = subscription.items.data[0].id; //zadnja

     await stripe.subscriptions.update(subId, {
        items: [{
      id: itemId,
      price: newPriceId,
        }],
        proration_behavior: 'always_invoice', // NAPLATITI ODMAH RAZLIKU
    });
     
    await prisma.subscriptions.update({
        where: { stripePaymentId: subId },
        data: { plan: plan}
    });

    revalidatePath("/user/subscriptions"); //refresh
    }


