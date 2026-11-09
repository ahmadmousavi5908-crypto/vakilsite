# Official Legal Source Access Audit — 2026-11-09

**Scope:** Verify current landing-page reachability and institutional source links only. This audit does not verify the text, completeness, current validity, finality, or legal effect of any individual law or judgment.

## National Judicial Decisions Portal

- URL: https://ara.jri.ac.ir/
- Result: homepage reachable and rendered on 2026-11-09.
- Visible features: search by title, text, date, decision number, issuing authority and ruling type; categories for trial courts, appellate courts, Administrative Justice Court and Supreme Court; links to unifying opinions and Legal Department advisory opinions.
- The page reported 43,701 published decisions and a latest publication date of 1405/07/29 at the time of inspection.
- Institutional indicators: contact email under the `jri.ac.ir` domain, a Research Institute of the Judiciary copyright notice, and links to the Judiciary, Official Gazette and related judiciary bodies.
- Registry state: `live_access_checked=true`, scoped to `landing_page_only`.
- Limit: no individual judgment was opened, hash-captured, checked for finality, appeal history, anonymization or legal effect. No legal record is promoted to primary-source verified by this check.

## Judiciary gateway

The judicial portal links to https://eadl.ir/ as the Judiciary website. Direct access to that gateway was not confirmed during this check. The registry URL is corrected from the earlier `eadil.com` spelling to `eadl.ir`, but `live_access_checked` remains false.

## Official Gazette and national laws portal

- The specific Official Gazette law URL remained inaccessible through the current research interface.
- The Qavanin law URL returned a transfer/interstitial page rather than the law text.
- These entries remain `live_access_checked=false`; no legal content is promoted or marked current.

## Registry and bundle controls

- Registry entries: 16.
- Record-level source references: 25.
- Source ID/class/host integrity mismatches: 0 after the previous registry-integrity change.
- Primary-source/current-validity verified legal records: 0.
- `source_review_date` remains unchanged because no legal text or amendment chain was reviewed.
- `registry_review_date` and bundle generation date are updated to 2026-11-09.
- Offline bundle version and service-worker cache version are incremented so clients do not keep a stale registry snapshot.

## Research references

- Official Judicial Decisions Portal: https://ara.jri.ac.ir/
- Its institutional footer links to the Judiciary at https://eadl.ir/ and the Official Gazette at https://www.rrk.ir/.
- Law Library of Congress archive record for the Iranian Official Gazette: https://www.loc.gov/item/lcwaN0017935/
- ecoi.net legal research guide identifying Qavanin/Dotic as state-run laws portals and warning that availability can be inconsistent: https://www.ecoi.net/en/countries/islamic-republic-of-iran/law-guide/

## Release boundary

Registry and access-metadata update only. No legal text changes, legal interpretation, automated scraping, client access, or production deployment.
