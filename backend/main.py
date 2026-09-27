from datetime import date, datetime
from typing import Optional
import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from models import Candidate, Employee, EmployeeLifecycle, User


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="PeopleOS API",
    description="People Analytics and HR Operations Platform",
    version="1.0.0",
)


# ============================================================
# AUTHENTICATION
# ============================================================

AUTH_TOKEN_TTL_SECONDS = int(os.getenv("PEOPLEOS_SESSION_TTL_SECONDS", "28800"))
AUTH_SECRET = os.getenv("PEOPLEOS_JWT_SECRET") or secrets.token_urlsafe(32)
AUTH_PUBLIC_PATHS = {
    "/",
    "/health",
    "/auth/login",
    "/docs",
    "/openapi.json",
    "/redoc",
}
PBKDF2_ITERATIONS = 310_000


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


def hash_password(password: str, salt: bytes) -> str:
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
        dklen=32,
    )
    return base64.urlsafe_b64encode(derived).decode("ascii")


def verify_password(password: str, stored_hash: str, stored_salt: str) -> bool:
    try:
        salt = base64.urlsafe_b64decode(stored_salt.encode("ascii"))
    except Exception:
        return False
    candidate = hash_password(password, salt)
    return hmac.compare_digest(candidate, stored_hash)


def encode_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": int(time.time()) + AUTH_TOKEN_TTL_SECONDS,
    }
    payload_part = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("ascii").rstrip("=")
    signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        payload_part.encode("ascii"),
        hashlib.sha256,
    ).digest()
    signature_part = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")
    return f"{payload_part}.{signature_part}"


def decode_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 2:
        raise ValueError("Invalid authentication token")

    payload_part, signature_part = parts
    expected_signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        payload_part.encode("ascii"),
        hashlib.sha256,
    ).digest()
    expected_part = base64.urlsafe_b64encode(expected_signature).decode("ascii").rstrip("=")
    if not hmac.compare_digest(signature_part, expected_part):
        raise ValueError("Invalid authentication token")

    padded = payload_part + "=" * (-len(payload_part) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
    if int(payload.get("exp", 0)) <= int(time.time()):
        raise ValueError("Authentication token expired")
    return payload


def ensure_admin_user() -> None:
    admin_email = os.getenv("PEOPLEOS_ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("PEOPLEOS_ADMIN_PASSWORD", "")
    if not admin_email or not admin_password:
        return

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == admin_email).first()
        if user:
            return
        salt = secrets.token_bytes(16)
        user = User(
            email=admin_email,
            password_salt=base64.urlsafe_b64encode(salt).decode("ascii"),
            password_hash=hash_password(admin_password, salt),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()


# Protect API routes by default. Authentication endpoints and API docs remain public.
@app.middleware("http")
async def authentication_middleware(request, call_next):
    path = request.url.path
    if request.method == "OPTIONS" or path in AUTH_PUBLIC_PATHS or path.startswith("/docs/") or path.startswith("/redoc/"):
        return await call_next(request)

    authorization = request.headers.get("Authorization", "")
    if not authorization.lower().startswith("bearer "):
        return JSONResponse(status_code=401, content={"detail": "Authentication required"})

    token = authorization.split(" ", 1)[1].strip()
    try:
        request.state.user = decode_token(token)
    except Exception:
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired authentication token"})

    return await call_next(request)


# ============================================================
# CORS
# ============================================================
# Allows local development and Vercel production deployments.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE TABLE INITIALIZATION
# ============================================================
# Creates missing tables without deleting existing data.

Base.metadata.create_all(bind=engine)


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    email: EmailStr
    department: str
    designation: str
    employment_type: str
    date_of_joining: date
    status: str = "Active"
    location: Optional[str] = None
    manager: Optional[str] = None
    performance_score: Optional[float] = None
    skills: Optional[str] = None
    is_active: bool = True


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: str
    full_name: str
    email: EmailStr
    department: str
    designation: str
    employment_type: str
    date_of_joining: date
    status: str
    location: Optional[str] = None
    manager: Optional[str] = None
    performance_score: Optional[float] = None
    skills: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


RECRUITMENT_STAGES = [
    "Applied",
    "Screening",
    "Interview",
    "Offer",
    "Hired",
    "Rejected",
    "Withdrawn",
]


class CandidateCreate(BaseModel):
    candidate_id: str
    full_name: str
    email: EmailStr
    role: str
    department: str
    source: str = "Direct"
    stage: str = "Applied"
    applied_date: date
    interview_date: Optional[date] = None
    offer_date: Optional[date] = None
    hired_date: Optional[date] = None
    recruiter: Optional[str] = None
    notes: Optional[str] = None


class CandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: str
    full_name: str
    email: EmailStr
    role: str
    department: str
    source: str
    stage: str
    applied_date: date
    interview_date: Optional[date] = None
    offer_date: Optional[date] = None
    hired_date: Optional[date] = None
    recruiter: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CandidateImportResponse(BaseModel):
    imported: int
    failed: int
    errors: list[str] = []
    candidates: list[CandidateResponse] = []


class EmployeeLifecycleResponse(BaseModel):
    employee_id: int
    employee_name: str
    lifecycle_status: str
    exit_date: Optional[date] = None
    exit_reason: Optional[str] = None
    exit_notes: Optional[str] = None
    has_lifecycle_record: bool
    updated_at: Optional[datetime] = None


class EmployeeLifecycleUpdate(BaseModel):
    lifecycle_status: str = "Active"
    exit_date: Optional[date] = None
    exit_reason: Optional[str] = None
    exit_notes: Optional[str] = None


LIFECYCLE_STATUSES = [
    "Onboarding",
    "Active",
    "On Leave",
    "Offboarding",
    "Exited",
]


EXIT_REASONS = [
    "Resignation",
    "Termination",
    "Layoff",
    "Retirement",
    "Contract End",
    "Relocation",
    "Other",
]


# ============================================================
# DATA QUALITY HELPERS
# ============================================================

PLACEHOLDER_TEXTS = {
    "string",
    "null",
    "none",
    "n/a",
    "na",
    "-",
    "—",
}


def clean_dimension(value: Optional[str]) -> Optional[str]:
    """Return meaningful text for analytics, ignoring demo/placeholder values."""
    if value is None:
        return None

    cleaned = value.strip()
    if not cleaned or cleaned.lower() in PLACEHOLDER_TEXTS:
        return None

    return cleaned


# ============================================================
# AUTH LOGIN
# ============================================================

@app.post("/auth/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    email = str(login_data.email).strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not user.is_active or not verify_password(login_data.password, user.password_hash, user.password_salt):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = encode_token(user)
    return LoginResponse(
        access_token=token,
        expires_in=AUTH_TOKEN_TTL_SECONDS,
        user={"id": user.id, "email": user.email, "role": user.role},
    )


@app.get("/auth/me")
def auth_me(request: Request):
    return request.state.user


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "PeopleOS API is running",
        "status": "healthy",
        "version": "1.0.0",
        "docs": "/docs",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "PeopleOS",
    }


# ============================================================
# GET ALL EMPLOYEES
# ============================================================

@app.get(
    "/employees",
    response_model=list[EmployeeResponse],
)
def get_employees(
    skip: int = Query(
        default=0,
        ge=0,
        description="Number of employees to skip",
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Maximum number of employees to return",
    ),
    db: Session = Depends(get_db),
):
    employees = (
        db.query(Employee)
        .order_by(Employee.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return employees


# ============================================================
# SEARCH / FILTER EMPLOYEES
# ============================================================

@app.get(
    "/employees/search",
    response_model=list[EmployeeResponse],
)
def search_employees(
    search: Optional[str] = Query(
        default=None,
        description=(
            "Search employee ID, name, email, "
            "designation or skills"
        ),
    ),
    department: Optional[str] = Query(
        default=None,
        description="Filter by department",
    ),
    status: Optional[str] = Query(
        default=None,
        description="Filter by status",
    ),
    location: Optional[str] = Query(
        default=None,
        description="Filter by location",
    ),
    employment_type: Optional[str] = Query(
        default=None,
        description="Filter by employment type",
    ),
    is_active: Optional[bool] = Query(
        default=None,
        description="Filter by active state",
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Employee)

    if search:
        search_pattern = f"%{search}%"

        query = query.filter(
            (Employee.employee_id.ilike(search_pattern))
            | (Employee.full_name.ilike(search_pattern))
            | (Employee.email.ilike(search_pattern))
            | (Employee.designation.ilike(search_pattern))
            | (Employee.skills.ilike(search_pattern))
        )

    if department:
        query = query.filter(
            Employee.department.ilike(
                f"%{department}%"
            )
        )

    if status:
        query = query.filter(
            Employee.status.ilike(
                f"%{status}%"
            )
        )

    if location:
        query = query.filter(
            Employee.location.ilike(
                f"%{location}%"
            )
        )

    if employment_type:
        query = query.filter(
            Employee.employment_type.ilike(
                f"%{employment_type}%"
            )
        )

    if is_active is not None:
        query = query.filter(
            Employee.is_active == is_active
        )

    return (
        query
        .order_by(Employee.id)
        .all()
    )


# ============================================================
# EMPLOYEE COUNT
# ============================================================

@app.get("/employees/count")
def get_employee_count(
    db: Session = Depends(get_db),
):
    total_employees = (
        db.query(Employee)
        .count()
    )

    return {
        "total_employees": total_employees,
    }


# ============================================================
# GET EMPLOYEE BY DATABASE ID
# ============================================================

@app.get(
    "/employees/{employee_id}",
    response_model=EmployeeResponse,
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
):
    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    return employee


# ============================================================
# CREATE EMPLOYEE
# ============================================================

@app.post(
    "/employees",
    response_model=EmployeeResponse,
    status_code=201,
)
def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
):
    employee_id = (
        employee_data.employee_id.strip()
    )

    email = (
        str(employee_data.email)
        .strip()
        .lower()
    )

    if not employee_id:
        raise HTTPException(
            status_code=400,
            detail="Employee ID is required",
        )

    if not employee_data.full_name.strip():
        raise HTTPException(
            status_code=400,
            detail="Full name is required",
        )

    if not employee_data.department.strip():
        raise HTTPException(
            status_code=400,
            detail="Department is required",
        )

    if not employee_data.designation.strip():
        raise HTTPException(
            status_code=400,
            detail="Designation is required",
        )

    if (
        employee_data.performance_score
        is not None
    ):
        if not (
            0
            <= employee_data.performance_score
            <= 100
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Performance score must be "
                    "between 0 and 100"
                ),
            )

    existing_employee = (
        db.query(Employee)
        .filter(
            Employee.employee_id
            == employee_id
        )
        .first()
    )

    if existing_employee:
        raise HTTPException(
            status_code=400,
            detail="Employee ID already exists",
        )

    existing_email = (
        db.query(Employee)
        .filter(
            Employee.email == email
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    employee = Employee(
        employee_id=employee_id,
        full_name=(
            employee_data.full_name.strip()
        ),
        email=email,
        department=(
            employee_data.department.strip()
        ),
        designation=(
            employee_data.designation.strip()
        ),
        employment_type=(
            employee_data.employment_type.strip()
        ),
        date_of_joining=(
            employee_data.date_of_joining
        ),
        status=(
            employee_data.status.strip()
            or "Active"
        ),
        location=(
            employee_data.location.strip()
            if employee_data.location
            else None
        ),
        manager=(
            employee_data.manager.strip()
            if employee_data.manager
            else None
        ),
        performance_score=(
            employee_data.performance_score
        ),
        skills=(
            employee_data.skills.strip()
            if employee_data.skills
            else None
        ),
        is_active=(
            employee_data.is_active
        ),
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee


# ============================================================
# UPDATE EMPLOYEE
# ============================================================

@app.put(
    "/employees/{employee_id}",
    response_model=EmployeeResponse,
)
def update_employee(
    employee_id: int,
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
):
    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    new_employee_id = (
        employee_data.employee_id.strip()
    )

    new_email = (
        str(employee_data.email)
        .strip()
        .lower()
    )

    if (
        employee_data.performance_score
        is not None
    ):
        if not (
            0
            <= employee_data.performance_score
            <= 100
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Performance score must be "
                    "between 0 and 100"
                ),
            )

    duplicate_employee = (
        db.query(Employee)
        .filter(
            Employee.employee_id
            == new_employee_id,
            Employee.id != employee_id,
        )
        .first()
    )

    if duplicate_employee:
        raise HTTPException(
            status_code=400,
            detail="Employee ID already exists",
        )

    duplicate_email = (
        db.query(Employee)
        .filter(
            Employee.email == new_email,
            Employee.id != employee_id,
        )
        .first()
    )

    if duplicate_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    employee.employee_id = (
        new_employee_id
    )

    employee.full_name = (
        employee_data.full_name.strip()
    )

    employee.email = new_email

    employee.department = (
        employee_data.department.strip()
    )

    employee.designation = (
        employee_data.designation.strip()
    )

    employee.employment_type = (
        employee_data.employment_type.strip()
    )

    employee.date_of_joining = (
        employee_data.date_of_joining
    )

    employee.status = (
        employee_data.status.strip()
        or "Active"
    )

    employee.location = (
        employee_data.location.strip()
        if employee_data.location
        else None
    )

    employee.manager = (
        employee_data.manager.strip()
        if employee_data.manager
        else None
    )

    employee.performance_score = (
        employee_data.performance_score
    )

    employee.skills = (
        employee_data.skills.strip()
        if employee_data.skills
        else None
    )

    employee.is_active = (
        employee_data.is_active
    )

    db.commit()
    db.refresh(employee)

    return employee


# ============================================================
# DELETE EMPLOYEE
# ============================================================

@app.delete(
    "/employees/{employee_id}"
)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
):
    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    db.delete(employee)
    db.commit()

    return {
        "message": (
            "Employee deleted successfully"
        ),
        "employee_id": employee_id,
    }


# ============================================================
# EMPLOYEE LIFECYCLE
# ============================================================

@app.get("/employees/{employee_id}/lifecycle", response_model=EmployeeLifecycleResponse)
def get_employee_lifecycle(
    employee_id: int,
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    record = (
        db.query(EmployeeLifecycle)
        .filter(EmployeeLifecycle.employee_id == employee_id)
        .first()
    )

    if record:
        return EmployeeLifecycleResponse(
            employee_id=employee.id,
            employee_name=employee.full_name,
            lifecycle_status=record.lifecycle_status,
            exit_date=record.exit_date.date() if isinstance(record.exit_date, datetime) else record.exit_date,
            exit_reason=record.exit_reason,
            exit_notes=record.exit_notes,
            has_lifecycle_record=True,
            updated_at=record.updated_at,
        )

    inferred_status = "Active" if employee.is_active else "Exited"
    return EmployeeLifecycleResponse(
        employee_id=employee.id,
        employee_name=employee.full_name,
        lifecycle_status=inferred_status,
        has_lifecycle_record=False,
        updated_at=employee.updated_at,
    )


@app.put("/employees/{employee_id}/lifecycle", response_model=EmployeeLifecycleResponse)
def update_employee_lifecycle(
    employee_id: int,
    lifecycle_data: EmployeeLifecycleUpdate,
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    status = lifecycle_data.lifecycle_status.strip()
    if status not in LIFECYCLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Lifecycle status must be one of: {', '.join(LIFECYCLE_STATUSES)}",
        )

    reason = lifecycle_data.exit_reason.strip() if lifecycle_data.exit_reason else None
    notes = lifecycle_data.exit_notes.strip() if lifecycle_data.exit_notes else None
    exit_date = lifecycle_data.exit_date

    if status == "Exited":
        if exit_date is None:
            raise HTTPException(status_code=400, detail="Exit date is required when lifecycle status is Exited")
        if exit_date < employee.date_of_joining.date() if isinstance(employee.date_of_joining, datetime) else exit_date < employee.date_of_joining:
            raise HTTPException(status_code=400, detail="Exit date cannot be before the date of joining")
        if exit_date > date.today():
            raise HTTPException(status_code=400, detail="Exit date cannot be in the future")
    else:
        exit_date = None
        reason = None
        notes = None

    record = (
        db.query(EmployeeLifecycle)
        .filter(EmployeeLifecycle.employee_id == employee_id)
        .first()
    )

    if not record:
        record = EmployeeLifecycle(employee_id=employee.id)
        db.add(record)

    record.lifecycle_status = status
    record.exit_date = datetime.combine(exit_date, datetime.min.time()) if exit_date else None
    record.exit_reason = reason
    record.exit_notes = notes

    if status == "Exited":
        employee.is_active = False
        employee.status = "Inactive"
    else:
        employee.is_active = True
        employee.status = "Active"

    db.commit()
    db.refresh(record)

    return EmployeeLifecycleResponse(
        employee_id=employee.id,
        employee_name=employee.full_name,
        lifecycle_status=record.lifecycle_status,
        exit_date=exit_date,
        exit_reason=record.exit_reason,
        exit_notes=record.exit_notes,
        has_lifecycle_record=True,
        updated_at=record.updated_at,
    )


@app.get("/lifecycle/summary")
def lifecycle_summary(db: Session = Depends(get_db)):
    employees = db.query(Employee).order_by(Employee.id).all()
    records = db.query(EmployeeLifecycle).all()
    record_by_employee = {record.employee_id: record for record in records}
    today = date.today()

    status_breakdown = {status: 0 for status in LIFECYCLE_STATUSES}
    status_breakdown["Unrecorded"] = 0
    exit_reason_breakdown: dict[str, int] = {}
    monthly_exit_counts: dict[date, int] = {}

    month_starts: list[date] = []
    anchor = date(today.year, today.month, 1)
    for offset in range(11, -1, -1):
        year = anchor.year
        month = anchor.month - offset
        while month <= 0:
            year -= 1
            month += 12
        month_starts.append(date(year, month, 1))
        monthly_exit_counts[date(year, month, 1)] = 0

    recorded_exits = 0
    recent_exits_90_days = 0
    unrecorded_inactive = 0
    exit_tenures_months: list[int] = []
    exit_reason_missing_count = 0
    exit_department_breakdown: dict[str, int] = {}
    exit_location_breakdown: dict[str, int] = {}

    for employee in employees:
        record = record_by_employee.get(employee.id)
        if record:
            lifecycle_status = record.lifecycle_status if record.lifecycle_status in LIFECYCLE_STATUSES else "Unrecorded"
            status_breakdown[lifecycle_status] = status_breakdown.get(lifecycle_status, 0) + 1
            if lifecycle_status == "Exited" and record.exit_date:
                recorded_exits += 1
                exit_date = record.exit_date.date() if isinstance(record.exit_date, datetime) else record.exit_date
                days_ago = (today - exit_date).days
                if 0 <= days_ago <= 90:
                    recent_exits_90_days += 1
                joining_date = employee.date_of_joining.date() if isinstance(employee.date_of_joining, datetime) else employee.date_of_joining
                tenure_months = (exit_date.year - joining_date.year) * 12 + (exit_date.month - joining_date.month)
                if exit_date.day < joining_date.day:
                    tenure_months -= 1
                if tenure_months >= 0:
                    exit_tenures_months.append(tenure_months)

                reason = clean_dimension(record.exit_reason)
                if reason:
                    exit_reason_breakdown[reason] = exit_reason_breakdown.get(reason, 0) + 1
                else:
                    exit_reason_missing_count += 1

                department = clean_dimension(employee.department)
                if department:
                    exit_department_breakdown[department] = exit_department_breakdown.get(department, 0) + 1

                location = clean_dimension(employee.location)
                if location:
                    exit_location_breakdown[location] = exit_location_breakdown.get(location, 0) + 1

                for month_start in month_starts:
                    next_month = date(month_start.year + 1, 1, 1) if month_start.month == 12 else date(month_start.year, month_start.month + 1, 1)
                    if month_start <= exit_date < next_month:
                        monthly_exit_counts[month_start] += 1
                        break
        else:
            if employee.is_active:
                status_breakdown["Active"] += 1
            else:
                status_breakdown["Unrecorded"] += 1
                unrecorded_inactive += 1

    recent_joiners_90_days = 0
    for employee in employees:
        joining_date = employee.date_of_joining.date() if isinstance(employee.date_of_joining, datetime) else employee.date_of_joining
        if joining_date and 0 <= (today - joining_date).days <= 90:
            recent_joiners_90_days += 1

    insights: list[dict[str, str]] = []
    if not employees:
        insights.append({
            "type": "info",
            "title": "Add employees to track lifecycle",
            "message": "PeopleOS needs employee records before lifecycle analytics can be generated.",
        })
    elif recorded_exits == 0:
        insights.append({
            "type": "info",
            "title": "No recorded exits yet",
            "message": "Record exit dates and reasons when employees leave so PeopleOS can build evidence-based retention analytics.",
        })
    else:
        insights.append({
            "type": "info",
            "title": "Recorded exits",
            "message": f"PeopleOS has {recorded_exits} employee exit record(s) with a recorded exit date.",
        })

    if recent_joiners_90_days:
        insights.append({
            "type": "info",
            "title": "Recent joiners",
            "message": f"{recent_joiners_90_days} employee(s) joined in the last 90 days based on recorded joining dates.",
        })

    if unrecorded_inactive:
        insights.append({
            "type": "attention",
            "title": "Inactive records need lifecycle data",
            "message": f"{unrecorded_inactive} inactive employee record(s) do not have a lifecycle record. Add exit details where applicable.",
        })

    top_reason = max(exit_reason_breakdown, key=exit_reason_breakdown.get) if exit_reason_breakdown else None
    if top_reason:
        insights.append({
            "type": "info",
            "title": "Most recorded exit reason",
            "message": f"{top_reason} accounts for {exit_reason_breakdown[top_reason]} recorded exit(s).",
        })

    monthly_exits = [
        {"month": month_start.isoformat(), "label": month_start.strftime("%b %Y"), "count": monthly_exit_counts[month_start]}
        for month_start in month_starts
    ]

    average_tenure_at_exit_months = (
        round(sum(exit_tenures_months) / len(exit_tenures_months), 1)
        if exit_tenures_months
        else None
    )
    exit_reason_coverage = (
        round(((recorded_exits - exit_reason_missing_count) / recorded_exits) * 100, 1)
        if recorded_exits
        else 0
    )

    retention_insights: list[dict[str, str]] = []
    if recorded_exits == 0:
        retention_insights.append({
            "type": "info",
            "title": "No exit records yet",
            "message": "PeopleOS needs recorded exit dates before retention and exit-pattern analytics can be calculated.",
        })
    else:
        retention_insights.append({
            "type": "info",
            "title": "Recorded exit activity",
            "message": f"PeopleOS has {recorded_exits} recorded employee exit(s).",
        })
        if average_tenure_at_exit_months is not None:
            retention_insights.append({
                "type": "info",
                "title": "Average tenure at exit",
                "message": f"Recorded exits had an average tenure of {average_tenure_at_exit_months} months based on joining and exit dates.",
            })
        if exit_reason_coverage < 100:
            retention_insights.append({
                "type": "attention",
                "title": "Exit reason data is incomplete",
                "message": f"Exit reasons are recorded for {exit_reason_coverage}% of exits. Complete missing reasons for cleaner exit analysis.",
            })
        top_exit_department = max(exit_department_breakdown, key=exit_department_breakdown.get) if exit_department_breakdown else None
        if top_exit_department:
            retention_insights.append({
                "type": "info",
                "title": "Most recorded exits by department",
                "message": f"{top_exit_department} has the most recorded exits ({exit_department_breakdown[top_exit_department]}). This is a count of recorded exits, not an attrition rate.",
            })

    return {
        "total_employees": len(employees),
        "recorded_lifecycle_records": len(records),
        "recorded_exits": recorded_exits,
        "recent_exits_90_days": recent_exits_90_days,
        "recent_joiners_90_days": recent_joiners_90_days,
        "status_breakdown": status_breakdown,
        "exit_reason_breakdown": dict(sorted(exit_reason_breakdown.items(), key=lambda item: item[1], reverse=True)),
        "monthly_exits": monthly_exits,
        "unrecorded_inactive": unrecorded_inactive,
        "average_tenure_at_exit_months": average_tenure_at_exit_months,
        "exit_reason_coverage": exit_reason_coverage,
        "exit_department_breakdown": dict(sorted(exit_department_breakdown.items(), key=lambda item: item[1], reverse=True)),
        "exit_location_breakdown": dict(sorted(exit_location_breakdown.items(), key=lambda item: item[1], reverse=True)),
        "insights": insights,
        "retention_insights": retention_insights,
        "attrition_note": "PeopleOS does not calculate a historical attrition rate yet because it does not store workforce snapshots or full historical headcount records. The metrics below describe recorded exits and exit patterns only.",
    }


# ============================================================
# RECRUITMENT CANDIDATES
# ============================================================

@app.get("/candidates", response_model=list[CandidateResponse])
def get_candidates(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    stage: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Candidate)

    if stage and stage != "All":
        query = query.filter(Candidate.stage.ilike(f"%{stage}%"))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Candidate.candidate_id.ilike(pattern))
            | (Candidate.full_name.ilike(pattern))
            | (Candidate.email.ilike(pattern))
            | (Candidate.role.ilike(pattern))
            | (Candidate.department.ilike(pattern))
            | (Candidate.source.ilike(pattern))
        )

    return query.order_by(Candidate.id.desc()).offset(skip).limit(limit).all()


@app.post("/candidates", response_model=CandidateResponse, status_code=201)
def create_candidate(candidate_data: CandidateCreate, db: Session = Depends(get_db)):
    candidate_id = candidate_data.candidate_id.strip()
    email = str(candidate_data.email).strip().lower()

    if not candidate_id or not candidate_data.full_name.strip() or not candidate_data.role.strip() or not candidate_data.department.strip():
        raise HTTPException(status_code=400, detail="Candidate ID, name, role and department are required")

    if candidate_data.stage not in RECRUITMENT_STAGES:
        raise HTTPException(status_code=400, detail=f"Stage must be one of: {', '.join(RECRUITMENT_STAGES)}")

    if candidate_data.hired_date and candidate_data.hired_date < candidate_data.applied_date:
        raise HTTPException(status_code=400, detail="Hired date cannot be before applied date")

    if db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first():
        raise HTTPException(status_code=400, detail="Candidate ID already exists")

    if db.query(Candidate).filter(Candidate.email == email).first():
        raise HTTPException(status_code=400, detail="Candidate email already exists")

    candidate = Candidate(
        candidate_id=candidate_id,
        full_name=candidate_data.full_name.strip(),
        email=email,
        role=candidate_data.role.strip(),
        department=candidate_data.department.strip(),
        source=candidate_data.source.strip() or "Direct",
        stage=candidate_data.stage,
        applied_date=candidate_data.applied_date,
        interview_date=candidate_data.interview_date,
        offer_date=candidate_data.offer_date,
        hired_date=candidate_data.hired_date,
        recruiter=candidate_data.recruiter.strip() if candidate_data.recruiter else None,
        notes=candidate_data.notes.strip() if candidate_data.notes else None,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@app.post("/candidates/import", response_model=CandidateImportResponse)
def import_candidates(
    candidate_data: list[CandidateCreate],
    db: Session = Depends(get_db),
):
    """Bulk import validated candidate records while reporting row-level duplicates."""
    if not candidate_data:
        raise HTTPException(status_code=400, detail="At least one candidate is required")

    if len(candidate_data) > 500:
        raise HTTPException(status_code=400, detail="Import is limited to 500 candidates per upload")

    existing_ids = {row[0] for row in db.query(Candidate.candidate_id).filter(
        Candidate.candidate_id.in_([item.candidate_id.strip() for item in candidate_data])
    ).all()}
    existing_emails = {row[0] for row in db.query(Candidate.email).filter(
        Candidate.email.in_([str(item.email).strip().lower() for item in candidate_data])
    ).all()}

    seen_ids: set[str] = set()
    seen_emails: set[str] = set()
    errors: list[str] = []
    imported: list[Candidate] = []

    for row_number, item in enumerate(candidate_data, start=2):
        candidate_id = item.candidate_id.strip()
        email = str(item.email).strip().lower()

        if not candidate_id or not item.full_name.strip() or not item.role.strip() or not item.department.strip():
            errors.append(f"Row {row_number}: required candidate fields are missing")
            continue
        if candidate_id in existing_ids or candidate_id in seen_ids:
            errors.append(f"Row {row_number}: candidate ID '{candidate_id}' already exists")
            continue
        if email in existing_emails or email in seen_emails:
            errors.append(f"Row {row_number}: candidate email '{email}' already exists")
            continue
        if item.stage not in RECRUITMENT_STAGES:
            errors.append(f"Row {row_number}: invalid stage '{item.stage}'")
            continue
        if item.hired_date and item.hired_date < item.applied_date:
            errors.append(f"Row {row_number}: hired date cannot be before applied date")
            continue

        candidate = Candidate(
            candidate_id=candidate_id,
            full_name=item.full_name.strip(),
            email=email,
            role=item.role.strip(),
            department=item.department.strip(),
            source=item.source.strip() or "Direct",
            stage=item.stage,
            applied_date=item.applied_date,
            interview_date=item.interview_date,
            offer_date=item.offer_date,
            hired_date=item.hired_date,
            recruiter=item.recruiter.strip() if item.recruiter else None,
            notes=item.notes.strip() if item.notes else None,
        )
        db.add(candidate)
        imported.append(candidate)
        seen_ids.add(candidate_id)
        seen_emails.add(email)

    if imported:
        db.commit()
        for candidate in imported:
            db.refresh(candidate)
    else:
        db.rollback()

    return {
        "imported": len(imported),
        "failed": len(errors),
        "errors": errors[:100],
        "candidates": imported,
    }


@app.put("/candidates/{candidate_id}", response_model=CandidateResponse)
def update_candidate(candidate_id: int, candidate_data: CandidateCreate, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if candidate_data.stage not in RECRUITMENT_STAGES:
        raise HTTPException(status_code=400, detail=f"Stage must be one of: {', '.join(RECRUITMENT_STAGES)}")
    if candidate_data.hired_date and candidate_data.hired_date < candidate_data.applied_date:
        raise HTTPException(status_code=400, detail="Hired date cannot be before applied date")

    new_id = candidate_data.candidate_id.strip()
    new_email = str(candidate_data.email).strip().lower()
    duplicate_id = db.query(Candidate).filter(Candidate.candidate_id == new_id, Candidate.id != candidate_id).first()
    duplicate_email = db.query(Candidate).filter(Candidate.email == new_email, Candidate.id != candidate_id).first()
    if duplicate_id:
        raise HTTPException(status_code=400, detail="Candidate ID already exists")
    if duplicate_email:
        raise HTTPException(status_code=400, detail="Candidate email already exists")

    candidate.candidate_id = new_id
    candidate.full_name = candidate_data.full_name.strip()
    candidate.email = new_email
    candidate.role = candidate_data.role.strip()
    candidate.department = candidate_data.department.strip()
    candidate.source = candidate_data.source.strip() or "Direct"
    candidate.stage = candidate_data.stage
    candidate.applied_date = candidate_data.applied_date
    candidate.interview_date = candidate_data.interview_date
    candidate.offer_date = candidate_data.offer_date
    candidate.hired_date = candidate_data.hired_date
    candidate.recruiter = candidate_data.recruiter.strip() if candidate_data.recruiter else None
    candidate.notes = candidate_data.notes.strip() if candidate_data.notes else None
    db.commit()
    db.refresh(candidate)
    return candidate


@app.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(candidate)
    db.commit()
    return {"message": "Candidate deleted successfully"}


@app.get("/recruitment/summary")
def recruitment_summary(db: Session = Depends(get_db)):
    candidates = db.query(Candidate).order_by(Candidate.id).all()
    total = len(candidates)
    open_pipeline = sum(1 for c in candidates if c.stage in {"Applied", "Screening", "Interview", "Offer"})
    hired = sum(1 for c in candidates if c.stage == "Hired")
    rejected = sum(1 for c in candidates if c.stage == "Rejected")
    withdrawn = sum(1 for c in candidates if c.stage == "Withdrawn")

    stage_breakdown = {stage: 0 for stage in RECRUITMENT_STAGES}
    source_breakdown: dict[str, int] = {}
    department_breakdown: dict[str, int] = {}
    for c in candidates:
        if c.stage in stage_breakdown:
            stage_breakdown[c.stage] += 1
        source = clean_dimension(c.source)
        department = clean_dimension(c.department)
        if source:
            source_breakdown[source] = source_breakdown.get(source, 0) + 1
        if department:
            department_breakdown[department] = department_breakdown.get(department, 0) + 1

    days_to_hire = []
    recent_hires_90 = 0
    today = date.today()
    for c in candidates:
        applied = c.applied_date.date() if isinstance(c.applied_date, datetime) else c.applied_date
        hired_date = c.hired_date.date() if isinstance(c.hired_date, datetime) else c.hired_date
        if c.stage == "Hired" and applied and hired_date and hired_date >= applied:
            days_to_hire.append((hired_date - applied).days)
            if (today - hired_date).days <= 90:
                recent_hires_90 += 1

    avg_time_to_hire = round(sum(days_to_hire) / len(days_to_hire), 1) if days_to_hire else None
    hire_conversion = round((hired / total) * 100, 1) if total else 0

    month_starts = []
    anchor = date(today.year, today.month, 1)
    for offset in range(5, -1, -1):
        year, month = anchor.year, anchor.month - offset
        while month <= 0:
            year -= 1
            month += 12
        month_starts.append(date(year, month, 1))
    application_counts = {m: 0 for m in month_starts}
    for c in candidates:
        applied = c.applied_date.date() if isinstance(c.applied_date, datetime) else c.applied_date
        if not applied:
            continue
        for m in month_starts:
            next_month = date(m.year + 1, 1, 1) if m.month == 12 else date(m.year, m.month + 1, 1)
            if m <= applied < next_month:
                application_counts[m] += 1
                break

    monthly_applications = [{"month": m.isoformat(), "label": m.strftime("%b %Y"), "count": application_counts[m]} for m in month_starts]

    # ------------------------------------------------------------
    # FUNNEL INTELLIGENCE
    # ------------------------------------------------------------
    # The current Candidate model stores the candidate's current stage,
    # not a historical stage timeline. Therefore, funnel reach is a
    # current-stage snapshot for candidates still in the recorded funnel
    # (Applied → Screening → Interview → Offer → Hired). Rejected and
    # Withdrawn records are excluded because their earlier stage cannot
    # be reconstructed honestly from the current schema.
    funnel_stages = ["Applied", "Screening", "Interview", "Offer", "Hired"]
    funnel_candidates = [
        c for c in candidates
        if c.stage in funnel_stages
    ]

    stage_reach = {}
    for index, stage in enumerate(funnel_stages):
        stage_reach[stage] = sum(
            1
            for candidate in funnel_candidates
            if funnel_stages.index(candidate.stage) >= index
        )

    stage_conversion = {}
    largest_drop = None
    for index in range(1, len(funnel_stages)):
        previous_stage = funnel_stages[index - 1]
        current_stage = funnel_stages[index]
        previous_count = stage_reach[previous_stage]
        current_count = stage_reach[current_stage]
        conversion = (
            round((current_count / previous_count) * 100, 1)
            if previous_count
            else None
        )
        stage_conversion[f"{previous_stage} → {current_stage}"] = conversion

        if previous_count:
            drop_count = previous_count - current_count
            drop_rate = round((drop_count / previous_count) * 100, 1)
            candidate_drop = {
                "from_stage": previous_stage,
                "to_stage": current_stage,
                "from_count": previous_count,
                "to_count": current_count,
                "drop_count": drop_count,
                "drop_rate": drop_rate,
            }
            if largest_drop is None or candidate_drop["drop_rate"] > largest_drop["drop_rate"]:
                largest_drop = candidate_drop

    source_effectiveness = {}
    for source, source_total in sorted(source_breakdown.items(), key=lambda x: (-x[1], x[0].lower())):
        source_hires = sum(
            1
            for candidate in candidates
            if clean_dimension(candidate.source) == source and candidate.stage == "Hired"
        )
        source_effectiveness[source] = {
            "candidates": source_total,
            "hires": source_hires,
            "hire_rate": round((source_hires / source_total) * 100, 1) if source_total else 0,
        }

    funnel_insights = []
    if funnel_candidates:
        funnel_insights.append({
            "type": "info",
            "title": "Current funnel reach",
            "message": (
                f"{len(funnel_candidates)} of {total} recorded candidates are currently in the "
                f"Applied-to-Hired funnel snapshot. Rejected and withdrawn records are excluded."
            ),
        })
    if largest_drop and largest_drop["drop_count"] > 0:
        funnel_insights.append({
            "type": "attention",
            "title": "Largest recorded funnel drop",
            "message": (
                f"The largest drop is between {largest_drop['from_stage']} and {largest_drop['to_stage']}: "
                f"{largest_drop['drop_count']} candidate(s), or {largest_drop['drop_rate']}%."
            ),
        })
    if source_effectiveness:
        highest_hire_rate_source = max(
            source_effectiveness.items(),
            key=lambda item: (item[1]["hire_rate"], item[1]["hires"], item[1]["candidates"], item[0].lower()),
        )
        if highest_hire_rate_source[1]["hires"] > 0:
            funnel_insights.append({
                "type": "info",
                "title": "Recorded source hire rate",
                "message": (
                    f"{highest_hire_rate_source[0]} has the highest recorded hire rate at "
                    f"{highest_hire_rate_source[1]['hire_rate']}% ({highest_hire_rate_source[1]['hires']} hire(s))."
                ),
            })

    funnel_intelligence = {
        "eligible_candidate_count": len(funnel_candidates),
        "excluded_dispositions": {
            "Rejected": rejected,
            "Withdrawn": withdrawn,
        },
        "stage_reach": stage_reach,
        "stage_conversion": stage_conversion,
        "largest_drop": largest_drop,
        "source_effectiveness": source_effectiveness,
        "insights": funnel_insights,
    }

    return {
        "total_candidates": total,
        "open_pipeline": open_pipeline,
        "hired_candidates": hired,
        "rejected_candidates": rejected,
        "withdrawn_candidates": withdrawn,
        "hire_conversion_rate": hire_conversion,
        "average_time_to_hire_days": avg_time_to_hire,
        "recent_hires_90_days": recent_hires_90,
        "stage_breakdown": stage_breakdown,
        "source_breakdown": dict(sorted(source_breakdown.items(), key=lambda x: x[1], reverse=True)),
        "department_breakdown": dict(sorted(department_breakdown.items(), key=lambda x: x[1], reverse=True)),
        "monthly_applications": monthly_applications,
        "funnel_intelligence": funnel_intelligence,
    }


# ============================================================
# ANALYTICS SUMMARY
# ============================================================

@app.get("/analytics/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
):
    """Return workforce KPIs and actionable analytics derived from employee data."""
    employees = db.query(Employee).order_by(Employee.id).all()

    total_employees = len(employees)
    active_employees = sum(1 for employee in employees if employee.is_active)
    inactive_employees = total_employees - active_employees

    status_active = sum(
        1 for employee in employees
        if employee.status and employee.status.strip().lower() == "active"
    )
    status_inactive = sum(
        1 for employee in employees
        if employee.status and employee.status.strip().lower() == "inactive"
    )

    department_breakdown: dict[str, int] = {}
    employment_type_breakdown: dict[str, int] = {}
    location_breakdown: dict[str, int] = {}
    performance_distribution = {
        "90-100": 0,
        "75-89": 0,
        "60-74": 0,
        "Below 60": 0,
    }

    today = date.today()
    tenure_months: list[float] = []
    missing_fields = {
        "email": 0,
        "department": 0,
        "designation": 0,
        "date_of_joining": 0,
        "manager": 0,
        "performance_score": 0,
    }

    for employee in employees:
        department = clean_dimension(employee.department)
        employment_type = clean_dimension(employee.employment_type)
        location = clean_dimension(employee.location)

        if department:
            department_breakdown[department] = department_breakdown.get(department, 0) + 1

        if employment_type:
            employment_type_breakdown[employment_type] = employment_type_breakdown.get(employment_type, 0) + 1

        if location:
            location_breakdown[location] = location_breakdown.get(location, 0) + 1

        if employee.performance_score is not None:
            score = float(employee.performance_score)
            if 0 <= score <= 100:
                if score >= 90:
                    performance_distribution["90-100"] += 1
                elif score >= 75:
                    performance_distribution["75-89"] += 1
                elif score >= 60:
                    performance_distribution["60-74"] += 1
                else:
                    performance_distribution["Below 60"] += 1
            else:
                missing_fields["performance_score"] += 1
        else:
            missing_fields["performance_score"] += 1

        joining_date = (
            employee.date_of_joining.date()
            if isinstance(employee.date_of_joining, datetime)
            else employee.date_of_joining
        )
        if joining_date:
            tenure = max((today - joining_date).days / 30.44, 0)
            tenure_months.append(tenure)

        for field in missing_fields:
            if field == "performance_score":
                continue

            value = getattr(employee, field, None)
            if field in {"department", "designation", "manager"}:
                meaningful = clean_dimension(value)
                if meaningful is None:
                    missing_fields[field] += 1
            elif value is None or (isinstance(value, str) and not value.strip()):
                missing_fields[field] += 1

    average_tenure_months = (
        round(sum(tenure_months) / len(tenure_months), 1)
        if tenure_months else None
    )
    active_rate = round((active_employees / total_employees) * 100, 1) if total_employees else 0

    valid_performance_scores = [
        float(employee.performance_score)
        for employee in employees
        if employee.performance_score is not None
        and 0 <= float(employee.performance_score) <= 100
    ]
    average_performance_score = (
        round(sum(valid_performance_scores) / len(valid_performance_scores), 2)
        if valid_performance_scores else None
    )
    performance_coverage = (
        round((len(valid_performance_scores) / total_employees) * 100, 1)
        if total_employees else 0
    )

    # Workforce trend metrics are based only on valid joining dates.
    # They describe hiring activity recorded in the employee master data,
    # rather than pretending we have a full historical headcount ledger.
    month_starts: list[date] = []
    anchor = date(today.year, today.month, 1)
    for offset in range(11, -1, -1):
        year = anchor.year
        month = anchor.month - offset
        while month <= 0:
            year -= 1
            month += 12
        month_starts.append(date(year, month, 1))

    hiring_counts = {month_start: 0 for month_start in month_starts}
    valid_joining_dates: list[date] = []
    for employee in employees:
        joining_date = (
            employee.date_of_joining.date()
            if isinstance(employee.date_of_joining, datetime)
            else employee.date_of_joining
        )
        if not joining_date:
            continue
        if joining_date <= today:
            valid_joining_dates.append(joining_date)
        for index, month_start in enumerate(month_starts):
            next_month = (
                date(month_start.year + 1, 1, 1)
                if month_start.month == 12
                else date(month_start.year, month_start.month + 1, 1)
            )
            if month_start <= joining_date < next_month:
                hiring_counts[month_start] += 1
                break

    monthly_hiring_trend = [
        {
            "month": month_start.isoformat(),
            "label": month_start.strftime("%b %Y"),
            "count": hiring_counts[month_start],
        }
        for month_start in month_starts
    ]

    tenure_distribution = {
        "< 3 mo": 0,
        "3–6 mo": 0,
        "6–12 mo": 0,
        "1–2 yr": 0,
        "2+ yr": 0,
    }
    for joining_date in valid_joining_dates:
        months = max((today - joining_date).days / 30.44, 0)
        if months < 3:
            tenure_distribution["< 3 mo"] += 1
        elif months < 6:
            tenure_distribution["3–6 mo"] += 1
        elif months < 12:
            tenure_distribution["6–12 mo"] += 1
        elif months < 24:
            tenure_distribution["1–2 yr"] += 1
        else:
            tenure_distribution["2+ yr"] += 1

    recent_joiners_90_days = sum(
        1
        for joining_date in valid_joining_dates
        if (today - joining_date).days <= 90
    )

    top_department = (
        max(department_breakdown, key=department_breakdown.get)
        if department_breakdown
        else None
    )

    invalid_dimension_records = sum(
        missing_fields[field]
        for field in ("department", "designation")
    )

    insights = []
    if total_employees == 0:
        insights.append({
            "type": "info",
            "title": "Add your first employee",
            "message": "PeopleOS needs workforce data before meaningful analytics can be generated.",
        })
    else:
        if active_rate < 80:
            insights.append({
                "type": "attention",
                "title": "Active workforce rate is low",
                "message": f"{active_rate}% of recorded employees are currently active. Review inactive records for accuracy.",
            })

        if performance_coverage < 80:
            insights.append({
                "type": "attention",
                "title": "Performance data coverage is incomplete",
                "message": (
                    f"{len(valid_performance_scores)} of {total_employees} employees have a valid performance score. "
                    "Complete missing scores before relying on performance analytics for decisions."
                ),
            })

        if top_department:
            share = round((department_breakdown[top_department] / total_employees) * 100, 1)
            insights.append({
                "type": "info",
                "title": "Largest department",
                "message": f"{top_department} represents {share}% of the recorded workforce ({department_breakdown[top_department]} employees).",
            })

        if average_tenure_months is not None:
            insights.append({
                "type": "info",
                "title": "Average tenure",
                "message": f"The average recorded tenure is {average_tenure_months} months based on date of joining.",
            })

        if invalid_dimension_records:
            insights.append({
                "type": "attention",
                "title": "Some employee fields need cleanup",
                "message": "Placeholder or empty department/designation values are excluded from analytics. Update those employee records for cleaner reporting.",
            })

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "inactive_employees": inactive_employees,
        "status_active": status_active,
        "status_inactive": status_inactive,
        "active_rate": active_rate,
        "average_performance_score": average_performance_score,
        "performance_scored_count": len(valid_performance_scores),
        "performance_coverage": performance_coverage,
        "average_tenure_months": average_tenure_months,
        "recent_joiners_90_days": recent_joiners_90_days,
        "monthly_hiring_trend": monthly_hiring_trend,
        "tenure_distribution": tenure_distribution,
        "department_breakdown": dict(sorted(department_breakdown.items(), key=lambda item: item[1], reverse=True)),
        "employment_type_breakdown": dict(sorted(employment_type_breakdown.items(), key=lambda item: item[1], reverse=True)),
        "location_breakdown": dict(sorted(location_breakdown.items(), key=lambda item: item[1], reverse=True)),
        "performance_distribution": performance_distribution,
        "data_quality": missing_fields,
        "insights": insights,
        "recruitment": recruitment_summary(db),
        "lifecycle": lifecycle_summary(db),
    }

