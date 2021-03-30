from setuptools import setup, find_packages


setup(
    name='pfs_obslog',
    version='0.1.0',
    url='https://github.com/Subaru-PFS/pfs_obslog',
    package_dir={'': 'src'},
    packages=find_packages('src'),
    python_requires='>=3.9',
    install_requires=[
        'fastapi>=0.63',
        'aiofiles',
        'uvicorn',
        'pycryptodome',
        'ldap3',
        'psycopg2-binary',
        'opdb@git+https://github.com/Subaru-PFS/spt_operational_database.git@3a1e403ed464d59edf43994ee4ded37a1fa0da1b',
        'gunicorn',
        'uvloop',
        'httptools',
    ],
    extras_require={
        'dev': [
            'pytest-watch',
            'pytest-cov',
            'pytest-env',
            'autopep8',
            'time-machine',
            'pdbpp',
            'requests',
        ],
    },
)