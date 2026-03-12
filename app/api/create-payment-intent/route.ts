import { NextResponse } from "next/server";
import { stripe } from "../../lib/stripe";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "app/lib/prisma";

export async function POST(req: Request) {
  try {
    const { amount, itemName } = await req.json();

    //dodatak: preko keksica maila dobivam usera
    const cookie = await cookies();
    const email = cookie.get("userEmail")?.value;

    if(!email) {
      notFound(); 
    }

    const user = await prisma.user.findUnique({ //user po mailu iz cookies
      where: {email: email}
    });

    if(!user) {
      return NextResponse.json( { message: "Korisnik ne postoji"}, { status: 404});
    }

    const newOrder = await prisma.paymentIntents.create({
      data: {
        email: user.email,
        userId: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        status: "PENDING",
        items: itemName
      }
    });


    //last update: dodan metadata user/order id (oba su samo inkrementi)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "eur",
      payment_method_options: {
        card: {
          request_three_d_secure: 'any',
        }
      },
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: newOrder.id.toString(),
        userId: user.id.toString(),
        productName: itemName,
    },
  },
  {
    idempotencyKey: `order_${newOrder.id}`, //idempotency!!!
  }
);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
