import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser" //za XML format check

const BANK2_BIC = process.env.BANK2_BIC ?? 'MOCKHRYYXXX';
const parser = new XMLParser({ ignoreAttributes: false})

export async function POST(req: NextRequest) { //prima pacs.008, daje nazad pacs.002; simulira banku primatelja

    const pacs008Xml = await req.text(); //primi pacs.008
    //console.log('RECEIVED:', pacs008Xml.substring(0, 200));


    //Check 1: content type / encoding
    const contentType = req.headers.get('Content-Type') ?? '';
    if (!contentType.includes('xml')) {
        return new NextResponse('Krivi content type: ocekuje se application/xml', { status: 400});
    }

    if (!pacs008Xml.includes('encoding="UTF-8"')) {
        return new NextResponse('Krivi encoding: trazi se UTF-8', { status: 400 });
    }

    //Check 2: XML format
    if (!pacs008Xml.trim().startsWith('<?xml') || !pacs008Xml.includes('</Document>')) {
        return new NextResponse('Krivo formirani XML', { status: 400 });
    }
    const parsed = parser.parse(pacs008Xml);


    //Check 3: XSD shema: pacs.008 root je FIToFICstmrCdtTrf, tranzakcija je u CdtTrfTxInf
    //osnovni folder je FIToFICstmrCdtTrf; u njemu su GrpHdr i cdtTrfTxInf (info te tranzakcije)
    const grpHdr = parsed?.Document?.FIToFICstmrCdtTrf?.GrpHdr;
    const cdtTrfTxInf = parsed?.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf;
    if (!grpHdr?.MsgId || !grpHdr?.CreDtTm || !cdtTrfTxInf?.PmtId?.EndToEndId || !cdtTrfTxInf?.IntrBkSttlmAmt) {
        return new NextResponse('Kriva pacs.008 shema: fale nuzna polja', { status: 422 });
    }

    const msgId = grpHdr.MsgId;
    const endToEndId = cdtTrfTxInf.PmtId.EndToEndId;
    const uetr = cdtTrfTxInf.PmtId.UETR; //unique end to end transaction reference (uuid v4)
    const instgAgtBic = cdtTrfTxInf.DbtrAgt?.FinInstnId?.BICFI ?? 'UNKNOWN';

    const pacs002Xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10">
  <FIToFIPmtStsRpt>
    <GrpHdr>
      <MsgId>ACK-${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
    </GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>${msgId}</OrgnlMsgId>
      <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>
    </OrgnlGrpInfAndSts>
    <TxInfAndSts>
      <OrgnlEndToEndId>${endToEndId}</OrgnlEndToEndId>
      <OrgnlUETR>${uetr}</OrgnlUETR>
      <TxSts>ACCP</TxSts>
      <InstgAgt>
        <FinInstnId><BICFI>${instgAgtBic}</BICFI></FinInstnId>
      </InstgAgt>
      <InstdAgt>
        <FinInstnId><BICFI>${BANK2_BIC}</BICFI></FinInstnId>
      </InstdAgt>
    </TxInfAndSts>
  </FIToFIPmtStsRpt>
</Document>`

//pacs.008.001.08: pacs (clearing settlement) 008 (FI to Fi customer credit transfer) 001 (variant 1, standard sub type) 08 (verzija 8)
return new NextResponse(pacs002Xml, {
    headers: { 'Content-Type': 'application/xml' }
})

}