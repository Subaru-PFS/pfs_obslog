# Model Auto-generation Script

A script that auto-generates SQLAlchemy 2.0 style models from the DB schema.

## Usage

### Generate models from test DB

```bash
cd backend
uv run python devel/generate_models.py --env test
```

### Generate models from production DB

```bash
cd backend
uv run python devel/generate_models.py --env production
```

※ Connecting to production DB requires `~/.pgpass` configuration.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--env` | Target environment (`test` / `production`) | `test` |
| `--password` | DB password (when not using `~/.pgpass`) | - |
| `--output`, `-o` | Output file path | `src/pfs_obslog/models.py` |
| `--schemas` | Target schemas (can specify multiple) | All schemas |

## Output Example

```
Running: python -m sqlacodegen [db_url] --generator dataclasses --outfile src/pfs_obslog/models.py
Models generated successfully: src/pfs_obslog/models.py
Generated 54 model classes
```

## About Generated Models

- Generated in SQLAlchemy 2.0 `DeclarativeBase` style
- Includes `Mapped[]` type annotations
- Relationships are also auto-generated

## DB Connection Information

| Environment | Host | Port | Database | User |
|-------------|------|------|----------|------|
| test | localhost | 15432 | opdb | pfs |
| production | 133.40.164.48 | 5432 | opdb | pfs |
