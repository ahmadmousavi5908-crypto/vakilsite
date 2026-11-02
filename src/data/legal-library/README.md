# Iranian Legal Research Library

A versioned, structured Persian-language legal research dataset for Iranian law.

## Version 1.2.1 scope

- **Registration and real estate:** priority area, including official and ordinary documents, title deeds, cadastral mapping, parcel identifiers, unregistered property, claim registration and property boundaries.
- **Cheques and commercial instruments:** included from the first version, including Sayad cheques, registration and transfer, non-payment certificates, promissory notes (سفته), required particulars and protest (واخواست).
- Civil law and civil procedure.
- General and specific criminal law, criminal procedure and criminology.

Current dataset: 45 terms, 16 law records and 22 article summaries.

## Repository layout

- `terms/terms.json`: canonical terms, search titles, aliases, definitions and legal references.
- `laws/laws.json`: law metadata, source links and review status.
- `articles/articles.json`: article-level summaries linked to their parent law.
- `taxonomy/categories.json`: stable subject categories and educational tags.
- `relations/legal-content-links.json`: links between terms and legal provisions.
- `schema/record-contracts.json`: JSON Schema contracts for core records.
- `validation/validate_library.py`: local structural, manifest and reference validator.
- `reports/source-review.json`: source discovery, current findings and review limitations.
- `MANIFEST.json`: version, file inventory and record counts; included in every release archive.

## Termux validation

Python 3 standard library only. No pip install, npm install, build step or website integration is required.

From the extracted repository directory, run:

```sh
python validation/validate_library.py
```

The validator checks JSON parsing, manifest presence and inventory, declared record counts, unique IDs, duplicate canonical terms and cross-references. It does **not** certify legal correctness, the current validity of legislation, completeness of amendments or the current operation of government systems.

## Downloadable release

Versioned release packages are intended to be generated from a Git tag or the manual GitHub Actions workflow. Each package contains MANIFEST.json, the manifest-listed data, README, changelog and validator, plus a SHA-256 checksum. The build process verifies the exact archive inventory, manifest consistency and ZIP integrity. Verify the checksum before extracting or using the package.

The package is data-only. Extract it into a separate directory, never into the Vakilsite website repository.

## Legal review policy

- `verified_primary_source`: checked against an official primary publication for the stated point.
- `secondary_source_only`: located in a secondary legal source or an official statement reproduced by a news outlet; primary-source confirmation remains necessary.
- `needs_legal_review`: legal or editorial review remains.
- `draft`: incomplete record.

A law's enactment date, publication date, effective date, amendments, transitional rules and implementing regulations are distinct facts. Do not infer one from another.

## Current important caveats

- The launch of the Article 10 claim-registration system has been described as phased. As of the latest reviewed report dated 1405/08/06, the first phase covers a defined group of cadastral deeds; it must not be generalized to every property or every property lawsuit.
- Article 1 consequences depend on the relevant official launch date, property-document date, type of legal act and statutory exceptions.
- Cheque analysis must distinguish the cheque-book issue date and the 1400/01/29 amendment to Article 21 bis. Do not infer criminal liability, deadlines or direct enforcement eligibility from a short glossary entry.
- Promissory-note protest deadlines and recourse consequences require checking the applicable Commercial Code provisions and the facts of the instrument.
- Articles 46–48, 70–72, 88, 154 and 156 of the Registration Law have been indexed as cautious summaries. Their scope depends on registration status, later amendments and special statutes.

## Source policy

Primary-source verification must prioritize the Official Gazette, the National Laws and Regulations System, and official judiciary, Registration Organization and Central Bank publications. Secondary repositories and news reports are used for discovery and cross-checking, not as a substitute for the official text.

The source-review report records the limitations and the sources used. No law in this release is certified as fully consolidated against every official amendment and implementing regulation.

## Safety and use

This repository is a research dataset, not legal advice and not a substitute for checking the current official text before advising a client, drafting a pleading or calculating a deadline. Similar concepts are kept separate unless their legal equivalence is established.

This versioned dataset is integrated into the Vakilsite legal research library under `src/data/legal-library/`. The website displays review-status labels and source cautions. Integration does not certify legal accuracy, replace primary-source verification, or turn summaries into official statutory text.
