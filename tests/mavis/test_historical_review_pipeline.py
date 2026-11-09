import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "mavis"))
from create_historical_review_queue import ReviewQueueError, create_review_queue
from validate_historical_review_decisions import ReviewDecisionError, validate_review_decisions


class HistoricalReviewPipelineTests(unittest.TestCase):
    def make_stage(self, root: Path):
        stage_root = root / "stage"
        stage_root.mkdir()
        files = {
            "books/book.pdf": b"copyrighted legal book bytes",
            "laws/statute.pdf": b"official statute bytes",
            "seo/seo.md": b"public SEO document bytes",
        }
        records = []
        import hashlib
        for relative, content in files.items():
            path = stage_root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            records.append({
                "path": relative,
                "classification": "books" if relative.startswith("books/") else (
                    "legal_sources" if relative.startswith("laws/") else "seo_and_growth"
                ),
                "extension": path.suffix,
                "size_bytes": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
                "knowledge_stage": "L0_staged_unreviewed",
                "access_class": "unclassified_pending_review",
                "rights_status": "unknown_pending_review",
                "indexing_allowed": False,
                "retrieval_allowed": False,
            })

        manifest = {
            "schema_version": "1.0.0",
            "summary": {
                "staged_files": len(records),
                "human_review_required": True,
                "indexing_allowed": False,
                "retrieval_allowed": False,
            },
            "policy": {"automatic_ingestion_performed": False},
            "files": records,
        }
        manifest_path = stage_root / "staging-manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return stage_root, manifest_path, records

    def write_decisions(self, root: Path, decisions):
        path = root / "decisions.json"
        path.write_text(json.dumps({"schema_version": "1.0.0", "decisions": decisions}), encoding="utf-8")
        return path

    def valid_book_decision(self, source_id):
        return {
            "source_id": source_id,
            "decision": "approve_for_registration",
            "title": "کتاب پژوهشی حقوقی",
            "source_class": "book",
            "access_class": "internal",
            "rights_status": "licensed",
            "rights_evidence": "مجوز استفاده داخلی شماره LIC-2026-01 با دامنه محدود به تیم حقوقی.",
            "reviewed_by": "legal-reviewer",
            "reviewed_at": "2026-11-09T12:00:00+03:30",
            "review_notes": "حقوق استفاده داخلی بررسی شد؛ منبع ثانویه است و نباید مبنای پاسخ عمومی قرار گیرد.",
            "human_approved_searchable": True,
            "primary_source_verified": False,
            "validity_status": "unknown",
        }

    def valid_statute_decision(self, source_id):
        return {
            "source_id": source_id,
            "decision": "approve_for_registration",
            "title": "قانون نمونه",
            "source_class": "statute",
            "access_class": "public",
            "rights_status": "public_domain",
            "rights_evidence": "متن قانون از روزنامه رسمی جمهوری اسلامی ایران با شناسه انتشار رسمی.",
            "source_url": "https://rrk.ir/sample-law",
            "exact_citation": "قانون نمونه، ماده ۱، روزنامه رسمی، شماره ۲۱۰۰۰.",
            "publication_date": "2020-01-01",
            "jurisdiction": "IR",
            "reviewed_by": "licensed-lawyer",
            "reviewed_at": "2026-11-09T12:00:00+03:30",
            "review_notes": "متن رسمی و زنجیره اصلاحات بررسی و با نسخه روزنامه رسمی تطبیق داده شد.",
            "human_approved_searchable": True,
            "primary_source_verified": True,
            "validity_status": "in_force",
            "last_verified_at": "2026-11-09T11:30:00+03:30",
        }

    def test_creates_metadata_only_queue_and_marks_duplicate_hashes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, manifest_path, records = self.make_stage(root)
            # Add a second path with identical bytes to exercise duplicate detection.
            duplicate_path = stage_root / "books/book-copy.pdf"
            duplicate_path.write_bytes((stage_root / "books/book.pdf").read_bytes())
            manifest = json.loads(manifest_path.read_text("utf-8"))
            duplicate = dict(manifest["files"][0])
            duplicate["path"] = "books/book-copy.pdf"
            manifest["files"].append(duplicate)
            manifest["summary"]["staged_files"] += 1
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            result = create_review_queue(manifest_path)
            queue_path = Path(result["queue_path"])
            queue = json.loads(queue_path.read_text("utf-8"))

            self.assertEqual(result["records"], 4)
            self.assertEqual(result["duplicate_content_records"], 2)
            self.assertFalse(result["indexing_allowed"])
            self.assertFalse(result["retrieval_allowed"])
            self.assertEqual(queue["summary"]["pending_human_review"], 4)
            self.assertTrue(all(record["review_status"] == "pending_human_review" for record in queue["records"]))
            self.assertTrue(all(record["indexing_allowed"] is False for record in queue["records"]))
            self.assertNotIn("copyrighted legal book bytes", json.dumps(queue))

    def test_rejects_missing_or_tampered_staged_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, manifest_path, records = self.make_stage(root)
            (stage_root / "books/book.pdf").write_bytes(b"tampered")
            with self.assertRaisesRegex(ReviewQueueError, "checksum"):
                create_review_queue(manifest_path)

    def test_creates_separate_l1_and_l2_candidates_with_arm_scopes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, manifest_path, records = self.make_stage(root)
            queue_result = create_review_queue(manifest_path)
            queue_path = Path(queue_result["queue_path"])
            queue = json.loads(queue_path.read_text("utf-8"))
            by_path = {item["path"]: item for item in queue["records"]}

            book = self.valid_book_decision(by_path["books/book.pdf"]["source_id"])
            statute = self.valid_statute_decision(by_path["laws/statute.pdf"]["source_id"])
            growth = {
                "source_id": by_path["seo/seo.md"]["source_id"],
                "decision": "approve_for_registration",
                "title": "راهنمای سئوی حقوقی",
                "source_class": "seo_document",
                "access_class": "public",
                "rights_status": "permission_confirmed",
                "rights_evidence": "سند متعلق به مجموعه و مجوز انتشار عمومی آن توسط مالک تأیید شده است.",
                "source_url": "https://vakilahmadmousavi.ir/seo-guide",
                "reviewed_by": "site-owner",
                "reviewed_at": "2026-11-09T12:00:00+03:30",
                "review_notes": "مالکیت و مجوز انتشار بررسی شد؛ فقط برای بازوی رشد قابل استفاده است.",
                "human_approved_searchable": True,
                "primary_source_verified": False,
                "validity_status": "unknown",
            }
            decisions_path = self.write_decisions(root, [book, statute, growth])
            output_path = root / "registry-candidate.json"
            result = validate_review_decisions(queue_path, decisions_path, output_path)
            candidate = json.loads(output_path.read_text("utf-8"))
            entries = {item["path"]: item for item in candidate["records"]}

            self.assertEqual(result["summary"]["registered"], 3)
            self.assertEqual(result["summary"]["searchable"], 3)
            self.assertEqual(result["summary"]["public_legal_chat_eligible"], 1)
            self.assertEqual(result["summary"]["lawyer_copilot_eligible"], 2)
            self.assertEqual(result["summary"]["growth_eligible"], 1)
            self.assertTrue(entries["laws/statute.pdf"]["eligibility"]["public_legal_chat"])
            self.assertTrue(entries["books/book.pdf"]["eligibility"]["lawyer_copilot"])
            self.assertFalse(entries["books/book.pdf"]["eligibility"]["public_legal_chat"])
            self.assertTrue(entries["seo/seo.md"]["eligibility"]["growth"])
            self.assertFalse(candidate["policy"]["database_ingestion_performed"])

    def test_requires_a_decision_for_every_staged_file(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, manifest_path, records = self.make_stage(root)
            queue_path = Path(create_review_queue(manifest_path)["queue_path"])
            queue = json.loads(queue_path.read_text("utf-8"))
            one_decision = {
                "source_id": queue["records"][0]["source_id"],
                "decision": "reject",
            }
            decisions_path = self.write_decisions(root, [one_decision])
            with self.assertRaisesRegex(ReviewDecisionError, "Every staged source"):
                validate_review_decisions(queue_path, decisions_path, root / "candidate.json")
            self.assertFalse((root / "candidate.json").exists())

    def test_blocks_primary_verification_from_unregistered_hosts(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, manifest_path, records = self.make_stage(root)
            queue_path = Path(create_review_queue(manifest_path)["queue_path"])
            queue = json.loads(queue_path.read_text("utf-8"))
            statute = self.valid_statute_decision(queue["records"][1]["source_id"])
            statute["source_url"] = "https://unverified.example/law"
            decisions = [
                self.valid_book_decision(queue["records"][0]["source_id"]),
                statute,
                {
                    "source_id": queue["records"][2]["source_id"],
                    "decision": "reject",
                },
            ]
            decisions_path = self.write_decisions(root, decisions)
            with self.assertRaisesRegex(ReviewDecisionError, "official source"):
                validate_review_decisions(queue_path, decisions_path, root / "candidate.json")

    def test_blocks_searchable_approval_when_rights_are_unknown_or_access_is_confidential(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, manifest_path, records = self.make_stage(root)
            queue_path = Path(create_review_queue(manifest_path)["queue_path"])
            queue = json.loads(queue_path.read_text("utf-8"))
            book = self.valid_book_decision(queue["records"][0]["source_id"])
            book["rights_status"] = "unknown"
            book["rights_evidence"] = None
            decisions = [book] + [
                {"source_id": item["source_id"], "decision": "reject"}
                for item in queue["records"][1:]
            ]
            decisions_path = self.write_decisions(root, decisions)
            with self.assertRaisesRegex(ReviewDecisionError, "searchable approval conflicts"):
                validate_review_decisions(queue_path, decisions_path, root / "candidate.json")

    def test_rejects_confidential_global_registration_even_if_marked_searchable(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, manifest_path, records = self.make_stage(root)
            queue_path = Path(create_review_queue(manifest_path)["queue_path"])
            queue = json.loads(queue_path.read_text("utf-8"))
            book = self.valid_book_decision(queue["records"][0]["source_id"])
            book["access_class"] = "confidential"
            decisions = [book] + [
                {"source_id": item["source_id"], "decision": "reject"}
                for item in queue["records"][1:]
            ]
            decisions_path = self.write_decisions(root, decisions)
            with self.assertRaisesRegex(ReviewDecisionError, "confidential/secret"):
                validate_review_decisions(queue_path, decisions_path, root / "candidate.json")


if __name__ == "__main__":
    unittest.main()
