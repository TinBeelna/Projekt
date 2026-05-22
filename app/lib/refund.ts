"use server";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache"; //bez osvjezavanja (F5) admin vidi request
import { stripe } from "@/app/lib/stripe";
import { isAdminOrRefundAdmin } from "@/app/lib/authentication";

export async function requestRefundAction(stripeId: string, amount: number) {
    await prisma.paymentIntents.updateMany({
        where: { 
            stripeId: stripeId 
        },
        data: {
            status: "REQUESTED_REFUND",
            refundAmount: amount,
        }
    });

    revalidatePath("/user/refunds");
    revalidatePath("/admin/refunds");
}

export async function cancelRefundAction(stripeId: string) {
    await isAdminOrRefundAdmin();
    await prisma.paymentIntents.updateMany({
        where: { stripeId },
        data: {
            status: "DECLINED",
            refundAmount: 0,
        },
    });
    revalidatePath("/user/refunds");
    revalidatePath("/admin/refunds");
    revalidatePath("/refundAdmin/refunds");
}

export async function RefundAction(stripeId: string, amount: number, currency: string) {
    await isAdminOrRefundAdmin();
    try {
        const refund = await stripe.refunds.create({
            payment_intent: stripeId,
            amount: amount,
           // currency: currency, NIJE POTREBAN I NE KORISTI SE!!! STRIPE AUTOMATSKI VRACA U ISTOJ VALUTI!!!
        });

        if (refund.status === "succeeded" || refund.status === "pending") {
            const currentRecord = await prisma.paymentIntents.findFirst({ where: { stripeId } });
            
            // Koliko je trenutno izvuceno iz tranzakcije
            const currentBalance = currentRecord?.capturedAmount ?? currentRecord?.amount ?? 0;
            
            // oduzmi refund od te vrijednosti (sada imamo koliko se jos da refundati)
            const newBalance = Math.max(0, currentBalance - amount);

            await prisma.paymentIntents.updateMany({
                where: { stripeId },
                data: {
                    capturedAmount: newBalance, 
                    status: newBalance <= 0 ? "REFUNDED" : "Succeeded", 
                    refundAmount: 0, 
                },
            });

            if (!currentRecord?.email) throw new Error("Email je obavezan");
            
            await prisma.refunds.create({
                data: {
                    stripePaymentId: stripeId,
                    amount: amount,
                    email: currentRecord.email,
                    firstName: currentRecord.firstName,
                    lastName: currentRecord.lastName,
                    currency: currency,
                }
            });

            revalidatePath("/user/refunds");
            revalidatePath("/admin/refunds");
            return { success: true };
        }
    } catch (error: any) {
        const message = error.message.toLowerCase();
        const isAlreadyRefunded = error.code === 'charge_already_refunded' || message.includes("has already been refunded"); //za handleanje "already refunded" slucaja
        const isChargedBack = message.includes("charged back");

        if (isAlreadyRefunded || isChargedBack) { //ako je "already refunded" (error koji sam dobivao) cisti se pending status ali se zadrzi stat balansa da partial refundi rade

            await prisma.paymentIntents.updateMany({
                where: { stripeId },
                data: { 
                    status: isChargedBack ? "CHARGED_BACK" : "Succeeded", //charged back ako je, inace succeeded
                    refundAmount: 0, 
                    ...(isChargedBack && { capturedAmount: 0 }) //captured amount u 0 ako user napravi puni refund (ili sa vise njih dode do punog)
                }
            });

            // cisti se request da vise nije na listi
            await prisma.refunds.deleteMany({
                where: { stripePaymentId: stripeId }
            });

            revalidatePath("/user/refunds");
            revalidatePath("/admin/refunds");

            return { success: true, message: "Refund gotov." };
        }
        
        throw new Error(error.message);
    }
}