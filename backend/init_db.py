from database import Base, engine
import models

print("Creating PeopleOS database tables...")

Base.metadata.create_all(bind=engine)

print("PeopleOS database tables created successfully.")