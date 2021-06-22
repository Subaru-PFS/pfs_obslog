set -e
set -v

(cd webui && npm run build -- --base=./)
rsync -av --delete --exclude={.venv,node_modules,schemaspy/html,htmlcov,.git,logs,attachments,tmp} ./ ~/pfs_obslog
pushd ~/pfs_obslog
make setup python=~/miniconda3/envs/py39/bin/python

if [ -e tmp/server.pid ] ; then
  kill -HUP $(cat tmp/server.pid)
else
  bash ./start.bash -d --port 5000
fi
