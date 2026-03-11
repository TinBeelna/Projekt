import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/app/lib/stripe";

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
    //sve sto zelis da mode proci odnosno sto zelis obraditi!
    const permittedEvents = ['payment_intent.succeeded', 'checkout.session.completed'];

    if(permittedEvents.includes(event.type)) {
        let data

        try {
            //tu se rokaju porukice za log :)
            switch (event.type) {
                case 'payment_intent.succeeded':
                    data = event.data.object
                    console.log(`Payment status: ${data.status}`)
                    break
                
                case 'checkout.session.completed':
                    console.log('Netko je nes platioooooo', event)
                    break
                default:
                    throw new Error(`Unhandled event: ${event.type}`)
            }

        } catch (error) {
            console.log(error)
            return NextResponse.json(
                { message: 'Webhook handler failao'},
                { status: 500}
            )
        }
    }
    return NextResponse.json({ message: 'Received'}, { status: 200})
}