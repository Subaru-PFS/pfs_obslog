from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

url = 'postgresql://postgres:@localhost/opdb3'

engine = create_engine(url)#, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
