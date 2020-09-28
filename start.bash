(
  cd pfsobslog-client
  npm install
  npm run build -- --base=.
)

(
  cd pfsobslog-server/python
  pipenv install
  OBSLOG_SESSION_SECRET=$(openssl rand -hex 32) \
    pipenv run uvicorn pfsobslog.main:app \
    --reload --root-path /pfsobslog-169d77226896db79
)
