from setuptools import setup, find_packages
from pathlib import Path
HERE = Path(__file__).parent


setup(
    name='pfs_obslog',
    version='0.1.0',
    url='https://github.com/Subaru-PFS/pfs_obslog',
    package_dir={'': 'src'},
    packages=find_packages('src'),
    python_requires='>=3.9',
    install_requires=[
        'fastapi>=0.63',
        'psqlparse',
        'matplotlib',
        'scipy',
        'astropy',
        'aiofiles',
        'python-multipart',
        'uvicorn',
        'pycryptodome',
        'ldap3',
        'psycopg2-binary',
        # 'opdb', # venv/bin/pip install --use-feature=in-tree-build -e ./spt_operational_database
        'gunicorn',
        'uvloop',
        'httptools',
    ],
    extras_require={
        'dev': [
            'pytest-watch',
            'pytest-cov',
            'pytest-env',
            'pytest-asyncio',
            'autopep8',
            'time-machine',
            'pdbpp',
            'requests',
            'Pillow',
            'watchdog[watchmedo]',
        ],
    },
)
