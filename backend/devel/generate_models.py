#!/usr/bin/env python3
"""Generate SQLAlchemy models from database schema.

This script uses sqlacodegen to generate SQLAlchemy 2.0 style models
from an existing PostgreSQL database.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

# Default output path
DEFAULT_OUTPUT = Path(__file__).parent.parent / "src" / "pfs_obslog" / "models.py"

# Database connection settings
DB_CONFIGS = {
    "test": {
        "host": "localhost",
        "port": 15432,
        "database": "opdb",
        "user": "pfs",
    },
    "production": {
        "host": "133.40.164.48",
        "port": 5432,
        "database": "opdb",
        "user": "pfs",
    },
}

# 継承クラスで親と同名カラムを持つため use_existing_column=True が必要なクラス・カラム
# key: クラス名, value: カラム名のリスト
INHERITED_COLUMN_FIXES = {
    "AgcMatch": ["flags"],
    "CobraMatch": ["flags"],
    "CobraMove": ["flags"],
}


def build_connection_url(config: dict, password: str | None = None) -> str:
    """Build PostgreSQL connection URL from config."""
    user = config["user"]
    host = config["host"]
    port = config["port"]
    database = config["database"]

    if password:
        return f"postgresql://{user}:{password}@{host}:{port}/{database}"
    return f"postgresql://{user}@{host}:{port}/{database}"


def generate_models(
    db_url: str,
    output_path: Path,
    schemas: list[str] | None = None,
) -> None:
    """Generate SQLAlchemy models using sqlacodegen."""
    cmd = [
        sys.executable,
        "-m",
        "sqlacodegen",
        db_url,
        "--generator", "declarative",
        "--outfile", str(output_path),
    ]

    if schemas:
        for schema in schemas:
            cmd.extend(["--schemas", schema])

    print(f"Running: {' '.join(cmd[:3])} [db_url] {' '.join(cmd[4:])}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    print(f"Models generated successfully: {output_path}")

    # Apply post-processing fixes
    _apply_postprocess_fixes(output_path)

    # Show summary
    if output_path.exists():
        content = output_path.read_text()
        class_count = content.count("class ") - 1  # -1 for Base class
        print(f"Generated {class_count} model classes")


def _apply_postprocess_fixes(output_path: Path) -> None:
    """Apply post-processing fixes to generated models.

    This fixes issues that sqlacodegen doesn't handle well:
    - Inherited columns that need use_existing_column=True
    """
    content = output_path.read_text()
    original_content = content

    # Fix inherited columns
    for class_name, columns in INHERITED_COLUMN_FIXES.items():
        for column_name in columns:
            content = _fix_inherited_column(content, class_name, column_name)

    if content != original_content:
        output_path.write_text(content)
        print("Applied post-processing fixes for inherited columns")


def _fix_inherited_column(content: str, class_name: str, column_name: str) -> str:
    """Add use_existing_column=True to inherited column definitions.

    This fixes SQLAlchemy warnings about implicitly combining columns
    when a child class has a column with the same name as the parent.
    """
    # Step 1: Find the class definition block
    class_pattern = rf'(class\s+{class_name}\s*\([^)]+\)\s*:.*?)(?=\nclass\s|\Z)'
    class_match = re.search(class_pattern, content, flags=re.DOTALL)
    if not class_match:
        return content

    class_content = class_match.group(1)
    class_start = class_match.start(1)

    # Step 2: Find the column definition within the class
    # Mapped[...] can contain nested brackets, so we use a simpler pattern
    col_pattern = rf'(    {column_name}: Mapped\[.*?\] = mapped_column\()([^)]+)(\))'
    col_match = re.search(col_pattern, class_content)
    if not col_match:
        return content

    # Check if use_existing_column is already present
    column_args = col_match.group(2)
    if "use_existing_column" in column_args:
        return content

    # Step 3: Build the replacement
    new_column_args = column_args.rstrip() + ", use_existing_column=True"
    new_col_def = col_match.group(1) + new_column_args + col_match.group(3)

    # Step 4: Replace in the class content
    new_class_content = class_content[:col_match.start()] + new_col_def + class_content[col_match.end():]

    # Step 5: Replace in the full content
    return content[:class_start] + new_class_content + content[class_match.end():]


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate SQLAlchemy models from database schema"
    )
    parser.add_argument(
        "--env",
        choices=["test", "production"],
        default="test",
        help="Database environment (default: test)",
    )
    parser.add_argument(
        "--password",
        help="Database password (uses ~/.pgpass if not provided)",
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output file path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--schemas",
        nargs="+",
        help="Specific schemas to include (default: all schemas)",
    )

    args = parser.parse_args()

    config = DB_CONFIGS[args.env]
    db_url = build_connection_url(config, args.password)

    # Ensure output directory exists
    args.output.parent.mkdir(parents=True, exist_ok=True)

    generate_models(db_url, args.output, args.schemas)


if __name__ == "__main__":
    main()
