from opdb.models import obslog_user
from sqlalchemy import delete
from sqlalchemy.orm import Session


def test_db_crud(db: Session):
    # C
    user1 = obslog_user(account_name='hello')
    db.add(user1)
    db.commit()

    # R
    assert db.query(obslog_user).order_by(obslog_user.id.desc()).limit(1).one_or_none().account_name == 'hello'

    # U
    user1.account_name = 'world'  # type: ignore
    db.commit()
    assert db.query(obslog_user).order_by(obslog_user.id.desc()).limit(1).one_or_none().account_name == 'world'

    # D
    db.execute(delete(obslog_user))
    db.commit()
