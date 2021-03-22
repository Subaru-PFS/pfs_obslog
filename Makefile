python := python

test-watch:
	./.venv/bin/ptw -- \
			$(opt) \
			-v \
			--cov-config=.coveragerc \
			--cov=pfs_obslog \
			--cov-report=html \
			--cov-branch tests

test:
	./.venv/bin/pytest \
			-v \
			--cov-config=.coveragerc \
			--cov=pfs_obslog \
			--cov-report=html \
			--cov-branch tests

setup:
	$(MAKE) -B .venv

clean:
	rm -rf .venv

.venv:
	$(python) -m venv $@
	.venv/bin/python -m venv .venv
	.venv/bin/pip install -e .
	.venv/bin/pip install -e ."[dev]"
