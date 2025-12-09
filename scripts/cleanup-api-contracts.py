#!/usr/bin/env python3
"""
Cleanup api-contracts.ts by replacing manual types with Zod schema types.
Uses rg (ripgrep) and sd for fast, safe replacements.
"""

import subprocess
import sys

# Type mappings: old_type -> (new_type, new_import_source)
TYPE_MAPPINGS = {
    # Lease types
    "CreateLeaseInput": ("LeaseCreate", "@repo/shared/validation/leases"),
    "UpdateLeaseInput": ("LeaseUpdate", "@repo/shared/validation/leases"),

    # Property types
    "CreatePropertyInput": ("PropertyCreate", "@repo/shared/validation/properties"),
    "UpdatePropertyInput": ("PropertyUpdate", "@repo/shared/validation/properties"),
    "CreatePropertyRequest": ("PropertyCreate", "@repo/shared/validation/properties"),
    "UpdatePropertyRequest": ("PropertyUpdate", "@repo/shared/validation/properties"),

    # Unit types
    "CreateUnitInput": ("UnitInput", "@repo/shared/validation/units"),
    "UpdateUnitInput": ("UnitUpdate", "@repo/shared/validation/units"),
    "CreateUnitRequest": ("UnitInput", "@repo/shared/validation/units"),
    "UpdateUnitRequest": ("UnitUpdate", "@repo/shared/validation/units"),

    # Maintenance types
    "CreateMaintenanceRequestInput": ("MaintenanceRequestCreate", "@repo/shared/validation/maintenance"),
    "UpdateMaintenanceRequestInput": ("MaintenanceRequestUpdate", "@repo/shared/validation/maintenance"),
    "CreateMaintenanceRequest": ("MaintenanceRequestCreate", "@repo/shared/validation/maintenance"),
    "UpdateMaintenanceRequest": ("MaintenanceRequestUpdate", "@repo/shared/validation/maintenance"),
}

def run(cmd: str) -> tuple[int, str, str]:
    """Run a shell command and return (returncode, stdout, stderr)"""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr

def find_files_with_type(type_name: str) -> list[str]:
    """Find all TypeScript files that use a specific type"""
    code, stdout, _ = run(f"rg -l '{type_name}' apps/ packages/ --type ts 2>/dev/null || true")
    files = [f for f in stdout.strip().split('\n') if f and not f.endswith('api-contracts.ts')]
    return files

def replace_in_file(file_path: str, old: str, new: str):
    """Replace text in a file using sd"""
    run(f"sd '{old}' '{new}' '{file_path}'")

def main():
    print("=== API Contracts Type Cleanup ===\n")

    # Track which files need import updates
    files_to_update: dict[str, set[str]] = {}  # file -> set of new import sources

    # Step 1: Find all files that use old types and replace type names
    for old_type, (new_type, source) in TYPE_MAPPINGS.items():
        files = find_files_with_type(old_type)
        if files:
            print(f"Replacing {old_type} -> {new_type} in {len(files)} files")
            for f in files:
                # Skip api-contracts.ts itself
                if 'api-contracts.ts' in f:
                    continue

                # Replace the type name
                replace_in_file(f, old_type, new_type)

                # Track that this file needs the new import
                if f not in files_to_update:
                    files_to_update[f] = set()
                files_to_update[f].add(source)

    print(f"\n=== Files that need import updates: {len(files_to_update)} ===")
    for f, sources in sorted(files_to_update.items()):
        print(f"  {f}: {sources}")

    # Step 2: Update imports - replace api-contracts imports with validation imports
    print("\n=== Updating imports ===")

    # Group by source for cleaner import updates
    source_to_types: dict[str, list[str]] = {}
    for old_type, (new_type, source) in TYPE_MAPPINGS.items():
        if source not in source_to_types:
            source_to_types[source] = []
        if new_type not in source_to_types[source]:
            source_to_types[source].append(new_type)

    print("\nNew import sources and types:")
    for source, types in source_to_types.items():
        print(f"  {source}: {', '.join(types)}")

    print("\n=== Done! ===")
    print("Next steps:")
    print("1. Manually verify/fix imports in updated files")
    print("2. Delete old types from api-contracts.ts")
    print("3. Run type-check to verify")

if __name__ == "__main__":
    main()
