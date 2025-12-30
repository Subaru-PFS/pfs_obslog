"""LDAP認証モジュールのテスト"""

import pytest

from pfs_obslog.auth.ldap_auth import authorize, valid_uid


class TestValidUid:
    """ユーザーIDバリデーションのテスト"""

    def test_simple_username(self):
        """単純なユーザー名"""
        assert valid_uid.match("testuser")

    def test_username_with_domain(self):
        """ドメイン付きユーザー名"""
        assert valid_uid.match("testuser@stn")

    def test_invalid_username_with_special_chars(self):
        """特殊文字を含むユーザー名は無効"""
        # パターンにマッチしない（無効）
        assert valid_uid.match("test-user") is None
        assert valid_uid.match("test.user") is None

    def test_empty_username(self):
        """空のユーザー名は無効"""
        assert valid_uid.match("") is None


class TestAuthorize:
    """authorize関数のテスト"""

    def test_empty_password_returns_none(self):
        """空のパスワードはNoneを返す"""
        result = authorize("testuser", "")
        assert result is None

    def test_invalid_username_returns_none(self):
        """無効なユーザー名はNoneを返す"""
        result = authorize("test-user", "password")
        assert result is None

    def test_unknown_domain_returns_none(self):
        """不明なドメインはNoneを返す"""
        result = authorize("testuser@unknown", "password")
        assert result is None


# 注意: 実際のLDAP認証テストはLDAPサーバーが必要なため、
# モックを使用するか、統合テスト環境で実施してください。
