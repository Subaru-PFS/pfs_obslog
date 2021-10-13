# pfs-obslog

## Prerequisites

* Python3.9

## Setup

```bash
git clone https://github.com/Subaru-PFS/pfs_obslog
cd pfs_obslog
make setup python=~/miniconda3/envs/py39/bin/python # point to Python 3.9 binary
vi secrets/PFS_OBSLOG_DSN # save DSN on this file
make webui
bash ./start.bash
```

## Systemd Setup

```bash
make install_systemd
```