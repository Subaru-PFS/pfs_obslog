python := python
postgres_home := /usr

test-watch:
	./.venv/bin/ptw -- \
			$(opt) \
			-v \
			--cov-config=.coveragerc \
			--cov=pfs_obslog \
			--cov-report=html \
			--cov-branch tests \
			tests src

test:
	./.venv/bin/pytest \
			-v \
			--cov-config=.coveragerc \
			--cov=pfs_obslog \
			--cov-report=html \
			--cov-branch tests
	open ./htmlcov/index.html

dev-server:
	PFS_OBSLOG_ENV=development \
	PFS_OBSLOG_DATA_ROOT=$(HOME)/pfs/data \
		bash ./start.bash

prod-server:
	(cd webui && npm run build -- --base=./)
	PFS_OBSLOG_ENV=production \
	PFS_OBSLOG_DSN=postgresql://postgres@localhost/opdb \
	bash ./start.bash --port=5000

setup:
	$(MAKE) -B .venv

setup-test-db:
	$(postgres_home)/bin/dropdb --user=postgres opdb_test || true
	$(postgres_home)/bin/createdb --user=postgres opdb_test
	PFS_OBSLOG_ENV=test ./.venv/bin/python -m tests.db.setup

clean:
	rm -rf .venv

.PHONY: schemaspy

schemaspy:
	bash ./schemaspy/run.bash
	open ./schemaspy/html/index.html

.venv:
	$(python) -m venv $@
	.venv/bin/python -m venv .venv
	.venv/bin/pip install .
	.venv/bin/pip install ."[dev]"
	.venv/bin/pip install -e .
	.venv/bin/pip install -e ./spt_operational_database

deploy:
	bash ./deploy.bash

mount-data:
	mkdir -p ~/pfs/data
	sshfs pfs-obslog:/data ~/pfs/data -C -o volname=pfsdata -o reconnect

umount-data:
	umount ~/pfs/data
