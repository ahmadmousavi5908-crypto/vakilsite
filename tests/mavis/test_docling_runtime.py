import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "mavis"))
from parse_staged_mother_two import parse_staged_documents


def build_minimal_pdf(text):
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(body)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(b"xref\n0 6\n0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


@unittest.skipUnless(importlib.util.find_spec("docling"), "Optional Docling runtime is not installed.")
class DoclingRuntimeSmokeTests(unittest.TestCase):
    def test_real_docling_converter_parses_local_text_and_pdf_without_remote_services(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root = root / "stage"
            text_source = stage_root / "library" / "books" / "smoke.txt"
            pdf_source = stage_root / "library" / "books" / "smoke.pdf"
            text_source.parent.mkdir(parents=True)
            text_source.write_text(
                "نمونه آزمایشی کتابخانه حقوقی ماویس. ماده یک قانون آزمایشی.",
                encoding="utf-8",
            )
            pdf_source.write_bytes(build_minimal_pdf("MAVIS DOCLING PDF SMOKE"))

            entries = []
            for source, relative in [
                (text_source, "library/books/smoke.txt"),
                (pdf_source, "library/books/smoke.pdf"),
            ]:
                entries.append(
                    {
                        "path": relative,
                        "classification": "books",
                        "extension": source.suffix.lower(),
                        "size_bytes": source.stat().st_size,
                        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                        "knowledge_stage": "L0_staged_unreviewed",
                        "access_class": "unclassified_pending_review",
                        "rights_status": "unknown_pending_review",
                        "indexing_allowed": False,
                        "retrieval_allowed": False,
                    }
                )

            staging_manifest = {
                "schema_version": "1.0.0",
                "source_archive": {"filename": "synthetic.tar.gz", "sha256": "b" * 64},
                "source_inventory": {"filename": "inventory.json", "sha256": "c" * 64},
                "summary": {
                    "selected_files": 2,
                    "secret_content_candidates": 0,
                    "staged_files": 2,
                    "staged_bytes": sum(entry["size_bytes"] for entry in entries),
                    "human_review_required": True,
                    "indexing_allowed": False,
                    "retrieval_allowed": False,
                },
                "policy": {
                    "secrets_excluded": True,
                    "unsafe_paths_and_links_excluded": True,
                    "original_archive_modified": False,
                    "extracted_in_place": False,
                    "automatic_ingestion_performed": False,
                    "copyright_and_access_rights_verified": False,
                },
                "files": entries,
            }
            manifest_path = stage_root / "staging-manifest.json"
            manifest_path.write_text(
                json.dumps(staging_manifest, ensure_ascii=False),
                encoding="utf-8",
            )
            manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()

            result = parse_staged_documents(
                stage_root,
                root / "parsed",
                expected_manifest_sha256=manifest_hash,
            )
            manifest = json.loads((root / "parsed" / "parse-manifest.json").read_text("utf-8"))

            self.assertEqual(result["status"], "parsed_for_review")
            self.assertEqual(result["parsed_files"], 2)
            self.assertFalse(result["indexing_allowed"])
            self.assertFalse(result["retrieval_allowed"])

            parsed_by_path = {}
            for record in manifest["files"]:
                parsed_by_path[record["source_path"]] = json.loads(
                    (root / "parsed" / record["output_file"]).read_text("utf-8")
                )

            text_document = parsed_by_path["library/books/smoke.txt"]
            self.assertEqual(text_document["parser"]["name"], "docling")
            self.assertTrue(text_document["parser"]["version"])
            self.assertFalse(text_document["review"]["indexing_allowed"])
            self.assertFalse(text_document["review"]["retrieval_allowed"])
            self.assertTrue(
                any("نمونه آزمایشی کتابخانه حقوقی ماویس" in segment["markdown"]
                    for segment in text_document["content"]["pages"])
            )

            pdf_document = parsed_by_path["library/books/smoke.pdf"]
            self.assertEqual(pdf_document["content"]["page_count"], 1)
            self.assertEqual(pdf_document["content"]["pages"][0]["page_no"], 1)
            self.assertTrue(
                any("MAVIS DOCLING PDF SMOKE" in segment["markdown"]
                    for segment in pdf_document["content"]["pages"])
            )


if __name__ == "__main__":
    unittest.main()
