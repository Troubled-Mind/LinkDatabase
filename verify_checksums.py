#!/usr/bin/env python3
"""
Verify a downloaded recording folder against its Checksums.b2 manifest.

On Linux/macOS you don't need this script -- coreutils already ships
`b2sum`, so just run:

    b2sum -c "Checksums.b2"

from inside the recording folder. This script exists for platforms
(mainly Windows) that don't have a BLAKE2b checksum tool built in, but
works anywhere Python 3 is installed.

Usage:
    - Drop this file inside the downloaded recording folder (next to
      Checksums.b2) and double-click it, or drag the folder/manifest
      onto it in Explorer.
    - Or run from a terminal:  python verify_checksums.py [path]
      (path defaults to this script's own folder if omitted)
"""
import hashlib
import os
import sys

MANIFEST_NAME = "Checksums.b2"
CHUNK_SIZE = 4 * 1024 * 1024


def hash_file(path):
    h = hashlib.blake2b()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(CHUNK_SIZE), b""):
            h.update(chunk)
    return h.hexdigest()


def read_manifest(manifest_path):
    entries = {}
    with open(manifest_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            digest, sep, rel_path = line.partition("  ")
            if sep and digest:
                entries[rel_path] = digest
    return entries


def resolve_target(arg):
    """Accept a folder, or a file dropped onto the script (use its parent folder)."""
    path = os.path.abspath(arg) if arg else os.path.dirname(os.path.abspath(__file__))
    if os.path.isfile(path):
        path = os.path.dirname(path)
    return path


def main():
    target = resolve_target(sys.argv[1] if len(sys.argv) > 1 else None)
    manifest_path = os.path.join(target, MANIFEST_NAME)

    if not os.path.exists(manifest_path):
        print(f"No {MANIFEST_NAME} found in: {target}")
        print("Place this script inside the downloaded recording folder, or pass the folder as an argument.")
        return 1

    expected = read_manifest(manifest_path)
    failures = 0

    for rel_path in sorted(expected):
        full_path = os.path.join(target, *rel_path.split("/"))
        if not os.path.exists(full_path):
            print(f"{rel_path}: MISSING")
            failures += 1
            continue
        if hash_file(full_path) == expected[rel_path]:
            print(f"{rel_path}: OK")
        else:
            print(f"{rel_path}: FAILED")
            failures += 1

    print()
    if failures:
        print(f"\u274c {failures} of {len(expected)} file(s) failed verification.")
    else:
        print(f"\u2705 All {len(expected)} file(s) verified successfully.")

    return 1 if failures else 0


if __name__ == "__main__":
    code = main()
    if os.name == "nt" and len(sys.argv) <= 1:
        input("\nPress Enter to close...")
    sys.exit(code)
