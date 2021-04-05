(cd webui && npm run build -- --base=./)
rsync -av --delete --exclude={.venv,node_modules,schemaspy/html,htmlcov} ./ pfs-ics-shell:pfs_obslog/
cat <<EOT | ssh pfs-ics-shell bash
cd ~/pfs_obslog
make setup python=~/miniconda3/envs/py39/bin/python
EOT

cat <<EOT | ssh pfs-obslog bash
cd ~/pfs_obslog
[ -e tmp/server.pid ] && kill $(cat tmp/server.pid) || true
PFS_OBSLOG_DSN=$(cat secrets/PFS_OBSLOG_DSN) bash ./start.bash -d --port 5000
EOT
