'use server';

import { prisma } from '@/app/lib/prisma' 
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'


export async function loginUser(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // nadi korisnika u bazi
    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user || user.password !== password) {
        // ako nema korisnika ili password ne odgovara, vrati error
        return { error: 'Invalid email or password' };
    }
    const cookieStore = await cookies();
    cookieStore.set('userEmail', user.email, { //cookies za pamcenje logina
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });

    cookieStore.set('userRole', user.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
});

if (user.role === 'ADMIN') {
  redirect(`/admin/admin-dashboard`);
} else {
  redirect(`/user/user-dashboard`);
}

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
    const newUser = await prisma.user.create({
        data: {
            email: email, password: password, firstName: firstName, lastName: lastName, role: 'USER' // svi koji se registriraju su USER, samo admini su ADMIN
        }
    })

    const cookieStore = await cookies();
    cookieStore.set('userEmail', newUser.email, { //cookies za pamcenje logina
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });

    cookieStore.set('userRole', newUser.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
});

    if (newUser.role === 'ADMIN') {
  redirect(`/admin/admin-dashboard`);
} else {
  redirect(`/user/user-dashboard`);
}

}

//logout

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete('userEmail');
    cookieStore.delete('userRole'); 
    redirect('/');
}



