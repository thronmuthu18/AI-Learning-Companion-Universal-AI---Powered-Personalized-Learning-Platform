#!/usr/bin/env python3
"""
Verifies integrity (SHA-256) of exported ExecuTorch .pte and tokenizer artifacts
against manifest.sha256.json before pushing to Android/iOS device storage.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify exported model SHA-256 checksums")
    parser.add_argument("export_dir", help="Directory containing .pte, tokenizer, and manifest.sha256.json")
    args = parser.parse_args()

    export_dir = Path(args.export_dir)
    manifest_path = export_dir / "manifest.sha256.json"
    if not manifest_path.exists():
        print(f"[ERROR] Missing manifest: {manifest_path}", file=sys.stderr)
        return 1

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    failures = 0
    for name, info in manifest.get("files", {}).items():
        target = export_dir / name
        if not target.exists():
            print(f"[FAIL] Missing file: {target}", file=sys.stderr)
            failures += 1
            continue
        actual = sha256_file(target)
        expected = info["sha256"]
        if actual != expected:
            print(f"[FAIL] Checksum mismatch for {name}: expected {expected}, got {actual}", file=sys.stderr)
            failures += 1
        else:
            print(f"[PASS] {name} ({info['size_bytes']} bytes) sha256={actual[:16]}...")

    return 1 if failures > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
