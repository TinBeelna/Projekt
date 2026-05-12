"use server";
//"use client";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";
import { revalidatePath } from "next/cache";
//import { cookies } from 'next/headers'

export async function getPaymentMethods(userId: string) { //za prikaz payment methoda
   const paymentMethods = await prisma.paymentMethod.findMany({
      where: { stripeId: userId },
   });

   return paymentMethods.map(method => ({
      id: method.id,
      paymentMethodId: method.paymentMethodId,
      LastFour: method.LastFour,
      CardBrand: method.CardBrand,
      ExpMonth: method.ExpMonth,
      ExpYear: method.ExpYear,
      isDefault: method.isDefault,
      displayName: `${method.CardBrand.charAt(0).toUpperCase() + method.CardBrand.slice(1)} •••• ${method.LastFour}`, //stripe preporuka
   }));

}

export async function setAsDefaultMethod(userId: string, paymentMethodId: string){
   await prisma.paymentMethod.updateMany({ //reset svega na false
      where: {
         stripeId: userId,
         isDefault: true,
      },
      data: {
         isDefault: false,
      }
   });

   await stripe.customers.update(userId, { //postaviti za default za placanje
      invoice_settings: {
         default_payment_method: paymentMethodId,
      },
   });

   await prisma.paymentMethod.update({
      where: {
         paymentMethodId: paymentMethodId,
      },
      data: {
         isDefault: true,
      }
   });

   revalidatePath("/user/paymentmethods");
   return { success: true };
}

export async function deletePaymentMethod(userId: string, paymentMethodId: string) {
   const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
         paymentMethodId: paymentMethodId,
         stripeId: userId
      }
   });

   const isDefault = (paymentMethod?.isDefault === true); //provjera za postaviti default ako je default izbrisana

   if(!paymentMethod) {
      throw new Error('Nema payment metoda za brisanje');
   }
   try {
      await stripe.paymentMethods.detach(paymentMethod.paymentMethodId); //brisanje sa stripea
   } catch (err) {
      console.warn('Neuspjelo brisanje metode placanja sa stripea',err);
   }

   await prisma.paymentMethod.delete({
      where: { id: paymentMethod.id }
   });

   const remainingMethods = await prisma.paymentMethod.findMany({
      where: { stripeId: userId }
   });

   //ako je ostala samo jedna kartica, postavi ju kao default (korisnik inace sam postavlja default ako je obrisana default a ima ih vise)
   //ako je izbrisana default kartica a preostalo je vise kartica, uzmi prvu iz niza i postavi kao default
   if(remainingMethods.length === 1 || (isDefault && remainingMethods.length > 1)) {
      const lastMethod = remainingMethods[0];
      await setAsDefaultMethod(userId, lastMethod.paymentMethodId);
      return { success: true, newDefaultId: lastMethod.paymentMethodId };
   }

   revalidatePath("/user/paymentmethods");
   return { success: true, newDefaultId: null};
}

export async function setupIntentForPaymentMethod(userId: string): Promise<{ clientSecret: string }>{

   const user = await prisma.user.findUnique({
      where: { stripeId: userId }
   });

   if(!user) {
      throw new Error('Nema korisnika sa tim IDem.');
   }

   const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeId || undefined,
      payment_method_types: ['card', 'google_pay', 'apple_pay'], //bonus task: + apple/google pay
      usage: 'off_session', //da se moze spremiti kartica bez checkouta
   })
   return { clientSecret: setupIntent.client_secret! };
}

export async function savePaymentMethod(userId: string, paymentmethodId: string): Promise< { success: boolean; error?: string }> {

   try {
      const user = await prisma.user.findUnique({
         where: { stripeId: userId}
      });

      if(!user) {
         throw new Error('Nema korisnika koji koristi taj ID za spremanje metode placanja.');
      }
      //uzmi ju iz stripea za podatke
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentmethodId);

      if (!paymentMethod.card) {
         throw new Error('Payment method does not have card details.');
      }

      const lastFour = paymentMethod.card.last4; //zadnja 4 digita

      const existingMethods = await prisma.paymentMethod.findMany({
         where: { stripeId: userId }
      });

      const isDefault = existingMethods.length === 0; //check je li metoda prva 

      if(isDefault) { //postavi kao default ako je prva metoda
         await stripe.customers.update(user.stripeId!, {
            invoice_settings: {
               default_payment_method: paymentmethodId,
            },
         });
      }

      await prisma.paymentMethod.create({
         data: {
            stripeId: userId,
            paymentMethodId: paymentmethodId,
            LastFour: lastFour,
            CardBrand: paymentMethod.card.brand,
            ExpMonth: paymentMethod.card.exp_month,
            ExpYear: paymentMethod.card.exp_year,
            isDefault: isDefault,
         }
      });
      revalidatePath("/user/paymentmethods");
      return { success: true };
   }
      catch (err) {
         console.error('Neuspjelo spremanje metode placanja:', err);
         return {
            success: false,
            error: err instanceof Error ? err.message : 'Nepoznati error tijekom spremanja metode placanja!',
         };
      };

} 