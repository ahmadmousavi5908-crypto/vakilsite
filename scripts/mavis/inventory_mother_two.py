#!/usr/bin/env python3
"""Read-only inventory and hashing for the local Mother Two tar.gz archive.

This tool never extracts archive members, decrypts archives, or prints file contents.
Secret-like paths are quarantined and redacted from the generated inventory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tarfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any


DEFAULT_ARCHIVE = (
    Path.home()
    / "downloads"
    / "vakilsite-backups"
    / "VAKILSITE-MOTHER-TWO-UPDATED-20261106-220500-payload.tar.gz"
)
CHUNK_SIZE = 1024 * 1024

SECRET_PATH_PATTERN = re.compile(
    r"(^|/)(?:\.env(?:\.[^/]*)?|[^/]*(?:secret|credential|password|token)[^/]*|"
    r"service[-_ ]?account(?:s)?|id_rsa|id_ed25519)(?:/|$)|"
    r"(?:private[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token)",
    re.IGNORECASE,
)
SECRET_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"}
RESTRICTED_PERSONAL_PATH_PATTERN = re.compile(
    r"(^|/)(?:clients?|client[-_ ]?(?:files?|matters?|records?)|"
    r"confidential|personal[-_ ]?data|identity|medical|financial|"
    r"موکل(?:ان|ین)?|پرونده[-_ ]?موکل|اطلاعات[-_ ]?شخصی|محرمانه|هویتی|بانکی)(?=$|[/_ .-])",
    re.IGNORECASE,
)

CATEGORY_PATTERNS = [
    ("books", re.compile(r"(^|[/_\s.-])(?:books?|کتاب(?:‌ها|ها|خانه)?|کتب)(?=$|[/_\s.-])", re.IGNORECASE)),
    ("published_articles", re.compile(r"(^|[/_\s.-])(?:articles?|مقالات?|مقاله(?:‌ها|ها)?)(?=$|[/_\s.-])", re.IGNORECASE)),
    ("judicial_decisions", re.compile(r"(^|[/_\s.-])(?:decisions?|judgments?|precedents?|آرا|رأی|رای|وحدت[-_ ]?رویه)(?=$|[/_\s.-])", re.IGNORECASE)),
    ("advisory_opinions", re.compile(r"(^|[/_\s.-])(?:advisory|opinions?|مشورتی|نظریات?)(?=$|[/_\s.-])", re.IGNORECASE)),
    ("legal_sources", re.compile(r"(^|[/_\s.-])(?:laws?|statutes?|regulations?|legislation|قوانین|قانون|مقررات|روزنامه[-_ ]?رسمی)(?=$|[/_\s.-])", re.IGNORECASE)),
    ("research_and_datasets", re.compile(r"(^|[/_\s.-])(?:research|datasets?|corpus|پژوهش|داده(?:ها)?)(?=$|[/_\s.-])", re.IGNORECASE)),
    ("seo_and_growth", re.compile(r"(^|[/_\s.-])(?:seo|search[-_ ]?console|keywords?|سئو|کلیدواژه)(?=$|[/_\s.-])", re.IGNORECASE)),
    ("project_documentation", re.compile(r"(^|[/_\s.-])(?:docs?|documentation|مستندات)(?=$|[/_\s.-])", re.IGNORECASE)),
]

MANIFEST_PATTERN = re.compile(r"(manifest|sha256|checksum|inventory|catalog|فهرست|مانیفست)", re.IGNORECASE)


def _archive_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _normalized_member_name(name: str) -> str:
    return str(name or "").replace("\\", "/")


def _is_unsafe_path(name: str) -> bool:
    normalized = _normalized_member_name(name)
    path = PurePosixPath(normalized)
    return (
        not normalized
        or "\x00" in normalized
        or path.is_absolute()
        or ".." in path.parts
    )


def _classification(name: str) -> str:
    normalized = _normalized_member_name(name)
    if SECRET_PATH_PATTERN.search(normalized):
        return "restricted_secret"
    if RESTRICTED_PERSONAL_PATH_PATTERN.search(normalized):
        return "restricted_personal"
    suffix = PurePosixPath(normalized).suffix.lower()
    if suffix in SECRET_SUFFIXES:
        return "restricted_secret"
    for label, pattern in CATEGORY_PATTERNS:
        if pattern.search(normalized):
            return label
    return "unclassified"


def _consume_member(stream: Any, calculate_hash: bool) -> str | None:
    digest = hashlib.sha256() if calculate_hash else None
    while True:
        chunk = stream.read(CHUNK_SIZE)
        if not chunk:
            break
        if digest is not None:
            digest.update(chunk)
    return digest.hexdigest() if digest is not None else None


def inventory_archive(archive_path: str | Path) -> dict[str, Any]:
    """Inventory a gzip-compressed tar archive without extracting any member."""
    path = Path(archive_path).expanduser()
    if not path.is_file():
        raise FileNotFoundError(f"Archive not found: {path}")

    archive_hash = _archive_sha256(path)
    entries: list[dict[str, Any]] = []
    extension_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    duplicate_hashes: dict[str, list[str]] = defaultdict(list)
    manifest_candidates: list[str] = []
    counts = Counter()
    total_bytes = 0
    unsafe_path_count = 0
    unsafe_link_target_count = 0
    secret_candidate_count = 0
    confidential_candidate_count = 0
    unreadable_file_count = 0

    with tarfile.open(path, mode="r|gz") as archive:
        for member in archive:
            member_name = _normalized_member_name(member.name)
            unsafe_path = _is_unsafe_path(member_name)
            classification = _classification(member_name)

            if unsafe_path:
                unsafe_path_count += 1

            if member.isdir():
                counts["directories"] += 1
                continue

            if member.issym() or member.islnk():
                kind = "symlink" if member.issym() else "hardlink"
                counts[kind] += 1
                unsafe_target = _is_unsafe_path(member.linkname)
                if unsafe_target:
                    unsafe_link_target_count += 1
                if classification in {"restricted_secret", "restricted_personal"}:
                    if classification == "restricted_secret":
                        secret_candidate_count += 1
                    else:
                        confidential_candidate_count += 1
                    entries.append({
                        "path": None,
                        "path_redacted": True,
                        "kind": kind,
                        "classification": classification,
                        "status": "quarantined_secret_path",
                    })
                else:
                    entries.append({
                        "path": member_name,
                        "kind": kind,
                        "classification": classification,
                        "unsafe_path": unsafe_path,
                        "unsafe_link_target": unsafe_target,
                        "status": "quarantined_unsafe_link" if unsafe_target or unsafe_path else "discovered_unreviewed",
                    })
                continue

            if not member.isfile():
                counts["other"] += 1
                continue

            counts["files"] += 1
            total_bytes += max(0, int(member.size))
            suffix = PurePosixPath(member_name).suffix.lower() or "[no_extension]"
            extension_counts[suffix] += 1
            category_counts[classification] += 1

            is_restricted = classification in {"restricted_secret", "restricted_personal"}
            if classification == "restricted_secret":
                secret_candidate_count += 1
            elif classification == "restricted_personal":
                confidential_candidate_count += 1
            if MANIFEST_PATTERN.search(PurePosixPath(member_name).name) and not is_restricted and not unsafe_path:
                manifest_candidates.append(member_name)

            stream = archive.extractfile(member)
            if stream is None:
                unreadable_file_count += 1
                file_hash = None
            else:
                with stream:
                    file_hash = _consume_member(stream, calculate_hash=not is_restricted)

            if is_restricted:
                entries.append({
                    "path": None,
                    "path_redacted": True,
                    "kind": "file",
                    "size_bytes": None,
                    "sha256": None,
                    "extension": suffix,
                    "classification": classification,
                    "status": "quarantined_restricted_path",
                })
                continue

            status = "quarantined_unsafe_path" if unsafe_path else "L0_downloaded_unreviewed"
            entry = {
                "path": member_name,
                "kind": "file",
                "size_bytes": int(member.size),
                "sha256": file_hash,
                "extension": suffix,
                "classification": classification,
                "unsafe_path": unsafe_path,
                "knowledge_stage": "L0_downloaded",
                "status": status,
            }
            entries.append(entry)
            if file_hash and not unsafe_path:
                duplicate_hashes[file_hash].append(member_name)

        # Drain the compressed stream so gzip CRC/trailer errors are not skipped.
        reader = getattr(archive, "fileobj", None)
        if reader is not None:
            while reader.read(CHUNK_SIZE):
                pass

    duplicates = [
        {"sha256": digest, "paths": sorted(names), "count": len(names)}
        for digest, names in duplicate_hashes.items()
        if len(names) > 1
    ]
    duplicates.sort(key=lambda item: (-item["count"], item["sha256"]))

    return {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "archive": {
            "filename": path.name,
            "size_bytes": path.stat().st_size,
            "sha256": archive_hash,
            "integrity": "streamed_tar_gzip_read_completed",
            "extraction_performed": False,
            "decryption_performed": False,
        },
        "summary": {
            "files": counts["files"],
            "directories": counts["directories"],
            "symlinks": counts["symlink"],
            "hardlinks": counts["hardlink"],
            "other_members": counts["other"],
            "total_regular_file_bytes": total_bytes,
            "secret_candidate_count": secret_candidate_count,
            "confidential_candidate_count": confidential_candidate_count,
            "unsafe_path_count": unsafe_path_count,
            "unsafe_link_target_count": unsafe_link_target_count,
            "unreadable_file_count": unreadable_file_count,
            "duplicate_content_groups": len(duplicates),
        },
        "extension_counts": dict(sorted(extension_counts.items())),
        "classification_counts": dict(sorted(category_counts.items())),
        "manifest_candidates": sorted(manifest_candidates),
        "duplicate_groups": duplicates,
        "files": entries,
        "policy": {
            "archive_is_read_only": True,
            "members_are_never_extracted": True,
            "secret_paths_and_hashes_are_redacted": True,
            "confidential_client_paths_and_hashes_are_redacted": True,
            "secret_content_is_never_returned_or_indexed": True,
            "only_L2_human_reviewed_records_may_be_retrieved": True,
            "no_automatic_legal_verification": True,
        },
    }


def write_inventory(report: dict[str, Any], output_dir: str | Path) -> tuple[Path, str]:
    directory = Path(output_dir).expanduser()
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        directory.chmod(0o700)
    except OSError:
        pass

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_path = directory / ("mother-two-inventory-" + stamp + ".json")
    payload = (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8")

    with output_path.open("xb") as stream:
        stream.write(payload)
    try:
        output_path.chmod(0o600)
    except OSError:
        pass

    report_hash = hashlib.sha256(payload).hexdigest()
    checksum_path = output_path.with_suffix(output_path.suffix + ".sha256")
    with checksum_path.open("x", encoding="ascii") as stream:
        stream.write(report_hash + "  " + output_path.name + "\n")
    try:
        checksum_path.chmod(0o600)
    except OSError:
        pass
    return output_path, report_hash


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only Mother Two archive inventory")
    parser.add_argument("--archive", default=str(DEFAULT_ARCHIVE), help="Path to the original .tar.gz archive")
    parser.add_argument(
        "--output-dir",
        default=str(Path.home() / "downloads" / "vakilsite-mother-two-audit"),
        help="Separate directory for the private inventory report",
    )
    args = parser.parse_args()

    report = inventory_archive(args.archive)
    output_path, report_hash = write_inventory(report, args.output_dir)
    # Keep archive-derived metadata out of terminal logs; the private report is the audit artifact.
    print("Inventory created. Detailed metadata remains in the private report.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
