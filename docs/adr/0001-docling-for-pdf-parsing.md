# ADR-1: Docling over PyPDF2/pdfplumber for PDF parsing

## Status
Accepted

## Context
3GPP specifications are deeply structured documents — nested clause numbering, tables, figures, and a strict reading order that a naive text extractor collapses into an unstructured character stream.

## Decision
Use Docling as the primary PDF parser, with PyMuPDF as a diagnostic/fallback path when Docling fails to convert a file.

## Consequences
Docling preserves heading hierarchy, tables, and page boundaries, which the chunker (§3) depends on to keep clause structure intact. The PyMuPDF fallback trades structure for robustness — a document that fails structured parsing still gets ingested as flat text rather than failing the whole pipeline, at the cost of coarser chunk boundaries for that document.
