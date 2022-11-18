import shutil

from pfs_obslog.config import settings


def main():
    shutil.rmtree(settings.cache_dir, ignore_errors=True)


if __name__ == '__main__':
    main()
