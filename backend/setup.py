from pathlib import Path

from setuptools import find_packages, setup

HERE = Path(__file__).parent

setup(
    name='pfs_obslog',
    version='0.1.0',
    url='https://github.com/Subaru-PFS/pfs_obslog',
    package_dir={'': 'src'},
    packages=find_packages('src'),
    python_requires='>=3.10',
    install_requires=[
        'fastapi>=0.63',
        'orjson',
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
        'gunicorn',
        'uvloop',
        'httptools',
        'scikit-image',
        'pydantic==1.*',
        'pydantic[dotenv]',
        'pytz', # for pfsUtils
        'astroplan',  # for pfsUtils
        'SQLAlchemy==1.4.37',
        # f'opdb @ file://localhost{HERE.absolute()}/spt_operational_database',
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
            'pyright',
            'ipython',
        ],
    },
)
