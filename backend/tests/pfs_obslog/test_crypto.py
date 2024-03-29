import pytest
import time_machine
from pfs_obslog.config import settings
from pfs_obslog.crypto import (ExpiredError, KeyGenerator,
                                      MessageEncryptor, hashed_password,
                                      hashed_password_verify)


def test_hashed_password():
    password = 'password'
    h = hashed_password(password)
    assert len(h) >= 32
    assert h != hashed_password(password)  # 同じパスワードでも毎回違うhashが生成されること
    assert False is hashed_password_verify(h, 'BAD-PASSWORD')
    assert hashed_password_verify(h, password)


me = MessageEncryptor(__name__, key_generator=KeyGenerator(settings.secret_key_base))


def test_message_encryptor_normal():
    crypted = me.encrypt_and_sign('secret message')
    assert crypted != me.encrypt_and_sign('secret message')  # 暗号化済みデータは毎回異なること
    assert me.decrypt_and_verify(crypted) == 'secret message'


def test_message_encryptor_with_expires_in():
    with time_machine.travel(0):
        crypted = me.encrypt_and_sign('secret message', expires_in=10)
    with time_machine.travel(11):
        with pytest.raises(ExpiredError):
            me.decrypt_and_verify(crypted)
