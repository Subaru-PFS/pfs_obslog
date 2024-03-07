import os
from optparse import Option
from pathlib import Path
from typing import Literal, Optional

from functools import cached_property
from pydantic import BaseSettings, Field, PostgresDsn


class Settings(BaseSettings):
    app_env: Literal['test', 'development', 'production'] = Field('development', env='PFS_OBSLOG_ENV')
    relative_url_root: str = Field('', env='RELATIVE_URL_ROOT')

    # db
    dsn: PostgresDsn

    @property
    def echo_sql(self):
        return self.app_env == 'development'

    # files
    attachments_dir: Path = Path('./attachments')
    data_root: Path = Path('/data')
    pfs_design_dir: Path = Path('/data/pfsDesign')
    calexp_reruns: list[str] = ['drpActor/CALIB', 'drpActor/CALIB-20220630', 'ginga/drpActor', 'ginga/sm3', 'ginga/pfi', 'ginga/detrend']

    # auth
    auth_method: Literal['stn_ldap', 'test', 'dev'] = 'stn_ldap'

    # security
    secret_key_base: bytes

    # cache
    # I want to use cached_property, but it's not available in BaseSettings
    @property
    def cache_dir(self):
        username = os.environ.get('USER', 'unknown_user')
        return Path(f'/tmp/{username}/obslog/{self.app_env}')

    # asynctask
    asynctask_fork: bool = True
    mp_context: Optional[Literal['fork', 'spawn']] = None

    class Config:
        secrets_dir = Path('./secrets').absolute()
        env_prefix = 'PFS_OBSLOG_'
        env_file = '.env'


settings = Settings()  # type: ignore
