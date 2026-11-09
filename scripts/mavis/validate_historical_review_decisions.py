#!/usr/bin/env python3
"""Validate human decisions and emit a non-ingested historical registry candidate."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import date, datetime
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlparse

from inventory_mother_two import _is_unsafe_path
from stage_mother_two import sha256_file

PRIMARY_CLASSES = {
    "statute",
    "amendment",
    "repeal",
    "executive_regulation",
    "unifying_opinion",
    "published_judgment",
    "administrative_court_decision",
    "advisory_opinion",
    "judicial_session",
    "official_guidance",
}
ALLOWED_CLASSES = PRIMARY_CLASSES | {
    "academic_commentary",
    "legal_term",
    "educational_summary",
    "research_note",
    "book",
    "published_article",
    "dataset",
    "seo_document",
    "project_documentation",
}
ALLOWED_ACCESS = {"public", "internal", "confidential", "restricted_secret"}
ALLOWED_RIGHTS = {"public_domain", "permission_confirmed", "licensed", "internal_only", "unknown", "restricted"}
SEARCHABLE_RIGHTS = {"public_domain", "permission_confirmed", "licensed", "internal_only"}
TRUSTED_PRIMARY_HOSTS = {"rrk.ir", "qavanin.ir", "rc.majlis.ir"}
SOURCE_ID_PATTERN = re.compile(r"^hist_[a-f0-9]{24}$")


class ReviewDecisionError(RuntimeError):
    pass


def valid_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def valid_datetime(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.tzinfo is not None and parsed.utcoffset() is not None
    except ValueError:
        return False


def safe_https_url(value: Any, *, primary: bool = False) -> bool:
    if not isinstance(value, str) or len(value) > 2048:
        return False
    try:
        parsed = urlparse(value)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.port:
            return False
        host = parsed.hostname.lower().rstrip(".")
        if primary and not any(host == item or host.endswith("." + item) for item in TRUSTED_PRIMARY_HOSTS):
            return False
        return True
    except ValueError:
        return False


def clean_optional_text(value: Any, maximum: int = 2000) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ReviewDecisionError("Metadata fields must be strings or null.")
    clean = value.normalize("NFC").strip() if hasattr(value, "normalize") else value.strip()
    if len(clean) > maximum:
        raise ReviewDecisionError("A metadata field exceeds its maximum length.")
    return clean or None


def load_json(path_value: str | Path, label: str) -> tuple[dict[str, Any], str, Path]:
    path = Path(path_value).expanduser()
    if not path.is_file() or path.is_symlink():
        raise ReviewDecisionError(f"{label} must be a regular file.")
    raw = path.read_bytes()
    try:
        payload = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ReviewDecisionError(f"{label} is not valid UTF-8 JSON.") from error
    if not isinstance(payload, dict):
        raise ReviewDecisionError(f"{label} must contain a JSON object.")
    return payload, hashlib.sha256(raw).hexdigest(), path


def verify_queue_files(queue: dict[str, Any], queue_path: Path) -> None:
    root = queue_path.parent.resolve()
    records = queue.get("records")
    if not isinstance(records, list) or not records:
        raise ReviewDecisionError("Review queue contains no records.")

    seen_ids: set[str] = set()
    for record in records:
        if not isinstance(record, dict):
            raise ReviewDecisionError("Review queue contains an invalid record.")
        source_id = record.get("source_id")
        relative_path = record.get("path")
        digest = record.get("sha256")
        size = record.get("size_bytes")
        if not isinstance(source_id, str) or not SOURCE_ID_PATTERN.fullmatch(source_id) or source_id in seen_ids:
            raise ReviewDecisionError("Review queue contains an invalid or duplicate source ID.")
        seen_ids.add(source_id)
        if not isinstance(relative_path, str) or _is_unsafe_path(relative_path):
            raise ReviewDecisionError("Review queue contains an unsafe path.")
        if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest):
            raise ReviewDecisionError("Review queue contains an invalid checksum.")
        if not isinstance(size, int) or size < 0:
            raise ReviewDecisionError("Review queue contains an invalid file size.")

        file_path = root.joinpath(*PurePosixPath(relative_path).parts)
        if file_path.is_symlink() or not file_path.is_file():
            raise ReviewDecisionError("A quarantined file is missing or is not a regular file.")
        resolved = file_path.resolve()
        if root not in (resolved, *resolved.parents):
            raise ReviewDecisionError("A quarantined file escaped its staging directory.")
        if file_path.stat().st_size != size or sha256_file(file_path) != digest:
            raise ReviewDecisionError("A quarantined file changed after review queue creation.")


def normalize_approved_decision(decision: dict[str, Any], queue_record: dict[str, Any]) -> dict[str, Any]:
    source_id = queue_record["source_id"]
    source_class = decision.get("source_class")
    access_class = decision.get("access_class")
    rights_status = decision.get("rights_status")
    title = clean_optional_text(decision.get("title"), 240)
    reviewer = clean_optional_text(decision.get("reviewed_by"), 120)
    review_notes = clean_optional_text(decision.get("review_notes"), 2000)
    reviewed_at = decision.get("reviewed_at")

    if source_class not in ALLOWED_CLASSES:
        raise ReviewDecisionError(f"{source_id}: unknown source_class.")
    if access_class not in ALLOWED_ACCESS:
        raise ReviewDecisionError(f"{source_id}: unknown access_class.")
    if rights_status not in ALLOWED_RIGHTS:
        raise ReviewDecisionError(f"{source_id}: unknown rights_status.")
    if access_class in {"confidential", "restricted_secret"}:
        raise ReviewDecisionError(f"{source_id}: confidential/secret sources cannot enter the global registry.")
    if rights_status == "restricted":
        raise ReviewDecisionError(f"{source_id}: restricted-rights sources cannot be registered.")
    if rights_status == "internal_only" and access_class != "internal":
        raise ReviewDecisionError(f"{source_id}: internal_only rights require internal access.")
    if not title or not reviewer or not review_notes or len(review_notes) < 10 or not valid_datetime(reviewed_at):
        raise ReviewDecisionError(f"{source_id}: title, reviewer, review notes and timezone-aware review date are required.")

    rights_evidence = clean_optional_text(decision.get("rights_evidence"), 1200)
    if rights_status in SEARCHABLE_RIGHTS and not rights_evidence:
        raise ReviewDecisionError(f"{source_id}: explicit rights evidence is required.")

    source_url = clean_optional_text(decision.get("source_url"), 2048)
    exact_citation = clean_optional_text(decision.get("exact_citation"), 1200)
    publication_date = decision.get("publication_date")
    if publication_date is not None and not valid_date(publication_date):
        raise ReviewDecisionError(f"{source_id}: publication_date must be YYYY-MM-DD.")

    human_approved = decision.get("human_approved_searchable")
    primary_verified = decision.get("primary_source_verified")
    if not isinstance(human_approved, bool) or not isinstance(primary_verified, bool):
        raise ReviewDecisionError(f"{source_id}: explicit searchable and primary-verification booleans are required.")

    validity_status = decision.get("validity_status", "unknown")
    if validity_status not in {"in_force", "partially_repealed", "repealed", "unknown"}:
        raise ReviewDecisionError(f"{source_id}: invalid validity_status.")

    last_verified_at = decision.get("last_verified_at")
    if last_verified_at is not None and not valid_datetime(last_verified_at):
        raise ReviewDecisionError(f"{source_id}: last_verified_at must include a timezone.")

    primary_verified_eligible = (
        source_class in PRIMARY_CLASSES
        and access_class == "public"
        and rights_status in {"public_domain", "permission_confirmed", "licensed"}
        and safe_https_url(source_url, primary=True)
        and bool(exact_citation)
        and valid_date(publication_date)
        and decision.get("jurisdiction") == "IR"
        and validity_status == "in_force"
        and valid_datetime(last_verified_at)
        and human_approved
    )
    if primary_verified and not primary_verified_eligible:
        raise ReviewDecisionError(f"{source_id}: primary verification requires official source, exact citation, dates, validity and public rights.")
    if primary_verified and not source_class in PRIMARY_CLASSES:
        raise ReviewDecisionError(f"{source_id}: secondary material cannot be primary-source verified.")

    rights_allow_search = rights_status in SEARCHABLE_RIGHTS
    access_allow_search = access_class in {"public", "internal"}
    search_eligible = human_approved and rights_allow_search and access_allow_search

    return {
        "source_id": source_id,
        "path": queue_record["path"],
        "sha256": queue_record["sha256"],
        "size_bytes": queue_record["size_bytes"],
        "title": title,
        "source_class": source_class,
        "access_class": access_class,
        "rights_status": rights_status,
        "rights_evidence": rights_evidence,
        "author": clean_optional_text(decision.get("author"), 240),
        "publisher": clean_optional_text(decision.get("publisher"), 240),
        "publication_date": publication_date,
        "jurisdiction": clean_optional_text(decision.get("jurisdiction"), 32),
        "language": clean_optional_text(decision.get("language"), 32),
        "source_url": source_url,
        "exact_citation": exact_citation,
        "review_status": "verified_primary_source" if primary_verified else (
            "secondary_source_only" if source_class not in PRIMARY_CLASSES else "needs_legal_review"
        ),
        "reviewed_by": reviewer,
        "reviewed_at": reviewed_at,
        "review_notes": review_notes,
        "validity_status": validity_status,
        "last_verified_at": last_verified_at,
        "primary_source_verified": primary_verified,
        "knowledge_stage": "L2_approved_searchable" if search_eligible else "L1_registered_not_searchable",
        "indexing_allowed": search_eligible,
        "retrieval_allowed": search_eligible,
        "eligibility": {
            "public_legal_chat": bool(primary_verified and primary_verified_eligible),
            "lawyer_copilot": bool(search_eligible),
            "growth": bool(search_eligible and access_class == "public" and source_class in {"seo_document", "published_article", "project_documentation"}),
        },
    }


def validate_review_decisions(queue_path_value: str | Path, decisions_path_value: str | Path, output_path_value: str | Path) -> dict[str, Any]:
    queue, queue_hash, queue_path = load_json(queue_path_value, "Review queue")
    decisions_payload, decisions_hash, _ = load_json(decisions_path_value, "Review decisions")
    if queue.get("schema_version") != "1.0.0" or not isinstance(queue.get("records"), list):
        raise ReviewDecisionError("Unsupported review queue schema.")
    if decisions_payload.get("schema_version") != "1.0.0" or not isinstance(decisions_payload.get("decisions"), list):
        raise ReviewDecisionError("Unsupported review decisions schema.")

    verify_queue_files(queue, queue_path)
    queue_by_id = {item["source_id"]: item for item in queue["records"]}
    if len(queue_by_id) != len(queue["records"]):
        raise ReviewDecisionError("Review queue contains duplicate source IDs.")

    decisions_by_id: dict[str, dict[str, Any]] = {}
    for decision in decisions_payload["decisions"]:
        if not isinstance(decision, dict):
            raise ReviewDecisionError("Review decisions contain an invalid item.")
        source_id = decision.get("source_id")
        if source_id not in queue_by_id or source_id in decisions_by_id:
            raise ReviewDecisionError("Review decision references an unknown or duplicate source ID.")
        decisions_by_id[source_id] = decision

    missing = sorted(set(queue_by_id) - set(decisions_by_id))
    if missing:
        raise ReviewDecisionError("Every staged source requires an explicit approve, reject or hold decision.")

    records: list[dict[str, Any]] = []
    rejected = 0
    held = 0
    for source_id, queue_record in queue_by_id.items():
        decision = decisions_by_id[source_id]
        action = decision.get("decision")
        if action == "reject":
            rejected += 1
            records.append({
                "source_id": source_id,
                "path": queue_record["path"],
                "sha256": queue_record["sha256"],
                "decision": "rejected",
                "knowledge_stage": "excluded",
                "indexing_allowed": False,
                "retrieval_allowed": False,
                "eligibility": {"public_legal_chat": False, "lawyer_copilot": False, "growth": False},
            })
        elif action == "hold_for_ocr":
            held += 1
            records.append({
                "source_id": source_id,
                "path": queue_record["path"],
                "sha256": queue_record["sha256"],
                "decision": "hold_for_ocr",
                "knowledge_stage": "L0_needs_ocr_or_review",
                "indexing_allowed": False,
                "retrieval_allowed": False,
                "eligibility": {"public_legal_chat": False, "lawyer_copilot": False, "growth": False},
            })
        elif action == "approve_for_registration":
            records.append(normalize_approved_decision(decision, queue_record))
        else:
            raise ReviewDecisionError(f"{source_id}: decision must be approve_for_registration, reject or hold_for_ocr.")

    summary = {
        "total": len(records),
        "registered": sum(1 for item in records if item.get("knowledge_stage") in {"L1_registered_not_searchable", "L2_approved_searchable"}),
        "searchable": sum(1 for item in records if item.get("knowledge_stage") == "L2_approved_searchable"),
        "public_legal_chat_eligible": sum(1 for item in records if item.get("eligibility", {}).get("public_legal_chat")),
        "lawyer_copilot_eligible": sum(1 for item in records if item.get("eligibility", {}).get("lawyer_copilot")),
        "growth_eligible": sum(1 for item in records if item.get("eligibility", {}).get("growth")),
        "rejected": rejected,
        "held_for_ocr": held,
    }

    candidate = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now().astimezone().isoformat(),
        "source_review_queue": {"filename": queue_path.name, "sha256": queue_hash},
        "source_review_decisions": {"filename": Path(decisions_path_value).name, "sha256": decisions_hash},
        "summary": summary,
        "records": records,
        "policy": {
            "candidate_only": True,
            "database_ingestion_performed": False,
            "search_index_updated": False,
            "public_assistant_activated": False,
            "rights_and_access_review_required": True,
        },
    }

    destination = Path(output_path_value).expanduser()
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if destination.exists() or destination.is_symlink():
        raise ReviewDecisionError("Registry candidate output already exists; refusing to overwrite.")
    payload = (json.dumps(candidate, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    with destination.open("xb") as stream:
        stream.write(payload)
    try:
        destination.chmod(0o600)
    except OSError:
        pass

    return {
        "status": "registry_candidate_created",
        "candidate_path": str(destination),
        "candidate_sha256": hashlib.sha256(payload).hexdigest(),
        "summary": summary,
        "database_ingestion_performed": False,
        "search_index_updated": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate human review decisions and create a non-ingested registry candidate")
    parser.add_argument("--queue", required=True, help="historical-review-queue.json")
    parser.add_argument("--decisions", required=True, help="Owner-reviewed decisions JSON")
    parser.add_argument("--output", required=True, help="New candidate JSON output path")
    args = parser.parse_args()
    print(json.dumps(validate_review_decisions(args.queue, args.decisions, args.output), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
