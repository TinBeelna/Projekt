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

//IBAN

async function generateUniqueIBAN(): Promise<string> {
    while (true) {
        const ibanNum = Array.from({ length: 17}, () => Math.floor(Math.random() * 10)).join('');
        // H=17, R=27; radi se MOD 97 za IBAN
        const arranged = ibanNum + '1727' + '00';
        const remainder = BigInt(arranged) % 97n;
        const checkDigits = String (98n - remainder).padStart(2, '0');

        const finalIBAN = 'HR' + checkDigits + ibanNum;

        const existing = await prisma.user.findUnique(
        {
            where: {
            IBAN: finalIBAN,
            }
        }
        )
        if (!existing) return finalIBAN;

        continue; //nastavi (generiraj iznova) ako se vec desi da postoji
    }
}

//signup

export async function registerUser(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    if (password.length < 5) {
        return { error: 'Password must be at least 5 characters' };
    }

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
            email: email, password: hashedPassword, firstName: firstName, lastName: lastName, role: 'USER', // svi koji se registriraju su USER, samo admini su ADMIN
            IBAN: await generateUniqueIBAN(),
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
}

//logout

export async function logoutUser() {
    await signOut({ redirectTo: "/" });
}



