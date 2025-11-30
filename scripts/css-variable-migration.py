#!/usr/bin/env python3
"""
CSS Variable Migration Script for TailwindCSS v4 Alignment

This script finds and replaces old CSS variable patterns with the new
TailwindCSS v4 compliant namespaced versions.

Usage:
    python scripts/css-variable-migration.py --dry-run  # Preview changes
    python scripts/css-variable-migration.py            # Apply changes
"""

import os
import re
import argparse
from pathlib import Path
from typing import Dict, List, Tuple

# Define the search directory
SEARCH_DIR = Path(__file__).parent.parent / "apps" / "frontend" / "src"

# File extensions to process
FILE_EXTENSIONS = {".tsx", ".ts", ".css"}

# Replacement patterns: (find, replace)
REPLACEMENTS: List[Tuple[str, str]] = [
    # Color variables (without --color- prefix)
    (r"var\(--border\)", "var(--color-border)"),
    (r"var\(--background\)", "var(--color-background)"),
    (r"var\(--foreground\)", "var(--color-foreground)"),
    (r"var\(--muted\)", "var(--color-muted)"),
    (r"var\(--muted-foreground\)", "var(--color-muted-foreground)"),
    (r"var\(--primary\)", "var(--color-primary)"),
    (r"var\(--primary-foreground\)", "var(--color-primary-foreground)"),
    (r"var\(--secondary\)", "var(--color-secondary)"),
    (r"var\(--secondary-foreground\)", "var(--color-secondary-foreground)"),
    (r"var\(--accent\)", "var(--color-accent)"),
    (r"var\(--accent-foreground\)", "var(--color-accent-foreground)"),
    (r"var\(--destructive\)", "var(--color-destructive)"),
    (r"var\(--destructive-foreground\)", "var(--color-destructive-foreground)"),
    (r"var\(--card\)", "var(--color-card)"),
    (r"var\(--card-foreground\)", "var(--color-card-foreground)"),
    (r"var\(--popover\)", "var(--color-popover)"),
    (r"var\(--popover-foreground\)", "var(--color-popover-foreground)"),
    (r"var\(--ring\)", "var(--color-ring)"),
    (r"var\(--input\)", "var(--color-input)"),
    (r"var\(--success\)", "var(--color-success)"),
    (r"var\(--success-foreground\)", "var(--color-success-foreground)"),
    (r"var\(--warning\)", "var(--color-warning)"),
    (r"var\(--warning-foreground\)", "var(--color-warning-foreground)"),
    (r"var\(--info\)", "var(--color-info)"),
    (r"var\(--info-foreground\)", "var(--color-info-foreground)"),
    (r"var\(--sidebar\)", "var(--color-sidebar)"),
    (r"var\(--sidebar-foreground\)", "var(--color-sidebar-foreground)"),

    # Line height variables (--line-height-* to --leading-*)
    (r"var\(--line-height-display-2xl\)", "var(--leading-display-2xl)"),
    (r"var\(--line-height-display-xl\)", "var(--leading-display-xl)"),
    (r"var\(--line-height-display-lg\)", "var(--leading-display-lg)"),
    (r"var\(--line-height-display-md\)", "var(--leading-display-md)"),
    (r"var\(--line-height-display-sm\)", "var(--leading-display-sm)"),
    (r"var\(--line-height-large-title\)", "var(--leading-large-title)"),
    (r"var\(--line-height-title-1\)", "var(--leading-title-1)"),
    (r"var\(--line-height-title-2\)", "var(--leading-title-2)"),
    (r"var\(--line-height-title-3\)", "var(--leading-title-3)"),
    (r"var\(--line-height-headline\)", "var(--leading-headline)"),
    (r"var\(--line-height-body\)", "var(--leading-body)"),
    (r"var\(--line-height-callout\)", "var(--leading-callout)"),
    (r"var\(--line-height-subheadline\)", "var(--leading-subheadline)"),
    (r"var\(--line-height-footnote\)", "var(--leading-footnote)"),
    (r"var\(--line-height-caption\)", "var(--leading-caption)"),
    (r"var\(--line-height-none\)", "var(--leading-none)"),
    (r"var\(--line-height-tight\)", "var(--leading-tight)"),
    (r"var\(--line-height-snug\)", "var(--leading-snug)"),
    (r"var\(--line-height-normal\)", "var(--leading-normal)"),
    (r"var\(--line-height-relaxed\)", "var(--leading-relaxed)"),
    (r"var\(--line-height-loose\)", "var(--leading-loose)"),

    # Radius variables (old naming to standard)
    (r"var\(--radius-small\)", "var(--radius-sm)"),
    (r"var\(--radius-medium\)", "var(--radius-md)"),
    (r"var\(--radius-large\)", "var(--radius-lg)"),
    (r"var\(--radius-xlarge\)", "var(--radius-xl)"),
    (r"var\(--radius-xxlarge\)", "var(--radius-2xl)"),

    # Shadow variables (old naming to standard)
    (r"var\(--shadow-small\)", "var(--shadow-sm)"),
    (r"var\(--shadow-medium\)", "var(--shadow-md)"),
    (r"var\(--shadow-large\)", "var(--shadow-lg)"),

    # Typography variables (--font-* sizes to --text-*)
    (r"var\(--font-display-2xl\)", "var(--text-display-2xl)"),
    (r"var\(--font-display-xl\)", "var(--text-display-xl)"),
    (r"var\(--font-display-lg\)", "var(--text-display-lg)"),
    (r"var\(--font-display-md\)", "var(--text-display-md)"),
    (r"var\(--font-display-sm\)", "var(--text-display-sm)"),
    (r"var\(--font-large-title\)", "var(--text-large-title)"),
    (r"var\(--font-title-1\)", "var(--text-title-1)"),
    (r"var\(--font-title-2\)", "var(--text-title-2)"),
    (r"var\(--font-title-3\)", "var(--text-title-3)"),
    (r"var\(--font-headline\)", "var(--text-headline)"),
    (r"var\(--font-body\)", "var(--text-body)"),
    (r"var\(--font-callout\)", "var(--text-callout)"),
    (r"var\(--font-subheadline\)", "var(--text-subheadline)"),
    (r"var\(--font-footnote\)", "var(--text-footnote)"),
    (r"var\(--font-caption-1\)", "var(--text-caption-1)"),
    (r"var\(--font-caption-2\)", "var(--text-caption-2)"),
]


def find_files(directory: Path, extensions: set) -> List[Path]:
    """Find all files with given extensions in directory recursively."""
    files = []
    for ext in extensions:
        files.extend(directory.rglob(f"*{ext}"))
    return sorted(files)


def process_file(file_path: Path, dry_run: bool = True) -> Dict[str, any]:
    """Process a single file, finding and optionally replacing patterns."""
    result = {
        "file": str(file_path.relative_to(SEARCH_DIR.parent.parent.parent)),
        "changes": [],
        "modified": False
    }

    try:
        content = file_path.read_text(encoding="utf-8")
        original_content = content

        for pattern, replacement in REPLACEMENTS:
            matches = list(re.finditer(pattern, content))
            if matches:
                for match in matches:
                    # Find line number
                    line_num = content[:match.start()].count('\n') + 1
                    result["changes"].append({
                        "line": line_num,
                        "old": match.group(),
                        "new": replacement
                    })
                content = re.sub(pattern, replacement, content)

        if content != original_content:
            result["modified"] = True
            if not dry_run:
                file_path.write_text(content, encoding="utf-8")

    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Migrate CSS variables to TailwindCSS v4 naming conventions"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without modifying files"
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed output for each change"
    )
    args = parser.parse_args()

    print(f"\n{'=' * 60}")
    print("CSS Variable Migration Script")
    print(f"{'=' * 60}")
    print(f"Search directory: {SEARCH_DIR}")
    print(f"Mode: {'DRY RUN (no changes)' if args.dry_run else 'APPLY CHANGES'}")
    print(f"{'=' * 60}\n")

    # Find files
    files = find_files(SEARCH_DIR, FILE_EXTENSIONS)
    print(f"Found {len(files)} files to scan\n")

    # Process files
    total_changes = 0
    modified_files = 0

    for file_path in files:
        result = process_file(file_path, dry_run=args.dry_run)

        if result.get("changes"):
            modified_files += 1
            change_count = len(result["changes"])
            total_changes += change_count

            print(f"\n{result['file']} ({change_count} changes)")
            print("-" * 50)

            if args.verbose:
                for change in result["changes"]:
                    print(f"  Line {change['line']}: {change['old']} -> {change['new']}")
            else:
                # Group changes by type
                change_summary = {}
                for change in result["changes"]:
                    key = f"{change['old']} -> {change['new']}"
                    change_summary[key] = change_summary.get(key, 0) + 1
                for change_type, count in change_summary.items():
                    print(f"  {count}x {change_type}")

    # Summary
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    print(f"Files scanned:  {len(files)}")
    print(f"Files modified: {modified_files}")
    print(f"Total changes:  {total_changes}")

    if args.dry_run and total_changes > 0:
        print(f"\nRun without --dry-run to apply these changes:")
        print(f"  python {__file__}")
    elif total_changes > 0:
        print(f"\nAll changes applied successfully!")
    else:
        print(f"\nNo changes needed - all files are up to date!")

    print()


if __name__ == "__main__":
    main()
