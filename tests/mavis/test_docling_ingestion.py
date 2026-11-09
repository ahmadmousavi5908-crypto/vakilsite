import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "mavis"))
from parse_staged_mother_two import ParsingError, parse_staged_documents


class FakeBoundingBox:
    def model_dump(self, mode="python"):
        return {"l": 1.0, "t": 2.0, "r": 3.0, "b": 4.0}


class FakeProvenance:
    def __init__(self, page_no):
        self.page_no = page_no
        self.bbox = FakeBoundingBox()
        self.charspan = (0, 12)


class FakeItem:
    def __init__(self, page_no):
        self.self_ref = "#/texts/0"
        self.label = SimpleNamespace(value="text")
        self.prov = [FakeProvenance(page_no)]


class FakeDocument:
    pages = {1: object(), 2: object()}

    def export_to_markdown(self, page_no=None, traverse_pictures=False):
        return {1: "صفحه نخست قانون", 2: "صفحه دوم قانون"}[page_no]

    def iterate_items(self, page_no=None, traverse_pictures=False):
        return [(FakeItem(page_no), 0)]


class FakeConverter:
    def __init__(self, error=None):
        self.error = error
        self.calls = []

    def convert(self, source):
        self.calls.append(source)
        if self.error:
            raise RuntimeError(self.error)
        return SimpleNamespace(
            document=FakeDocument(),
            status=SimpleNamespace(value="success"),
            errors=[],
        )


class DoclingIngestionTests(unittest.TestCase):
    def create_stage(self, root, filename="books/law.pdf", content=b"synthetic pdf bytes"):
        stage_root = root / "stage"
        source = stage_root / filename
        source.parent.mkdir(parents=True)
        source.write_bytes(content)
        digest = hashlib.sha256(content).hexdigest()
        manifest = {
            "schema_version": "1.0.0",
            "source_archive": {"filename": "mother-two.tar.gz", "sha256": "a" * 64},
            "summary": {
                "human_review_required": True,
                "indexing_allowed": False,
                "retrieval_allowed": False,
            },
            "policy": {"automatic_ingestion_performed": False},
            "files": [
                {
                    "path": filename,
                    "classification": "books",
                    "extension": source.suffix.lower(),
                    "size_bytes": len(content),
                    "sha256": digest,
                    "knowledge_stage": "L0_staged_unreviewed",
                    "access_class": "unclassified_pending_review",
                    "rights_status": "unknown_pending_review",
                    "indexing_allowed": False,
                    "retrieval_allowed": False,
                }
            ],
        }
        (stage_root / "staging-manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False),
            encoding="utf-8",
        )
        return stage_root, source, manifest

    def test_parses_verified_pdf_to_page_anchored_review_only_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, source, _manifest = self.create_stage(root)
            converter = FakeConverter()
            output = root / "parsed"

            result = parse_staged_documents(
                stage_root,
                output,
                converter=converter,
                docling_version="2.149.0",
            )

            self.assertEqual(result["status"], "parsed_for_review")
            self.assertEqual(result["parsed_files"], 1)
            self.assertFalse(result["indexing_allowed"])
            self.assertFalse(result["retrieval_allowed"])
            self.assertEqual(len(converter.calls), 1)
            self.assertEqual(source.read_bytes(), b"synthetic pdf bytes")

            parse_manifest = json.loads((output / "parse-manifest.json").read_text("utf-8"))
            self.assertFalse(parse_manifest["policy"]["automatic_ingestion_performed"])
            self.assertFalse(parse_manifest["summary"]["indexing_allowed"])
            record = parse_manifest["files"][0]
            self.assertEqual(record["status"], "parsed_pending_review")

            document = json.loads((output / record["output_file"]).read_text("utf-8"))
            self.assertEqual(document["parser"]["version"], "2.149.0")
            self.assertFalse(document["review"]["indexing_allowed"])
            self.assertFalse(document["review"]["retrieval_allowed"])
            self.assertEqual([page["page_no"] for page in document["content"]["pages"]], [1, 2])
            self.assertEqual(document["content"]["pages"][0]["markdown"], "صفحه نخست قانون")
            self.assertEqual(document["content"]["pages"][0]["anchors"][0]["page_no"], 1)
            self.assertEqual(document["content"]["pages"][0]["anchors"][0]["bbox"]["l"], 1.0)
            self.assertNotIn("صفحه نخست قانون", json.dumps(parse_manifest))

    def test_rejects_modified_source_before_creating_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, source, _manifest = self.create_stage(root)
            source.write_bytes(b"x" * len(b"synthetic pdf bytes"))
            output = root / "parsed"

            with self.assertRaisesRegex(ParsingError, "SHA-256"):
                parse_staged_documents(stage_root, output, converter=FakeConverter())

            self.assertFalse(output.exists())

    def test_rejects_manifest_that_enables_indexing(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, _source, manifest = self.create_stage(root)
            manifest["files"][0]["indexing_allowed"] = True
            (stage_root / "staging-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(ParsingError, "L0 review-only"):
                parse_staged_documents(stage_root, root / "parsed", converter=FakeConverter())

    def test_rejects_path_traversal_and_output_inside_quarantine(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, _source, manifest = self.create_stage(root)
            manifest["files"][0]["path"] = "../outside.pdf"
            (stage_root / "staging-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(ParsingError, "unsafe relative path"):
                parse_staged_documents(stage_root, root / "parsed", converter=FakeConverter())

            stage_root, _source, _manifest = self.create_stage(root / "second")
            with self.assertRaisesRegex(ParsingError, "outside the source quarantine"):
                parse_staged_documents(stage_root, stage_root / "parsed", converter=FakeConverter())

    def test_rejects_symlink_sources(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, source, manifest = self.create_stage(root)
            outside = root / "outside.pdf"
            outside.write_bytes(source.read_bytes())
            source.unlink()
            source.symlink_to(outside)
            (stage_root / "staging-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(ParsingError, "symlink"):
                parse_staged_documents(stage_root, root / "parsed", converter=FakeConverter())

    def test_skips_unsupported_legacy_word_format_without_running_converter(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, _source, _manifest = self.create_stage(root, filename="books/legacy.doc")
            converter = FakeConverter()

            result = parse_staged_documents(
                stage_root,
                root / "parsed",
                converter=converter,
                docling_version="2.149.0",
            )

            self.assertEqual(result["skipped_files"], 1)
            self.assertEqual(converter.calls, [])
            parse_manifest = json.loads((root / "parsed/parse-manifest.json").read_text("utf-8"))
            self.assertEqual(parse_manifest["files"][0]["status"], "skipped_unsupported_format")

    def test_redacts_parser_exception_details(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, _source, _manifest = self.create_stage(root)
            converter = FakeConverter(error="DB_PASSWORD=must-not-be-written")

            result = parse_staged_documents(
                stage_root,
                root / "parsed",
                converter=converter,
                docling_version="2.149.0",
            )

            self.assertEqual(result["failed_files"], 1)
            parse_manifest = json.loads((root / "parsed/parse-manifest.json").read_text("utf-8"))
            serialized = json.dumps(parse_manifest)
            self.assertNotIn("DB_PASSWORD", serialized)
            self.assertNotIn("must-not-be-written", serialized)
            self.assertEqual(parse_manifest["files"][0]["error_type"], "RuntimeError")
            self.assertTrue(parse_manifest["files"][0]["error_details_redacted"])

    def test_never_overwrites_existing_output_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stage_root, _source, _manifest = self.create_stage(root)
            output = root / "parsed"
            output.mkdir()
            marker = output / "keep.txt"
            marker.write_text("keep", encoding="utf-8")

            with self.assertRaisesRegex(ParsingError, "must be new"):
                parse_staged_documents(stage_root, output, converter=FakeConverter())

            self.assertEqual(marker.read_text("utf-8"), "keep")


if __name__ == "__main__":
    unittest.main()
