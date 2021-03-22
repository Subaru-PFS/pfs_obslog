# pfs-obslog

## Prerequisites

* Python3.10

## Setup

```bash
git clone https://github.com/Subaru-PFS/pfs_obslog
cd pfs_obslog
make setup python=~/miniconda3/envs/py3_10/bin/python # point to Python 3.10 binary
vi secrets/dsn # save DSN on this file
make webui
bash ./start.bash
```

## Systemd Setup

```bash
make install_systemd
```