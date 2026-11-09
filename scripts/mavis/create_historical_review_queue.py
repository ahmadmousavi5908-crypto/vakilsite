#!/usr/bin/env python3
"""Create a metadata-only human review queue from a verified quarantine manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

from inventory_mother_two import _is_unsafe_path
from stage_mother_two import sha256_file


class ReviewQueueError(RuntimeError):
    pass


def create_review_queue(staging_manifest_path: str | Path, output_path: str | Path | None = None) -> dict[str, Any]:
    manifest_path = Path(staging_manifest_path).expanduser()
    if not manifest_path.is_file() or manifest_path.is_symlink():
        raise ReviewQueueError("A regular staging manifest file is required.")

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ReviewQueueError("Staging manifest is not valid UTF-8 JSON.") from error

    if manifest.get("schema_version") != "1.0.0" or not isinstance(manifest.get("files"), list):
        raise ReviewQueueError("Unsupported staging manifest schema.")
    if manifest.get("summary", {}).get("indexing_allowed") is not False or \
       manifest.get("summary", {}).get("retrieval_allowed") is not False:
        raise ReviewQueueError("Staging manifest must keep indexing and retrieval disabled.")
    if manifest.get("policy", {}).get("automatic_ingestion_performed") is not False:
        raise ReviewQueueError("Automatic ingestion is not allowed.")

    root = manifest_path.parent.resolve()
    staged_files = manifest["files"]
    if not staged_files:
        raise ReviewQueueError("Staging manifest has no files to review.")

    digest_counts: dict[str, int] = {}
    validated: list[dict[str, Any]] = []

    for item in staged_files:
        if not isinstance(item, dict):
            raise ReviewQueueError("Staging manifest contains an invalid file record.")

        relative_path = item.get("path")
        digest = item.get("sha256")
        size = item.get("size_bytes")
        if not isinstance(relative_path, str) or _is_unsafe_path(relative_path):
            raise ReviewQueueError("Staging manifest contains an unsafe file path.")
        if not isinstance(digest, str) or len(digest) != 64 or any(ch not in "0123456789abcdef" for ch in digest):
            raise ReviewQueueError("Staging manifest contains an invalid file checksum.")
        if not isinstance(size, int) or size < 0:
            raise ReviewQueueError("Staging manifest contains an invalid file size.")

        relative = PurePosixPath(relative_path)
        file_path = root.joinpath(*relative.parts)
        if file_path.is_symlink() or not file_path.is_file():
            raise ReviewQueueError("A staged file is missing or is not a regular file.")
        resolved = file_path.resolve()
        if root not in (resolved, *resolved.parents):
            raise ReviewQueueError("A staged file escaped its quarantine directory.")
        if file_path.stat().st_size != size or sha256_file(file_path) != digest:
            raise ReviewQueueError("A staged file no longer matches its verified checksum.")

        source_id = "hist_" + hashlib.sha256((relative_path + ":" + digest).encode("utf-8")).hexdigest()[:24]
        digest_counts[digest] = digest_counts.get(digest, 0) + 1
        validated.append({
            "source_id": source_id,
            "path": relative_path,
            "sha256": digest,
            "size_bytes": size,
            "extension": item.get("extension"),
            "category": item.get("classification"),
            "duplicate_content_pending_review": False,
        })

    for record in validated:
        record["duplicate_content_pending_review"] = digest_counts[record["sha256"]] > 1

    queue = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_staging_manifest": {
            "filename": manifest_path.name,
            "sha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        },
        "summary": {
            "records": len(validated),
            "duplicate_content_records": sum(1 for item in validated if item["duplicate_content_pending_review"]),
            "pending_human_review": len(validated),
            "indexing_allowed": False,
            "retrieval_allowed": False,
            "automatic_registration_performed": False,
        },
        "records": [
            {
                **record,
                "review_status": "pending_human_review",
                "metadata": {
                    "title": None,
                    "author": None,
                    "publisher": None,
                    "publication_date": None,
                    "jurisdiction": None,
                    "language": None,
                    "source_class": None,
                    "source_url": None,
                    "exact_citation": None,
                },
                "rights": {
                    "status": "unknown",
                    "evidence": None,
                },
                "access": {
                    "class": "unclassified_pending_review",
                },
                "review": {
                    "reviewed_by": None,
                    "reviewed_at": None,
                    "notes": None,
                    "human_approved_searchable": False,
                    "primary_source_verified": False,
                    "validity_status": "unknown",
                    "last_verified_at": None,
                },
                "eligibility": {
                    "public_legal_chat": False,
                    "lawyer_copilot": False,
                    "growth": False,
                },
                "indexing_allowed": False,
                "retrieval_allowed": False,
            }
            for record in sorted(validated, key=lambda item: item["path"])
        ],
        "policy": {
            "metadata_only": True,
            "file_contents_included": False,
            "rights_review_required": True,
            "human_review_required": True,
            "no_automatic_indexing": True,
            "no_automatic_retrieval": True,
        },
    }

    destination = Path(output_path).expanduser() if output_path else manifest_path.parent / "historical-review-queue.json"
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if destination.exists() or destination.is_symlink():
        raise ReviewQueueError("Review queue output already exists; refusing to overwrite.")
    payload = (json.dumps(queue, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    with destination.open("xb") as stream:
        stream.write(payload)
    try:
        destination.chmod(0o600)
    except OSError:
        pass

    return {
        "status": "review_queue_created",
        "queue_path": str(destination),
        "queue_sha256": hashlib.sha256(payload).hexdigest(),
        "records": len(validated),
        "duplicate_content_records": queue["summary"]["duplicate_content_records"],
        "indexing_allowed": False,
        "retrieval_allowed": False,
        "automatic_registration_performed": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a metadata-only human review queue for staged historical sources")
    parser.add_argument("--staging-manifest", required=True)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()
    print(json.dumps(create_review_queue(args.staging_manifest, args.output), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
