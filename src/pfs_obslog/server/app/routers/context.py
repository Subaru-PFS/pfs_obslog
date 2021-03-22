from pfs_obslog.server.db import Session as DBSession


def get_db():
    db = DBSession()
    try:
        yield db
    finally:
        db.close()
