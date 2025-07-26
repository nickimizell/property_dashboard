#!/usr/bin/env python3
"""
PDF Plumber-based text extraction for problematic PDFs
This script provides robust PDF text extraction using pdfplumber
"""

import sys
import json
import pdfplumber
import io
import traceback

def extract_pdf_text(pdf_path_or_bytes):
    """
    Extract text from PDF using pdfplumber
    """
    try:
        if isinstance(pdf_path_or_bytes, str):
            # File path provided
            with pdfplumber.open(pdf_path_or_bytes) as pdf:
                return extract_from_pdf_object(pdf)
        else:
            # Bytes provided via stdin
            pdf_bytes = sys.stdin.buffer.read()
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                return extract_from_pdf_object(pdf)
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

def extract_from_pdf_object(pdf):
    """
    Extract text and metadata from pdfplumber PDF object
    """
    pages_data = []
    total_text = ""
    
    for page_num, page in enumerate(pdf.pages):
        try:
            # Extract text from page
            page_text = page.extract_text() or ""
            
            # Extract tables if any
            tables = []
            try:
                page_tables = page.extract_tables()
                if page_tables:
                    for table in page_tables:
                        if table:
                            # Convert table to text representation
                            table_text = "\n".join(["\t".join([cell or "" for cell in row]) for row in table])
                            tables.append(table_text)
            except:
                pass  # Tables extraction can fail, continue without them
            
            page_data = {
                "page_number": page_num + 1,
                "text": page_text,
                "tables": tables,
                "char_count": len(page_text)
            }
            
            pages_data.append(page_data)
            total_text += page_text + "\n\f\n"  # Page separator
            
        except Exception as e:
            # If individual page fails, add error info but continue
            page_data = {
                "page_number": page_num + 1,
                "text": "",
                "tables": [],
                "char_count": 0,
                "error": str(e)
            }
            pages_data.append(page_data)
    
    return {
        "success": True,
        "total_pages": len(pdf.pages),
        "total_text": total_text.strip(),
        "pages": pages_data,
        "total_chars": len(total_text.strip()),
        "metadata": {
            "has_text": len(total_text.strip()) > 0,
            "pages_with_text": len([p for p in pages_data if p["char_count"] > 0]),
            "pages_with_errors": len([p for p in pages_data if "error" in p])
        }
    }

def main():
    """
    Main function - can be called with file path or read from stdin
    """
    try:
        if len(sys.argv) > 1:
            # File path provided as argument
            pdf_path = sys.argv[1]
            result = extract_pdf_text(pdf_path)
        else:
            # Read PDF bytes from stdin
            result = extract_pdf_text(None)
        
        # Output JSON result
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()