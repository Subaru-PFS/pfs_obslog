# PFS Obslog Backend

## Setup

```bash
cd backend
uv sync --all-extras
```

`pfs-datamodel` and `pfs-utils` are automatically installed from the `external/` directory via `[tool.uv.sources]` in `pyproject.toml`.

## Development

### Running Tests

```bash
uv run pytest
```

### Tests with Coverage

```bash
uv run pytest --cov=pfs_obslog --cov-report=html
```

## Package Structure

```
backend/
├── src/
│   └── pfs_obslog/    # Main package
│       └── module.py
├── tests/             # Test directory
│   └── test_module.py
└── pyproject.toml
```

Modules can be imported with `import pfs_obslog.module`.
