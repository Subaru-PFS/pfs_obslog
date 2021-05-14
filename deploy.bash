set -e

(cd webui && npm run build -- --base=./)
rsync -av --delete --exclude={.venv,node_modules,schemaspy/html,htmlcov,.git} ./ pfs-ics-shell:pfs_obslog/
cat <<'EOT' | ssh pfs-ics-shell bash
cd ~/pfs_obslog
make setup python=~/miniconda3/envs/py39/bin/python
EOT

cat <<'EOT' | ssh pfs-obslog bash
cd ~/pfs_obslog
if [ -e tmp/server.pid ] ; then
  kill -HUP $(cat tmp/server.pid)
else
  bash ./start.bash -d --port 5000
fi
EOT
