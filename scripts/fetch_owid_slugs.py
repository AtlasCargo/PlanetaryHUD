#!/usr/bin/env python3
"""
Fetch all OWID grapher slugs using the owid-catalog Python API
and write them to src/data/owidSlugs.json for frontend consumption.
"""

"""
Fetch all OWID grapher slugs by reading the OWID datasets datapackage.json from GitHub
and write them to src/data/owidSlugs.json for frontend consumption.
"""
import json
import sys
import ssl
from urllib.request import urlopen
from urllib.error import URLError, HTTPError

def main():
    # URL of the OWID datasets datapackage
    DP_URL = "https://raw.githubusercontent.com/owid/owid-datasets/master/datapackage.json"
    # Create unverified SSL context to avoid certificate validation errors
    context = ssl._create_unverified_context()
    try:
        with urlopen(DP_URL, timeout=30, context=context) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except HTTPError as e:
        print(f"HTTP error fetching datapackage.json: {e.code} {e.reason}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"URL error fetching datapackage.json: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error fetching datapackage.json: {e}", file=sys.stderr)
        sys.exit(1)

    resources = data.get('resources', [])
    slugs = set()
    for r in resources:
        path = r.get('path', '')
        # Match paths like datasets/owid/<slug>/datapackage.json
        parts = path.split('/')
        if len(parts) == 4 and parts[0] == 'datasets' and parts[1] == 'owid' and parts[3] == 'datapackage.json':
            slugs.add(parts[2])

    if not slugs:
        print("No OWID slugs found in datapackage.json", file=sys.stderr)
    out = sorted(slugs)
    out_path = "src/data/owidSlugs.json"
    try:
        with open(out_path, 'w') as f:
            json.dump(out, f, indent=2)
        print(f"Wrote {len(out)} slugs to {out_path}")
    except Exception as e:
        print(f"Error writing slugs to file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

if __name__ == "__main__":
    main()