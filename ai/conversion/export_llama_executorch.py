#!/usr/bin/env python3
"""
Reproducible Meta Llama 3.2 1B Instruct -> ExecuTorch (.pte) export script.

Prerequisites:
  1. Accept Meta Llama 3.2 Community License on Hugging Face:
     https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct
  2. Set HF_TOKEN environment variable or run `huggingface-cli login`.
  3. Install Optimum ExecuTorch (`pip install optimum-executorch`) or PyTorch ExecuTorch.

Usage:
  python ai/conversion/export_llama_executorch.py --output-dir ai/exports/llama-3.2-1b
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Export Llama 3.2 1B Instruct for ExecuTorch")
    parser.add_argument("--model-id", default="meta-llama/Llama-3.2-1B-Instruct")
    parser.add_argument("--output-dir", default="ai/exports/llama-3.2-1b")
    parser.add_argument("--recipe", default="xnnpack", choices=["xnnpack"])
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not os.environ.get("HF_TOKEN"):
        print(
            "[ERROR] HF_TOKEN is not set. Meta Llama 3.2 1B Instruct is a gated model.\n"
            "1. Review and accept Meta's license at https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct\n"
            "2. Export HF_TOKEN=<your_token> or run `huggingface-cli login`.\n"
            "Refusing to bypass licensing or substitute a remote API.",
            file=sys.stderr,
        )
        return 2

    cmd = [
        "optimum-cli",
        "export",
        "executorch",
        "--model",
        args.model_id,
        "--task",
        "text-generation",
        "--recipe",
        args.recipe,
        "--use_custom_sdpa",
        "--use_custom_kv_cache",
        "--output_dir",
        str(out_dir),
    ]
    print("Running:", " ".join(cmd))
    res = subprocess.run(cmd, check=False)
    if res.returncode != 0:
        print(f"[ERROR] optimum-cli export exited with code {res.returncode}", file=sys.stderr)
        return res.returncode

    manifest = {"model_id": args.model_id, "recipe": args.recipe, "files": {}}
    for file_path in sorted(out_dir.glob("*")):
        if file_path.is_file() and file_path.suffix in {".pte", ".model", ".json", ".bin"}:
            manifest["files"][file_path.name] = {
                "size_bytes": file_path.stat().st_size,
                "sha256": sha256_file(file_path),
            }

    manifest_path = out_dir / "manifest.sha256.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Export complete. Integrity manifest written to {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
