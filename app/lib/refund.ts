"use server";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache"; //bez osvjezavanja (F5) admin vidi request
import { stripe } from "@/app/lib/stripe";

export async function requestRefundAction(stripeId: string, amountCents: number) {
    await prisma.paymentIntents.updateMany({
        where: { 
            stripeId: stripeId 
        },
        data: {
            status: "REQUESTED_REFUND",
            refundAmount: amountCents, 
        }
    });

    revalidatePath("/user/refunds");
    revalidatePath("/admin/refunds");
}

export async function RefundAction(stripeId: string, amountCents: number) {
    try {
        const refund = await stripe.refunds.create({
            payment_intent: stripeId,
            amount: amountCents,
        });

        if (refund.status === "succeeded" || refund.status === "pending") {
            // 1. Prvo dohvatimo trenutno stanje jer decrement na NULL ne radi
            const currentRecord = await prisma.paymentIntents.findFirst({
                where: { stripeId }
            });

            // Određujemo bazu od koje oduzimamo (ako je capturedAmount null, uzimamo amount)
            const currentBalance = currentRecord?.capturedAmount ?? currentRecord?.amount ?? 0;
            const newBalance = Math.max(0, currentBalance - amountCents);

            // 2. Radimo update s točno izračunatim brojem
            await prisma.paymentIntents.updateMany({
                where: { stripeId },
                data: {
                    capturedAmount: newBalance, // Ručno upisujemo novi manji iznos
                    status: newBalance === 0 ? "REFUNDED" : "Succeeded",        // Vraćamo status da user opet vidi gumb
                    refundAmount: 0,           // Čistimo zahtjev za Admina
                },
            });


            if (!currentRecord?.email) {
                 throw new Error("Email je obavezan za kreiranje refunda");
            }
            
            const newOrderInvoice = await prisma.refunds.create({
                data: {
                    stripePaymentId: stripeId,
                    amount: amountCents,
                    email: currentRecord?.email,
                    firstName: currentRecord?.firstName,
                    lastName: currentRecord?.lastName,
                }
                });

            revalidatePath("/user/refunds");
            revalidatePath("/admin/refunds");
            return { success: true };
        }
    } catch (error: any) {
       if (error.code === 'charge_already_refunded' || error.message.includes("has already been refunded")) {
        await prisma.paymentIntents.updateMany({
            where: { stripeId },
            data: { status: "REFUNDED", refundAmount: 0, capturedAmount: 0 }
        });
        revalidatePath("/admin/refunds");
    }
    throw new Error(error.message);
  }
}
