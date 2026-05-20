import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
    const rows = await prisma.currencyRate.findMany();
    const rates: Record<string, number> = { eur: 1 };
    for (const row of rows) {
        rates[row.currency] = row.coefficient;
    }
    return NextResponse.json(rates);
}
„