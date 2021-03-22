import re

import ldap3

valid_uid = re.compile(r'\w+(:?@\w+)?$')


def authorize(username: str, password: str) -> str | None:
    if not valid_uid.match(username) or password == '':
        return
    domain = 'stn'
    if '@' in username:
        username, domain = username.split('@')
    if domain == 'stn':
        return _stn(username, password)


def _stn(username: str, password: str):
    server = ldap3.Server('omlb-virt.subaru.nao.ac.jp')
    my_dn = f'uid={username},ou=people,dc=subaru,dc=nao,dc=ac,dc=jp'
    conn = ldap3.Connection(server, my_dn, password)  # ここではまだ接続していない
    conn.bind()
    try:
        if conn.result['result'] == 0:  # valid credentails
            conn.search(
                'ou=group,dc=subaru,dc=nao,dc=ac,dc=jp',
                f'(&(cn=pfs)(memberUid={username}))'
            )
            if len(conn.entries) > 0:  # pragma: no branch
                return f'{username}@stn'
    finally:
        conn.unbind()
