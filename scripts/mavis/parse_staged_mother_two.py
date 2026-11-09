#!/usr/bin/env python3
"""Parse hash-verified Mother Two quarantine files into page-cited review artifacts.

This worker never indexes, retrieves, publishes, or sends document content to an AI
provider. Its output remains restricted and requires a separate human review gate.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import importlib.metadata
import json
import os
import re
import shutil
import stat
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".pptx",
    ".xlsx",
    ".csv",
    ".html",
    ".htm",
    ".epub",
    ".md",
    ".qmd",
    ".rmd",
    ".txt",
    ".odt",
    ".ods",
    ".odp",
    ".xml",
}
OCR_LANGUAGES = ["fas", "eng"]
DOCUMENT_TIMEOUT_SECONDS = 120
MAX_FILE_BYTES = 100 * 1024 * 1024
MAX_TOTAL_BYTES = 1024 * 1024 * 1024
MAX_FILES = 5000
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


class ParsingError(RuntimeError):
    """Raised when a staged source fails an integrity or policy check."""


def installed_docling_version() -> str:
    for distribution in ("docling", "docling-slim"):
        try:
            return importlib.metadata.version(distribution)
        except importlib.metadata.PackageNotFoundError:
            continue
    raise importlib.metadata.PackageNotFoundError("Neither docling nor docling-slim is installed.")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_relative_path(value: Any) -> PurePosixPath:
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        raise ParsingError("Staging manifest contains an invalid relative path.")

    if value.startswith("/") or any(part in {"", ".", ".."} for part in value.split("/")):
        raise ParsingError("Staging manifest contains an unsafe relative path.")

    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or path.as_posix() != value:
        raise ParsingError("Staging manifest contains an unsafe relative path.")
    return path


def load_staging_manifest(stage_root: str | Path) -> tuple[Path, dict[str, Any], str]:
    supplied_root = Path(stage_root).expanduser()
    if supplied_root.is_symlink():
        raise ParsingError("Quarantine root must not be a symlink.")

    root = supplied_root.resolve(strict=True)
    if not root.is_dir():
        raise ParsingError("Quarantine root is not a directory.")

    manifest_path = root / "staging-manifest.json"
    if manifest_path.is_symlink() or not manifest_path.is_file():
        raise ParsingError("A regular staging-manifest.json is required.")

    raw = manifest_path.read_bytes()
    try:
        manifest = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ParsingError("Staging manifest is not valid UTF-8 JSON.") from error

    if not isinstance(manifest, dict) or manifest.get("schema_version") != "1.0.0":
        raise ParsingError("Unsupported staging manifest schema.")

    summary = manifest.get("summary")
    policy = manifest.get("policy")
    entries = manifest.get("files")
    source_archive = manifest.get("source_archive")
    source_inventory = manifest.get("source_inventory")
    required_policy = {
        "secrets_excluded": True,
        "unsafe_paths_and_links_excluded": True,
        "original_archive_modified": False,
        "extracted_in_place": False,
        "automatic_ingestion_performed": False,
        "copyright_and_access_rights_verified": False,
    }

    if (
        not isinstance(summary, dict)
        or summary.get("indexing_allowed") is not False
        or summary.get("retrieval_allowed") is not False
        or summary.get("human_review_required") is not True
        or not isinstance(policy, dict)
        or any(policy.get(key) is not expected for key, expected in required_policy.items())
        or not isinstance(source_archive, dict)
        or not SHA256_PATTERN.fullmatch(str(source_archive.get("sha256", "")))
        or not isinstance(source_inventory, dict)
        or not SHA256_PATTERN.fullmatch(str(source_inventory.get("sha256", "")))
        or not isinstance(entries, list)
    ):
        raise ParsingError("Staging manifest does not satisfy the quarantine policy.")

    return root, manifest, hashlib.sha256(raw).hexdigest()


def validate_staged_entry(root: Path, entry: dict[str, Any]) -> tuple[Path, PurePosixPath]:
    relative = _safe_relative_path(entry.get("path"))
    extension = relative.suffix.lower()

    if (
        entry.get("classification") not in ALLOWED_CATEGORIES
        or entry.get("knowledge_stage") != "L0_staged_unreviewed"
        or entry.get("access_class") != "unclassified_pending_review"
        or entry.get("rights_status") != "unknown_pending_review"
        or entry.get("indexing_allowed") is not False
        or entry.get("retrieval_allowed") is not False
        or entry.get("extension") != extension
        or not SHA256_PATTERN.fullmatch(str(entry.get("sha256", "")))
        or not isinstance(entry.get("size_bytes"), int)
        or isinstance(entry.get("size_bytes"), bool)
        or entry["size_bytes"] < 0
        or entry["size_bytes"] > MAX_FILE_BYTES
    ):
        raise ParsingError("A staged entry violates the L0 review-only contract.")

    candidate = root.joinpath(*relative.parts)
    if candidate.is_symlink():
        raise ParsingError("A staged source is a symlink.")

    try:
        resolved = candidate.resolve(strict=True)
    except OSError as error:
        raise ParsingError("A staged source is missing or unreadable.") from error

    if not resolved.is_relative_to(root):
        raise ParsingError("A staged source escaped its quarantine root.")

    file_stat = resolved.lstat()
    if not stat.S_ISREG(file_stat.st_mode) or file_stat.st_nlink != 1:
        raise ParsingError("A staged source must be a standalone regular file.")

    if file_stat.st_size != entry["size_bytes"]:
        raise ParsingError("A staged source size differs from its manifest.")

    if sha256_file(resolved) != entry["sha256"]:
        raise ParsingError("A staged source SHA-256 differs from its manifest.")

    return resolved, relative


def _json_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if hasattr(value, "dict"):
        return value.dict()
    return str(value)


def _page_anchors(document: Any, page_no: int | None) -> list[dict[str, Any]]:
    anchors: list[dict[str, Any]] = []
    iterator = document.iterate_items(
        page_no=page_no,
        traverse_pictures=True,
    )

    for item, _level in iterator:
        for provenance in getattr(item, "prov", []):
            provenance_page = getattr(provenance, "page_no", None)
            if page_no is not None and provenance_page != page_no:
                continue

            anchors.append(
                {
                    "item_ref": getattr(item, "self_ref", None),
                    "label": str(getattr(getattr(item, "label", None), "value", getattr(item, "label", ""))),
                    "page_no": provenance_page,
                    "bbox": _json_value(getattr(provenance, "bbox", None)),
                    "charspan": _json_value(getattr(provenance, "charspan", None)),
                }
            )

    return anchors


def _document_pages(document: Any) -> list[dict[str, Any]]:
    page_map = getattr(document, "pages", None)
    page_numbers = sorted(page_map.keys(), key=lambda value: int(value)) if isinstance(page_map, dict) else []

    if not page_numbers:
        markdown = document.export_to_markdown(traverse_pictures=True)
        return [
            {
                "page_no": None,
                "segment_type": "unpaginated_document",
                "markdown": str(markdown or ""),
                "anchors": _page_anchors(document, None),
            }
        ]

    pages = []
    for page_no in page_numbers:
        markdown = document.export_to_markdown(
            page_no=page_no,
            traverse_pictures=True,
        )
        pages.append(
            {
                "page_no": page_no,
                "segment_type": "page",
                "markdown": str(markdown or ""),
                "anchors": _page_anchors(document, page_no),
            }
        )
    return pages


def create_converter(*, ocr: bool, artifacts_dir: str | Path | None = None) -> Any:
    """Create a local-only Docling converter; OCR requires pre-fetched model artifacts."""
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"

    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import NativePdfPipelineOptions

    from docling.document_converter import DocumentConverter, PdfFormatOption

    if not ocr:
        pipeline_options = NativePdfPipelineOptions(
            document_timeout=DOCUMENT_TIMEOUT_SECONDS,
            enable_remote_services=False,
            allow_external_plugins=False,
        )
    else:
        if artifacts_dir is None:
            raise ParsingError("OCR requires a pre-fetched Docling artifacts directory.")

        artifacts_path = Path(artifacts_dir).expanduser()
        if artifacts_path.is_symlink() or not artifacts_path.is_dir():
            raise ParsingError("OCR artifacts directory is missing or unsafe.")

        tesseract = shutil.which("tesseract")
        if tesseract is None:
            raise ParsingError("Tesseract CLI is not installed.")

        try:
            languages = subprocess.run(
                [tesseract, "--list-langs"],
                check=True,
                capture_output=True,
                text=True,
                timeout=15,
                env=os.environ.copy(),
            ).stdout.splitlines()
        except (OSError, subprocess.SubprocessError) as error:
            raise ParsingError("Tesseract language availability could not be verified.") from error

        installed_languages = {line.strip() for line in languages if line.strip() and not line.startswith("List of")}
        if not set(OCR_LANGUAGES).issubset(installed_languages):
            raise ParsingError("Tesseract must have both fas and eng traineddata installed.")

        from docling.datamodel.pipeline_options import PdfPipelineOptions, TesseractCliOcrOptions

        pipeline_options = PdfPipelineOptions(
            do_ocr=True,
            ocr_options=TesseractCliOcrOptions(
                lang=OCR_LANGUAGES,
                replace_broken_text_layer=True,
            ),
            document_timeout=DOCUMENT_TIMEOUT_SECONDS,
            enable_remote_services=False,
            allow_external_plugins=False,
            artifacts_path=str(artifacts_path.resolve()),
        )

    return DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )


def _write_private_json(path: Path, payload: dict[str, Any]) -> str:
    raw = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    with path.open("xb") as stream:
        stream.write(raw)
    try:
        path.chmod(0o600)
    except OSError:
        pass
    return hashlib.sha256(raw).hexdigest()


def parse_staged_documents(
    stage_root: str | Path,
    output_dir: str | Path,
    *,
    expected_manifest_sha256: str,
    converter: Any | None = None,
    docling_version: str | None = None,
    ocr: bool = False,
    artifacts_dir: str | Path | None = None,
) -> dict[str, Any]:
    root, staging_manifest, staging_manifest_sha256 = load_staging_manifest(stage_root)
    if (
        not isinstance(expected_manifest_sha256, str)
        or not SHA256_PATTERN.fullmatch(expected_manifest_sha256)
        or not hmac.compare_digest(expected_manifest_sha256, staging_manifest_sha256)
    ):
        raise ParsingError("Staging manifest SHA-256 does not match the trusted staging result.")

    entries = staging_manifest["files"]

    if len(entries) > MAX_FILES:
        raise ParsingError("Staging manifest exceeds the configured file-count limit.")

    validated: list[tuple[dict[str, Any], Path, PurePosixPath]] = []
    seen_paths: set[str] = set()
    total_bytes = 0
    for entry in entries:
        if not isinstance(entry, dict):
            raise ParsingError("Staging manifest contains a malformed file entry.")
        source, relative = validate_staged_entry(root, entry)
        if relative.as_posix() in seen_paths:
            raise ParsingError("Staging manifest contains duplicate source paths.")
        seen_paths.add(relative.as_posix())
        total_bytes += entry["size_bytes"]
        if total_bytes > MAX_TOTAL_BYTES:
            raise ParsingError("Staging manifest exceeds the configured total-size limit.")
        validated.append((entry, source, relative))

    summary = staging_manifest["summary"]
    if (
        not isinstance(summary.get("staged_files"), int)
        or isinstance(summary.get("staged_files"), bool)
        or summary.get("staged_files") != len(validated)
        or not isinstance(summary.get("staged_bytes"), int)
        or isinstance(summary.get("staged_bytes"), bool)
        or summary.get("staged_bytes") != total_bytes
        or not isinstance(summary.get("selected_files"), int)
        or isinstance(summary.get("selected_files"), bool)
        or summary.get("selected_files") < len(validated)
    ):
        raise ParsingError("Staging manifest counts do not match the validated quarantine files.")

    requested_output = Path(output_dir).expanduser()
    if requested_output.exists() or requested_output.is_symlink():
        raise ParsingError("Output directory must be new; existing data will not be overwritten.")

    if requested_output.parent.is_symlink():
        raise ParsingError("Output parent must not be a symlink.")
    requested_output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    output_parent = requested_output.parent.resolve(strict=True)
    if output_parent.is_relative_to(root):
        raise ParsingError("Parser output must be outside the source quarantine directory.")

    active_converter = converter or create_converter(ocr=ocr, artifacts_dir=artifacts_dir)
    active_version = docling_version or installed_docling_version()
    requested_output.mkdir(mode=0o700)

    records: list[dict[str, Any]] = []
    try:
        for entry, source, relative in validated:
            extension = relative.suffix.lower()
            source_hash = entry["sha256"]
            document_id = hashlib.sha256(
                f"{relative.as_posix()}\x00{source_hash}".encode("utf-8")
            ).hexdigest()

            if extension not in SUPPORTED_EXTENSIONS:
                records.append(
                    {
                        "document_id": document_id,
                        "source_path": relative.as_posix(),
                        "source_sha256": source_hash,
                        "status": "skipped_unsupported_format",
                        "indexing_allowed": False,
                        "retrieval_allowed": False,
                    }
                )
                continue

            try:
                result = active_converter.convert(str(source))
                if sha256_file(source) != source_hash:
                    raise ParsingError("Source changed while Docling was processing it.")

                document = result.document
                pages = _document_pages(document)
                combined_text = "\n\n".join(page["markdown"] for page in pages).strip()
                text_hash = hashlib.sha256(combined_text.encode("utf-8")).hexdigest()
                errors = getattr(result, "errors", []) or []
                conversion_status = getattr(result, "status", "unknown")
                conversion_status = getattr(conversion_status, "value", str(conversion_status))

                if not combined_text:
                    status = "empty_output_needs_ocr_or_review"
                elif errors:
                    status = "parsed_with_warnings_pending_review"
                else:
                    status = "parsed_pending_review"

                payload = {
                    "schema_version": "1.0.0",
                    "document_id": document_id,
                    "source": {
                        "path": relative.as_posix(),
                        "sha256": source_hash,
                        "size_bytes": entry["size_bytes"],
                        "archive_sha256": staging_manifest["source_archive"]["sha256"],
                        "staging_manifest_sha256": staging_manifest_sha256,
                    },
                    "parser": {
                        "name": "docling",
                        "version": active_version,
                        "conversion_status": conversion_status,
                        "error_count": len(errors),
                        "ocr_enabled": ocr,
                        "ocr_languages": OCR_LANGUAGES if ocr else [],
                    },
                    "content": {
                        "text_sha256": text_hash,
                        "page_count": sum(page["page_no"] is not None for page in pages),
                        "segment_count": len(pages),
                        "pages": pages,
                    },
                    "review": {
                        "status": status,
                        "knowledge_stage": "L1_parsed_pending_review",
                        "access_class": "unclassified_pending_review",
                        "rights_status": "unknown_pending_review",
                        "human_review_required": True,
                        "indexing_allowed": False,
                        "retrieval_allowed": False,
                    },
                }

                output_name = f"{document_id}.json"
                output_sha256 = _write_private_json(requested_output / output_name, payload)
                records.append(
                    {
                        "document_id": document_id,
                        "source_path": relative.as_posix(),
                        "source_sha256": source_hash,
                        "output_file": output_name,
                        "output_sha256": output_sha256,
                        "page_count": sum(page["page_no"] is not None for page in pages),
                        "content_segment_count": len(pages),
                        "status": status,
                        "indexing_allowed": False,
                        "retrieval_allowed": False,
                    }
                )
            except ParsingError:
                raise
            except Exception as error:
                if sha256_file(source) != source_hash:
                    raise ParsingError("Source integrity changed during a failed conversion.") from error
                records.append(
                    {
                        "document_id": document_id,
                        "source_path": relative.as_posix(),
                        "source_sha256": source_hash,
                        "status": "conversion_failed",
                        "error_type": type(error).__name__,
                        "error_details_redacted": True,
                        "indexing_allowed": False,
                        "retrieval_allowed": False,
                    }
                )

        summary = {
            "total_files": len(records),
            "parsed_files": sum(record["status"].startswith(("parsed_", "empty_output_")) for record in records),
            "skipped_files": sum(record["status"] == "skipped_unsupported_format" for record in records),
            "failed_files": sum(record["status"] == "conversion_failed" for record in records),
            "human_review_required": True,
            "indexing_allowed": False,
            "retrieval_allowed": False,
        }
        parse_manifest = {
            "schema_version": "1.0.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_archive_sha256": staging_manifest["source_archive"]["sha256"],
            "staging_manifest_sha256": staging_manifest_sha256,
            "parser": {
                "name": "docling",
                "version": active_version,
                "ocr_enabled": ocr,
                "ocr_languages": OCR_LANGUAGES if ocr else [],
            },
            "summary": summary,
            "files": sorted(records, key=lambda record: record["source_path"]),
            "policy": {
                "source_quarantine_modified": False,
                "source_files_modified": False,
                "remote_services_enabled": False,
                "automatic_ingestion_performed": False,
                "indexing_allowed": False,
                "retrieval_allowed": False,
                "human_review_required": True,
            },
        }
        manifest_sha256 = _write_private_json(requested_output / "parse-manifest.json", parse_manifest)
        return {
            "status": "parsed_for_review",
            "output_dir": str(requested_output),
            "manifest_sha256": manifest_sha256,
            **summary,
        }
    except Exception:
        shutil.rmtree(requested_output, ignore_errors=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Parse hash-verified Mother Two quarantine files into restricted review artifacts."
    )
    parser.add_argument("--stage-root", required=True, help="Existing Mother Two quarantine workspace")
    parser.add_argument("--output-dir", required=True, help="New private output directory outside the quarantine")
    parser.add_argument("--expected-manifest-sha256", required=True, help="SHA-256 returned by the trusted staging command")
    parser.add_argument("--ocr", action="store_true", help="Enable local Persian/English Tesseract OCR for PDFs")
    parser.add_argument("--artifacts-dir", help="Pre-fetched Docling model artifacts directory required with --ocr")
    args = parser.parse_args()

    try:
        result = parse_staged_documents(
            args.stage_root,
            args.output_dir,
            expected_manifest_sha256=args.expected_manifest_sha256,
            ocr=args.ocr,
            artifacts_dir=args.artifacts_dir,
        )
    except (OSError, ParsingError, importlib.metadata.PackageNotFoundError) as error:
        print(f"Document parsing stopped: {error}", file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
