import { NextResponse } from "next/server";
import { getSellers } from "@/app/lib/sellers";

export async function GET() {
    const sellers = await getSellers();
    return NextResponse.json(sellers);
}
