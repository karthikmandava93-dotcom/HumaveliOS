from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    department: Mapped[str] = mapped_column(String(100))
    designation: Mapped[str] = mapped_column(String(100))
    employment_type: Mapped[str] = mapped_column(String(50))
    date_of_joining: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(50), default="Active")
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    manager: Mapped[str | None] = mapped_column(String(150), nullable=True)
    performance_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )



class EmployeeLifecycle(Base):
    __tablename__ = "employee_lifecycle"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id"),
        unique=True,
        index=True,
    )
    lifecycle_status: Mapped[str] = mapped_column(String(50), default="Active")
    exit_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    exit_reason: Mapped[str | None] = mapped_column(String(150), nullable=True)
    exit_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(150))
    department: Mapped[str] = mapped_column(String(100))
    source: Mapped[str] = mapped_column(String(100))
    stage: Mapped[str] = mapped_column(String(50), default="Applied")
    applied_date: Mapped[datetime] = mapped_column(DateTime)
    interview_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    offer_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    hired_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recruiter: Mapped[str | None] = mapped_column(String(150), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
