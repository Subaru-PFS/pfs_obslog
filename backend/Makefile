python ?= python
PFS_OBSLOG_ENV ?= development
postgres_home ?= /Applications/Postgres.app/Contents/Versions/latest

app_server := pfs-obslog
copy_to := pfs-ics-shell:pfs_obslog/

.PHONY: hotdev

run:
	BIND_ADDRESS=127.0.0.1:8000 \
	./runner bash ./entrypoint.bash

test:
	PFS_OBSLOG_ENV=test ./runner bash ./entrypoint.bash --only-setup
	./runner python -m pytest \
		$(opts) \
		-v \
		--cov-config=.coveragerc \
		--cov=pfs_obslog \
		--cov-report=html \
		--cov-branch

test/watch:
	./.venv/bin/ptw --runner "$(MAKE) test"

hotdev:
	PFS_OBSLOG_ENV=test ./runner bash ./entrypoint.bash --only-setup
	./runner python -m pytest \
		$(opts) \
		-v \
		--cov-config=.coveragerc \
		--cov=pfs_obslog \
		--cov-report=html \
		--cov-branch \
		hotdev

hotdev/watch:
	./.venv/bin/ptw --runner "$(MAKE) hotdev"

test/setup-db:
	$(postgres_home)/bin/dropdb --user=postgres opdb-test || true
	$(postgres_home)/bin/createdb --user=postgres opdb-test
	ssh pfs-ics-shell 'pg_dump -h 133.40.164.48 -U pfs opdb --clean --schema-only' | $(postgres_home)/bin/psql --user postgres opdb-test
	ssh pfs-ics-shell 'pg_dump -h 133.40.164.48 -U pfs opdb --data-only --exclude-table={mcs_data,cobra_target,cobra_match,agc_data,agc_match,obslog_fits_header,pfs_design_fiber}' | $(postgres_home)/bin/psql --user postgres opdb-test

devel/setup:
	$(python) -m venv .venv
	./.venv/bin/pip install --upgrade pip
	./.venv/bin/pip install -e .
	./.venv/bin/pip install -e ."[dev]"
	./.venv/bin/pip install -e ../external/spt_operational_database
	./.venv/bin/pip install -e ../external/pfs_utils
	./.venv/bin/pip install -e ../external/datamodel
	./runner bash ./entrypoint.bash --only-setup

devel/server:
	BIND_ADDRESS=127.0.0.1:8000 \
	PFS_OBSLOG_ENV=development ./runner bash ./entrypoint.bash

devel/schemaspy:
	$(postgres_home)/bin/dropdb --user=postgres opdb-schema || true
	$(postgres_home)/bin/createdb --user=postgres opdb-schema
	PFS_OBSLOG_DSN=postgresql://postgres@localhost/opdb-schema \
		./runner python -m tests.db.setup
	bash ./schemaspy/run.bash
	open ./schemaspy/html/index.html

devel/db/load-remote:
	$(postgres_home)/bin/dropdb --user=postgres opdb || true
	$(postgres_home)/bin/createdb --user=postgres opdb
	ssh pfs-ics-shell 'pg_dump -h 133.40.164.48 -U pfs opdb --clean --schema-only' | $(postgres_home)/bin/psql --user postgres opdb
	ssh pfs-ics-shell 'pg_dump -h 133.40.164.48 -U pfs opdb --data-only --exclude-table={mcs_data,cobra_target,cobra_match,agc_data,agc_match,obslog_fits_header,pfs_design_fiber}' | $(postgres_home)/bin/psql --user postgres opdb

devel/db/snapshot:
	mkdir -p snapshot
	$(postgres_home)/bin/pg_dump --user postgres --clean opdb | gzip -c > snapshot/dump.sql.gz
	
devel/db/renew-snapshot:
	mkdir -p snapshot
	ssh pfs-ics-shell 'cat dump.sql' | gzip -c > snapshot/dump.sql.gz

devel/db/restore:
	gzip -d < snapshot/dump.sql.gz | $(postgres_home)/bin/psql --user postgres opdb

devel/sync:
	rsync -av --delete --exclude=$(rsync_exclude) --rsync-path=/home/michitaro/machines/obslog-ics.pfs.sum.subaru.nao.ac.jp/packages/rsync/bin/rsync ../ pfs-obslog:devel/pfs_obslog

devel/sync-watch:
	./.venv/bin/watchmedo shell-command -w -c '$(MAKE) devel/sync' -R ./src ../webui/src

devel/type-check:
	./.venv/bin/pyright

devel/type-check-watch:
	./.venv/bin/ptw --runner "$(MAKE) devel/type-check"

devel/console:
	./runner ./.venv/bin/ipython

webui/build:
	cd ../webui && VITE_API_BASE_URL=. npm run build

rsync_exclude := {.env,secrets,.venv,.nodeenv,node_modules,schemaspy/html,htmlcov,logs,attachments,tmp,__pycache__,'*.sock',snapshot,sample_data,pfsDesign}

deploy/production-sync:
	rsync -av --delete --exclude=$(rsync_exclude) ../ $(copy_to)

deploy/production-restart:
	ssh $(app_server) systemctl --user restart pfs-obslog

deploy:
	$(MAKE) webui/build
	$(MAKE) deploy-only-backend

deploy-only-backend:
	./runner python -m pfs_obslog.filecache.clear 
	$(MAKE) deploy/production-sync || true
	$(MAKE) deploy/production-restart

deploy/install_user_systemd:
	loginctl enable-linger $(USER)
	mkdir -p ~/.config/systemd/user
	bash -c 'template="$$(cat ./systemd/pfs-obslog.user.service.template)" ; eval "echo \"$$template\""' > ./systemd/pfs-obslog.service
	cp ./systemd/pfs-obslog.service ~/.config/systemd/user/
	systemctl --user daemon-reload
	systemctl --user enable pfs-obslog --now

deploy/install_root_systemd:
	bash -c 'template="$$(cat ./systemd/pfs-obslog.root.service.template)" ; eval "echo \"$$template\""' > /etc/systemd/system/pfs-obslog.service
	systemctl daemon-reload
	systemctl enable pfs-obslog --now
