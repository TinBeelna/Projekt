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

    if(!user || user.role !== 'ADMIN') {
        //redirect('user-dashboard?error=Unauthorized'); //ako nije admin, vrati na user dashboard
        notFound(); //error 404 custom stranica
    }
    return user; //ako je sve ok vrati usera
}
