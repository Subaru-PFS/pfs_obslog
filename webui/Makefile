python_home := ../backend/.venv

bootstrap:
	$(python_home)/bin/python -m pip install nodeenv
	$(python_home)/bin/nodeenv ./.nodeenv

dev:
	./.nodeenv/bin/npm run dev
