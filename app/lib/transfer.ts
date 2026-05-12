import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import { stripe } from "./stripe";

export async function balanceInquiry(userId: number) {
    try {
        const user = await prisma.user.findUnique({
        where: {
            id: userId,
        }
    });

    if (!user) {
        throw new Error("Nema korisnika sa tim ID-em");
    }

    return user.Acc_bal / 100;

    } catch (err) {
        console.error("Error tijekom balanceInquiry funkcije: ", err);
    }
}

async function validateIBAN(iban: string): Promise<boolean>{

    const hrIbanRegex = /^HR\d{19}$/; // HR + 2 check digita + 17 digita ibana
    if (! hrIbanRegex.test(iban)) { // format check
        return false; 
    }
    const rearranged = iban.slice(4) + iban.slice(0,4); //prva 4 znaka (HR + 2 check digita) na kraj
    const toNumericIBAN = rearranged.split('').map(char => {
        if (char >= '0' && char <= '9') {
            return char;
        }
        return char.charCodeAt(0) - 55; // A=10, B=11,....Z=35 
    })

    const ibanIntoBigInt = BigInt(toNumericIBAN.join(''));
    return ibanIntoBigInt % 97n === 1n; //ostatak mora biti 1
}

export async function transferFundsSEPA(senderId: number, recipientIBAN: string, amount: number) { //recimo da je balans samo u eurima, jer radimo samo sepa transfer (makar je i UK u SEPA domeni, ali transfer je u eurima!)
    try {
        const sender = await prisma.user.findUnique({
            where: {
                id: senderId,
            }
        })

        const recipient = await prisma.user.findUnique({
            where: {
                IBAN: recipientIBAN,
            }
        })

        if (!sender || !recipient) {
            throw new Error("Nema sendera/receivera sa tim ID-em!");
        }

        if (sender.Acc_bal < amount) {
            throw new Error("Nema dovoljno novca na racunu!!!");
        }

        if (amount <= 100) {
            throw new Error("Iznos transfera je pre malen. Minimalni iznos je 1 euro.");
        }

        if (! await validateIBAN(recipientIBAN)) {
            throw new Error("IBAN u neispravnom formatu!");
        }

        const charge = await stripe.charges.create({ //simulira se naplata sa sender kartice da dobijemo novac tokom transfera
        amount: 50, 
        currency: 'eur',
        source: 'tok_bypassPending', //test token koji uvijek prode
        description: 'Charge for SEPA transfer',
        });

        if (charge.status !== 'succeeded') {
            throw new Error("Neuspjela uplata naknade pomocu charge funkcije!");
        }

        await prisma.$transaction([ //da moraju proci oba updatea!!!
            prisma.user.update({
                where: {
                    id: senderId,
                },
                data: {
                    Acc_bal: sender.Acc_bal - amount - 50,
                }
            }),
            prisma.user.update({
                where: {
                    IBAN: recipientIBAN,
                },
                data: {
                    Acc_bal: recipient.Acc_bal + amount,
                }
            })
        ])

        await prisma.transfer.create({
            data: {
                senderId: senderId,
                recipientIBAN: recipientIBAN,
                amount: amount,
                status: 'succeeded',
            }
        });

    } catch (err) {
        console.error("Error tijekom transferFundsSEPA funkcije: ", err);
        throw err; //za prikaz korisniku
    }
}