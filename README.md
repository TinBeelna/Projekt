# Stripe projekt - projekt za učenje o tranzakcijama te funkcionalnostima stripe platforme

Projekt implementira razne funkcionalnosti tipičnih internet marketplace stranica poput pretplata, kupovine, autorizacije kupnji, disputeova, refunda...

## Test cases

> Za detaljniji pregled test caseva (slike, videozapisi, neka pojašnjenja), provjeriti .zip na linku:
> https://drive.google.com/file/d/16auEIsi_lpOAU4Yr7PtNSuD0-OSFvB7j/view?usp=sharing

---

## Prerequisites

Potrebno je instalirati:

- [Node.js](https://nodejs.org/) v18+
- [Stripe CLI](https://stripe.com/docs/stripe-cli) — za slanje webhookova na localhost
- [ngrok](https://ngrok.com/download) — za https:// stranicu; potrebno za apple i google pay

---

## 1. Dependencies

```bash
npm install
```

Instalira sve Node.js pakete iz `package.json`:

- **Next.js** — React framework
- **Prisma** — ORM za bazu podataka
- **Stripe SDK** — `stripe` (server) i `@stripe/stripe-js`, `@stripe/react-stripe-js` (klijent)
- **NextAuth v5** — autentikacija
- **Tailwind CSS** — stiliziranje
- **bcryptjs** — hashiranje lozinki
- **ts-node** — pokretanje TypeScript skripti direktno (za `create:admins`)

---

## 2. Environment variables

Napraviti `.env.local` datoteku u rootu projekta sa navedenim ključevima:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AUTH_SECRET=your_auth_secret_here
BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok-free.app
TRUSTED_BANK_BIC=MOCKHRZZXXX
TRUSTED_BANK_2_BIC=MOCKHRYYXXX
BANK2_URL=http://localhost:3000/api/bank_2
```

- `STRIPE_SECRET_KEY` i `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — iz vašeg[Stripe dashboard](https://dashboard.stripe.com/test/apikeys)
- `STRIPE_WEBHOOK_SECRET` — generira se nakon `stripe listen` komande (korak 6 ispod)
- `AUTH_SECRET` — generirati sa `openssl rand -base64 32`
- `NEXT_PUBLIC_APP_URL` — vaš ngrok javni URL (korak 5 ispod); potreban za google/apple pay testiranje

---

## 3. Postavljanje baze podataka

Projekt koristi SQLite bazu podataka putem Prisma ORM-a. Pokrenuti sljedeće kako bi se stvorila baza i primijenila shema:

```bash
npx prisma db push
```

Za pregled i upravljanje bazom podataka u pregledniku (npr. dodavanje korisnika bez korištenja registracije):

```bash
npx prisma studio
```

---

## 4. Kreiranje admina

Stvoriti dva zadana admin korisnika (ADMIN i REFUNDADMIN):

```bash
npm run create:admins
```

Kreira:

| Email | Lozinka | Uloga |
|---|---|---|
| `admin@admin.com` | `admin123` | ADMIN |
| `refund@admin.com` | `radmin123` | REFUNDADMIN |

U bazi podataka lozinke su enkriptirane; za login se koriste podatci iznad.

---

## 5. Pokretanje ngroка

ngrok je potreban jer goole i apple pay zahtijevaju javno dostupnu HTTPS adresu — `localhost` nije dovoljan.

```bash
ngrok http 3000
```

Kopirati `https://...ngrok-free.app` URL i postaviti ga kao `NEXT_PUBLIC_APP_URL` u `.env.local`.

---

## 6. Pokretanje Stripe webhook listenera

U zasebnom terminalu, prosljeđivati Stripe webhook evente na lokalni server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks
```

Pri prvom pokretanju ispisuje `whsec_...` secret — kopirati ga u `STRIPE_WEBHOOK_SECRET` u `.env.local`.

Ostaviti pokrenuto cijelo vrijeme razvoja.

---

## 7. Pokretanje razvojnog servera

```bash
npm run dev
```

Aplikacija se pokreće na [http://localhost:3000](http://localhost:3000).

---

## Sažetak pokretanja

Otvoriti četiri terminala i pokrenuti redom:

| Terminal | Komanda | Svrha |
|---|---|---|
| 1 | `ngrok http 3000` | Javni HTTPS URL za Stripe |
| 2 | `stripe listen --forward-to localhost:3000/api/webhooks` | Prosljeđivanje webhookova |
| 3 | `npm run dev` | Next.js razvojni server |
| 4 | (jednom) `npm run create:admins` | Kreiranje admin korisnika |

---

## Pregled uloga

| Uloga | Pristup |
|---|---|
| `USER` | Plaćanja, pretplate, zahtjevi za povrat, bankovni transferi |
| `ADMIN` | Puni dashboard — svi korisnici, pretplate, webhookovi, disputevi, naknade |
| `REFUNDADMIN` | Upravljanje zahtjevima za povrat novca |

### Testni podaci (Stripe test kartice)

| Broj kartice | Ponašanje |
|---|---|
| `4242 4242 4242 4242` | Uvijek prolazi (visa)|
| `5555 5555 5555 4444` | Uvijek prolazi (mastercard)|
| `4000 0000 0000 0002` | Uvijek pada (card_declined) |
| `4000 0025 0000 3155` | Zahtijeva 3D Secure autentifikaciju |
| `4000 0000 0000 9995` | Pada zbog insufficient_funds |
| `4000 0000 0000 0259` | Uvijek prolazi; izaziva dispute nakon |

Datum isteka: bilo koji budući datum (ne u pre dalekoj budućnosti; pisati brojeve ispod 40). CVV: bilo koja 3 znamenke.

---

### TS-00: Registriranje korisnika

**Preduvjeti:**
- Provjeriti jeste li dobro pokrenuli projekt

**Koraci:**
1. Kliknuti register
2. Upisati email (koristiti znak @)
3. Upisati ime i prezime (nema ograničenja)
4. Upisati lozinku (6 ili )

**Očekivani rezultat:**
- Novi korisnik je zapisan u bazu (provjeriti npm prisma studio)
- Novi korisnik se automatski logira
- Novi customer napravljen na stripe dashboardu

---

---

### TS-01: Kupovina karticom (automatic ili manual capture)

**Preduvjeti:**
- Korisnik je prijavljen

**Koraci:**
1. Otići na buy & pay stranicu
2. Kupiti novine sa testnom karticom (automatska autorizacija) ili kupiti knjigu (manual capture, pratiti podkorake)
   1. Nakon plaćanja logirati se kao admin
   2. Na dashboard stranici kliknuti "Capture (100%)" ili "Partial capture (20%)"
   3. Odlogirati se kao admin, logirati se kao korisnik
3. Otići na "Payments" stranicu. Provjeriti status tranzakcije

**Očekivani rezultat:**
- Plaćanje logirano na "Payments" korisničkoj stranici te na "dashboard" admin stranici
- Balans admina će se promijeniti (zarada)
- Plaćanje (paymentIntents) upisano u bazu

---

---

### TS-02: 3DS/SCA plaćanje

**Preduvjeti:**
- Korisnik je prijavljen

**Koraci:**
1. Ponoviti TS-01 uz karticu 4000 0025 0000 3155
2. Napraviti refresh kada iskoči 3DS auth prozor
3. Kliknuti "COMPLETE"

**Očekivani rezultat:**
- Prolazi plaćanje kao u TS-01 (manual i automatski auth)
- Balans admina će se promijeniti u narednom roku (zarada)
-Plaćanje (paymentIntents) upisano u bazu

---

---

### TS-03: Refund: full/partial

**Preduvjeti:**
- Korisnik je prijavljen
- Korisnik je obavio kartično plaćanje (i ono je captured)

**Koraci:**
1. Otići na "Refunds" stranicu
2. Odabrati vrstu povrata:
   1. Upisati vrijednost za povrat novca i kliknuti (zatraži dio)
   2. Kliknuti "Puni povrat"
3. Potvrditi sa "ok"
4. Odlogirati se te logirati kao admin
5. Otići na "Refunds" stranicu
6. Kliknuti "Izvrši povrat" (za partial) za jednu tranzakciju te "Odbij zahtjev" za drugu (full)

**Očekivani rezultat:**
- Korisnik vidi "osporeno - povrat blokiran" za odbijeni refund
- Korisnik vidi mogućnost vršenja povrata za ostatak nevraćenog novca od tranzakcie čiji je partial refund potvrđen
- Korisnik vidi "potpuno vraceno" u slučaju da je napravljen refund za 100% iznosa
- U slučaju da je izvršen puni povrat, korisnik više ne vidi tranzakciju za vraćanje novca
- Refund (refunds) upisan u bazu


---

---

### TS-04: Pretplate + računi

**Preduvjeti:**
- Korisnik je prijavljen

**Koraci:**
1. Otići na "My subscriptions" stranicu
2. Odabrati svoj plan "Tjedno" 
3. Ispuniti podatke sa karticom na stripe checkout stranici
4. Vratiti se na "My subscriptions" stranicu
5. Nadograditi pretplatu ":Nadogradi" na "Mjesečno"
6. Nakon provjere računa, otići na ":smanji"
7. Provjeriti negativnu vrijednost računa; označava vraćen novac 
8. (Opcionalno) logirati se kao admin te kliknuti "Cancel" za otkazivanje preplate


**Očekivani rezultat:**
- Korisnik ima pretplatu te može vidjeti račune + proraciju
- Na admin "subscriptions" stranici se vidi pretplata te zaradu od nje za svakog korisnika sa aktivnom pretplatom
- Pretplata upisana u bazu te na stripe dashboard
- (Opcionalno) korisnik više ne vidi pretplatu nakon što ju je zaustavio admin

---

---

### TS-05: Vaulting (payment methods) + customer management

**Preduvjeti:**
- Admin je prijavljen

**Koraci:**
1. Provjeriti "Users" stranicu; vidjeti REFUNDADMIN i USER korisnike
2. Odlogirati se kao admin, logirati se kao korisnik
3. Otići na "Payment methods" stranicu te kliknuti "Add new card" te upisati karticu. Ponoviti još jednom
4. Kliknuti "Set Default" drugu karticu
5. (Opcionalno) ponoviti TS-01, TS-02 ili TS-04

**Očekivani rezultat:**
- Kartica spremljena u bazu (prema propisima), kao default za korisnika na stranici te vidljiva korisniku pod "Payment methods"
- Kod pretplati i plaćanja više nije potreban upis kartice; koristi se default kartica

---

---

### TS-06: Webhooks

**Preduvjeti:**
- Admin je prijavljen

**Koraci:**
1. Otići na stranicu "Webhooks"
2. Pogledati neke od webhookova koji su došli povodom prijašnjih koraka; primjerice, nakon TS-05 vidi se "payment_method.attached"
3. Kliknuti "vidi payload" i vidjeti sve podatke koje stripe šalje za taj webhook

**Očekivani rezultat:**
- Admin može pratiti svu komunikaciju sa stripeom iz pristiglih webhookova
- Webhookovi iz prijašnjih koraka su upisati na ovoj stranici
- U terminalu gdje se vrti "npm run dev" se vide primljeni webhookovi

---

---

### TS-07: Disputes/chargebacks

**Preduvjeti:**
- Korisnik je prijavljen
- Radi jednostavnosti: ponoviti korak TS-05 sa karticom 4000 0000 0000 0259 (postaviti kao default po potrebi)

**Koraci:**
1. Kupiti nešto na "Buy&Pay" stranici; primjerice novine radi brzine izvođenja. Pogledati "My disputes" stranicu.
2. Odlogirati se. Logirati se kao admin.
3. Otići na "Refunds" stranicu. 
4. Vidi se dispute:
   1. Kliknuti "Close Dispute (lose it)" ili upisati "losing_evidence" te kliknuti "Submit dispute to bank" za gubitak disputea
   2. Upisati "winning_evidence" te kliknuti "Submit dispute to bank" za pobjedu disputea

**Očekivani rezultat:**
- Dispute se ažurira, admin vidi status: under review ili status: finalized (Won/Lost)
- Dispute zapisan u bazu, na admin "disputes" te korisnikovu "My disputes" stranicu
- Ažurira se balans admina (plaćen je dispute)

---

---

### TS-08: Payouts i Balance

**Preduvjeti:**
- Admin je prijavljen

**Koraci:**
1. Otići na "Balance & payouts" stranicu
2. Vidjeti balans (po valutama)
3. Ako se želi testirati "Payout", potrebno je odkomentirati redove 29-34 (+ liniju 14 ili 15) u lib/payout-balance.ts te posjetiti stranicu opet
4. Ako se želi testirati "Charge", potrebno je odkomentirati redove 12-27 u lib/payout-balance.ts te posjetiti stranicu opet
5. Provjeriti ažurirani balans računa admina

**Očekivani rezultat:**
- Balans računa admina se mijenja ovisno o Payoutu/Chargeu
- Balans računa korelira sa balansom na stripe dashboardu

---

---

### TS-09: Multi-currency/FX

**Preduvjeti:**
- Korisnik je prijavljen

**Koraci:**
1. Ponoviti korake TS-01, TS-02, TS-03 , TS-04 ili TS-07 uz odabir drugačije value od eura

**Očekivani rezultat:**
- Prikaz valute je drugačiji u bazi, na stripe dashboardu te na admin/user stranicama

---

---

### TS-10: Bonus task 1: Google/apple pay

**Preduvjeti:**
- Koristi se ngrok stranica (https) a ne localhost
- Koristiti google chrome
- Korisnik je prijavljen
- Korisnik nema spremljenu default karticu
- Za pravo testiranje (NEPROVJERENO) imati logiranu google i apple pay karticu

**Koraci:**
1. Obaviti TS-01 do trena kada se pojavi checkout prozor za upis kartice
2. Ako se ne vidi gumb za apple/google pay, pogledati web terminal (mac: command + option + J)
3. Provjeriti piše li poruka da opcija google/apple paya nije dozvoljena

**Očekivani rezultat:**
- Ako korisnik ima google ili apple pay karticu, UI bi trebao prikazati opciju plaćanja njima (NEPROVJERENO)
- Ako korisnik nema google ili apple pay karticu, u web terminalu bi se trebala vidjeti poruka da nije prošla provjera kartice

---

---

### TS-11: Bonus task 2: Marketplace
#### NAPOMENA: manual capture se traži za knjige ali ne i za novine (kao kod buy&pay)
**Preduvjeti:**
- Korisnik je prijavljen
- Radi jednostavnosti upisati default karticu po koraku TS-05

**Koraci:**
1. Obaviti tranzakciju kao u TS-01
2. (Opcionalno) ponoviti korake za TS-02, TS-03 ili TS-07
3. Odlogirati se te ulogirati kao admin
4. Otići na "Application fee earnings" i vidjeti stanje kupovina sa marketplacea

**Očekivani rezultat:**
- Sve funkcionalnost sa Marketplacea rade kao i za one sa Buy&Pay
- Adminu se ažurira zarada na balansu; zarade su dobro zbrojene

---

### TS-11: Bonus task 3: SEPA transfer

**Preduvjeti:**
- Izrađen je još jedan korisnik (Korisnik 2)
- Korisnik 1 je prijavljen
- Koristeći "npx prisma studio" provjereni su  i zapisani IBANi oba korisnika
- Provjereno početno stanje računa korisnika (na dashboardu) od 10 eura

**Koraci:**
1. Otići na dashboard stranicu; upisati IBAN korisnika 2 i vrijednost koja se želi poslati (npr. 200; to je 200 centi)
2. Kliknuti "Pošalji" te "Potvrdi"
3. Provjeriti da je prošla tranzakcija.
4. Odlogirati se kao Korisnik 1 te se logirati kao Korisnik 2; provjeriti da je ažurirano stanje računa
5. Odlogirati se te ulogirati kao admin; pod "Transfer fee earnings" vidjeti da je zarađeno 50 centi (ažurirano i u balansu)
6. Provjeriti "ISO 20022 PORUKE" za tranzakciju

**Očekivani rezultat:**
- Korisniku koji je slao novac je oduzeto 50 centi više; tranzakcije su zapisane i kod korisnika 1 i korisnika 2
- Admin vidi zaradu te može vidjeti poruke između simuliranih banaka (glume ih api/route) te između "nas i banke"

---