"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type Employee = {
  id: number;
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  employment_type: string;
  date_of_joining: string;
  status: string;
  location: string | null;
  manager: string | null;
  performance_score: number | null;
  skills: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Analytics = {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  status_active: number;
  status_inactive: number;
  average_performance_score: number | null;
  department_breakdown: Record<string, number>;
  employment_type_breakdown: Record<string, number>;
  location_breakdown: Record<string, number>;
};

type EmployeeForm = {
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  employment_type: string;
  date_of_joining: string;
  status: string;
  location: string;
  manager: string;
  performance_score: string;
  skills: string;
  is_active: boolean;
};

const emptyForm: EmployeeForm = {
  employee_id: "",
  full_name: "",
  email: "",
  department: "",
  designation: "",
  employment_type: "Full-time",
  date_of_joining: "",
  status: "Active",
  location: "",
  manager: "",
  performance_score: "",
  skills: "",
  is_active: true,
};

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [analytics, setAnalytics] =
    useState<Analytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] =
    useState("All");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);

  const [form, setForm] =
    useState<EmployeeForm>(emptyForm);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  // ==========================================================
  // LOAD EMPLOYEES + ANALYTICS
  // ==========================================================

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        employeesResponse,
        analyticsResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/employees?skip=0&limit=100`,
          {
            cache: "no-store",
          }
        ),
        fetch(
          `${API_URL}/analytics/summary`,
          {
            cache: "no-store",
          }
        ),
      ]);

      if (!employeesResponse.ok) {
        throw new Error(
          `Employees API error: ${employeesResponse.status}`
        );
      }

      if (!analyticsResponse.ok) {
        throw new Error(
          `Analytics API error: ${analyticsResponse.status}`
        );
      }

      const employeeData: Employee[] =
        await employeesResponse.json();

      const analyticsData: Analytics =
        await analyticsResponse.json();

      setEmployees(employeeData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to PeopleOS API."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==========================================================
  // DEPARTMENTS
  // ==========================================================

  const departments = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return Object.keys(
      analytics.department_breakdown
    ).sort();
  }, [analytics]);

  // ==========================================================
  // FILTERED EMPLOYEES
  // ==========================================================

  const filteredEmployees = useMemo(() => {
    const text = search.toLowerCase().trim();

    return employees.filter((employee) => {
      const matchesSearch =
        !text ||
        employee.full_name
          .toLowerCase()
          .includes(text) ||
        employee.employee_id
          .toLowerCase()
          .includes(text) ||
        employee.email
          .toLowerCase()
          .includes(text) ||
        employee.department
          .toLowerCase()
          .includes(text) ||
        employee.designation
          .toLowerCase()
          .includes(text) ||
        (employee.skills ?? "")
          .toLowerCase()
          .includes(text);

      const matchesDepartment =
        departmentFilter === "All" ||
        employee.department ===
          departmentFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" &&
          employee.is_active) ||
        (statusFilter === "Inactive" &&
          !employee.is_active);

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus
      );
    });
  }, [
    employees,
    search,
    departmentFilter,
    statusFilter,
  ]);

  // ==========================================================
  // FORM HELPERS
  // ==========================================================

  function updateForm(
    field: keyof EmployeeForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openAddModal() {
    setEditingEmployee(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(employee: Employee) {
    setEditingEmployee(employee);

    setForm({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      department: employee.department,
      designation: employee.designation,
      employment_type:
        employee.employment_type,
      date_of_joining:
        employee.date_of_joining,
      status: employee.status,
      location: employee.location ?? "",
      manager: employee.manager ?? "",
      performance_score:
        employee.performance_score !== null
          ? String(employee.performance_score)
          : "",
      skills: employee.skills ?? "",
      is_active: employee.is_active,
    });

    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingEmployee(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  // ==========================================================
  // CREATE / UPDATE
  // ==========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");
    setSaving(true);

    try {
      if (!form.employee_id.trim()) {
        throw new Error(
          "Employee ID is required."
        );
      }

      if (!form.full_name.trim()) {
        throw new Error(
          "Full name is required."
        );
      }

      if (!form.email.trim()) {
        throw new Error(
          "Email is required."
        );
      }

      if (!form.department.trim()) {
        throw new Error(
          "Department is required."
        );
      }

      if (!form.designation.trim()) {
        throw new Error(
          "Designation is required."
        );
      }

      if (!form.date_of_joining) {
        throw new Error(
          "Date of joining is required."
        );
      }

      let performanceScore:
        | number
        | null = null;

      if (
        form.performance_score.trim() !== ""
      ) {
        const parsedScore = Number(
          form.performance_score
        );

        if (
          Number.isNaN(parsedScore) ||
          parsedScore < 0 ||
          parsedScore > 100
        ) {
          throw new Error(
            "Performance score must be between 0 and 100."
          );
        }

        performanceScore = parsedScore;
      }

      const payload = {
        employee_id:
          form.employee_id.trim(),

        full_name:
          form.full_name.trim(),

        email:
          form.email.trim(),

        department:
          form.department.trim(),

        designation:
          form.designation.trim(),

        employment_type:
          form.employment_type,

        date_of_joining:
          form.date_of_joining,

        status:
          form.status,

        location:
          form.location.trim() || null,

        manager:
          form.manager.trim() || null,

        performance_score:
          performanceScore,

        skills:
          form.skills.trim() || null,

        is_active:
          form.is_active,
      };

      const url = editingEmployee
        ? `${API_URL}/employees/${editingEmployee.id}`
        : `${API_URL}/employees`;

      const method = editingEmployee
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: unknown = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        let detail =
          "Unable to save employee.";

        if (
          typeof data === "object" &&
          data !== null &&
          "detail" in data
        ) {
          detail = String(
            (data as { detail: unknown })
              .detail
          );
        }

        throw new Error(detail);
      }

      closeModal();
      await loadDashboard();
    } catch (err) {
      console.error("Save error:", err);

      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to save employee."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async function handleDelete(
    employee: Employee
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee.full_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(employee.id);
      setError("");

      const response = await fetch(
        `${API_URL}/employees/${employee.id}`,
        {
          method: "DELETE",
        }
      );

      let data: unknown = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        let detail =
          "Unable to delete employee.";

        if (
          typeof data === "object" &&
          data !== null &&
          "detail" in data
        ) {
          detail = String(
            (data as { detail: unknown })
              .detail
          );
        }

        throw new Error(detail);
      }

      await loadDashboard();
    } catch (err) {
      console.error("Delete error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete employee."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ==========================================================
  // BAR WIDTH
  // ==========================================================

  function getBarWidth(
    value: number,
    data: Record<string, number>
  ) {
    const values = Object.values(data);

    if (!values.length) {
      return 0;
    }

    const maximum = Math.max(...values);

    if (maximum === 0) {
      return 0;
    }

    return Math.max(
      (value / maximum) * 100,
      8
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="dashboard">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="topbar">

        <div className="brand-row">

          <div className="brand-icon">
            P
          </div>

          <div>
            <h1>PeopleOS</h1>

            <p>
              HR Analytics & Employee Management
            </p>
          </div>

        </div>

        <button
          className="refresh-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : "Refresh Data"}
        </button>

      </header>

      {/* ======================================================
          API ERROR
      ====================================================== */}

      {error && (
        <div className="error-message">

          <strong>
            Something went wrong
          </strong>

          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError("")
            }
          >
            Dismiss
          </button>

        </div>
      )}

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && !analytics && (
        <div className="message-card">
          Loading PeopleOS data...
        </div>
      )}

      {/* ======================================================
          DASHBOARD
      ====================================================== */}

      {!loading && analytics && (
        <>
          {/* ==================================================
              KPI CARDS
          ================================================== */}

          <section className="stats-grid">

            <div className="stat-card">

              <div className="stat-card-top">

                <span>
                  Total Employees
                </span>

                <div className="stat-icon blue">
                  👥
                </div>

              </div>

              <strong>
                {analytics.total_employees}
              </strong>

              <small>
                Current workforce
              </small>

            </div>

            <div className="stat-card">

              <div className="stat-card-top">

                <span>
                  Active Employees
                </span>

                <div className="stat-icon green">
                  ✓
                </div>

              </div>

              <strong>
                {analytics.active_employees}
              </strong>

              <small>
                Currently active
              </small>

            </div>

            <div className="stat-card">

              <div className="stat-card-top">

                <span>
                  Inactive Employees
                </span>

                <div className="stat-icon orange">
                  ○
                </div>

              </div>

              <strong>
                {analytics.inactive_employees}
              </strong>

              <small>
                Currently inactive
              </small>

            </div>

            <div className="stat-card">

              <div className="stat-card-top">

                <span>
                  Average Performance
                </span>

                <div className="stat-icon purple">
                  ★
                </div>

              </div>

              <strong>
                {analytics.average_performance_score ??
                  0}
              </strong>

              <small>
                Overall performance score
              </small>

            </div>

          </section>

          {/* ==================================================
              ANALYTICS
          ================================================== */}

          <section className="analytics-grid">

            {/* DEPARTMENT */}

            <div className="panel">

              <div className="panel-header">

                <div>
                  <h2>
                    Department Breakdown
                  </h2>

                  <p>
                    Workforce distribution by department
                  </p>
                </div>

              </div>

              <div className="chart-list">

                {Object.entries(
                  analytics.department_breakdown
                ).length > 0 ? (
                  Object.entries(
                    analytics.department_breakdown
                  ).map(
                    ([department, count]) => (
                      <div
                        className="chart-item"
                        key={department}
                      >
                        <div className="chart-item-top">

                          <span>
                            {department}
                          </span>

                          <strong>
                            {count}
                          </strong>

                        </div>

                        <div className="bar-track">

                          <div
                            className="bar-fill blue-fill"
                            style={{
                              width: `${getBarWidth(
                                count,
                                analytics.department_breakdown
                              )}%`,
                            }}
                          />

                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="empty-chart">
                    No department data available.
                  </div>
                )}

              </div>

            </div>

            {/* LOCATION */}

            <div className="panel">

              <div className="panel-header">

                <div>
                  <h2>
                    Location Breakdown
                  </h2>

                  <p>
                    Workforce distribution by location
                  </p>
                </div>

              </div>

              <div className="chart-list">

                {Object.entries(
                  analytics.location_breakdown
                ).length > 0 ? (
                  Object.entries(
                    analytics.location_breakdown
                  ).map(
                    ([location, count]) => (
                      <div
                        className="chart-item"
                        key={location}
                      >
                        <div className="chart-item-top">

                          <span>
                            {location}
                          </span>

                          <strong>
                            {count}
                          </strong>

                        </div>

                        <div className="bar-track">

                          <div
                            className="bar-fill purple-fill"
                            style={{
                              width: `${getBarWidth(
                                count,
                                analytics.location_breakdown
                              )}%`,
                            }}
                          />

                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="empty-chart">
                    No location data available.
                  </div>
                )}

              </div>

            </div>

            {/* EMPLOYMENT TYPE */}

            <div className="panel">

              <div className="panel-header">

                <div>
                  <h2>
                    Employment Type
                  </h2>

                  <p>
                    Workforce by employment type
                  </p>
                </div>

              </div>

              <div className="chart-list">

                {Object.entries(
                  analytics.employment_type_breakdown
                ).length > 0 ? (
                  Object.entries(
                    analytics.employment_type_breakdown
                  ).map(
                    ([employmentType, count]) => (
                      <div
                        className="chart-item"
                        key={employmentType}
                      >
                        <div className="chart-item-top">

                          <span>
                            {employmentType}
                          </span>

                          <strong>
                            {count}
                          </strong>

                        </div>

                        <div className="bar-track">

                          <div
                            className="bar-fill green-fill"
                            style={{
                              width: `${getBarWidth(
                                count,
                                analytics.employment_type_breakdown
                              )}%`,
                            }}
                          />

                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="empty-chart">
                    No employment type data available.
                  </div>
                )}

              </div>

            </div>

            {/* STATUS */}

            <div className="panel">

              <div className="panel-header">

                <div>
                  <h2>
                    Workforce Status
                  </h2>

                  <p>
                    Active vs inactive employees
                  </p>
                </div>

              </div>

              <div className="status-summary">

                <div className="status-summary-item">

                  <div className="status-dot green-dot" />

                  <div>
                    <span>
                      Active
                    </span>

                    <strong>
                      {analytics.status_active}
                    </strong>
                  </div>

                </div>

                <div className="status-summary-item">

                  <div className="status-dot red-dot" />

                  <div>
                    <span>
                      Inactive
                    </span>

                    <strong>
                      {analytics.status_inactive}
                    </strong>
                  </div>

                </div>

              </div>

              <div className="status-progress">

                <div
                  className="status-progress-active"
                  style={{
                    width: `${
                      analytics.total_employees > 0
                        ? (
                            analytics.status_active /
                            analytics.total_employees
                          ) * 100
                        : 0
                    }%`,
                  }}
                />

              </div>

            </div>

          </section>

          {/* ==================================================
              EMPLOYEE MANAGEMENT
          ================================================== */}

          <section className="panel employee-panel">

            <div className="employee-panel-header">

              <div>

                <h2>
                  Employee Management
                </h2>

                <p>
                  Add, edit, delete, search and filter employees
                </p>

              </div>

              <div className="management-actions">

                <span className="employee-count">
                  {filteredEmployees.length} of{" "}
                  {employees.length}
                </span>

                <button
                  className="add-button"
                  onClick={openAddModal}
                >
                  + Add Employee
                </button>

              </div>

            </div>

            {/* FILTERS */}

            <div className="filters">

              <div className="search-box">

                <span>
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search by name, ID, email, department, role or skill..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />

              </div>

              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  All Departments
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department}
                      value={department}
                    >
                      {department}
                    </option>
                  )
                )}

              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  All Status
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

              </select>

            </div>

            {/* EMPLOYEE TABLE */}

            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>
                      Employee
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Designation
                    </th>

                    <th>
                      Location
                    </th>

                    <th>
                      Performance
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredEmployees.length > 0 ? (

                    filteredEmployees.map(
                      (employee) => (

                        <tr
                          key={employee.id}
                        >

                          <td>

                            <div className="employee-cell">

                              <div className="avatar">
                                {employee.full_name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>

                                <div className="employee-name">
                                  {
                                    employee.full_name
                                  }
                                </div>

                                <div className="employee-meta">
                                  {
                                    employee.employee_id
                                  }
                                  {" · "}
                                  {employee.email}
                                </div>

                              </div>

                            </div>

                          </td>

                          <td>
                            {employee.department}
                          </td>

                          <td>
                            {employee.designation}
                          </td>

                          <td>
                            {employee.location ??
                              "—"}
                          </td>

                          <td>

                            <span className="performance">
                              {employee.performance_score ??
                                "—"}
                            </span>

                          </td>

                          <td>

                            <span
                              className={
                                employee.is_active
                                  ? "status active"
                                  : "status inactive"
                              }
                            >
                              {employee.is_active
                                ? "Active"
                                : "Inactive"}
                            </span>

                          </td>

                          <td>

                            <div className="row-actions">

                              <button
                                className="edit-button"
                                onClick={() =>
                                  openEditModal(
                                    employee
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="delete-button"
                                onClick={() =>
                                  handleDelete(
                                    employee
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  employee.id
                                }
                              >
                                {deletingId ===
                                employee.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan={7}
                        className="empty-state"
                      >
                        No employees match your current search or filters.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>

        </>
      )}

      {/* ======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="modal">

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <h2>
                  {editingEmployee
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>

                <p>
                  {editingEmployee
                    ? "Update the employee information."
                    : "Enter the employee information."}
                </p>

              </div>

              <button
                className="close-button"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>

            </div>

            {/* FORM ERROR */}

            {formError && (
              <div className="form-error">
                {formError}
              </div>
            )}

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
            >

              <div className="form-grid">

                {/* EMPLOYEE ID */}

                <div className="form-field">

                  <label>
                    Employee ID *
                  </label>

                  <input
                    type="text"
                    value={
                      form.employee_id
                    }
                    onChange={(event) =>
                      updateForm(
                        "employee_id",
                        event.target.value
                      )
                    }
                    placeholder="EMP004"
                    disabled={
                      saving
                    }
                  />

                </div>

                {/* FULL NAME */}

                <div className="form-field">

                  <label>
                    Full Name *
                  </label>

                  <input
                    type="text"
                    value={
                      form.full_name
                    }
                    onChange={(event) =>
                      updateForm(
                        "full_name",
                        event.target.value
                      )
                    }
                    placeholder="Ananya Rao"
                    disabled={
                      saving
                    }
                  />

                </div>

                {/* EMAIL */}

                <div className="form-field">

                  <label>
                    Email *
                  </label>

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(event) =>
                      updateForm(
                        "email",
                        event.target.value
                      )
                    }
                    placeholder="employee@example.com"
                    disabled={
                      saving
                    }
                  />

                </div>

                {/* DEPARTMENT */}

                <div className="form-field">

                  <label>
                    Department *
                  </label>

                  <input
                    type="text"
                    value={
                      form.department
                    }
                    onChange={(event) =>
                      updateForm(
                        "department",
                        event.target.value
                      )
                    }
                    placeholder="Human Resources"
                    disabled={
                      saving
                    }
                  />

                </div>

                {/* DESIGNATION */}

                <div className="form-field">

                  <label>
                    Designation *
                  </label>

                  <input
                    type="text"
                    value={
                      form.designation
                    }
                    onChange={(event) =>
                      updateForm(
                        "designation",
                        event.target.value
                      )
                    }
                    placeholder="HR Executive"
                    disabled={
                      saving
                    }
                  />

                </div>

                {/* EMPLOYMENT TYPE */}

                <div className="form-field">

                  <label>
                    Employment Type
                  </label>

                  <select
                    value={
                      form.employment_type
                    }
                    onChange={(event) =>
                      updateForm(
                        "employment_type",
                        event.target.value
                      )
                    }
                    disabled={
                      saving
                    }
                  >
                    <option value="Full-time">
                      Full-time
                    </option>

                    <option value="Part-time">
                      Part-time
                    </option>

                    <option value="Contract">
                      Contract
                    </option>

                    <option value="Intern">
                      Intern
                    </option>

                  </select>

                </div>

                {/* JOINING DATE */}

                <div className="form-field">

                  <label>
                    Date of Joining *
                  </label>

                  <input
                    type="date"
                    value={
                      form.date_of_joining
                    }
                    onChange={(event) =>
                      updateForm(
                        "date_of_joining",
                        event.target.value
                      )
                    }
                    disabled={
                      saving
                    }
                  />

                </div>

                {/* STATUS */}

                <div className="form-field">

                  <label>
                    Status
                  </label>

                  <select
                    value={
                      form.status
                    }
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value
                      )
                    }
                    disabled={
                      saving
                    }
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>

                    <option value="On Leave">
                      On Leave
                    </option>

                  </select>

                </div>

                {/* LOCATION */}

                <div className="form-field">

                  <label>
                    Location
                  </label>

                  <input
                    type="text"
                    value={
                      form.location
                    }
                    onChange={(event) =>
                      updateForm(
                        "location",
                        event.target.value
                      )
                    }
                    placeholder="Hyderabad"
                    disabled={
                      saving
                    }
                  />

                </div>

                {/* MANAGER */}

                <div className="form-field">

                  <label>
                    Manager
                  </label>

                  <input
                    type="text"
                    value={
                      form.manager
                    }
                    onChange={(event) =>
                      updateForm(
                        "manager",
                        event.target.value
                      )
                    }
                    placeholder="HR Manager"
                    disabled={
                      saving
                    }
                  />

                </div>

                {/* PERFORMANCE */}

                <div className="form-field">

                  <label>
                    Performance Score
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      form.performance_score
                    }
                    onChange={(event) =>
                      updateForm(
                        "performance_score",
                        event.target.value
                      )
                    }
                    placeholder="90"
                    disabled={
                      saving
                    }
                  />

                </div>

              </div>

              {/* SKILLS */}

              <div className="form-field full-field">

                <label>
                  Skills
                </label>

                <textarea
                  value={
                    form.skills
                  }
                  onChange={(event) =>
                    updateForm(
                      "skills",
                      event.target.value
                    )
                  }
                  placeholder="Recruitment, HR Operations, Excel, Power BI, SQL"
                  rows={3}
                  disabled={
                    saving
                  }
                />

              </div>

              {/* ACTIVE */}

              <label className="checkbox-field">

                <input
                  type="checkbox"
                  checked={
                    form.is_active
                  }
                  onChange={(event) =>
                    updateForm(
                      "is_active",
                      event.target.checked
                    )
                  }
                  disabled={
                    saving
                  }
                />

                <span>
                  Employee is currently active
                </span>

              </label>

              {/* ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingEmployee
                    ? "Save Changes"
                    : "Create Employee"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}