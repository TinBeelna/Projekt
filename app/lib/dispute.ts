"use server";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";
import { revalidatePath } from "next/cache";

export async function getIntentDisputes(payment_intent_id: string) {

    const disputes = await prisma.disputes.findMany({
        where: { paymentStripeId: payment_intent_id },
        include: { paymentIntent: true },
    })

    return disputes.map(disp => ({
        disputeId: disp.disputeId,
        paymentSripeId: disp.paymentStripeId,
        reason: disp.reason,
        status: disp.status,
        evidence: disp.evidence,
        amount: disp.amount,
        chargeId: disp.chargeId,
        id: disp.id,
        currency: disp.paymentIntent?.currency, //dodano za valutu u dispute UIu!
    }));
}

export async function closeDispute(dispute_id: string) { //ako (kao) nemamo argument; na dashboardu nam se skida novac

    await stripe.disputes.close(dispute_id);

    // await prisma.disputes.update({
    //     where: {
    //         disputeId: dispute_id, 
    //     },
    //     data: {
    //         status: 'closed',
    //     },
    // });
    revalidatePath('/admin/disputes');
}

export async function provideDisputeEvidence(dispute_id: string, argument: string) { //test funkcija za "dokaz"

    const dispute = await prisma.disputes.update({
        where: {
            disputeId: dispute_id
        },
        data: {
            evidence: argument
        },
    });
    // winning_evidence za W
    // losing_evidence za L
    await stripe.disputes.update(dispute_id, {
        evidence: {
            uncategorized_text: argument,
        },
        submit: true,
    })

   console.log(`Oduzet novac za dispute: ${dispute.disputeId}`);
    revalidatePath('/admin/disputes');

}

export async function submitDisputeToBank(dispute_id: string) {
    await stripe.disputes.update(dispute_id, {
        submit: true,
    })
    revalidatePath('/admin/disputes');
}