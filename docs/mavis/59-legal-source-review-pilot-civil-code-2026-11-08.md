# Legal Source Review Pilot — Civil Code — 2026-11-09

**Record:** `law_civil_code`  
**Related records:** `art_civil_code_1284`, `term_official_document`, `term_ordinary_document`  
**Outcome:** Discovery lead recorded; primary-source verification NOT completed. No knowledge record is promoted to verified.

## 1. Why this pilot was selected

The existing offline corpus includes the Civil Code and article-level concepts around documentary evidence. This is a foundational, high-frequency area and a useful test of the evidence workflow before expanding to less common records.

## 2. Findings

1. The existing corpus record identifies the Civil Code as `secondary_source_only`, cites Adlio, and explicitly states that the code is not fully consolidated.
2. Lawlex's Civil Code index identifies the statute as adopted on 1307/02/18 and exposes a link labelled as the Research Center of the Islamic Consultative Assembly's official text: `https://rc.majlis.ir/fa/law/show/97937`.
3. Direct retrieval of that official endpoint timed out during this review. The general official Gazette homepage `https://www.rrk.ir/` also timed out, while `https://qavanin.ir/` returned only a redirect page in the retrieval environment.
4. Adlio and other legal publishers reproduce the text of Articles 1284–1293, but these are secondary copies. They can help identify the target provisions, not prove the current official text or amendment history.
5. The available public secondary pages are not sufficient to establish the full current validity of the Civil Code, all amendments, repeals, constitutional review effects, or transitional rules.

## 3. Access recheck — 2026-11-09

The direct Qavanin law-tree and print-text URLs discovered through the secondary index did not return a retrievable instrument in this research environment. The official Gazette URL likewise did not provide a document response. This is an access limitation, not evidence that the statute or portal is unavailable generally. No official text, amendment chain, or legal validity was verified in this recheck.

## 4. Evidence status

| Evidence item | Result |
|---|---|
| Exact official primary document retrieved | No |
| Official publication number/date captured | No |
| Official amendment/repeal chain captured | No |
| Current validity reviewed | No |
| SHA-256 of official document | Not available |
| Named legal reviewer sign-off | Pending |
| Corpus verification status | Remains `secondary_source_only` |

## 5. Required next action

- Retry the official Majlis Research Center link through a human browser or obtain an official Gazette scan/record.
- Capture the exact original publication and every relevant amending instrument, with publication identifiers and effective dates.
- Compare the text of the target articles with the official source; separately inspect amendments, deletions, Constitutional Guardian Council opinions, and later special statutes that may affect application.
- Hash the retrieved files and attach immutable provenance metadata to the existing law/article records.
- Obtain named lawyer review before any record is marked verified or made eligible for authoritative answer retrieval.

## 6. Safety decision

Do not copy the secondary text into the corpus as verified law. Do not change `exact_primary_document_verified` or `current_validity_verified` to true. Keep the record excluded from authoritative retrieval until the required evidence exists.

## Sources checked

- Lawlex index and its displayed official-source discovery link: https://lawlex.ir/laws/madani
- Official Majlis Research Center target (timed out during this review): https://rc.majlis.ir/fa/law/show/97937
- Official National Laws and Regulations portal (redirect only in this review environment): https://qavanin.ir/
- Official Gazette homepage (timed out during this review): https://www.rrk.ir/
- Secondary text used only for discovery/cross-check: https://adlio.ir/law/قانون-مدنی-مصوب-1307-02-18/
- Library of Congress guide to Iranian law (research starting point, not a validity certificate): https://guides.loc.gov/law-iran
