from datetime import date, datetime
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Employee


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="PeopleOS API",
    description="People Analytics and HR Operations Platform",
    version="1.0.0",
)


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
# ANALYTICS SUMMARY
# ============================================================

@app.get(
    "/analytics/summary"
)
def get_analytics_summary(
    db: Session = Depends(get_db),
):
    employees = (
        db.query(Employee)
        .order_by(Employee.id)
        .all()
    )

    total_employees = len(
        employees
    )

    active_employees = sum(
        1
        for employee in employees
        if employee.is_active
    )

    inactive_employees = (
        total_employees
        - active_employees
    )

    status_active = sum(
        1
        for employee in employees
        if employee.status
        and employee.status.strip().lower()
        == "active"
    )

    status_inactive = sum(
        1
        for employee in employees
        if employee.status
        and employee.status.strip().lower()
        == "inactive"
    )

    performance_scores = [
        float(
            employee.performance_score
        )
        for employee in employees
        if employee.performance_score
        is not None
    ]

    if performance_scores:
        average_performance_score = round(
            sum(performance_scores)
            / len(performance_scores),
            2,
        )
    else:
        average_performance_score = None

    department_breakdown = {}
    employment_type_breakdown = {}
    location_breakdown = {}

    for employee in employees:

        if employee.department:
            department = (
                employee.department.strip()
            )

            department_breakdown[
                department
            ] = (
                department_breakdown.get(
                    department,
                    0,
                )
                + 1
            )

        if employee.employment_type:
            employment_type = (
                employee.employment_type.strip()
            )

            employment_type_breakdown[
                employment_type
            ] = (
                employment_type_breakdown.get(
                    employment_type,
                    0,
                )
                + 1
            )

        if employee.location:
            location = (
                employee.location.strip()
            )

            if location:
                location_breakdown[
                    location
                ] = (
                    location_breakdown.get(
                        location,
                        0,
                    )
                    + 1
                )

    return {
        "total_employees":
            total_employees,

        "active_employees":
            active_employees,

        "inactive_employees":
            inactive_employees,

        "status_active":
            status_active,

        "status_inactive":
            status_inactive,

        "average_performance_score":
            average_performance_score,

        "department_breakdown":
            department_breakdown,

        "employment_type_breakdown":
            employment_type_breakdown,

        "location_breakdown":
            location_breakdown,
    }