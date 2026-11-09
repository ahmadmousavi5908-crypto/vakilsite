import hashlib
import io
import json
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "mavis"))
from inventory_mother_two import inventory_archive, write_inventory


class MotherTwoInventoryTests(unittest.TestCase):
    def make_archive(self, root: Path) -> Path:
        archive_path = root / "mother-two-test.tar.gz"
        with tarfile.open(archive_path, mode="w:gz") as archive:
            files = {
                "library/books/book-one.pdf": b"same-public-book-bytes",
                "backup/books/book-copy.pdf": b"same-public-book-bytes",
                "library/articles/guide.md": "راهنمای حقوقی".encode("utf-8"),
                "metadata/manifest.json": b'{"schema":"test"}',
                "private/.env": b"SUPABASE_SERVICE_ROLE_KEY=must-never-appear",
                "config/db-password.txt": b"DB_PASSWORD=must-also-never-appear",
                "../outside.txt": b"unsafe path member",
            }
            for name, content in files.items():
                info = tarfile.TarInfo(name)
                info.size = len(content)
                archive.addfile(info, io.BytesIO(content))

            link = tarfile.TarInfo("links/book-link")
            link.type = tarfile.SYMTYPE
            link.linkname = "../../outside"
            archive.addfile(link)
        return archive_path

    def test_streams_hashes_and_classifies_without_extracting(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = self.make_archive(root)
            report = inventory_archive(archive_path)

            self.assertEqual(report["summary"]["files"], 7)
            self.assertEqual(report["summary"]["symlinks"], 1)
            self.assertEqual(report["summary"]["secret_candidate_count"], 2)
            self.assertEqual(report["summary"]["unsafe_path_count"], 1)
            self.assertEqual(report["summary"]["unsafe_link_target_count"], 1)
            self.assertEqual(report["summary"]["duplicate_content_groups"], 1)
            self.assertEqual(report["manifest_candidates"], ["metadata/manifest.json"])
            self.assertEqual(report["archive"]["sha256"], hashlib.sha256(archive_path.read_bytes()).hexdigest())
            self.assertFalse(report["archive"]["extraction_performed"])

            secret_entries = [entry for entry in report["files"] if entry["classification"] == "restricted_secret"]
            self.assertEqual(len(secret_entries), 2)
            self.assertIsNone(secret_entries[0]["path"])
            self.assertIsNone(secret_entries[0]["sha256"])
            self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", json.dumps(report))
            self.assertNotIn(".env", json.dumps(report))
            self.assertNotIn("db-password", json.dumps(report))
            self.assertNotIn("DB_PASSWORD", json.dumps(report))
            self.assertEqual(sorted(item.name for item in root.iterdir()), ["mother-two-test.tar.gz"])

    def test_writes_private_inventory_and_checksum_outside_archive(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = self.make_archive(root)
            report = inventory_archive(archive_path)
            output_path, digest = write_inventory(report, root / "audit")

            self.assertTrue(output_path.is_file())
            self.assertTrue(output_path.with_suffix(".json.sha256").is_file())
            self.assertEqual(digest, hashlib.sha256(output_path.read_bytes()).hexdigest())
            self.assertEqual(json.loads(output_path.read_text("utf-8"))["archive"]["sha256"], report["archive"]["sha256"])
            self.assertTrue(output_path.stat().st_mode & 0o600)


if __name__ == "__main__":
    unittest.main()
