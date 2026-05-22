import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import { stripe } from "./stripe";
import { ISO20022 } from "iso20022.js"

const Fee = 50; //samo je jedan; neka bude hard kodiran :)

function generatePain001(
    sender: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        IBAN: string | null;},
    recipientIBAN: string, amount: number): string {

    const iso = new ISO20022({
        initiatingParty: {
            name: `${sender.firstName ?? ''} ${sender.lastName ?? ''}`.trim() || `User-${sender.id}`,
            id: String(sender.id),
            account: {iban: sender.IBAN!},
            agent: {bic: 'MOCKHRZZXXX'}, //A- bank code; B- country code, CC - location code, D - branch code
        }
    });

    const payment = iso.createSEPACreditPaymentInitiation({
        paymentInstructions: [
            {
            type: 'sepa',
            direction: 'credit',
            amount: amount, //pain001 oce EUR a ne CENTS
            currency: 'EUR',
            creditor: {
                name: 'User with ' + recipientIBAN,
                account: {
                iban: recipientIBAN,
                },
            },
            },
        ],
        });


    return payment.toString();
}

export async function statusReport(transferId: number, status: 'ACCP' | 'RJCT', pain002Xml: string) { //update transfera sa pain002 porukom
    await prisma.transfer.update({
        where: { id: transferId},
        data: {
            pain002Xml,
            status: status === 'ACCP' ? 'succeeded' : 'failed',
        }
    });
}

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

async function validatePain002(pain002Xml: string, transferId: number) {

    //Check 1: je li BIC onaj koji je zapisan u .env.local
    const bankBIC = pain002Xml.match(/<BICFI>(.*?)<\/BICFI>/)?.[1];
    const trustedBIC = process.env.TRUSTED_BANK_BIC ?? 'MOCKHRZZXXX';

    if (bankBIC !== trustedBIC) {
        throw new Error(`Krivi BIC banke (${bankBIC}) kod pain.002 poruke!`);
    }

    //Check 2: postoje li vazeca polja
    const requiredFields = ['<MsgId>', '<OrgnlMsgId>', '<GrpSts>'];
    for (const field of requiredFields) {
        if (!pain002Xml.includes(field)) {
            throw new Error(`Fali polje (${field}) kod pain.002 poruke!`)
        }
    }

    //Check 3: dupli id
    const ackMsgId = pain002Xml.match(/<MsgId>(.*?)<\/MsgId>/)?.[1];
    if (ackMsgId) {
        const duplicate = await prisma.transfer.findFirst({
            where: {
                id: { not: transferId },
                pain002Xml: {contains: `<MsgId>${ackMsgId}</MsgId>`},
            }
        });
        if (duplicate) {
            throw new Error(`pain.002 sa (${ackMsgId}) je vec obradena!!`);
        }
    }


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

        if (sender.IBAN === recipientIBAN) {
            throw new Error("Ne možete slati novac sami sebi.");
        }

        if (sender.Acc_bal < amount + Fee) {
            throw new Error("Nema dovoljno novca na racunu!!!");
        }

        const appConfig = await prisma.appConfig.findUnique({ where: { id: 1 } });
        const minTransferCents = appConfig?.minTransferCents ?? 100;
        if (amount < minTransferCents) {
            throw new Error("Iznos transfera je pre malen. Minimalni iznos je 1 euro.");
        }

        if (! await validateIBAN(recipientIBAN)) {
            throw new Error("IBAN u neispravnom formatu!");
        }

        const pain001Xml = generatePain001(sender, recipientIBAN, amount); //generiranje pain001 koji se salje banci

        const prismaTransferEntry = await prisma.transfer.create({
            data: {
                senderId: senderId,
                recipientIBAN: recipientIBAN,
                amount: amount,
                status: 'pending',
                pain001Xml,
            }
        });
    
        const BaseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

        const bankResponse = await fetch(`${BaseUrl}/api/bank_1`, { //salji pain.001 banci
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
                'X-Transfer-Id': String(prismaTransferEntry.id), //da bank_1 ruta zna na koji transfer spremiti poruku
            },
            body: pain001Xml,
        })

        const pain002Xml = await bankResponse.text();
        //console.log('Bank returned:', pain002Xml.substring(0, 300));
        await validatePain002(pain002Xml, prismaTransferEntry.id);
        const bankStatus = pain002Xml.match(/<GrpSts>(.*?)<\/GrpSts>/)?.[1] ?? 'RJCT';

        if (bankStatus === 'RJCT') {
            await statusReport(prismaTransferEntry.id, 'RJCT', pain002Xml); //ako RJCT, update da je rejected
            throw new Error("Transfer odbijen od strane banke.");
        }

        const charge = await stripe.charges.create({ //simulira se naplata sa sender kartice da dobijemo novac tokom transfera
        amount: Fee, 
        currency: 'eur',
        source: 'tok_bypassPending', //test token koji uvijek prode
        description: 'Charge for SEPA transfer',
        });

        await prisma.$transaction([ //da moraju proci oba updatea!!!
            prisma.user.update({
                where: {
                    id: senderId,
                },
                data: {
                    Acc_bal: sender.Acc_bal - amount - Fee,
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

        await statusReport(prismaTransferEntry.id, 'ACCP', pain002Xml);
        revalidatePath('/user/user-dashboard');
        

    } catch (err) {
        console.error("Error tijekom transferFundsSEPA funkcije: ", err);
        throw err; //za prikaz korisniku
    }
}