"use server";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";
//import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from "next/cache";
import { auth } from "@/app/lib/auth"
import { ensureStripeCustomer } from "@/app/lib/payment-methods"



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

    if (!user) {
        throw new Error("No Stripe customer found for this user.");
    }

    const customerId = await ensureStripeCustomer(user);

    //stripe hosted billing page
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/mysubscriptions`, // Where they go after fixing the card
    });

    if (portalSession.url) {
        redirect(portalSession.url);
    }
}


export async function requestSubscription(duration: string, currency: string) {
    const plan = await prisma.subscriptionPlan.findFirst({ where: { duration } });
    if (!plan) throw new Error(`Plan "${duration}" nije pronađen u bazi.`);
    const priceId = plan.stripePriceId;
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

    const customerId = await ensureStripeCustomer(user);

    //u slucaju da postoji default kartica (znaci da ima upisanu karticu) pretplata se odmah radi; nema checkout sessiona
    const defaultMethod = await prisma.paymentMethod.findFirst({
        where: {
            stripeId: customerId,
            isDefault: true,
        }
    })

    if(defaultMethod) {
        //koristi default payment method za napraviti pretplatu
        const subcription = await stripe.subscriptions.create({
            customer: customerId,
            items: [
                {price: priceId,}
            ],
            default_payment_method: defaultMethod.paymentMethodId,
            currency: currency,
        });
        console.log('Postoji default: pretplata se radi automatski');
        revalidatePath("/user/mysubscriptions");
        revalidatePath("/admin/subscriptions");
    } else { 
        //koristi checkout session za napraviti subscription
        console.log('Ne postoji default kartica; ulazimo u checkout session.');
        const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        //maknuta linija payment methods --> prati se default sa dashboarda
        currency: currency,
        line_items: [{ price: priceId, quantity: 1 }],
        customer: customerId,
        customer_email: undefined,
        subscription_data: {
            //trial_period_days: 0,
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/success?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/success?status=cancel`,
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
    revalidatePath("/user/mysubscriptions");

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

     revalidatePath("/user/mysubscriptions");
     revalidatePath("/admin/subscriptions");
}

export async function updateSubscription(subId: string, plan: string){

    const planRecord = await prisma.subscriptionPlan.findFirst({ where: { duration: plan } });
    if (!planRecord) throw new Error(`Plan "${plan}" nije pronađen u bazi.`);
    const newPriceId = planRecord.stripePriceId;
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
    revalidatePath("/user/mysubscriptions"); 
    revalidatePath("/admin/subscriptions");
    }



