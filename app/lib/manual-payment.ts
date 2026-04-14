"use server";
import { stripe } from "@/app/lib/stripe";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

export async function capturePayment(paymentIntentId: string, amount?: number) {
  try {
    const params: any = {};
    if (amount) {
      params.amount_to_capture = amount; 
    }

    const intent = await stripe.paymentIntents.capture(paymentIntentId, params);
    const ourOrderId = intent.metadata.orderId;

    // za update baze (partial ili ne)
    const isPartial = amount && amount < intent.amount;
    
    await prisma.paymentIntents.update({
      where: { id: Number(ourOrderId)}, 
      data: { 
        status: isPartial ? "Partially captured" : "Succeeded",
        capturedAmount: amount || intent.amount 
      }
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


export async function cancelPayment(paymentIntentId: string) {
  try {
    // je li vec otkazano?
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // ako je stripe otkazao, samo azuriraj status (radi prijasnjeg errora)
    if (intent.status === 'canceled') {
      const orderId = intent.metadata.orderId;
      await prisma.paymentIntents.update({
        where: { id: Number(orderId) },
        data: { status: "Canceled" }
      });
      revalidatePath("/admin/dashboard");
      return { success: true };
    }

    // ako nije otkazan, sada otkazi
    const canceledIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    const orderId = canceledIntent.metadata.orderId;

    await prisma.paymentIntents.update({
      where: { id: Number(orderId) },
      data: { status: "Canceled" }
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    //mici narudzbu makar baca error
    return { success: false, error: error.message };
  }
}
