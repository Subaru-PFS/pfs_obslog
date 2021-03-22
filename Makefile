python := python
postgres_home := /usr

test-watch:
	./.venv/bin/ptw -- \
			$(opt) \
			-v \
			--cov-config=.coveragerc \
			--cov=pfs_obslog \
			--cov-report=html \
			--cov-branch tests

test:
	./.venv/bin/pytest \
			-v \
			--cov-config=.coveragerc \
			--cov=pfs_obslog \
			--cov-report=html \
			--cov-branch tests

setup:
	$(MAKE) -B .venv

setup-test-db:
	$(postgres_home)/bin/dropdb --user=postgres opdb_test || true
	$(postgres_home)/bin/createdb --user=postgres opdb_test
	$(postgres_home)/bin/psql --user=postgres --dbname=opdb_test < ./db/opdb-schema.sql

clean:
	rm -rf .venv

.venv:
	$(python) -m venv $@
	.venv/bin/python -m venv .venv
	.venv/bin/pip install -e .
	.venv/bin/pip install -e ."[dev]"
