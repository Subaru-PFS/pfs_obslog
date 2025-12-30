#!/usr/bin/env python3
"""Generate SQLAlchemy models from database schema.

This script uses sqlacodegen to generate SQLAlchemy 2.0 style models
from an existing PostgreSQL database.
"""

import argparse
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
        "--generator", "dataclasses",
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

    # Show summary
    if output_path.exists():
        content = output_path.read_text()
        class_count = content.count("class ") - 1  # -1 for Base class
        print(f"Generated {class_count} model classes")


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
