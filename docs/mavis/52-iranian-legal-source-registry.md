# Iranian Legal Source Registry for MAVIS

**Discovery snapshot:** 2026-11-08  
**Important:** URLs were identified through legal research guides and public search. Live availability, current API access, reuse permissions and automated-ingestion permissions were not verified in this implementation pass.

## Source hierarchy

### Tier 1 — Official publication and official legal portal
1. **Official Gazette of the Islamic Republic of Iran** — https://www.rrk.ir/  
   Use for official publication details, issue/date identification and the final published instrument. Preserve issue number, publication date and the original publication reference.
2. **National Laws and Regulations Portal** — https://qavanin.ir/  
   Use for discovery and cross-checking laws, regulations and consolidation metadata. Where there is any conflict or uncertainty, check the Official Gazette and the competent issuing authority.
3. **Islamic Parliament Research Center** — https://rc.majlis.ir/fa/law  
   Use for legislative research and legislative materials. Do not treat a research note or draft as the final published law.

### Tier 2 — Official issuing/implementing authorities
For specialist subject areas, MAVIS should identify the official issuing authority and its publication channel before ingestion. Examples include the Judiciary, the State Organization for Registration of Deeds and Properties, the Central Bank and the relevant ministries or regulators. Their circulars and implementation notices are authoritative only within their competence and must be linked to their enabling instrument. Exact endpoints, APIs and current availability must be confirmed before any connector is enabled.

### Tier 3 — Secondary legal databases and discovery
- Lawlex — https://lawlex.ir/
- Law-ir — https://law-ir.ir/
- Adlio — https://adlio.ir/

Use these for search discovery, related citations and cross-checking. A secondary database must never silently upgrade a record to primary-source verified.

### Tier 4 — Research guides and selected translations
- Iran Data Portal — https://irandataportal.syr.edu/laws-and-regulations/
- Library of Congress, Guide to Law Online: Iran — https://wwws.loc.gov/law/help/guide/nations/iran.php
- ecoi.net, Iran law guide — https://www.ecoi.net/en/countries/islamic-republic-of-iran/law-guide/

These are research aids, selected collections or translations, not substitutes for the official Persian publication.

## Source-class separation
MAVIS must store and display these as distinct source classes:
- Statutes and codes
- Amendments, additions, repeals and corrigenda
- Executive regulations, bylaws and circulars
- Unifying opinions of the Supreme Court
- Published court judgments (including appeal decisions)
- Administrative Justice Court General Board decisions
- Advisory opinions
- Judicial نشست‌های قضایی and educational materials
- Academic commentary and research
- Official implementation notices and service guidance

A published judgment is not automatically a binding precedent. Advisory opinions, نشست‌های قضایی, academic commentary and administrative guidance must not be labeled as statutes or unifying opinions.

## Mandatory provenance fields
Every source and legal record should retain:
- Stable source and record IDs
- Issuing/publishing authority and competence
- Source class and instrument type
- Official URL and exact document/issue identifier
- Approval, notification, publication and effective dates as separate fields
- Amendment, repeal, replacement and transitional links
- Retrieval timestamp, observed availability and source snapshot checksum
- Primary/secondary classification and review status
- License/terms and permitted reuse method
- Reviewer, review timestamp and unresolved conflicts

## Ingestion policy
1. Prefer documented APIs, official feeds, downloadable open data and expressly permitted access.
2. Do not bypass authentication, CAPTCHA, rate limits or technical restrictions; do not scrape at scale without checking terms and permissions.
3. Keep immutable source snapshots and content hashes where lawful.
4. Never infer that a statute is current merely because a third-party database labels it current.
5. If the official source is unavailable, retain the record as secondary-source-only and display the limitation.
6. Preserve the difference between enacted, published, effective, amended, suspended, repealed and superseded.
7. Do not reproduce copyrighted commentary or books in the offline bundle without a lawful reuse basis.

## Evidence behind this registry
The Official Gazette is identified as Iran's official gazette by the Library of Congress archive. Research guides identify qavanin.ir as the state-run Laws and Regulations Portal and point to the Majlis research center as a legislative resource. Lawlex advertises linked statutes, judgments, advisory opinions and unifying opinions, but remains a secondary database. Iran Data Portal explicitly describes its legal documents as selected translations and collections.

This registry is a discovery map, not proof that each endpoint is currently reachable or that each page provides a supported API.
