"use server";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";
//import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from "next/cache";
import { auth } from "@/app/lib/auth"


// const PRICE_IDS_EUR = { //cijene, ali samo u eurima
//   weekly: "price_1TBtA6LrpwzLPald0XAcYc2W",
//   monthly: "price_1TBtA6LrpwzLPalde3oLQBid",
//   three_months: "price_1TBtA6LrpwzLPald60ILheZK",
//   yearly: "price_1TBtA6LrpwzLPalduovKrRMV",
// };

const PRICE_IDS = { //dodane cijene sa USD/GBP opcijom
    weekly: "price_1TMRnMLrpwzLPaldmyHxqgit",
    monthly: "price_1TMRoJLrpwzLPald4W0VQ3vT",
    three_months: "price_1TMRpSLrpwzLPaldIm8Hg6di",
    yearly: "price_1TMRq6LrpwzLPaldAYHeVL2e",
}

type Duration = keyof typeof PRICE_IDS;

//za update kartice (u slucaju faila)
export async function createCustomerPortal() {
    const session = await auth();
    const userEmail = session?.user?.email;

    if(!userEmail) {
        return; //ako nema maila (ts fix)
    }

    const user = await prisma.user.findUnique({
        where: { email: userEmail }
    });

    if (!user || !user.stripeId) {
        throw new Error("No Stripe customer found for this user.");
    }

    //stripe hosted billing page
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeId,
        return_url: `http://localhost:3000/user/mysubscriptions`, // Where they go after fixing the card
    });

    if (portalSession.url) {
        redirect(portalSession.url);
    }
}


export async function requestSubscription(duration: Duration, currency: string) {
    const priceId = PRICE_IDS[duration];
    const session = await auth();
    const userEmail = session?.user?.email;

    if(!userEmail) {
        return; //ako nema maila (ts fix)
    }

   const user = await prisma.user.findUnique({
        where: { 
            email: userEmail,
        }
    });

    if(!user) throw new Error("No user!");

    if (!user.stripeId) {
        console.log("No user stripe ID!!");
        return null; 
    }

    //u slucaju da postoji default kartica (znaci da ima upisanu karticu) pretplata se odmah radi; nema checkout sessiona
    const defaultMethod = await prisma.paymentMethod.findFirst({
        where: {
            stripeId: user.stripeId,
            isDefault: true,
        }
    })

    if(defaultMethod) { 
        //koristi default payment method za napraviti pretplatu
        const subcription = await stripe.subscriptions.create({
            customer: user.stripeId,
            items: [
                {price: priceId,}
            ],
            default_payment_method: defaultMethod.paymentMethodId,
            currency: currency,
        });
        console.log('Postoji default: pretplata se radi automatski');
    } else { 
        //koristi checkout session za napraviti subscription
        console.log('Ne postoji default kartica; ulazimo u checkout session.');
        const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'], 
        currency: currency,
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
        },
        saved_payment_method_options: {
            payment_method_save: 'enabled',        },
        payment_method_collection: 'if_required', 
        customer_update: { 
            name: 'auto',
            address: 'auto',
        },
    });

    if (session.url) {
        redirect(session.url);
    }
        }
} 

export async function cancelSubscription(subId: string) {
    const subcription = await stripe.subscriptions.cancel(subId);
    revalidatePath("/admin/subscriptions");
    revalidatePath("/user/subscriptions");

}

export async function cancelSubscriptionAtPeriodEnd(subId: string) {

    const subscription = await stripe.subscriptions.update(
        subId,
        {
        cancel_at_period_end: true,
        });

    await prisma.subscriptions.update({ //dodano za funkcionalnost user cancela (at period end)
        where: { stripePaymentId: subId },
        data: { 
            cancelAtPeriodEnd: true,
        }
    });

     revalidatePath("/user/subscriptions");
     revalidatePath("/admin/subscriptions");
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
        proration_behavior: 'always_invoice', // proracija
     });
     
    await prisma.subscriptions.update({
        where: { stripePaymentId: subId },
        data: { 
            plan: plan,
        }
    });
    revalidatePath("/user/subscriptions"); 
    revalidatePath("/admin/subscriptions");
    }



