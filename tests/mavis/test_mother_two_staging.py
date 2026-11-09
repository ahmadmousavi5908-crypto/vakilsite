import io
import json
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "mavis"))
from inventory_mother_two import inventory_archive, write_inventory
from stage_mother_two import StagingError, stage_archive


class MotherTwoStagingTests(unittest.TestCase):
    def make_archive(self, root: Path) -> Path:
        archive_path = root / "mother-two-test.tar.gz"
        with tarfile.open(archive_path, mode="w:gz") as archive:
            files = {
                "library/books/book-one.pdf": b"licensed status unknown",
                "library/articles/guide.md": "راهنمای حقوقی".encode("utf-8"),
                "library/research/data.csv": b"id,value\n1,2\n",
                "misc/unknown.pdf": b"unclassified file",
                "private/.env": b"SECRET_TOKEN=never-stage",
                "../outside.pdf": b"unsafe path",
            }
            for name, content in files.items():
                info = tarfile.TarInfo(name)
                info.size = len(content)
                archive.addfile(info, io.BytesIO(content))

            link = tarfile.TarInfo("library/books/book-link.pdf")
            link.type = tarfile.SYMTYPE
            link.linkname = "../../outside.pdf"
            archive.addfile(link)
        return archive_path

    def create_inventory(self, archive_path: Path, root: Path) -> Path:
        report = inventory_archive(archive_path)
        inventory_path, _ = write_inventory(report, root / "audit")
        return inventory_path

    def test_stages_only_hash_verified_regular_files_and_keeps_them_unindexed(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = self.make_archive(root)
            inventory_path = self.create_inventory(archive_path, root)

            result = stage_archive(archive_path, inventory_path, root / "staging")

            self.assertEqual(result["status"], "staging_created")
            self.assertEqual(result["staged_files"], 3)
            self.assertFalse(result["indexing_allowed"])
            self.assertFalse(result["retrieval_allowed"])
            self.assertFalse(result["original_archive_modified"])

            stage_root = Path(result["stage_path"])
            manifest = json.loads((stage_root / "staging-manifest.json").read_text("utf-8"))
            self.assertEqual(manifest["summary"]["staged_files"], 3)
            self.assertFalse(manifest["summary"]["indexing_allowed"])
            self.assertTrue(manifest["policy"]["secrets_excluded"])
            self.assertFalse(manifest["policy"]["copyright_and_access_rights_verified"])

            staged_paths = {entry["path"] for entry in manifest["files"]}
            self.assertEqual(staged_paths, {
                "library/books/book-one.pdf",
                "library/articles/guide.md",
                "library/research/data.csv",
            })
            self.assertNotIn("misc/unknown.pdf", staged_paths)
            self.assertTrue((stage_root / "library/books/book-one.pdf").is_file())
            self.assertFalse((stage_root / "private/.env").exists())
            self.assertFalse((stage_root / "../outside.pdf").exists())
            self.assertFalse((stage_root / "library/books/book-link.pdf").exists())
            self.assertNotIn("SECRET_TOKEN", json.dumps(manifest))

    def test_dry_run_verifies_archive_and_inventory_without_creating_staging(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = self.make_archive(root)
            inventory_path = self.create_inventory(archive_path, root)
            output_parent = root / "staging"

            result = stage_archive(archive_path, inventory_path, output_parent, dry_run=True)

            self.assertEqual(result["status"], "dry_run_verified")
            self.assertEqual(result["selected_files"], 3)
            self.assertEqual(result["staged_files"], 0)
            self.assertFalse(result["extraction_performed"])
            self.assertFalse(output_parent.exists())

    def test_rejects_archive_changed_after_inventory(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = self.make_archive(root)
            inventory_path = self.create_inventory(archive_path, root)
            with archive_path.open("ab") as stream:
                stream.write(b"tampered")

            with self.assertRaisesRegex(StagingError, "does not match"):
                stage_archive(archive_path, inventory_path, root / "staging")
            self.assertFalse((root / "staging").exists())

    def test_rejects_invalid_or_tampered_inventory_without_extracting(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = self.make_archive(root)
            inventory_path = self.create_inventory(archive_path, root)
            report = json.loads(inventory_path.read_text("utf-8"))
            report["files"][0]["sha256"] = "0" * 64
            inventory_path.write_text(json.dumps(report), encoding="utf-8")

            with self.assertRaisesRegex(StagingError, "SHA-256"):
                stage_archive(archive_path, inventory_path, root / "staging")
            self.assertFalse((root / "staging").exists())

    def test_rejects_inventory_with_no_eligible_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = self.make_archive(root)
            inventory_path = self.create_inventory(archive_path, root)
            report = json.loads(inventory_path.read_text("utf-8"))
            for entry in report["files"]:
                entry["classification"] = "unclassified"
            inventory_path.write_text(json.dumps(report), encoding="utf-8")

            with self.assertRaisesRegex(StagingError, "No eligible files"):
                stage_archive(archive_path, inventory_path, root / "staging")


if __name__ == "__main__":
    unittest.main()
