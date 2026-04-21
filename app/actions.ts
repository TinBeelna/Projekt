'use server';

import { prisma } from '@/app/lib/prisma' 
import { redirect } from 'next/navigation'
//import { cookies } from 'next/headers'
import { stripe } from "@/app/lib/stripe";
import bcrypt from 'bcryptjs';
import { signIn } from "@/app/lib/auth"; // path to your auth.ts
import { AuthError } from "next-auth";
import {signOut} from "@/app/lib/auth"


export async function loginUser(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/",
        });
    } catch (err) {
        if (err instanceof AuthError) {
            return { error: 'Kivi mail ili pass'};
        }
        throw err;
    }
    
   
// if (user.role === 'ADMIN') {
//   redirect(`/admin/admin-dashboard`);
// } else {
//   redirect(`/user/user-dashboard`);
// }

}

//signup

export async function registerUser(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    // provjeri postoji li već korisnik s tim emailom
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        return { error: 'Email already in use' };
    }

    const hashedPassword = await bcrypt.hash(password, 10); //hash passworda: 10 salt rundi

    const newUser = await prisma.user.create({
        data: {
            email: email, password: hashedPassword, firstName: firstName, lastName: lastName, role: 'USER' // svi koji se registriraju su USER, samo admini su ADMIN
        }
    })
    //Stripe create customer
    const customer = await stripe.customers.create({
        name: firstName + " " + lastName,
        email: email,
        metadata: {
            role: 'USER',
            id: newUser.id,
        }, 
         description: 'User registered on website',
        }, {
  idempotencyKey: crypto.randomUUID(), // protiv duplih izrada
    });

    await prisma.user.update({ //dodatak stripeID na usera
    where: { id: newUser.id },
    data: {
        stripeId: customer.id 
    }
});

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/user/user-dashboard" //middleware provjerava ulogu
        });
    } catch (err) {
        if (err instanceof AuthError) {
            return { error: "Registracija uspjela ali login ne!"}
        }
        throw err;
    }
 

//     if (newUser.role === 'ADMIN') {
//   redirect(`/admin/admin-dashboard`);
// } else {
//   redirect(`/user/user-dashboard`);
// }

}

//logout

export async function logoutUser() {
    await signOut({ redirectTo: "/" });
}



