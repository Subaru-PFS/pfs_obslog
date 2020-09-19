from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

url = 'postgresql://postgres:@localhost/opdb2'

engine = create_engine(url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
