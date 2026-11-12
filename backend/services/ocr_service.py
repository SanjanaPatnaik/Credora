import os
import pymupdf  # PyMuPDF
from typing import Dict, Any

def extract_text_from_pdf(file_path: str) -> Dict[str, Any]:
    """
    Extracts text and page layout from a PDF using PyMuPDF.
    Returns:
        {
            "pages": [{"page_num": 1, "text": "...", "confidence": 0.98}],
            "full_text": "...",
            "page_count": 1,
            "is_digital": True,
            "overall_confidence": 0.98
        }
    """
    if not os.path.exists(file_path):
        return {
            "pages": [],
            "full_text": "",
            "page_count": 0,
            "is_digital": False,
            "overall_confidence": 0.0,
            "error": "File not found"
        }

    try:
        doc = pymupdf.open(file_path)
        pages_data = []
        full_text_parts = []
        total_chars = 0

        for idx, page in enumerate(doc):
            text = page.get_text("text")
            full_text_parts.append(text)
            char_count = len(text.strip())
            total_chars += char_count

            # If selectable characters exist, it's digital PDF with high confidence
            page_conf = 0.98 if char_count > 40 else 0.85
            pages_data.append({
                "page_num": idx + 1,
                "text": text,
                "confidence": page_conf,
                "char_count": char_count
            })

        doc.close()
        full_text = "\n".join(full_text_parts)

        is_digital = total_chars > 30
        overall_conf = 0.97 if is_digital else 0.70

        return {
            "pages": pages_data,
            "full_text": full_text,
            "page_count": len(pages_data),
            "is_digital": is_digital,
            "overall_confidence": overall_conf
        }
    except Exception as e:
        return {
            "pages": [],
            "full_text": "",
            "page_count": 0,
            "is_digital": False,
            "overall_confidence": 0.0,
            "error": str(e)
        }

