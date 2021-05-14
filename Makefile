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
	PFS_OBSLOG_DSN=postgresql://postgres@localhost/opdb \
	PFS_OBSLOG_DATA_ROOT=$(HOME)/pfs/data \
		bash ./start.bash

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

pip_option := --use-feature=in-tree-build

.venv:
	$(python) -m venv $@
	.venv/bin/pip install --upgrade pip
	.venv/bin/python -m venv .venv
	.venv/bin/pip install --use-feature=in-tree-build --upgrade pip
	.venv/bin/pip install --use-feature=in-tree-build .
	.venv/bin/pip install --use-feature=in-tree-build ."[dev]"
	.venv/bin/pip install --use-feature=in-tree-build -e .
	.venv/bin/pip install --use-feature=in-tree-build -e ./spt_operational_database

deploy:
	bash ./deploy.bash

mount-data:
	$(MAKE) umount-data || true
	mkdir -p ~/pfs/data
	sshfs pfs-obslog:/data ~/pfs/data -C -o volname=pfsdata -o reconnect

umount-data:
	umount ~/pfs/data