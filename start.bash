set -e

cd $(dirname $0)

[ -s ./secrets/SECRET_KEY_BASE ] || openssl rand -hex 32 > ./secrets/SECRET_KEY_BASE
[ -z "$SECRET_KEY_BASE" ] && SECRET_KEY_BASE=$(cat ./secrets/SECRET_KEY_BASE)
[ -z "$PFS_OBSLOG_DSN" ] && PFS_OBSLOG_DSN=$(cat ./secrets/PFS_OBSLOG_DSN)
[ -z "$PFS_OBSLOG_DATA_ROOT" ] && PFS_OBSLOG_DATA_ROOT=/data

export SECRET_KEY_BASE
export PFS_OBSLOG_DSN
export PFS_OBSLOG_DATA_ROOT

daemon=
host=127.0.0.1
port=8000

while [ "$#" -gt 0 ] ; do
    case $1 in
        --daemon | -d)
            daemon=1
            ;;
        --host)
            shift
            host=$1
            ;;
        --port | -p)
            shift
            port=$1
            ;;
        *)
            echo "Invalid argument: $1" 1> /dev/stderr
            exit 1
    esac
    shift
done


if [ "$daemon" ] ; then
  exec .venv/bin/gunicorn  pfs_obslog.server.app:app \
    --daemon \
    --bind=0.0.0.0:$port --workers=4 -k uvicorn.workers.UvicornWorker \
    --pid=tmp/server.pid \
    --log-file=logs/gunicorn.log \
    --access-logfile=logs/access.log
else
  exec ./.venv/bin/uvicorn pfs_obslog.server.app:app \
    --host=$host \
    --port=$port \
    --reload \
    --reload-dir src
fi
