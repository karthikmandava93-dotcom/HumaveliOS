"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";


/* ============================================================
   API URL
   ============================================================ */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (
    process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:8000"
      : "https://peopleos-7c5b.onrender.com"
  )
).replace(/\/+$/, "");


/* ============================================================
   TYPES
   ============================================================ */

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
  department_breakdown: Record<
    string,
    number
  >;
  employment_type_breakdown: Record<
    string,
    number
  >;
  location_breakdown: Record<
    string,
    number
  >;
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


/* ============================================================
   EMPTY FORM
   ============================================================ */

const EMPTY_FORM: EmployeeForm = {
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


/* ============================================================
   API HELPER
   ============================================================ */

async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,

      cache: "no-store",

      headers: {
        Accept: "application/json",
        ...(options?.headers || {}),
      },
    }
  );


  let data: unknown = null;


  try {
    data = await response.json();
  } catch {
    data = null;
  }


  if (!response.ok) {

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data
    ) {
      throw new Error(
        String(
          (
            data as {
              detail: unknown;
            }
          ).detail
        )
      );
    }


    throw new Error(
      `PeopleOS API returned ${response.status}`
    );
  }


  return data as T;
}


/* ============================================================
   PAGE
   ============================================================ */

export default function Home() {

  const [
    employees,
    setEmployees,
  ] = useState<Employee[]>([]);


  const [
    analytics,
    setAnalytics,
  ] = useState<Analytics | null>(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    departmentFilter,
    setDepartmentFilter,
  ] = useState("All");


  const [
    statusFilter,
    setStatusFilter,
  ] = useState("All");


  const [
    showModal,
    setShowModal,
  ] = useState(false);


  const [
    editingEmployee,
    setEditingEmployee,
  ] = useState<Employee | null>(null);


  const [
    form,
    setForm,
  ] = useState<EmployeeForm>(
    EMPTY_FORM
  );


  const [
    formError,
    setFormError,
  ] = useState("");


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    deletingId,
    setDeletingId,
  ] = useState<number | null>(null);


  /* ==========================================================
     LOAD DASHBOARD
     ========================================================== */

  async function loadDashboard() {

    try {

      setLoading(true);
      setError("");


      const [
        employeeData,
        analyticsData,
      ] = await Promise.all([

        apiRequest<Employee[]>(
          "/employees?skip=0&limit=100"
        ),

        apiRequest<Analytics>(
          "/analytics/summary"
        ),
      ]);


      setEmployees(
        employeeData
      );


      setAnalytics(
        analyticsData
      );

    } catch (err) {

      console.error(
        "PeopleOS API error:",
        err
      );


      if (err instanceof Error) {

        setError(
          `${err.message} — API: ${API_URL}`
        );

      } else {

        setError(
          `Unable to connect to PeopleOS API — API: ${API_URL}`
        );
      }

    } finally {

      setLoading(false);
    }
  }


  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    loadDashboard();
  }, []);


  /* ==========================================================
     DEPARTMENTS
     ========================================================== */

  const departments = useMemo(() => {

    if (!analytics) {
      return [];
    }


    return Object.keys(
      analytics.department_breakdown
    ).sort();

  }, [analytics]);


  /* ==========================================================
     FILTERED EMPLOYEES
     ========================================================== */

  const filteredEmployees = useMemo(() => {

    const query =
      search
        .trim()
        .toLowerCase();


    return employees.filter(
      (employee) => {

        const matchesSearch =
          !query ||
          employee.employee_id
            .toLowerCase()
            .includes(query) ||
          employee.full_name
            .toLowerCase()
            .includes(query) ||
          employee.email
            .toLowerCase()
            .includes(query) ||
          employee.department
            .toLowerCase()
            .includes(query) ||
          employee.designation
            .toLowerCase()
            .includes(query) ||
          (
            employee.skills ?? ""
          )
            .toLowerCase()
            .includes(query);


        const matchesDepartment =
          departmentFilter === "All" ||
          employee.department ===
            departmentFilter;


        const matchesStatus =
          statusFilter === "All" ||
          (
            statusFilter ===
              "Active" &&
            employee.is_active
          ) ||
          (
            statusFilter ===
              "Inactive" &&
            !employee.is_active
          );


        return (
          matchesSearch &&
          matchesDepartment &&
          matchesStatus
        );
      }
    );

  }, [
    employees,
    search,
    departmentFilter,
    statusFilter,
  ]);


  /* ==========================================================
     FORM HELPERS
     ========================================================== */

  function setField(
    field: keyof EmployeeForm,
    value: string | boolean
  ) {

    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }


  function openAddModal() {

    setEditingEmployee(null);

    setForm({
      ...EMPTY_FORM,
    });

    setFormError("");
    setShowModal(true);
  }


  function openEditModal(
    employee: Employee
  ) {

    setEditingEmployee(
      employee
    );


    setForm({

      employee_id:
        employee.employee_id,

      full_name:
        employee.full_name,

      email:
        employee.email,

      department:
        employee.department,

      designation:
        employee.designation,

      employment_type:
        employee.employment_type,

      date_of_joining:
        employee.date_of_joining
          .slice(0, 10),

      status:
        employee.status,

      location:
        employee.location ?? "",

      manager:
        employee.manager ?? "",

      performance_score:
        employee.performance_score ===
        null
          ? ""
          : String(
              employee.performance_score
            ),

      skills:
        employee.skills ?? "",

      is_active:
        employee.is_active,
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

    setForm({
      ...EMPTY_FORM,
    });

    setFormError("");
  }


  /* ==========================================================
     CREATE / UPDATE
     ========================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setFormError("");


    if (!form.employee_id.trim()) {
      setFormError(
        "Employee ID is required."
      );
      return;
    }


    if (!form.full_name.trim()) {
      setFormError(
        "Full name is required."
      );
      return;
    }


    if (!form.email.trim()) {
      setFormError(
        "Email is required."
      );
      return;
    }


    if (!form.department.trim()) {
      setFormError(
        "Department is required."
      );
      return;
    }


    if (!form.designation.trim()) {
      setFormError(
        "Designation is required."
      );
      return;
    }


    if (!form.date_of_joining) {
      setFormError(
        "Date of joining is required."
      );
      return;
    }


    const performanceScore =
      form.performance_score.trim() === ""
        ? null
        : Number(
            form.performance_score
          );


    if (
      performanceScore !== null &&
      (
        !Number.isFinite(
          performanceScore
        ) ||
        performanceScore < 0 ||
        performanceScore > 100
      )
    ) {

      setFormError(
        "Performance score must be between 0 and 100."
      );

      return;
    }


    setSaving(true);


    try {

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
          form.location.trim() ||
          null,

        manager:
          form.manager.trim() ||
          null,

        performance_score:
          performanceScore,

        skills:
          form.skills.trim() ||
          null,

        is_active:
          form.is_active,
      };


      if (editingEmployee) {

        await apiRequest<Employee>(
          `/employees/${editingEmployee.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      } else {

        await apiRequest<Employee>(
          "/employees",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );
      }


      closeModal();

      await loadDashboard();

    } catch (err) {

      console.error(
        "Save employee error:",
        err
      );


      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to save employee."
      );

    } finally {

      setSaving(false);
    }
  }


  /* ==========================================================
     DELETE
     ========================================================== */

  async function handleDelete(
    employee: Employee
  ) {

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${employee.full_name}?`
      );


    if (!confirmed) {
      return;
    }


    setDeletingId(
      employee.id
    );

    setError("");


    try {

      await apiRequest<{
        message: string;
        employee_id: number;
      }>(
        `/employees/${employee.id}`,
        {
          method: "DELETE",
        }
      );


      await loadDashboard();

    } catch (err) {

      console.error(
        "Delete employee error:",
        err
      );


      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete employee."
      );

    } finally {

      setDeletingId(null);
    }
  }


  /* ==========================================================
     BAR WIDTH
     ========================================================== */

  function barWidth(
    value: number,
    data: Record<string, number>
  ) {

    const maximum =
      Math.max(
        ...Object.values(data),
        0
      );


    if (!maximum) {
      return 0;
    }


    return Math.max(
      (value / maximum) * 100,
      8
    );
  }


  /* ==========================================================
     LOADING
     ========================================================== */

  if (
    loading &&
    !analytics
  ) {

    return (
      <main className="dashboard">

        <div className="message-card">
          Loading PeopleOS data...
        </div>

      </main>
    );
  }


  /* ==========================================================
     PAGE
     ========================================================== */

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

            <h1>
              PeopleOS
            </h1>

            <p>
              HR Analytics &
              Employee Management
            </p>

          </div>

        </div>


        <button
          className="refresh-button"
          onClick={
            loadDashboard
          }
          disabled={
            loading
          }
        >
          {loading
            ? "Loading..."
            : "Refresh Data"}
        </button>

      </header>


      {/* ======================================================
          ERROR
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


      {analytics && (

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
                {
                  analytics.total_employees
                }
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
                {
                  analytics.active_employees
                }
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
                {
                  analytics.inactive_employees
                }
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
                {
                  analytics.average_performance_score ??
                  0
                }
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

                {
                  Object.entries(
                    analytics.department_breakdown
                  ).length > 0 ? (

                    Object.entries(
                      analytics.department_breakdown
                    ).map(
                      (
                        [
                          department,
                          count,
                        ]
                      ) => (

                        <div
                          className="chart-item"
                          key={
                            department
                          }
                        >

                          <div className="chart-item-top">

                            <span>
                              {
                                department
                              }
                            </span>

                            <strong>
                              {count}
                            </strong>

                          </div>


                          <div className="bar-track">

                            <div
                              className="bar-fill blue-fill"
                              style={{
                                width:
                                  `${barWidth(
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

                  )
                }

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

                {
                  Object.entries(
                    analytics.location_breakdown
                  ).length > 0 ? (

                    Object.entries(
                      analytics.location_breakdown
                    ).map(
                      (
                        [
                          location,
                          count,
                        ]
                      ) => (

                        <div
                          className="chart-item"
                          key={
                            location
                          }
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
                                width:
                                  `${barWidth(
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

                  )
                }

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

                {
                  Object.entries(
                    analytics.employment_type_breakdown
                  ).length > 0 ? (

                    Object.entries(
                      analytics.employment_type_breakdown
                    ).map(
                      (
                        [
                          employmentType,
                          count,
                        ]
                      ) => (

                        <div
                          className="chart-item"
                          key={
                            employmentType
                          }
                        >

                          <div className="chart-item-top">

                            <span>
                              {
                                employmentType
                              }
                            </span>

                            <strong>
                              {count}
                            </strong>

                          </div>


                          <div className="bar-track">

                            <div
                              className="bar-fill green-fill"
                              style={{
                                width:
                                  `${barWidth(
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

                  )
                }

              </div>

            </div>


            {/* WORKFORCE STATUS */}

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
                      {
                        analytics.status_active
                      }
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
                      {
                        analytics.status_inactive
                      }
                    </strong>

                  </div>

                </div>

              </div>


              <div className="status-progress">

                <div
                  className="status-progress-active"
                  style={{
                    width:
                      `${
                        analytics.total_employees
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
                  Search and filter your workforce
                </p>

              </div>


              <div className="management-actions">

                <span className="employee-count">
                  {
                    filteredEmployees.length
                  }{" "}
                  of{" "}
                  {
                    employees.length
                  }
                </span>


                <button
                  className="add-button"
                  onClick={
                    openAddModal
                  }
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
                  placeholder="Search by name, ID, email, role or skill..."
                  value={
                    search
                  }
                  onChange={
                    (event) =>
                      setSearch(
                        event.target.value
                      )
                  }
                />

              </div>


              <select
                value={
                  departmentFilter
                }
                onChange={
                  (event) =>
                    setDepartmentFilter(
                      event.target.value
                    )
                }
              >

                <option value="All">
                  All Departments
                </option>

                {
                  departments.map(
                    (department) => (

                      <option
                        key={
                          department
                        }
                        value={
                          department
                        }
                      >
                        {
                          department
                        }
                      </option>

                    )
                  )
                }

              </select>


              <select
                value={
                  statusFilter
                }
                onChange={
                  (event) =>
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


            {/* TABLE */}

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

                  {
                    filteredEmployees.length >
                    0 ? (

                      filteredEmployees.map(
                        (employee) => (

                          <tr
                            key={
                              employee.id
                            }
                          >

                            <td>

                              <div className="employee-cell">

                                <div className="avatar">
                                  {
                                    employee.full_name
                                      .charAt(0)
                                      .toUpperCase()
                                  }
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
                                    }{" "}
                                    ·{" "}
                                    {
                                      employee.email
                                    }
                                  </div>

                                </div>

                              </div>

                            </td>


                            <td>
                              {
                                employee.department
                              }
                            </td>


                            <td>
                              {
                                employee.designation
                              }
                            </td>


                            <td>
                              {
                                employee.location ??
                                "—"
                              }
                            </td>


                            <td>

                              <span className="performance">
                                {
                                  employee.performance_score ??
                                  "—"
                                }
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
                                {
                                  employee.is_active
                                    ? "Active"
                                    : "Inactive"
                                }
                              </span>

                            </td>


                            <td>

                              <div className="row-actions">

                                <button
                                  className="edit-button"
                                  onClick={
                                    () =>
                                      openEditModal(
                                        employee
                                      )
                                  }
                                >
                                  Edit
                                </button>


                                <button
                                  className="delete-button"
                                  onClick={
                                    () =>
                                      handleDelete(
                                        employee
                                      )
                                  }
                                  disabled={
                                    deletingId ===
                                    employee.id
                                  }
                                >
                                  {
                                    deletingId ===
                                    employee.id
                                      ? "Deleting..."
                                      : "Delete"
                                  }
                                </button>

                              </div>

                            </td>

                          </tr>

                        )
                      )

                    ) : (

                      <tr>

                        <td
                          colSpan={
                            7
                          }
                          className="empty-state"
                        >
                          No employees match your current search or filters.
                        </td>

                      </tr>

                    )
                  }

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
          onMouseDown={
            (event) => {

              if (
                event.target ===
                event.currentTarget
              ) {
                closeModal();
              }

            }
          }
        >

          <div className="modal">

            <div className="modal-header">

              <div>

                <h2>
                  {
                    editingEmployee
                      ? "Edit Employee"
                      : "Add Employee"
                  }
                </h2>

                <p>
                  {
                    editingEmployee
                      ? "Update the employee information."
                      : "Enter the employee information."
                  }
                </p>

              </div>


              <button
                className="close-button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
              >
                ×
              </button>

            </div>


            {formError && (

              <div className="form-error">
                {
                  formError
                }
              </div>

            )}


            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="form-grid">

                <div className="form-field">

                  <label>
                    Employee ID *
                  </label>

                  <input
                    type="text"
                    value={
                      form.employee_id
                    }
                    onChange={
                      (event) =>
                        setField(
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


                <div className="form-field">

                  <label>
                    Full Name *
                  </label>

                  <input
                    type="text"
                    value={
                      form.full_name
                    }
                    onChange={
                      (event) =>
                        setField(
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


                <div className="form-field">

                  <label>
                    Email *
                  </label>

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    onChange={
                      (event) =>
                        setField(
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


                <div className="form-field">

                  <label>
                    Department *
                  </label>

                  <input
                    type="text"
                    value={
                      form.department
                    }
                    onChange={
                      (event) =>
                        setField(
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


                <div className="form-field">

                  <label>
                    Designation *
                  </label>

                  <input
                    type="text"
                    value={
                      form.designation
                    }
                    onChange={
                      (event) =>
                        setField(
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


                <div className="form-field">

                  <label>
                    Employment Type
                  </label>

                  <select
                    value={
                      form.employment_type
                    }
                    onChange={
                      (event) =>
                        setField(
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


                <div className="form-field">

                  <label>
                    Date of Joining *
                  </label>

                  <input
                    type="date"
                    value={
                      form.date_of_joining
                    }
                    onChange={
                      (event) =>
                        setField(
                          "date_of_joining",
                          event.target.value
                        )
                    }
                    disabled={
                      saving
                    }
                  />

                </div>


                <div className="form-field">

                  <label>
                    Status
                  </label>

                  <select
                    value={
                      form.status
                    }
                    onChange={
                      (event) =>
                        setField(
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


                <div className="form-field">

                  <label>
                    Location
                  </label>

                  <input
                    type="text"
                    value={
                      form.location
                    }
                    onChange={
                      (event) =>
                        setField(
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


                <div className="form-field">

                  <label>
                    Manager
                  </label>

                  <input
                    type="text"
                    value={
                      form.manager
                    }
                    onChange={
                      (event) =>
                        setField(
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
                    onChange={
                      (event) =>
                        setField(
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


              <div className="form-field full-field">

                <label>
                  Skills
                </label>

                <textarea
                  value={
                    form.skills
                  }
                  onChange={
                    (event) =>
                      setField(
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


              <label className="checkbox-field">

                <input
                  type="checkbox"
                  checked={
                    form.is_active
                  }
                  onChange={
                    (event) =>
                      setField(
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


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="save-button"
                  disabled={
                    saving
                  }
                >
                  {
                    saving
                      ? "Saving..."
                      : editingEmployee
                      ? "Save Changes"
                      : "Create Employee"
                  }
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
}