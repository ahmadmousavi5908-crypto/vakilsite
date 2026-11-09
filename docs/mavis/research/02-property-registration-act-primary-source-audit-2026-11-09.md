# Property Registration Act — Primary-Source Audit Note

**Research date:** 2026-11-09  
**Scope:** Law on Compulsory Official Registration of Transactions Concerning Immovable Property (قانون الزام به ثبت رسمی معاملات اموال غیرمنقول), Article 1 and Article 10, including the public announcement of the phased launch of the Article 10 system.  
**Status:** Discovery and source-audit note only. This is not a legal opinion, does not verify the corpus record, and must not be used as a client-facing deadline calculator.

## 1. Executive finding

The enacted law text is discoverable in a PDF mirror reproducing the Official Gazette issue metadata and printed Gazette URL. The exact original Gazette page/PDF was not independently retrieved from the official `rrk.ir` domain during this review.

The later public announcement is reproduced by several legal/news websites and identifies:
- announcement/order date: 1405/02/29;
- outgoing letter to the Official Gazette: 9000/7001/1000 dated 1405/02/29;
- cited Official Gazette issue: 23636, special issue 2197, dated 1405/02/31;
- phased launch date: 1405/03/01 for the property group specified in clause 1.

These reproductions are useful discovery evidence, but they are not a substitute for the original Official Gazette issue or a verified official issuing-system copy. Therefore the law and announcement remain **not primary-source verified** in the legal corpus.

## 2. Enacted law publication metadata

The PDF mirror identifies the instrument as:
- Title: قانون الزام به ثبت رسمی معاملات اموال غیرمنقول
- Official Gazette issue: 23068
- Special issue: 1833
- Publication date: 1403/03/17
- Instrument/letter number shown: 11261
- Parliament approval: 1401/09/06
- Expediency Council approval: 1403/02/26
- Printed Gazette source URL inside the PDF: `https://www.rrk.ir/Laws/PrintLaw.aspx?Code=29068`

The mirror is hosted outside the Official Gazette domain:
https://avaye-edalat.com/wp-content/uploads/2024/07/قانون-الزام-به-ثبت-رسمی-اموال-غیر-منقول.pdf

**Evidence status:** secondary-hosted reproduction of an official publication; original official page/PDF not retrieved; no local source bytes or SHA-256 captured; no named legal reviewer; no validity flag may be changed.

## 3. Relevant statutory text and timing distinctions

### Article 1

The reproduced law text makes the Article 1 registration consequences effective **one year after the official launch** of the Article 10 system. It also contains a separate rule in تبصره ۴ ماده ۱ for immovable property for which a title deed is issued after the law becomes effective: the provision applies from the date of issuance of that title deed.

### Article 10

The reproduced Article 10 concerns claims and supporting documents for specified immovable-property rights that arose before the Article 10 system was launched and lack an official deed. It sets:
- a two-year period from system launch to enter the claim and supporting documents; and
- a further two-year period from claim entry for the relevant formalization/legal action and recording its evidence.

The exact application of these provisions depends on the property group, the date/type of title deed, the claim/right, any subsequent official announcement, and the complete current law and regulations. A generic date must not be applied to every property.

### Phased public announcement

The secondary reproductions state the following:
1. For properties receiving an official cadastral title deed from 1396/01/01 through 1405/02/31, the announced launch date is 1405/03/01.
2. For properties receiving a cadastral title deed from 1405/03/01 until the later announcement under clause 3, launch is the date that cadastral title deed is issued.
3. The date for other properties is to be announced later by the First Deputy of the Judiciary in the Official Gazette, following a proposal by the Head of the Registration Organization.
4. For publication of notices under تبصره ۳ ماده ۱۰, the launch date is 1405/03/01.

**Do not collapse these groups into one universal commencement date.** In particular, the two-year Article 10 claim-entry period and the one-year Article 1 effect are distinct periods and should not be conflated.

## 4. Source discrepancy and unresolved checks

One legal website reports that a Majlis Research Center legal database displays the announcement approval date as 1404/02/29, while the reproduced announcement and correspondence show 1405/02/29. This discrepancy is unresolved. Do not silently normalize the date or use the inconsistent metadata as proof.

The following must be obtained before primary-source verification:
1. Official Gazette issue 23068 original page/PDF or official record for the enacted law.
2. Official Gazette issue 23636, special issue 2197, original page/PDF or an independently verifiable official record for the launch announcement.
3. Official Judiciary/Registration Organization source for the scope and operation of the phased system, plus any later announcement under clause 3.
4. All subsequent amendments, implementing regulations, binding interpretations, and relevant judicial decisions through the actual review date.
5. A named Iranian legal reviewer, review timestamp, captured source bytes, retrieval timestamp, and SHA-256 hashes.

## 5. Corpus handling

Target queue record: `law_compulsory_real_estate_registration`.

Keep its status as `secondary_source_only` until the exact primary instrument and its amendment/repeal chain have been retrieved and reviewed. Do not set:
- `primary_document_retrieved=true`;
- `amendment_chain_reviewed=true`;
- any approval/publication/effective date as verified;
- `live_access_checked=true`;
- a content hash or reviewer identity.

This note is a research work product, not a parallel legal knowledge base. The canonical legal corpus and its existing source registry remain the only knowledge store.

## 6. Sources consulted

### Primary-publication reproduction (not direct official-domain retrieval)
- PDF mirror reproducing Official Gazette issue 23068 and the printed `rrk.ir` URL:  
  https://avaye-edalat.com/wp-content/uploads/2024/07/قانون-الزام-به-ثبت-رسمی-اموال-غیر-منقول.pdf

### Secondary reproductions / discovery sources
- Announcement reproduction with issue metadata and text:  
  https://vakileshomal.ir/قانون-الزام-به-ثبت-رسمی-معاملات/اعلان-راه-اندازی-رسمی-سامانه-ساغر/
- Ekhtabar reproduction of the announcement:  
  https://www.ekhtebar.ir/اعلان-عمومی-راه-اندازی-رسمی-سامانه-سام/
- Hoghogh.ai reproduction of Article 10 implementing regulation (discovery only):  
  https://hoghogh.ai/circulars/c-02eaba80
- IranCodify law metadata page (discovery only):  
  https://www.irancodify.com/b/قانون_الزام_به_ثبت_رسمی_معاملات_اموال_غیرمنقول_مصوب_1401-09-06

## 7. Next actions

- Retrieve the two exact Official Gazette issues from an official source and preserve immutable copies.
- Resolve the 1404/1405 metadata discrepancy against the original issue and issuing correspondence.
- Build a property-group decision table only after confirming the full current law and later announcements.
- Have counsel review the legal interpretation before creating any public-facing explainer or deadline logic.
