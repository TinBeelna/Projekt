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
            const currentRecord = await prisma.paymentIntents.findFirst({ where: { stripeId } });
            
            // 1. Determine the REAL current balance
            const currentBalance = currentRecord?.capturedAmount ?? currentRecord?.amount ?? 0;
            
            // 2. Subtract THIS refund from that balance
            const newBalance = Math.max(0, currentBalance - amountCents);

            await prisma.paymentIntents.updateMany({
                where: { stripeId },
                data: {
                    capturedAmount: newBalance, 
                    status: newBalance <= 0 ? "REFUNDED" : "Succeeded", 
                    refundAmount: 0, 
                },
            });

            // 3. Create the invoice/log entry
            if (!currentRecord?.email) throw new Error("Email je obavezan");
            
            await prisma.refunds.create({
                data: {
                    stripePaymentId: stripeId,
                    amount: amountCents,
                    email: currentRecord.email,
                    firstName: currentRecord.firstName,
                    lastName: currentRecord.lastName,
                }
            });

            revalidatePath("/user/refunds");
            revalidatePath("/admin/refunds");
            return { success: true };
        }
    } catch (error: any) {
        const message = error.message.toLowerCase();
        const isAlreadyRefunded = error.code === 'charge_already_refunded' || message.includes("has already been refunded");
        const isChargedBack = message.includes("charged back");

        if (isAlreadyRefunded || isChargedBack) {
            // 1. We ONLY set capturedAmount to 0 if the bank took everything (Chargeback)
            // If it was "already refunded", we just clear the pending request 
            // but keep the current balance so partial refunds still work.
            await prisma.paymentIntents.updateMany({
                where: { stripeId },
                data: { 
                    status: isChargedBack ? "CHARGED_BACK" : "Succeeded", 
                    refundAmount: 0, 
                    ...(isChargedBack && { capturedAmount: 0 }) 
                }
            });

            // 2. Clear the specific admin request so it disappears from the list
            await prisma.refunds.deleteMany({
                where: { stripePaymentId: stripeId }
            });

            revalidatePath("/user/refunds");
            revalidatePath("/admin/refunds");

            return { success: true, message: "Sync complete." };
        }
        
        throw new Error(error.message);
    }
}