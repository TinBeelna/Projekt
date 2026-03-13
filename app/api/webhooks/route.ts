import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/app/lib/stripe";
import Stripe from "stripe";
import { prisma } from "app/lib/prisma";

export async function POST(request: Request) {
    let event

    try {
        const body = await request.text();
        const headerList = await headers();
        const signature = headerList.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ message: "No signature found" }, { status: 400 });
        }

        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET as string 
        );

        await prisma.webhook.create({
            data: {
                type: event.type,
                payload: JSON.stringify(event.data.object)
            }
        });

        //console.log("Stigao webhook:", event.type);
    } catch (err: any) {
        const errorMessage = err.message

        if (err) console.log(err)
        console.log(`Error message: ${errorMessage}`)

        return NextResponse.json(
            { message: `Webhook error message: ${errorMessage}`},
            { status: 400 }
        )
    }
    //sve poruke za obradu
    //const permittedEvents = ['payment_intent.succeeded', , 'invoice.payment_failed'];


        try {
            //tu se stavljaju porukice za log :)
            switch (event.type) {
                case 'payment_intent.succeeded': {//update status uz provjeru ovdje!
                    const intent = event.data.object as Stripe.PaymentIntent; //sigurnije nego intent succeeded
                    const orderId1 = Number (intent.metadata?.orderId);

                        await prisma.paymentIntents.update({
                            where: { id: orderId1},
                            data: {
                                status: "Succeeded",
                                amount: intent.amount,
                                currency: intent.currency,
                            } 
                        });

                        await prisma.invoices.update({
                            where: { id: orderId1},
                            data: {
                                status: "Succeeded",
                                amount: intent.amount,
                            } 
                        });

                   // console.log(`Payment status: ${data.status}`)
                    break; }
                
                case 'payment_intent.payment_failed': {//obrada faila
                    const intent = event.data.object as Stripe.PaymentIntent;
                    const orderId = Number (intent.metadata?.orderId);
                    const errMessage = intent.last_payment_error?.message || "Payment failed for an unknown reason."; //google preporuka
                    const errCode = intent.last_payment_error?.code;
                    console.log(`PAYMENT FAILED FOR ID: ${intent.id} WITH ERROR: ${errMessage}`);
                    await prisma.paymentIntents.update({
                            where: { id: orderId},
                            data: {
                                status: "Failed",
                            } 
                        });

                    await prisma.invoices.update({
                            where: { id: orderId},
                            data: {
                                status: "Failed",
                            } 
                        });

                    break; }                

                default: 
                    console.log(`Primljen event: ${event.type}`);
            }

        } catch (error) {
            console.log(error)
            return NextResponse.json(
                { message: 'Webhook handler failao'},
                { status: 500}
            )
        }
    
    return NextResponse.json({ message: 'Received'}, { status: 200})
}