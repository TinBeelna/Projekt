import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser" //za XML format check
import { prisma } from "@/app/lib/prisma";

const BANK_BIC = process.env.TRUSTED_BANK_BIC ?? 'MOCKHRZZXXX';
const parser = new XMLParser({ ignoreAttributes: false})

const BANK2_URL = process.env.BANK2_URL ?? 'http://localhost:3000/api/bank_2';
const BANK2_BIC = process.env.BANK2_BIC ?? 'MOCKHRYYXXX';

export async function POST(req: NextRequest) { //prima pain.001, daje nazad pain.002; simulira banku koja sama obraduje sve

    const pain001Xml = await req.text(); //primi pain.001
    //console.log('RECEIVED:', pain001Xml.substring(0, 200));


    //Check 1: content type / encoding
    const contentType = req.headers.get('Content-Type') ?? '';
    if (!contentType.includes('xml')) {
        return new NextResponse('Krivi content type: ocekuje se application/xml', { status: 400});
    }

    if (!pain001Xml.includes('encoding="UTF-8"')) {
        return new NextResponse('Krivi encoding: trazi se UTF-8', { status: 400 });
    }

    //Check 2: XML format
    if (!pain001Xml.trim().startsWith('<?xml') || !pain001Xml.includes('</Document>')) {
        return new NextResponse('Krivo formirani XML', { status: 400 });
    }
    const parsed = parser.parse(pain001Xml);


    //Check 3: XSD shema (validiranje naspram specificne sheme npr pain.001.001.03; ovdje gledamo imamo li nuzna polja)
    const grpHdr = parsed?.Document?.CstmrCdtTrfInitn?.GrpHdr; //group header
    const pmtInf = parsed?.Document?.CstmrCdtTrfInitn?.PmtInf; //payment info
    if (!grpHdr?.MsgId || !grpHdr?.CreDtTm || !pmtInf) { //grphdr i pmtinf su osnovna dva dijela pain001 poruke-->u njima je sve drugo, necemo dublje provjeravati
    return new NextResponse('Kriva pain.001 shema: fale nuzna polja', { status: 422 });
    }

    const msgId = grpHdr.MsgId;

    //izvlacenje i stvaranje informacija za izradu pacs.008
    const cdtTrfTxInf = pmtInf.CdtTrfTxInf; //per transaction info
    const dbtrNm = pmtInf.Dbtr?.Nm ?? 'NEPOZNATO'; // debtor ime
    const dbtrIBAN = pmtInf.DbtrAcct?.Id?.IBAN ?? ''; //debtor iban
    const cdtrNm = cdtTrfTxInf?.Cdtr?.Nm ?? 'NEPOZNATO'; //creditor ime
    const cdtrIBAN = cdtTrfTxInf?.CdtrAcct?.Id?.IBAN ?? ''; //creditor iban
    const endToEndId = cdtTrfTxInf?.PmtId?.EndToEndId ?? `E2E-${msgId}`; //originalni pain.001 id
    const instdAmt = cdtTrfTxInf?.Amt?.InstdAmt; 
    const amount = typeof instdAmt === 'object' ? instdAmt['#text'] : instdAmt ?? '0.00'; //izvuci ccy/amt (Currency/amount) iz teksta
    const uetr = crypto.randomUUID(); //UUID v4 (unique end to end transaction reference); isti do kraja 
    const pacs008MsgId = `PACS008-${msgId}`;
    const settlementDate = new Date().toISOString().split('T')[0];

    const pacs008Xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${pacs008MsgId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Prtry>SEPA</Prtry>
        </ClrSys>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="EUR">${amount}</IntrBkSttlmAmt>
      <IntrBkSttlmDt>${settlementDate}</IntrBkSttlmDt>
      <Dbtr>
        <Nm>${dbtrNm}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${dbtrIBAN}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId><BICFI>${BANK_BIC}</BICFI></FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId><BICFI>${BANK2_BIC}</BICFI></FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${cdtrNm}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>${cdtrIBAN}</IBAN></Id>
      </CdtrAcct>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;


const bank2Response = await fetch(BANK2_URL, { //Salji banci 2 pacs.008
  method: 'POST',
  headers: { 'Content-Type': 'application/xml' },
  body: pacs008Xml,
});

const pacs002Xml = await bank2Response.text(); //odgovor banke 2 je pacs.002

//Checkovi

//XML format check
if (!pacs002Xml.trim().startsWith('<?xml') || !pacs002Xml.includes('</Document>')) {
    return new NextResponse('pacs.002: krivo formirani XML', { status: 502 });
}

const pacs002Parsed = parser.parse(pacs002Xml);
const pacs002Root = pacs002Parsed?.Document?.FIToFIPmtStsRpt;
const pacs002GrpHdr = pacs002Root?.GrpHdr;
const pacs002OrgnlGrp = pacs002Root?.OrgnlGrpInfAndSts;
const pacs002TxInf = pacs002Root?.TxInfAndSts;

//Check za 3 glavna bloka ("foldera") strukture
if (!pacs002GrpHdr?.MsgId || !pacs002OrgnlGrp?.OrgnlMsgId || !pacs002TxInf?.TxSts) {
    return new NextResponse('pacs.002: fale nuzna polja', { status: 502 });
}

//id check (obraduje li se originalna tranzakcija)
if (pacs002OrgnlGrp.OrgnlMsgId !== pacs008MsgId) {
    return new NextResponse('pacs.002: OrgnlMsgId se ne podudara s poslanim pacs.008', { status: 502 });
}

const grpStatus = pacs002TxInf.TxSts === 'ACCP' ? 'ACCP' : 'RJCT';

const transferId = Number(req.headers.get('X-Transfer-Id'));
if (transferId) {
    await prisma.transfer.update({
      where: {
        id: transferId,
      },
      data: {
        pacs008Xml, pacs002Xml
      }
    });
}


    const pain002Xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.10">
  <CstmrPmtStsRpt>
    <GrpHdr>
  <MsgId>ACK-${msgId}</MsgId>
  <CreDtTm>${new Date().toISOString()}</CreDtTm>
  <InstgAgt>
    <FinInstnId>
      <BICFI>${BANK_BIC}</BICFI>
    </FinInstnId>
  </InstgAgt>
</GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>${msgId}</OrgnlMsgId>
      <OrgnlMsgNmId>pain.001.001.09</OrgnlMsgNmId>
      <GrpSts>${grpStatus}</GrpSts>
    </OrgnlGrpInfAndSts>
  </CstmrPmtStsRpt>
</Document>`

// Document xmlns: envelope (tip poruke); CstmrPmtStsRpt: customer payment status report
// GrpHdr: bankin messageId, ACK acknowledgement + timestamp kada ga je banka napravila
// OrgnlMsgId je Id pain.002 koji smo slali
//GrpSts ACCP kaze da potvrdujemo narudzbu; moze biti i RJCT (rejected) i PDNG (pending)
//pain 001 001 09 --> pain (payment initiation) 001 (message identifier; credit transfer initiation) 001 (variant 1; sub-type) 09 (version 9, zadnja revizija sheme)
//pain 002 001 10 --> pain (payment initiation) 002 (message number: payment status report) 001 (variant 1; standardni sub-type) 10 (version 10, zadnja revizija sheme )
return new NextResponse(pain002Xml, {
    headers: { 'Content-Type': 'application/xml' }
})

}