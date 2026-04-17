import { NextResponse } from "next/server";
import { stripe } from "../../lib/stripe";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "app/lib/prisma";

async function convertCurrency(amount: number, currency: string): Promise<number> {
  try {
     if (currency === "eur") return amount;

       const res = await fetch(
      `https://api.frankfurter.app/latest?from=EUR&to=${currency.toUpperCase()}` //ovdje pak radi .app
    );

      const data = await res.json();
      const rate = data?.rates?.[currency.toUpperCase()];

      if (!rate) {
        console.log("NEMA FX VRIJEDNOSTI SA FRANKFURTERA");
        return amount;
      }
      return Math.round(amount * rate);

    } catch (err) {
      console.log("Error tijekom konverzije valute za placanje: ",err);
      return amount;
    }
 
}

export async function POST(req: Request) {
  try {
    const { amountEurCents, itemName, currency } = await req.json();

    //dodatak: preko cookies maila dobivam usera
    const cookie = await cookies();
    const email = cookie.get("userEmail")?.value;

    if(!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
    }

    const user = await prisma.user.findUnique({ //user po mailu iz cookies
      where: {email: email},
      include: {  //dodan check ima li default karticu
        cards: {
          where: {isDefault: true},
        }
      },
    });

    if(!user) {
      return NextResponse.json( { message: "Korisnik ne postoji"}, { status: 404});
    }

    const defaultCard = user?.cards[0];
    const normalizedCurrency = currency.toLowerCase();
    const convertedAmount = await convertCurrency(amountEurCents,normalizedCurrency);

    // console.log("Payment info:", { //za provjeru
    //   amount: convertedAmount,
    //   currency: normalizedCurrency
    // });

    const newOrder = await prisma.paymentIntents.create({
      data: {
        email: user.email,
        userId: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        status: "PENDING",
        items: itemName,
        amount: convertedAmount,
        currency: normalizedCurrency,
      }
    });

    const newOrderInvoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        total: convertedAmount,
        status: "PENDING",
        currency: normalizedCurrency,
        items: itemName,
      }
    });

    if(defaultCard) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: convertedAmount,
        currency: normalizedCurrency,
        customer: user.stripeId ?? undefined,
        payment_method: defaultCard.paymentMethodId,
        confirmation_method: 'automatic',
        confirm: true,
        return_url: "http://localhost:3000/user/success",

        metadata: {
          orderId: newOrder.id.toString(),
          invoiceId: newOrderInvoice.id.toString(),
        },
      });
      console.log("DOVRSENO AUTOMATSKO PLACANJE");
      return NextResponse.json({ clientSecret: paymentIntent.client_secret, hasDefaultCard: true });

    } else { //ako nema default kartice
        const paymentIntent = await stripe.paymentIntents.create({
          amount: convertedAmount,
          currency: normalizedCurrency,
          customer: user.stripeId ?? undefined,
          payment_method_options: {
            card: {
              request_three_d_secure: 'any',
            }
          },
        payment_method_types: ['card'],
          metadata: {
            orderId: newOrder.id.toString(),
            userId: user.id.toString(),
            productName: itemName,
            invoiceId: newOrderInvoice.id, //dodano za rjesavanje errora kod invoice izrade!
            return_url: "http://localhost:3000/user/success",
        },
        capture_method: "manual",
      },
      {
        idempotencyKey: crypto.randomUUID(), //idempotency!!!
      }
    );

    await prisma.paymentIntents.update({ //dodaj stripe ID za manual capture!
      where: {id: newOrder.id},
      data: {
        stripeId: paymentIntent.id
      },
    });
    console.log("DOVRSENO MANUAL PLACANJE");
    return NextResponse.json({ clientSecret: paymentIntent.client_secret, hasDefaultCard: false });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

