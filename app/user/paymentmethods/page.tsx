import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import PaymentMethodsClient from "./paymentmethodsclient";

export default async function PaymentMethodsPage() {
    const cookieStore = await cookies();
    const email = cookieStore.get("userEmail")?.value;

    const user = await prisma.user.findUnique({
        where: { email: email || "" },
    });
    
    const userId = user?.stripeId || "no_id";

    // Pass the server-fetched userId to the Client Component
    return <PaymentMethodsClient userId={userId} />;
}
