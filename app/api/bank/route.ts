import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser" //za XML format check

const BANK_BIC = process.env.TRUSTED_BANK_BIC ?? 'MOCKHRZZXXX';
const parser = new XMLParser({ ignoreAttributes: false})

export async function POST(req: NextRequest) { //prima pain.001, daje nazad pain.002; simulira banku koja sama obraduje sve

    const pain001Xml = await req.text(); //primi pain.001
    console.log('RECEIVED:', pain001Xml.substring(0, 200));


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
      <GrpSts>ACCP</GrpSts>
    </OrgnlGrpInfAndSts>
  </CstmrPmtStsRpt>
</Document>`

// Document xmlns: envelope (tip poruke); CstmrPmtStsRpt: customer payment status report
// GrpHdr: bankin messageId, ACK acknowledgement + timestamp kada ga je banka napravila
// OrgnlMsgId je Id pain.002 koji smo slali
//GrpSts ACCP kaze da potvrdujemo narudzbu; moze biti i RJCT (rejected) i PDNG (pending)
//pain 001 001 09 --> pain (payment initiation) 001 (payment initiation; message number) 001 (variant 1) 09 (version 9, zadnja revizija)
//pain 002 001 10 --> pain (payment initiation) 002 (message number: payment status report) 001 (variant 1) 10 (version 10, zadnja revizija)
return new NextResponse(pain002Xml, {
    headers: { 'Content-Type': 'application/xml' }
})

}