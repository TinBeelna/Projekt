import { prisma } from "@/app/lib/prisma";

export async function getAccFeeEarningsInCurr(currency: string) {

    let totalEarnings = 0;
    
    const currFees = await prisma.applicationFee.findMany({
        where: {
            currency: currency,
        },
    })

    for (const fee of currFees) {
        totalEarnings += fee.amount;

        if(fee.amountRefunded) {
            totalEarnings -= fee.amountRefunded;
        }
    }

    return totalEarnings;
}