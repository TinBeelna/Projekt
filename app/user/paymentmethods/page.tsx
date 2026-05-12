//import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import PaymentMethodsClient from "./paymentmethodsclient";
import { auth } from "@/app/lib/auth"

export const dynamic = 'force-dynamic';

export default async function PaymentMethodsPage() {
    const session = await auth();
    const email = session?.user?.email;

    const user = await prisma.user.findUnique({
        where: { email: email || "" },
    });
    
    const userId = user?.stripeId || "no_id";

    //Id se salje korisniku (client compponent); radi problema sa dobivanjem userId bilo je potrebno odvojiti client i server strane
    return <PaymentMethodsClient userId={userId} />;
}
