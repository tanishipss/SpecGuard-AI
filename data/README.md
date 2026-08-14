# data/

Place source 3GPP specification PDFs here before ingesting them (e.g. `data/23501-h70.pdf` for TS 23.501 Rel-17).

This directory is not committed with corpus content — 3GPP specs are publicly downloadable from the [3GPP specification archive](https://www.3gpp.org/specifications-technologies/specifications-by-series) but are not redistributed in this repo.

To ingest a file placed here, call:

```
POST /api/v1/ingest
{
  "file_path": "data/23501-h70.pdf",
  "spec_number": "23.501",
  "release": "Rel-17",
  "version": "h70"
}
```

See `backend/ingestion/pipeline.py` for what happens next (parse → chunk → quality-check → embed → store), and the top-level README for full setup steps.
