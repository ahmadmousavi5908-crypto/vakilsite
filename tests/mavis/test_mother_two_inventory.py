import hashlib
from contextlib import redirect_stderr, redirect_stdout
import io
import json
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "mavis"))
from inventory_mother_two import inventory_archive, main, write_inventory


class MotherTwoInventoryTests(unittest.TestCase):
    def make_archive(self, root: Path) -> Path:
        archive_path = root / "mother-two-test.tar.gz"
        with tarfile.open(archive_path, mode="w:gz") as archive:
            files = {
                "library/books/book-one.pdf": b"same-public-book-bytes",
                "backup/books/book-copy.pdf": b"same-public-book-bytes",
                "library/articles/guide.md": "راهنمای حقوقی".encode("utf-8"),
                "misc/کتاب-قانون-مدنی.pdf": b"book identified from filename",
                "misc/مقاله-تحلیلی.md": b"article identified from filename",
                "metadata/manifest.json": b'{"schema":"test"}',
                "private/.env": b"SUPABASE_SERVICE_ROLE_KEY=must-never-appear",
                "config/db-password.txt": b"DB_PASSWORD=must-also-never-appear",
                "private/clients/client-records.json": b'{"fullName":"Private Client","phone":"09000000000"}',
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

            self.assertEqual(report["summary"]["files"], 10)
            self.assertEqual(report["summary"]["symlinks"], 1)
            self.assertEqual(report["summary"]["secret_candidate_count"], 2)
            self.assertEqual(report["summary"]["confidential_candidate_count"], 1)
            self.assertEqual(report["summary"]["unsafe_path_count"], 1)
            self.assertEqual(report["summary"]["unsafe_link_target_count"], 1)
            self.assertEqual(report["summary"]["duplicate_content_groups"], 1)
            self.assertEqual(report["manifest_candidates"], ["metadata/manifest.json"])
            classified_by_path = {entry.get("path"): entry["classification"] for entry in report["files"]}
            self.assertEqual(classified_by_path["misc/کتاب-قانون-مدنی.pdf"], "books")
            self.assertEqual(classified_by_path["misc/مقاله-تحلیلی.md"], "published_articles")
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
            self.assertNotIn("client-records.json", json.dumps(report))
            self.assertNotIn("Private Client", json.dumps(report))
            restricted_entries = [entry for entry in report["files"] if entry["classification"] == "restricted_personal"]
            self.assertEqual(len(restricted_entries), 1)
            self.assertIsNone(restricted_entries[0]["path"])
            self.assertIsNone(restricted_entries[0]["sha256"])
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


    def test_rejects_symlink_output_directory_without_touching_target(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            target = root / "private-target"
            target.mkdir()
            target.chmod(0o755)
            link = root / "audit-link"
            link.symlink_to(target, target_is_directory=True)
            original_mode = target.stat().st_mode

            with self.assertRaisesRegex(ValueError, "must not be a symlink"):
                write_inventory({}, link)

            self.assertEqual(list(target.iterdir()), [])
            self.assertEqual(target.stat().st_mode, original_mode)

    def test_cli_requires_an_explicit_archive_path(self):
        captured = io.StringIO()
        with patch.object(sys, "argv", ["inventory_mother_two.py"]):
            with redirect_stderr(captured):
                with self.assertRaises(SystemExit) as result:
                    main()

        self.assertEqual(result.exception.code, 2)
        self.assertIn("--archive", captured.getvalue())

    def test_cli_does_not_log_archive_derived_metadata(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = self.make_archive(root)
            output_dir = root / "private-audit"
            captured = io.StringIO()

            with patch.object(
                sys,
                "argv",
                [
                    "inventory_mother_two.py",
                    "--archive",
                    str(archive_path),
                    "--output-dir",
                    str(output_dir),
                ],
            ):
                with redirect_stdout(captured):
                    self.assertEqual(main(), 0)

            output = captured.getvalue()
            self.assertEqual(
                output,
                "Inventory created. Detailed metadata remains in the private report.\n",
            )
            self.assertNotIn(str(archive_path), output)
            self.assertNotIn(hashlib.sha256(archive_path.read_bytes()).hexdigest(), output)
            self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", output)
            self.assertNotIn("Private Client", output)


if __name__ == "__main__":
    unittest.main()
