import { NextResponse } from "next/server";
import { stripe } from "../../lib/stripe";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "app/lib/prisma";

export async function POST(req: Request) {
  try {
    const { amount, itemName, currency } = await req.json();

    //dodatak: preko keksica maila dobivam usera
    const cookie = await cookies();
    const email = cookie.get("userEmail")?.value;

    if(!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
    }

    const user = await prisma.user.findUnique({ //user po mailu iz cookies
      where: {email: email},
      include: { //dodatak ima li default card
        cards: {
          where: {isDefault: true},
        }
      }
    });

    if(!user) {
      return NextResponse.json( { message: "Korisnik ne postoji"}, { status: 404});
    }

    const defaultCard = user?.cards[0];

    const newOrder = await prisma.paymentIntents.create({
      data: {
        email: user.email,
        userId: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        status: "PENDING",
        items: itemName,
        amount: amount,
        currency: currency,
      }
    });

    const newOrderInvoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        total: amount,
        status: "PENDING",
        currency: currency,
        items: itemName,
      }
    });

    if (defaultCard) { //flow ako ima default karticu
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        customer: user.stripeId ?? undefined,
        payment_method: defaultCard.paymentMethodId,
       confirmation_method: 'automatic',
        confirm: true,
        return_url: "http://localhost:3000/user/success",

        metadata: {
          orderId: newOrder.id.toString(),
          invoiceId: newOrderInvoice.id.toString(),
        },
        capture_method: "manual",
      });
      console.log("Info o placanju:", { //za provjeru
      amount: amount,
      currency: currency,
      isDefault: true,
    });

    await prisma.paymentIntents.update({ //dodaj stripe ID za manual capture!
      where: {id: newOrder.id},
      data: {
        stripeId: paymentIntent.id
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, hasDefaultCard: true});

    } else { //normalan flow ako nema automatskog placanja
      const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: currency,
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

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, hasDefaultCard: false});

    }
    
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: amount,
//       currency: currency as string,
//       payment_method_options: {
//         card: {
//           request_three_d_secure: 'any',
//         }
//       },
//     //automatic_payment_methods: { enabled: true },
//     payment_method_types: ['card'],
//       metadata: {
//         orderId: newOrder.id.toString(),
//         userId: user.id.toString(),
//         productName: itemName,
//         invoiceId: newOrderInvoice.id, //dodano za rjesavanje errora kod invoice izrade!
//     },
//     capture_method: "manual",
//   },
//   {
//     idempotencyKey: crypto.randomUUID(), //idempotency!!!
//   }
// );
    // await prisma.paymentIntents.update({ //dodaj stripe ID za manual capture!
    //   where: {id: newOrder.id},
    //   data: {
    //     stripeId: paymentIntent.id
    //   },
    // });

    //return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("Error u izradi payment intenta:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
