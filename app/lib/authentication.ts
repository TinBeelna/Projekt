import { prisma } from "@/app/lib/prisma"; 
import { notFound, redirect } from "next/navigation";
//import { cookies } from "next/headers";
import { auth } from "@/app/lib/auth"

export async function isAdmin() {
    const session = await auth();
    const email = session?.user?.email;

    if(!email) return null; //ako nema emaila u auth, vrati null

    const user = await prisma.user.findUnique({
        where: { email }
    })

    const adminConfig = await prisma.roleRouteConfig.findFirst({ where: { routePrefix: '/admin' } });
    if(!user || user.role !== adminConfig?.role) {
        notFound();
    }
    return user;
}

export async function isRefundAdmin() {
    const session = await auth();
    const email = session?.user?.email;

    if(!email) return null;

    const user = await prisma.user.findUnique({
        where: { email }
    })

    const refundAdminConfig = await prisma.roleRouteConfig.findFirst({ where: { routePrefix: '/refundAdmin' } });
    if(!user || user.role !== refundAdminConfig?.role) {
        notFound();
    }
    return user;
}
