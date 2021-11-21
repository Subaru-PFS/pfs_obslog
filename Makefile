python := python
postgres_home := /usr
rsync_exclude := {secrets,.venv,node_modules,schemaspy/html,htmlcov,logs,attachments,tmp,__pycache__,'*.sock'}

.PHONY: schemaspy

test:
	./.venv/bin/pytest \
			$(opt) \
			-v \
			--cov-config=.coveragerc \
			--cov=pfs_obslog \
			--cov-report=html \
			--cov-branch tests \
			tests

test-watch:
	./.venv/bin/ptw --runner "$(MAKE) test"

dev-server:
	PFS_OBSLOG_ENV=development bash ./start.bash

rsync_path := /home/michitaro/machines/obslog-ics.pfs.sum.subaru.nao.ac.jp/packages/rsync/bin/rsync

dev-sync:
	rsync \
		--rsync-path=$(rsync_path) \
		-av --delete --exclude=$(rsync_exclude) \
		./ pfs-obslog:devel/pfs_obslog/

dev-sync-watch:
	$(MAKE) dev-sync
	./.venv/bin/watchmedo shell-command -D -W -c '$(MAKE) dev-sync' -R \
		tests src ./webui/src spt_operational_database/{python/opdb,tests}

setup-test-db:
	$(postgres_home)/bin/dropdb --user=postgres opdb_test || true
	$(postgres_home)/bin/createdb --user=postgres opdb_test
	PFS_OBSLOG_ENV=test \
	PFS_OBSLOG_DSN=$(shell cat tests/pfs_obslog/server/secrets/dsn.example.txt) \
	./.venv/bin/python -m tests.db.setup

schemaspy:
	$(postgres_home)/bin/dropdb --user=postgres opdb-schema || true
	$(postgres_home)/bin/createdb --user=postgres opdb-schema
	PFS_OBSLOG_ENV=test \
	PFS_OBSLOG_DSN=postgresql://postgres@localhost/opdb-schema \
	PFS_OBSLOG_DATA_ROOT=/data \
	./.venv/bin/python -m tests.db.setup
	bash ./schemaspy/run.bash
	open ./schemaspy/html/index.html

setup:
	$(python) -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -e .
	.venv/bin/pip install -e ."[dev]"
	.venv/bin/pip install -e ./spt_operational_database

webui-build:
	cd webui && npm run build -- --base=./

production-sync: webui-build
	rsync -av --delete --exclude=$(rsync_exclude) ./ pfs-ics-shell:pfs_obslog/

production-restart:
	ssh pfs-obslog systemctl --user restart pfs-obslog

deploy:
	$(MAKE) production-sync
	$(MAKE) production-restart

install_systemd:
	loginctl enable-linger $(USER)
	mkdir -p ~/.config/systemd/user
	bash -c 'template="$$(cat ./systemd/pfs-obslog.service.template)" ; eval "echo \"$$template\""' > ./systemd/pfs-obslog.service
	cp ./systemd/pfs-obslog.service ~/.config/systemd/user/
	systemctl --user daemon-reload
	systemctl --user enable pfs-obslog --now
