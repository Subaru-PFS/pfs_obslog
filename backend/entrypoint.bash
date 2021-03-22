set -eu
cd $(dirname $0)

# parse options
only_setup=
while [[ $# -gt 0 ]]; do
  case $1 in
  --only-setup)
    only_setup=yes
    shift
    ;;
  *)
    echo "Unknown argument: $1" 1>/dev/stderr
    exit 1
    ;;
  esac
done

# Add venv to path
PATH=$PWD/.venv/bin:$PATH

# Set up secret key base
secret_key_base_file=./secrets/pfs_obslog_secret_key_base
mkdir -p $(dirname $secret_key_base_file)
if [ ! -f $secret_key_base_file ]; then
  echo "Generating secret key base..."
  openssl rand -hex 64 >$secret_key_base_file
fi

# Exit if --only-setup is set
if [ "$only_setup" == "yes" ]; then
  exit 0
fi

# Start the server
BIND_ADDRESS=${BIND_ADDRESS:?}
wsgi_app=pfs_obslog.app.fastapi_app:app
if [ "$PFS_OBSLOG_ENV" = 'development' ]; then
  exec uvicorn $wsgi_app \
    --host=$(echo $BIND_ADDRESS | cut -d: -f1) \
    --port=$(echo $BIND_ADDRESS | cut -d: -f2) \
    --reload \
    --reload-dir src
else
  exec gunicorn \
    $wsgi_app \
    --workers 8 \
    --worker-class uvicorn.workers.UvicornWorker \
    -b $BIND_ADDRESS
fi
