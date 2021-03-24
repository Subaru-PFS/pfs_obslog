set -e

cd $(dirname $0)

if ! [ -s ./secrets/SECRET_KEY_BASE ]; then
  openssl rand -hex 32 > ./secrets/SECRET_KEY_BASE
fi

export SECRET_KEY_BASE=$(cat ./secrets/SECRET_KEY_BASE)

if [ "$1" == -d ] ; then
  exec .venv/bin/gunicorn  pfs_obslog.server:app \
    --daemon \
    --bind=0.0.0.0:5000 --workers=4 -k uvicorn.workers.UvicornWorker \
    --pid=tmp/server.pid \
    --log-file=logs/production.log
else
  exec ./.venv/bin/uvicorn pfs_obslog.server:app \
    --reload \
    --reload-dir src
fi
