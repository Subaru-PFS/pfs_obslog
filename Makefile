python := python
postgres_home := /usr
rsync_exclude := {secrets,.venv,node_modules,schemaspy/html,htmlcov,logs,attachments,tmp,__pycache__,'*.sock'}

.PHONY: schemaspy

test:
	./.venv/bin/pytest \
			-v \
			--cov-config=.coveragerc \
			--cov=pfs_obslog \
			--cov-report=html \
			--cov-branch tests \
			tests
	open ./htmlcov/index.html

test-watch:
	./.venv/bin/ptw -- $(opt) -v tests

dev-server:
	PFS_OBSLOG_ENV=development bash ./start.bash

dev-watch:
	./.venv/bin/ptw -- \
			$(opt) \
			-s \
			-v \
			dev

rsync_path := /home/michitaro/machines/obslog-ics.pfs.sum.subaru.nao.ac.jp/packages/rsync/bin/rsync

dev-sync:
	rsync \
		--rsync-path=$(rsync_path) \
		-av --delete --exclude=$(rsync_exclude) \
		./ pfs-obslog:devel/pfs_obslog/

dev-sync-watch:
	$(MAKE) dev-sync
	./.venv/bin/watchmedo shell-command -D -W -c '$(MAKE) dev-sync' -R src ./webui/src

setup-test-db:
	$(postgres_home)/bin/dropdb --user=postgres opdb_test || true
	$(postgres_home)/bin/createdb --user=postgres opdb_test
	PFS_OBSLOG_ENV=test \
	PFS_OBSLOG_DSN=postgresql://postgres@localhost/opdb_test \
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
