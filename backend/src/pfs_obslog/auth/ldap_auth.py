"""LDAP認証モジュール

ユーザー名とパスワードによるLDAP認証を行います。
"""

import re

import ldap3

valid_uid = re.compile(r"\w+(?:@\w+)?$")


def authorize(username: str, password: str) -> str | None:
    """ユーザー名とパスワードでLDAP認証を行う

    Args:
        username: ユーザー名（例: "user" または "user@stn"）
        password: パスワード

    Returns:
        認証成功時は "username@domain" 形式のユーザーID、失敗時は None
    """
    if not valid_uid.match(username) or password == "":
        return None

    domain = "stn"
    if "@" in username:
        username, domain = username.split("@")

    if domain == "stn":
        return _stn(username, password)

    return None


def _stn(username: str, password: str) -> str | None:
    """STNドメインのLDAP認証

    Args:
        username: ユーザー名（ドメインなし）
        password: パスワード

    Returns:
        認証成功時は "username@stn"、失敗時は None
    """
    server = ldap3.Server("omlb-virt.subaru.nao.ac.jp")
    my_dn = f"uid={username},ou=people,dc=subaru,dc=nao,dc=ac,dc=jp"
    conn = ldap3.Connection(server, my_dn, password)
    conn.bind()
    try:
        if conn.result["result"] == 0:  # valid credentials
            conn.search(
                "ou=group,dc=subaru,dc=nao,dc=ac,dc=jp",
                f"(&(cn=pfs)(memberUid={username}))",
            )
            if len(conn.entries) > 0:
                return f"{username}@stn"
    finally:
        conn.unbind()
    return None
