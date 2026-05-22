import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simulates the ownership check inside requestRefundAction
async function checkOwnership(stripeId: string, sessionEmail: string) {
    const payment = await prisma.paymentIntents.findFirst({ where: { stripeId } });
    if (!payment || payment.email !== sessionEmail) throw new Error("Not authorized");
    return payment;
}

async function run() {
    // Real stripeId that belongs to user@nextmail.com
    const realStripeId = "pi_3TM26aLrpwzLPald2Qkj3uMD";
    const ownerEmail = "user@nextmail.com";
    const attackerEmail = "attacker@evil.com";

    console.log("--- Test 1: correct user requests refund (should PASS) ---");
    try {
        await checkOwnership(realStripeId, ownerEmail);
        console.log("PASS: owner can request refund\n");
    } catch (e: any) {
        console.log("FAIL:", e.message, "\n");
    }

    console.log("--- Test 2: wrong user requests refund (should BLOCK) ---");
    try {
        await checkOwnership(realStripeId, attackerEmail);
        console.log("FAIL: attacker was not blocked!\n");
    } catch (e: any) {
        console.log("PASS: blocked with ->", e.message, "\n");
    }

    console.log("--- Test 3: non-existent stripeId (should BLOCK) ---");
    try {
        await checkOwnership("pi_fakeid123", ownerEmail);
        console.log("FAIL: fake id was not blocked!\n");
    } catch (e: any) {
        console.log("PASS: blocked with ->", e.message, "\n");
    }

    await prisma.$disconnect();
}

run();
