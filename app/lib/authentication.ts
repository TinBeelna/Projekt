import { prisma } from "@/app/lib/prisma"; 
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
export async function isAdmin() {
    const cookieStore = await cookies();
    const email = cookieStore.get('userEmail')?.value;

    if(!email) return null; //ako nema emaila u cookies, vrati null

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if(!user || user.role !== 'ADMIN') {
        //redirect('user-dashboard?error=Unauthorized'); //ako nije admin, vrati na user dashboard
        notFound(); //error 404 custom stranica
    }
    return user; //ako je sve ok vrati usera
}
