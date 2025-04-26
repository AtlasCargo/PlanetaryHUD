#!/usr/bin/env python3
"""
Script to dump the OWID dataset catalog (slugs, titles, descriptions, latest version)
into a JSON file for frontend consumption.
"""
import json
from owid import catalog

def main():
    # Fetch metadata index (no CSV data loaded)
    df = catalog.find("")

    out = []
    for _, row in df.iterrows():
        ds_slug = row.dataset
        meta = row.metadata.dataset
        out.append({
            "id": ds_slug,
            "title": meta.title,
            "description": getattr(meta, "description", ""),
            # metadata.version may contain the latest version string
            "version": getattr(meta, "version", "")
        })

    # Write to public folder so CRA can serve it
    with open("public/owid_catalog.json", "w") as f:
        json.dump(out, f, indent=2)

if __name__ == '__main__':
    main()