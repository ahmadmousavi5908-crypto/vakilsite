import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "mavis"))
from parse_staged_mother_two import parse_staged_documents


@unittest.skipUnless(importlib.util.find_spec("docling"), "Optional Docling runtime is not installed.")
class DoclingRuntimeSmokeTests(unittest.TestCase):
    def test_real_docling_converter_parses_local_persian_text_without_remote_services(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root = root / "stage"
            source = stage_root / "library" / "books" / "smoke.txt"
            source.parent.mkdir(parents=True)
            source.write_text("نمونه آزمایشی کتابخانه حقوقی ماویس. ماده یک قانون آزمایشی.", encoding="utf-8")
            source_hash = hashlib.sha256(source.read_bytes()).hexdigest()

            staging_manifest = {
                "schema_version": "1.0.0",
                "source_archive": {"filename": "synthetic.tar.gz", "sha256": "b" * 64},
                "source_inventory": {"filename": "inventory.json", "sha256": "c" * 64},
                "summary": {
                    "selected_files": 1,
                    "secret_content_candidates": 0,
                    "staged_files": 1,
                    "staged_bytes": source.stat().st_size,
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
                "files": [
                    {
                        "path": "library/books/smoke.txt",
                        "classification": "books",
                        "extension": ".txt",
                        "size_bytes": source.stat().st_size,
                        "sha256": source_hash,
                        "knowledge_stage": "L0_staged_unreviewed",
                        "access_class": "unclassified_pending_review",
                        "rights_status": "unknown_pending_review",
                        "indexing_allowed": False,
                        "retrieval_allowed": False,
                    }
                ],
            }
            (stage_root / "staging-manifest.json").write_text(
                json.dumps(staging_manifest, ensure_ascii=False),
                encoding="utf-8",
            )

            manifest_hash = hashlib.sha256(
                (stage_root / "staging-manifest.json").read_bytes()
            ).hexdigest()
            result = parse_staged_documents(
                stage_root,
                root / "parsed",
                expected_manifest_sha256=manifest_hash,
            )
            manifest = json.loads((root / "parsed" / "parse-manifest.json").read_text("utf-8"))
            record = manifest["files"][0]
            parsed = json.loads((root / "parsed" / record["output_file"]).read_text("utf-8"))

            self.assertEqual(result["status"], "parsed_for_review")
            self.assertEqual(record["status"], "parsed_pending_review")
            self.assertEqual(parsed["parser"]["name"], "docling")
            self.assertTrue(parsed["parser"]["version"])
            self.assertFalse(parsed["review"]["indexing_allowed"])
            self.assertFalse(parsed["review"]["retrieval_allowed"])
            self.assertTrue(
                any("نمونه آزمایشی کتابخانه حقوقی ماویس" in segment["markdown"]
                    for segment in parsed["content"]["pages"])
            )


if __name__ == "__main__":
    unittest.main()
