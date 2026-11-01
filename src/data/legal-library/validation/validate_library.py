#!/usr/bin/env python3
"""Validate manifest, JSON structure and cross-references using Python's standard library."""
import json
import re
import sys
import unicodedata
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []
JSON_FILES = sorted(ROOT.rglob("*.json"))


def add_error(message):
    ERRORS.append(message)


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        add_error(f"{path.relative_to(ROOT)}: {exc}")
        return {}


def normalize(value):
    value = unicodedata.normalize("NFKC", value).replace("ي", "ی").replace("ك", "ک")
    return re.sub(r"[\u200c\s]+", " ", value).strip()


data = {p.relative_to(ROOT).as_posix(): read_json(p) for p in JSON_FILES}
manifest_path = ROOT / "MANIFEST.json"
manifest = data.get("MANIFEST.json", {})

if not manifest_path.is_file():
    add_error("Missing required MANIFEST.json")
if not isinstance(manifest, dict):
    add_error("MANIFEST.json must contain a JSON object")
    manifest = {}

version = manifest.get("version")
if not isinstance(version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", version):
    add_error("MANIFEST.json version must use MAJOR.MINOR.PATCH format")

manifest_files = manifest.get("files")
if not isinstance(manifest_files, list) or not manifest_files:
    add_error("MANIFEST.json files must be a non-empty array")
    manifest_files = []
else:
    if any(not isinstance(name, str) for name in manifest_files):
        add_error("Every MANIFEST.json files entry must be a string")
    if len(manifest_files) != len(set(item for item in manifest_files if isinstance(item, str))):
        add_error("MANIFEST.json contains duplicate file paths")
    for name in manifest_files:
        if not isinstance(name, str):
            continue
        relative = PurePosixPath(name)
        if relative.is_absolute() or ".." in relative.parts or not relative.parts:
            add_error(f"Unsafe manifest path: {name}")
            continue
        if not (ROOT / name).is_file():
            add_error(f"Manifest-listed file is missing: {name}")

required_manifest_files = {
    "taxonomy/categories.json",
    "terms/terms.json",
    "laws/laws.json",
    "articles/articles.json",
    "relations/legal-content-links.json",
    "schema/record-contracts.json",
    "validation/validate_library.py",
    "reports/source-review.json",
}
missing_required = sorted(required_manifest_files - set(manifest_files))
if missing_required:
    add_error(f"Manifest inventory omits required files: {', '.join(missing_required)}")

terms = data.get("terms/terms.json", {}).get("records", [])
laws = data.get("laws/laws.json", {}).get("records", [])
articles = data.get("articles/articles.json", {}).get("records", [])
if not isinstance(terms, list):
    add_error("terms/terms.json records must be an array")
    terms = []
if not isinstance(laws, list):
    add_error("laws/laws.json records must be an array")
    laws = []
if not isinstance(articles, list):
    add_error("articles/articles.json records must be an array")
    articles = []

ids = {}
for group in (terms, laws, articles):
    for record in group:
        if not isinstance(record, dict):
            add_error("A record is not a JSON object")
            continue
        key = record.get("id")
        if not key:
            add_error("A record has no id")
        elif key in ids:
            add_error(f"Duplicate id: {key}")
        else:
            ids[key] = record

canonical = {}
law_ids = {item.get("id") for item in laws if isinstance(item, dict)}
article_ids = {item.get("id") for item in articles if isinstance(item, dict)}
for term in terms:
    if not isinstance(term, dict):
        continue
    key = normalize(term.get("canonical", ""))
    if not key:
        add_error(f"Empty canonical term: {term.get('id')}")
    elif key in canonical:
        add_error(f"Duplicate canonical term: {term.get('id')} and {canonical[key]}")
    else:
        canonical[key] = term.get("id")
    if term.get("review_status") not in {"verified_primary_source", "secondary_source_only", "needs_legal_review", "draft"}:
        add_error(f"Invalid review status: {term.get('id')}")
    for ref in term.get("law_refs", []):
        if ref not in law_ids:
            add_error(f"Unknown law reference {ref} in {term.get('id')}")
    for ref in term.get("article_refs", []):
        if ref not in article_ids:
            add_error(f"Unknown article reference {ref} in {term.get('id')}")

for article in articles:
    if isinstance(article, dict) and article.get("law_id") not in law_ids:
        add_error(f"Unknown law for article {article.get('id')}")

relations = data.get("relations/legal-content-links.json", {}).get("relations", [])
if not isinstance(relations, list):
    add_error("relations/legal-content-links.json relations must be an array")
    relations = []
for relation in relations:
    if not isinstance(relation, dict):
        add_error("A relation is not a JSON object")
        continue
    for endpoint in ("from", "to"):
        if relation.get(endpoint) not in ids:
            add_error(f"Unknown relation endpoint: {relation.get(endpoint)}")

counts = manifest.get("counts", {})
if not isinstance(counts, dict):
    add_error("MANIFEST.json counts must be an object")
    counts = {}
actual_counts = {"terms": len(terms), "laws": len(laws), "articles": len(articles)}
for key, actual in actual_counts.items():
    declared = counts.get(key)
    if not isinstance(declared, int) or isinstance(declared, bool):
        add_error(f"MANIFEST.json counts.{key} must be an integer")
    elif declared != actual:
        add_error(f"Manifest count mismatch for {key}: declared {declared}, actual {actual}")

report = {
    "json_files": len(JSON_FILES),
    "manifest_version": version,
    "manifest_files": len(manifest_files),
    "terms": len(terms),
    "laws": len(laws),
    "articles": len(articles),
    "errors": ERRORS,
}
print(json.dumps(report, ensure_ascii=False, indent=2))
if ERRORS:
    sys.exit(1)
print("VALIDATION PASSED")
