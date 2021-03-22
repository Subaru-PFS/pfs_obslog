import pytest
from opdb.models import obslog_user
from sqlalchemy.sql.expression import update
from sqlalchemy.orm import Session
from sqlalchemy import select, delete


def test_db_crud(test_db: Session):
    # C
    user1 = obslog_user(account_name='hello')
    test_db.add(user1)
    test_db.commit()

    # R
    assert test_db.execute(select(obslog_user)).first()[0].account_name == 'hello'

    # U
    user1.account_name = 'world'  # type: ignore
    test_db.commit()
    assert test_db.execute(select(obslog_user)).first()[0].account_name == 'world'

    # D
    test_db.execute(delete(obslog_user))
    test_db.commit()
