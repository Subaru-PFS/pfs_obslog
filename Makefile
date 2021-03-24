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
	open ./htmlcov/index.html

setup:
	$(MAKE) -B .venv

setup-test-db:
	$(postgres_home)/bin/dropdb --user=postgres opdb_test || true
	$(postgres_home)/bin/createdb --user=postgres opdb_test
	$(postgres_home)/bin/psql --user=postgres --dbname=opdb_test < ./db/opdb-schema.sql

clean:
	rm -rf .venv

.PHONY: schemaspy

schemaspy:
	bash ./schemaspy/run.bash
	open ./schemaspy/html/index.html

.venv:
	$(python) -m venv $@
	.venv/bin/python -m venv .venv
	.venv/bin/pip install -e .
	.venv/bin/pip install -e ."[dev]"

deploy:
	bash ./deploy.bash