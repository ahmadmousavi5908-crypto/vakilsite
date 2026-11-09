import hashlib
import json
import os
import re
import tempfile
import unittest
from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "mavis"))
from parse_staged_mother_two import parse_staged_documents


def build_image_pdf(jpeg_bytes, image_width, image_height):
    page_content = b"q\n500 0 0 140 56 320 cm\n/Im0 Do\nQ"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
        (
            b"<< /Type /XObject /Subtype /Image /Width "
            + str(image_width).encode("ascii")
            + b" /Height "
            + str(image_height).encode("ascii")
            + b" /ColorSpace /DeviceRGB /BitsPerComponent 8 "
            + b"/Filter /DCTDecode /Length "
            + str(len(jpeg_bytes)).encode("ascii")
            + b" >>\nstream\n"
            + jpeg_bytes
            + b"\nendstream"
        ),
        (
            b"<< /Length "
            + str(len(page_content)).encode("ascii")
            + b" >>\nstream\n"
            + page_content
            + b"\nendstream"
        ),
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


@unittest.skipUnless(
    os.environ.get("MAVIS_DOCLING_OCR") == "1",
    "Set MAVIS_DOCLING_OCR=1 in the isolated OCR workflow.",
)
class DoclingOcrRuntimeTests(unittest.TestCase):
    def test_tesseract_farsi_ocr_runs_through_docling_on_an_image_only_pdf(self):
        artifacts_dir = os.environ.get("MAVIS_DOCLING_OCR_ARTIFACTS_DIR")
        self.assertTrue(artifacts_dir and Path(artifacts_dir).is_dir())

        font_candidates = [
            Path("/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf"),
            Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf"),
        ]
        font_path = next((candidate for candidate in font_candidates if candidate.is_file()), None)
        self.assertIsNotNone(font_path, "Noto Arabic font is required for deterministic Persian OCR fixture.")

        image = Image.new("RGB", (1800, 520), "white")
        draw = ImageDraw.Draw(image)
        font = ImageFont.truetype(str(font_path), 108)
        persian_text = get_display(arabic_reshaper.reshape("قانون آزمایشی ماویس"))
        draw.text((120, 110), persian_text, font=font, fill="black")
        english_font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            72,
        )
        draw.text((120, 320), "MAVIS OCR TEST", font=english_font, fill="black")

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            image_path = root / "scan.jpg"
            image.save(image_path, format="JPEG", quality=96)
            with Image.open(image_path) as rendered:
                image_width, image_height = rendered.size
            pdf_bytes = build_image_pdf(image_path.read_bytes(), image_width, image_height)

            stage_root = root / "stage"
            source = stage_root / "scans" / "legal-scan.pdf"
            source.parent.mkdir(parents=True)
            source.write_bytes(pdf_bytes)
            source_hash = hashlib.sha256(pdf_bytes).hexdigest()

            staging_manifest = {
                "schema_version": "1.0.0",
                "source_archive": {"filename": "synthetic-scan.tar.gz", "sha256": "b" * 64},
                "source_inventory": {"filename": "inventory.json", "sha256": "c" * 64},
                "summary": {
                    "selected_files": 1,
                    "secret_content_candidates": 0,
                    "staged_files": 1,
                    "staged_bytes": len(pdf_bytes),
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
                        "path": "scans/legal-scan.pdf",
                        "classification": "legal_sources",
                        "extension": ".pdf",
                        "size_bytes": len(pdf_bytes),
                        "sha256": source_hash,
                        "knowledge_stage": "L0_staged_unreviewed",
                        "access_class": "unclassified_pending_review",
                        "rights_status": "unknown_pending_review",
                        "indexing_allowed": False,
                        "retrieval_allowed": False,
                    }
                ],
            }
            manifest_path = stage_root / "staging-manifest.json"
            manifest_path.write_text(json.dumps(staging_manifest, ensure_ascii=False), encoding="utf-8")
            manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()

            result = parse_staged_documents(
                stage_root,
                root / "parsed",
                expected_manifest_sha256=manifest_hash,
                ocr=True,
                artifacts_dir=artifacts_dir,
            )
            parse_manifest = json.loads((root / "parsed" / "parse-manifest.json").read_text("utf-8"))
            record = parse_manifest["files"][0]
            self.assertIn(
                "output_file",
                record,
                f"Docling OCR did not produce an artifact: {record.get('status')} "
                f"(error stage: {record.get('error_stage')})",
            )
            document = json.loads((root / "parsed" / record["output_file"]).read_text("utf-8"))
            extracted = "\n".join(page["markdown"] for page in document["content"]["pages"])

            self.assertEqual(result["parsed_files"], 1)
            self.assertEqual(document["parser"]["name"], "docling")
            self.assertTrue(document["parser"]["ocr_enabled"])
            self.assertFalse(document["review"]["indexing_allowed"])
            self.assertFalse(document["review"]["retrieval_allowed"])
            self.assertIn("MAVIS", extracted.upper())
            normalized_persian = re.sub(r"[\u064B-\u065F\u0670]", "", extracted)
            normalized_persian = (
                normalized_persian.replace("ي", "ی")
                .replace("ى", "ی")
                .replace("ك", "ک")
            )
            normalized_persian = " ".join(normalized_persian.split())
            self.assertIn("قانون", normalized_persian, f"Persian OCR output: {normalized_persian!r}")
            self.assertIn("ماویس", normalized_persian, f"Persian OCR output: {normalized_persian!r}")


if __name__ == "__main__":
    unittest.main()
