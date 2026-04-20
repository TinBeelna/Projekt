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

        event = stripe.webhooks.constructEvent( //tu se verificira webhook signature
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET as string 
        );

        //idempotency provjera
        const existingWebhook = await prisma.webhook.findUnique({
            where: { 
                stripeId: event.id
             }
          })

          if(existingWebhook) {
            throw new Error('Idempotency detektiran: webhook sa tim ID-em vec postoji!!!!');
          }

        await prisma.webhook.create({
            data: {
                stripeId: event.id,
                type: event.type,
                payload: JSON.stringify(event.data.object)
            }
        });


        console.log("Stigao webhook: ", event.type);
    } catch (err: any) {
        const errorMessage = err.message

        if (err) console.log(err)
        console.log(`Error message: ${errorMessage}`)

        return NextResponse.json(
            { message: `Webhook error message: ${errorMessage}`},
            { status: 400 }
        )
    }

        try {
            switch (event.type) {
                case 'payment_intent.canceled': { //ovo dodati!!!!

                break;}
                case 'payment_intent.succeeded': {//update status uz provjeru ovdje!
                    try {
                        console.log('Payment intent uspio!');
                        const intent = event.data.object as Stripe.PaymentIntent; //sigurnije nego intent succeeded
                        const orderId = Number (intent.metadata?.orderId);
                        const invoiceId = intent.metadata?.invoiceId;

                        if (!orderId || !invoiceId) {
                        console.log("IDs nisu dosli iz metadata!!: ", intent.metadata);
                        break;
                        }

                        const existing = await prisma.paymentIntents.findUnique({
                            where: { id: orderId },
                            });

                        if (!existing) break;
                        
                        if (existing.status === "Partially captured") {
                            console.log("Vec je partially captured -> skip prepisa u db.");
                            break;
                            }

                        
                            await prisma.paymentIntents.update({
                                where: { id: orderId},
                                data: {
                                    status: "Succeeded",
                                    amount: intent.amount_received ?? intent.amount,
                                    currency: intent.currency,
                                    capturedAmount: intent.amount_received ?? intent.amount, //dodan captured_amount za provjeru!
                                } 
                            });

                            await prisma.invoice.update({
                                where: { id: invoiceId},
                                data: {
                                    status: "Succeeded",
                                    total: intent.amount_received ?? intent.amount,
                                } 
                            });
                            console.log("USPJESAN DB APDEJT ZA SUCCESS PLACANJA");
                        }
                     catch (err) {
                        console.error('Error u payment_intent.succeeded: ',err);
                    }
                    break; }
                
                case 'payment_intent.payment_failed': {
                    try {
                        const intent = event.data.object as Stripe.PaymentIntent;
                        const orderId = intent.metadata?.orderId;
                        const invoiceId = intent.metadata?.invoiceId;
                        const orderIdNum = orderId ? parseInt(orderId) : null; //order id kao broj; google preporuka
                        const errMessage = intent.last_payment_error?.message || "Payment fail iz nepoznatog razloga.";

                        const errCode = intent.last_payment_error?.code;
                        console.log(`PAYMENT FAILAO ZA ID: ${intent.id} SA ERROROM: ${errMessage}`);
                        
                        if (orderIdNum) {
                        await prisma.paymentIntents.update({
                            where: { id: orderIdNum }, 
                            data: {
                            status: "Failed",
                            } 
                        });

                        await prisma.invoice.update({
                            where: { id: invoiceId },
                            data: {
                            status: "Failed",
                            } 
                        });
                        }
                    } catch (err) {
                        console.error('Error prilikom azuriranja statusa placanja:', err);
                    }
                    break;}

                case 'payment_intent.amount_capturable_updated': {

                    try {
                        const intent = event.data.object as Stripe.PaymentIntent; //sigurnije nego intent succeeded
                        const orderId = Number (intent.metadata?.orderId);
                        const invoiceId = intent.metadata?.invoiceId; //za fix
                        await prisma.paymentIntents.update({
                                where: { id: orderId},
                                data: {
                                    status: "Capture_required",
                                    amount: intent.amount,
                                    currency: intent.currency,
                                } 
                            });

                        if (invoiceId) {
                            await prisma.invoice.update({
                            where: { id: invoiceId },
                            data: {
                                status: "Authorized",
                                total: intent.amount,
                            } 
                        });
                        }

                    } catch (err){
                        console.error('Error tijekom payment_intent.amount_capturable_updated webhooka: ',err);
                    }
                break; }

                case 'charge.refunded': {
                    try {
                        const refund = event.data.object;
                        const orderId = Number (refund.metadata?.orderId);
                        await prisma.paymentIntents.update({
                                where: { id: orderId},
                                data: {
                                    status: "Charge_refunded",
                                    amount: refund.amount,
                                    currency: refund.currency,
                                } 
                            });
                    } catch (err) {
                        console.error('Error u charge.refunded webhooku: ', err);
                    }
                    break;}  
                
                    case 'customer.subscription.created': { 
                        try {
                            console.log('Usao u sub created');
                            const eventData = event.data.object;

                            if ('id' in eventData && 'customer' in eventData && 'items' in eventData) {
                                const subscription = eventData as any as Stripe.Subscription;
                                const subscriptionId = subscription.id;
                                    
                                const customerId = typeof subscription.customer === 'string' 
                                    ? subscription.customer 
                                    : subscription.customer.id;

                                console.log(`Subscription created: ${subscriptionId} for customer ${customerId}`);

                                const user = await stripe.customers.retrieve(customerId);
                                const email = 
                                        typeof user !== 'string' && !user.deleted
                                        ? user.email
                                        : null;

                                const fullSub = await stripe.subscriptions.retrieve(subscriptionId, {
                                        expand: ['items.data.price.product'],
                                    });
                                let plan: string | null = null; //uzimanje podataka o planu
                                const price = fullSub.items.data[0]?.price;
                                const interval = price?.recurring?.interval;
                                const intervalCount = price?.recurring?.interval_count ?? 1;
                                const startDate = new Date(subscription.start_date * 1000);
                                let endDate: Date;
                                endDate = new Date(startDate.getTime());

                                if (interval === 'week') {
                                    plan = 'weekly';
                                    endDate.setDate(endDate.getDate() + (intervalCount*7) );
                                    }

                                if (interval === 'month') {
                                if (intervalCount === 1)plan = 'monthly';
                                if (intervalCount === 3) plan = 'three_months';
                                endDate.setMonth(endDate.getMonth() + intervalCount);
                                }

                                if (interval === 'year') {
                                    plan = 'yearly';
                                    endDate.setFullYear(endDate.getFullYear() + intervalCount)
                                }

                                if (!user) {
                                    console.log(`Nema korisnika sa stripeId ${customerId}`);
                                    break;
                                }

                                if (!email) {
                                    console.log(`FALI EMAIL`);
                                    break;
                                }

                                if (!plan) {
                                    console.log(`FALI PLAN`);
                                    break;
                                }

                                if (plan && email && user) {
                                    await prisma.subscriptions.create({
                                    data: {
                                        stripePaymentId: subscriptionId, // PRAVI SUB ID!
                                        plan: plan,
                                        userStripeId: customerId,
                                        status: subscription.status,
                                        currency: subscription.currency,
                                    }
                                    });
                                    console.log('NAPRAVIO SUBSCRIPTION!!');

                                    //update racuna sa subid (ako se ne dobije iz webhooka izrade invoicea)
                                    if (subscription.latest_invoice) {
                                        const latestInvoiceId = typeof subscription.latest_invoice === 'string'
                                        ? subscription.latest_invoice
                                        : subscription.latest_invoice?.id;

                                        const existingInvoice = await prisma.invoice.findUnique({
                                            where: { stripeInvoiceId: latestInvoiceId }
                                            });

                                        if (existingInvoice) {
                                            await prisma.invoice.update({
                                                where: { id: existingInvoice.id },
                                                data: { 
                                                subscriptionId: subscriptionId,
                                                periodEnd: endDate,
                                            }});
                                        }
                                }
                            }    
                        }
                    } catch (err) {
                        console.error('Error u customer subscription created webhooku.');
                    }
                    break;}

                    case 'customer.subscription.updated': {
                        try {
                            console.log('Usao u sub updated');
                            const eventData = event.data.object;

                            if ('id' in eventData && 'customer' in eventData && 'items' in eventData) {
                                const subscription = eventData as any as Stripe.Subscription;
                                const subscriptionId = subscription.id;
                                
                                const customerId = typeof subscription.customer === 'string' 
                                    ? subscription.customer 
                                    : subscription.customer.id;

                                //handle za "incomplete expired": izbrisati iz db!
                                if(subscription.status === 'incomplete_expired') {
                                    await prisma.subscriptions.delete({
                                        where: {
                                            stripePaymentId: subscription.id,
                                        }
                                    });
                                }

                                console.log(`Subscription updated: ${subscriptionId} for customer ${customerId}`);

                                const user = await stripe.customers.retrieve(customerId);

                                const fullSub = await stripe.subscriptions.retrieve(subscriptionId, {
                                        expand: ['items.data.price.product'],
                                });
                                //plan
                                let plan: string | null = null;
                                const price = fullSub.items.data[0]?.price;
                                const interval = price?.recurring?.interval;
                                const intervalCount = price?.recurring?.interval_count ?? 1;
                                const startDate = new Date(subscription.start_date * 1000);
                                let endDate: Date;
                                endDate = new Date(startDate.getTime());

                                if (interval === 'week') {
                                    plan = 'weekly';
                                    endDate.setDate(endDate.getDate() + (intervalCount*7) );
                                    }

                                if (interval === 'month') {
                                if (intervalCount === 1)plan = 'monthly';
                                if (intervalCount === 3) plan = 'three_months';
                                    endDate.setMonth(endDate.getMonth() + intervalCount);
                                }

                                if (interval === 'year') {
                                    plan = 'yearly';
                                    endDate.setFullYear(endDate.getFullYear() + intervalCount)
                                }

                                if (!user) {
                                    console.log(`No user found with stripeId ${customerId}`);
                                    break;
                                }

                                if (!plan) {
                                    console.log(`FALI PLAN`);
                                    break;
                                }

                            if (plan && user) {
                                //update end/start date iz novog racuna
                                if (subscription.latest_invoice) {
                                    const latestInvoiceId = typeof subscription.latest_invoice === 'string'
                                    ? subscription.latest_invoice
                                    : subscription.latest_invoice?.id;

                                    const existingInvoice = await prisma.invoice.findUnique({
                                        where: { stripeInvoiceId: latestInvoiceId }
                                    });
                                    if (existingInvoice) {
                                        await prisma.invoice.update({
                                            where: { id: existingInvoice.id },
                                            data: { 
                                                subscriptionId: subscriptionId,
                                                periodEnd: endDate,
                                        }});
                                    }
                                }
                                //update status pretplate
                                await prisma.subscriptions.update({
                                    where: { stripePaymentId: subscriptionId},
                                    data: {
                                        status: subscription.status,
                                    }
                                });
                            } 
                        }
                    } catch (err) {
                        console.error('Error u sub updated webhooku: ', err);
                    }
                    break;}

                    case 'customer.subscription.deleted': { //za brisanje pretplate iz db
                        try {
                            console.log('Brisem pretplatu');
                            const subscription = event.data.object as Stripe.Subscription;
                            const subId = subscription.id;

                            await prisma.subscriptions.delete({
                                where: {
                                    stripePaymentId: subId,
                                }
                            })
                        } catch (err) {
                            console.error('Error tijekom customer subscription deleted webhooka.', err);
                        }
                    break;}

                    case 'invoice.created': {
                        try {
                            console.log('RADIM RACUN PRETPLATE');
                            const invoice = event.data.object as Stripe.Invoice;
                            const invoiceId = invoice.id;
                            
                            const existingInvoice = await prisma.invoice.findUnique({ 
                                where: { stripeInvoiceId: invoiceId}
                            });

                            if (existingInvoice) { //ako invoice vec postoji u db nema obrade;
                                console.log('Invoice vec postoji)');
                                break;
                            }
                            const customerId = typeof invoice.customer === 'string'
                            ? invoice.customer
                            :invoice.customer?.id;

                            console.log(`Racun ${invoice.id} je za kupca ${customerId}`);

                            const user = await prisma.user.findUnique({
                                where: { stripeId: customerId }
                            });

                            let subscriptionId: string | null = null;

                            if ((invoice as any).subscription) { //type issue handling + get sub id
                                subscriptionId = (invoice as any).subscription as string;
                            } else if (invoice.lines?.data?.[0]?.subscription) {
                                subscriptionId = invoice.lines.data[0].subscription as string;
                            }

                            let paymentMethod = 'card'; //za sad

                            if (user) {
                                await prisma.invoice.create({
                                    data: { 
                                        stripeInvoiceId: invoice.id,
                                        userId: user.id,
                                        subscriptionId: subscriptionId,
                                        invoiceNumber: invoice.number,
                                        status: invoice.status,
                                        total: invoice.total,
                                        currency: invoice.currency,
                                        createdAt: new Date(invoice.created * 1000),
                                        periodStart: new Date(invoice.period_start * 1000),
                                        // periodEnd: new Date(invoice.period_end * 1000),
                                        paidAt: new Date(),
                                        invoicePdfUrl: invoice.invoice_pdf,
                                        paymentMethod: paymentMethod,         
                                    },
                                });
                                console.log(`✅ Invoice upisan: ${invoice.id}`);
                                }
                        } catch (err) {
                            console.error('Error tijekom invoice.created webhooka: ', err);
                        }
                    break;}
                    
                    case 'invoice.paid': //Samo update statusa 
                    case 'invoice.payment_succeeded': 
                        try {
                            console.log('Uspjesno placanje racuna!');
                            const invoice = event.data.object as Stripe.Invoice;
                            const invoiceId = invoice.id;
                            
                            const existingInvoice = await prisma.invoice.findUnique({
                                where: { stripeInvoiceId: invoiceId}
                            });

                            if(existingInvoice) {
                                await prisma.invoice.update({
                                where: { id: existingInvoice?.id },
                                data: {
                                    status: invoice.status,
                                }
                                });

                            console.log(`Azuriran invoice ${existingInvoice.id} status na ${invoice.status}`);
                        } else {
                            console.log(`Nema racuna za Stripe invoice ID: ${invoiceId}`);
                        }
                        } catch (err) {
                            console.error('Error procesuirajuci invoice succeeded/paid webhook:',err);
                        }
                    break;

                    case 'invoice.payment_failed': { 
                        try {
                            console.log('Placanje invoicea nije uspjelo!!!');
                            const invoice = event.data.object as Stripe.Invoice;
                            const invoiceId = invoice.id;

                            const existingInvoice = await prisma.invoice.findUnique({
                                where: { stripeInvoiceId: invoiceId}
                            });

                            if(existingInvoice) { //check postoji li
                                await prisma.invoice.update({
                                where: { id: existingInvoice?.id },
                                data: {
                                    status: invoice.status,
                                }
                                });

                                console.log(`Azuriran invoice ${existingInvoice.id} status na ${invoice.status}`);
                            } else {
                                console.log(`Nema racuna za Stripe invoice ID: ${invoiceId}`);
                            }
                        } catch (err) {
                            console.error('Error procesuirajuci invoice payment failed webhook', err);
                        }
                        
                    break;}

                    case 'customer.updated': { //sluzi za azuriranje default payment method kupca
                        try {
                            console.log('Customer azuriran. Provjera default metode placanja za subscription.');
                            const customer = event.data.object as Stripe.Customer;
                            const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

                            if(defaultPaymentMethod) {
                                console.log('Imamo defaultPaymentMethod.');
                                let paymentMethodId: string;
                                //type checking za zadovoljiti typescript: je li string id, paymentmethod object sa id-em ili nesto trece
                                if(typeof defaultPaymentMethod === 'string') {
                                    paymentMethodId = defaultPaymentMethod; //vec je string
                                    console.log('Imamo defaultPaymentMethod kao string.');

                                } else if(defaultPaymentMethod && typeof defaultPaymentMethod === 'object' && 'id' in defaultPaymentMethod) {
                                    paymentMethodId = defaultPaymentMethod.id; //ako je paymentmethod object, izvuci id
                                    console.log('Imamo defaultPaymentMethod kao objekt iz kojega vucemo id.');
                                } else {
                                    console.log('Nije pronaden id kartice!');
                                    return;
                                }

                                const subscriptions = await stripe.subscriptions.list({ //izvlacenje svih pretplata
                                    customer: customer.id,
                                });

                                for (const subscription of subscriptions.data) { //for loop za azuriranje svih pretplata
                                    await stripe.subscriptions.update(
                                        subscription.id,
                                        {default_payment_method: paymentMethodId}
                                    );
                                    console.log('Azurirana default kartica korisnika na pretplatu: ', subscription.id);
                                }
                            }
                        } catch (err) {
                            console.error('Error tijekom customer updated webhooka: ', err);
                        }

                    break;}

                    case 'charge.dispute.created': {
                        try {
                            const dispute = event.data.object;
                            const paymentId = dispute.payment_intent;
                            const chargeId = dispute.charge;
                            console.log(`Stvoren novi dispute na paymentIntent: ${paymentId}, za charge: ${chargeId}, razlog: ${dispute.reason}`);

                            await prisma.disputes.create({
                                data: {
                                    paymentStripeId: paymentId as string,
                                    disputeId: dispute.id,
                                    reason: dispute.reason,
                                    status: dispute.status,
                                    amount: dispute.amount,
                                    chargeId: dispute.charge as string,
                                },
                            });

                        } catch (err) {
                            console.error('Error tijekom postavljanja novog disputea u db!', err);
                        }
                    break;}

                    case 'charge.dispute.updated': { //azuriran dispute; desi se i tijekom promjene statusa?
                        try {
                            const dispute = event.data.object;
                            await prisma.disputes.update({
                                where: {
                                    disputeId: dispute.id,
                                },
                                data: {
                                    status: dispute.status,
                                },
                        })
                        console.log(`Dispute ${dispute.id} azuriran; Status: ${dispute.status}`);
                        } catch (err) {
                            console.error('Error tijekom azuriranja db disputea:',err);
                        }
                    break;}

                    case 'charge.dispute.closed': {
                        try {
                            const dispute = event.data.object;
                            console.log(`Dispute ${dispute.id} zatvoren sa statusom: ${dispute.status}`);

                            await prisma.disputes.update({
                                where: {
                                    disputeId: dispute.id,
                                },
                                data: {
                                    status: dispute.status,
                                }
                            });
                        } catch(err) {
                            console.log('Error tijekom azuriranja statusa zatvorenog disputea:', err);
                        }   
                    break;}

                    case 'radar.early_fraud_warning.created': {
                        const transaction = event.data.object;
                        const transactionFraudType = transaction.fraud_type;
                        const transactionId= transaction.id;
                        const transactionIntentId = transaction.payment_intent;
                        console.log(`Tranzakcija ${transactionId} oznacena kao moguci fraud tipa: ${transactionFraudType},
                            od payment intenta ${transactionIntentId}`);
                    break;}

                    case 'charge.dispute.funds_reinstated': { //u slucaju da je potreban kasnije
                        const dispute = event.data.object;
                        console.log(`Vracen novac za dispute: ${dispute.id} u kolicini ${dispute.amount}`);
                    break;}

                    case 'charge.dispute.funds_withdrawn': { //u slucaju da je potreban kasnije
                        const dispute = event.data.object;
                        console.log(`Oduzet novac za dispute: ${dispute.id} u kolicini ${dispute.amount}`);
                    }

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