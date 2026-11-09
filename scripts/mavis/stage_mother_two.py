#!/usr/bin/env python3
"""Stage selected, hash-verified Mother Two files into a new quarantine directory.

No archive member is extracted in place. Secrets, links, unsafe paths, unsupported
formats and files without a matching inventory record are never staged.
Staged content is not searchable until rights, provenance and human review pass.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

from inventory_mother_two import _classification, _is_unsafe_path, _normalized_member_name

ALLOWED_CATEGORIES = {
    "books",
    "published_articles",
    "judicial_decisions",
    "advisory_opinions",
    "legal_sources",
    "research_and_datasets",
    "seo_and_growth",
    "project_documentation",
}
ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".md", ".txt", ".json", ".csv", ".xlsx",
    ".html", ".htm", ".rtf", ".odt", ".ods", ".pptx", ".epub", ".xml",
}
MAX_FILE_BYTES = 100 * 1024 * 1024
MAX_TOTAL_BYTES = 1024 * 1024 * 1024
MAX_FILES = 5000
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
SECRET_CONTENT_PATTERNS = (
    re.compile(rb"-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----"),
    re.compile(rb"(?i)\\b(?:password|passwd|client_secret|api[_-]?key|secret_access_key|access_token|refresh_token|service_role_key|database_url)\\s*[:=]\\s*['\\\"]?[A-Za-z0-9_./+=:-]{8,}"),
    re.compile(rb"\\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{20,})\\b"),
    re.compile(rb"\\beyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b"),
)


class StagingError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_inventory(inventory_path: str | Path) -> tuple[dict[str, Any], str]:
    path = Path(inventory_path).expanduser()
    if not path.is_file():
        raise FileNotFoundError(f"Inventory report not found: {path}")
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    try:
        report = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise StagingError("Inventory report is not valid UTF-8 JSON.") from error
    if report.get("schema_version") != "1.0.0" or not isinstance(report.get("files"), list):
        raise StagingError("Unsupported inventory report schema.")
    if not SHA256_PATTERN.fullmatch(str(report.get("archive", {}).get("sha256", ""))):
        raise StagingError("Inventory archive checksum is missing or invalid.")
    return report, digest


def select_inventory_entries(report: dict[str, Any]) -> dict[str, dict[str, Any]]:
    selected: dict[str, dict[str, Any]] = {}
    total_bytes = 0

    for entry in report["files"]:
        if not isinstance(entry, dict):
            continue
        path = entry.get("path")
        category = entry.get("classification")
        extension = str(entry.get("extension", "")).lower()
        digest = entry.get("sha256")
        size = entry.get("size_bytes")

        if (
            entry.get("kind") != "file"
            or entry.get("path_redacted") is True
            or category not in ALLOWED_CATEGORIES
            or extension not in ALLOWED_EXTENSIONS
            or entry.get("unsafe_path") is not False
            or entry.get("knowledge_stage") != "L0_downloaded"
            or entry.get("status") != "L0_downloaded_unreviewed"
            or not isinstance(path, str)
            or _is_unsafe_path(path)
            or _classification(path) != category
            or not isinstance(digest, str)
            or not SHA256_PATTERN.fullmatch(digest)
            or not isinstance(size, int)
            or size < 0
            or size > MAX_FILE_BYTES
        ):
            continue

        normalized = _normalized_member_name(path)
        if normalized in selected:
            raise StagingError("Duplicate archive path in inventory; staging stopped.")
        selected[normalized] = {
            "path": normalized,
            "classification": category,
            "extension": extension,
            "sha256": digest,
            "size_bytes": size,
        }
        total_bytes += size

        if len(selected) > MAX_FILES or total_bytes > MAX_TOTAL_BYTES:
            raise StagingError("Selected inventory exceeds the safe staging limits.")

    return selected


def contains_secret_content(stream: Any) -> bool:
    """Detect common credential markers without returning or persisting file content."""
    overlap = b""
    found = False
    while True:
        chunk = stream.read(1024 * 1024)
        if not chunk:
            break
        candidate = overlap + chunk
        if not found and any(pattern.search(candidate) for pattern in SECRET_CONTENT_PATTERNS):
            found = True
        overlap = candidate[-512:]
    return found


def scan_selected_content(
    archive_path: Path,
    selected: dict[str, dict[str, Any]],
) -> set[str]:
    """First pass: stream selected members and exclude content-level secret candidates."""
    flagged: set[str] = set()
    seen: set[str] = set()

    with tarfile.open(archive_path, mode="r|gz") as tar:
        for member in tar:
            member_path = _normalized_member_name(member.name)
            expected = selected.get(member_path)
            if expected is None:
                continue
            if member_path in seen:
                raise StagingError("Duplicate member path found in archive.")
            if not member.isfile() or _is_unsafe_path(member_path):
                raise StagingError("An eligible inventory path is not a safe regular file.")
            if int(member.size) != expected["size_bytes"]:
                raise StagingError("Archive member size changed after inventory.")
            source = tar.extractfile(member)
            if source is None:
                raise StagingError("Could not read an eligible archive member.")
            with source:
                if contains_secret_content(source):
                    flagged.add(member_path)
            seen.add(member_path)

    missing = sorted(set(selected) - seen)
    if missing:
        raise StagingError("Inventory contains eligible paths missing from the archive.")
    return flagged


def stage_archive(
    archive_path: str | Path,
    inventory_path: str | Path,
    output_parent: str | Path,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    archive = Path(archive_path).expanduser()
    if not archive.is_file():
        raise FileNotFoundError(f"Archive not found: {archive}")

    report, inventory_sha256 = load_inventory(inventory_path)
    expected_archive_hash = report["archive"]["sha256"]
    actual_archive_hash = sha256_file(archive)
    if actual_archive_hash != expected_archive_hash:
        raise StagingError("Archive SHA-256 does not match the inventory report.")

    selected = select_inventory_entries(report)
    if not selected:
        raise StagingError("No eligible files were found in the inventory.")

    secret_content_paths = scan_selected_content(archive, selected)
    safe_selected = {
        member_path: entry
        for member_path, entry in selected.items()
        if member_path not in secret_content_paths
    }

    if dry_run:
        return {
            "status": "dry_run_verified",
            "archive_sha256": actual_archive_hash,
            "inventory_sha256": inventory_sha256,
            "selected_files": len(selected),
            "selected_bytes": sum(item["size_bytes"] for item in selected.values()),
            "secret_content_candidates": len(secret_content_paths),
            "eligible_after_content_scan": len(safe_selected),
            "staged_files": 0,
            "extraction_performed": False,
        }

    parent = Path(output_parent).expanduser()
    parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if parent.is_symlink() or not parent.is_dir():
        raise StagingError("Staging output parent must be a real directory, not a symlink.")

    stage_root = Path(tempfile.mkdtemp(prefix="mother-two-stage-", dir=parent))
    try:
        try:
            stage_root.chmod(0o700)
        except OSError:
            pass

        staged: list[dict[str, Any]] = []
        seen: set[str] = set()
        total_written = 0

        with tarfile.open(archive, mode="r|gz") as tar:
            for member in tar:
                member_path = _normalized_member_name(member.name)
                expected = safe_selected.get(member_path)
                if expected is None:
                    continue
                if member_path in seen:
                    raise StagingError("Duplicate member path found in archive.")

                if not member.isfile() or _is_unsafe_path(member_path):
                    raise StagingError("An eligible inventory path is not a safe regular file.")
                if int(member.size) != expected["size_bytes"]:
                    raise StagingError("Archive member size changed after inventory.")

                relative = PurePosixPath(member_path)
                destination = stage_root.joinpath(*relative.parts)
                destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                resolved_parent = destination.parent.resolve()
                if stage_root.resolve() not in (resolved_parent, *resolved_parent.parents):
                    raise StagingError("Staging destination escaped its quarantine directory.")

                source = tar.extractfile(member)
                if source is None:
                    raise StagingError("Could not read an eligible archive member.")

                digest = hashlib.sha256()
                written = 0
                with source, destination.open("xb") as output:
                    while True:
                        chunk = source.read(1024 * 1024)
                        if not chunk:
                            break
                        written += len(chunk)
                        total_written += len(chunk)
                        if written > MAX_FILE_BYTES or total_written > MAX_TOTAL_BYTES:
                            raise StagingError("Staged data exceeded the configured safety limits.")
                        digest.update(chunk)
                        output.write(chunk)

                actual_digest = digest.hexdigest()
                if written != expected["size_bytes"] or actual_digest != expected["sha256"]:
                    raise StagingError("Archive member SHA-256 or size differs from inventory.")

                try:
                    destination.chmod(0o600)
                except OSError:
                    pass

                seen.add(member_path)
                staged.append({
                    "path": member_path,
                    "classification": expected["classification"],
                    "extension": expected["extension"],
                    "size_bytes": written,
                    "sha256": actual_digest,
                    "knowledge_stage": "L0_staged_unreviewed",
                    "access_class": "unclassified_pending_review",
                    "rights_status": "unknown_pending_review",
                    "indexing_allowed": False,
                    "retrieval_allowed": False,
                })

        missing = sorted(set(safe_selected) - seen)
        if missing:
            raise StagingError("Inventory contains eligible paths missing from the archive.")

        manifest = {
            "schema_version": "1.0.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_archive": {
                "filename": archive.name,
                "sha256": actual_archive_hash,
            },
            "source_inventory": {
                "filename": Path(inventory_path).name,
                "sha256": inventory_sha256,
            },
            "summary": {
                "selected_files": len(selected),
                "secret_content_candidates": len(secret_content_paths),
                "staged_files": len(staged),
                "staged_bytes": total_written,
                "human_review_required": True,
                "indexing_allowed": False,
                "retrieval_allowed": False,
            },
            "files": sorted(staged, key=lambda item: item["path"]),
            "policy": {
                "secrets_excluded": True,
                "unsafe_paths_and_links_excluded": True,
                "original_archive_modified": False,
                "extracted_in_place": False,
                "automatic_ingestion_performed": False,
                "copyright_and_access_rights_verified": False,
            },
        }

        manifest_path = stage_root / "staging-manifest.json"
        payload = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        with manifest_path.open("xb") as stream:
            stream.write(payload)
        try:
            manifest_path.chmod(0o600)
        except OSError:
            pass

        return {
            "status": "staging_created",
            "stage_path": str(stage_root),
            "manifest_sha256": hashlib.sha256(payload).hexdigest(),
            "archive_sha256": actual_archive_hash,
            "inventory_sha256": inventory_sha256,
            "selected_files": len(selected),
            "secret_content_candidates": len(secret_content_paths),
            "staged_files": len(staged),
            "staged_bytes": total_written,
            "indexing_allowed": False,
            "retrieval_allowed": False,
            "extraction_performed": True,
            "original_archive_modified": False,
        }
    except Exception:
        shutil.rmtree(stage_root, ignore_errors=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage hash-verified Mother Two files for human review")
    parser.add_argument("--archive", required=True, help="Original Mother Two .tar.gz archive")
    parser.add_argument("--inventory", required=True, help="Read-only inventory JSON generated by inventory_mother_two.py")
    parser.add_argument(
        "--output-parent",
        default=str(Path.home() / "downloads" / "vakilsite-mother-two-staging"),
        help="Separate parent directory for a new quarantine workspace",
    )
    parser.add_argument("--dry-run", action="store_true", help="Verify inputs and list eligible counts without staging")
    args = parser.parse_args()

    result = stage_archive(args.archive, args.inventory, args.output_parent, dry_run=args.dry_run)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
