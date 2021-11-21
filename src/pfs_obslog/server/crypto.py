import base64
import functools
import hashlib
import json
import os
import secrets
import time
from functools import lru_cache

from Crypto.Cipher import AES
from Crypto.Protocol.KDF import scrypt
from Crypto.Random import get_random_bytes


def hashed_password(password: str) -> str:
    salt = get_random_bytes(16)
    h: bytes = scrypt(password, salt, 16, N=2**14, r=8, p=1)  # type: ignore
    return f'{salt.hex()}:{h.hex()}'


def hashed_password_verify(hashed_password: str, password: str):
    if ':' not in hashed_password:  # pragma: no cover
        return False
    salt_hex, h_hex = hashed_password.split(':', 2)
    salt = bytes.fromhex(salt_hex)
    h = bytes.fromhex(h_hex)
    return secrets.compare_digest(scrypt(password, salt, 16, N=2**14, r=8, p=1), h)  # type: ignore


class ExpiredError(ValueError):
    pass


class KeyGenerator:
    # https://api.rubyonrails.org/classes/ActiveSupport/KeyGenerator.html
    def __init__(self, secret: bytes, iterations=2**16):
        self._secret = secret
        self._iterations = iterations

    @functools.cache
    def generate_key(self, salt: str, key_size: int):
        return hashlib.pbkdf2_hmac(
            hash_name='sha1',
            password=self._secret,
            salt=salt.encode(),
            iterations=self._iterations,
            dklen=key_size,
        )

    def __call__(self, salt: str, key_size: int):
        return self.generate_key(salt, key_size)  # type: ignore


@lru_cache()
def default_key_generator():
    base = os.environ['SECRET_KEY_BASE'].encode()
    if len(base) < 32:  # pragma: no cover
        raise ValueError(
            f'Environment variable SECRET_KEY_BASE is too short: {base}. '
            f'It must be longer the 32 bytes')
    return KeyGenerator(os.environ['SECRET_KEY_BASE'].encode())


class MessageEncryptor:
    def __init__(self, salt: str, *, key_generator: KeyGenerator = None):
        self._secret = (key_generator or default_key_generator())(salt, key_size=32)

    def encrypt_and_sign(self, payload: str, *, expires_in: float = None) -> str:
        cipher = AES.new(self._secret, AES.MODE_EAX)
        if expires_in is None:
            expires_at = None
        else:
            expires_at = time.time() + expires_in
        data = {
            'expires_at': expires_at,
            'payload': payload,
        }
        cipher_text, tag = cipher.encrypt_and_digest(json.dumps(data).encode())  # type: ignore
        return ':'.join(
            base64.urlsafe_b64encode(a).decode()  # type: ignore
            for a in (cipher.nonce, tag, cipher_text)  # type: ignore
        )

    def decrypt_and_verify(self, msg: str) -> str:
        nonce, tag, cipher_text = (base64.urlsafe_b64decode(a) for a in msg.split(':', 3))
        cipher = AES.new(self._secret, AES.MODE_EAX, nonce)
        data = json.loads(cipher.decrypt_and_verify(cipher_text, tag).decode())  # type: ignore
        expires_at = data.get('expires_at')
        if expires_at is not None and expires_at < time.time():
            raise ExpiredError()
        return data['payload']
