"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";


/* ============================================================
   API URL
   ============================================================ */

const AUTH_TOKEN_KEY = "peopleos_access_token";
const AUTH_USER_KEY = "peopleos_auth_user";

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
  active_rate: number;
  average_performance_score: number | null;
  performance_scored_count: number;
  performance_coverage: number;
  average_tenure_months: number | null;
  recent_joiners_90_days: number;
  monthly_hiring_trend: Array<{
    month: string;
    label: string;
    count: number;
  }>;
  tenure_distribution: Record<string, number>;
  performance_distribution: Record<string, number>;
  data_quality: Record<string, number>;
  insights: Array<{
    type: "info" | "attention";
    title: string;
    message: string;
  }>;
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
  recruitment: RecruitmentAnalytics;
  lifecycle: LifecycleAnalytics;
};

type LifecycleAnalytics = {
  total_employees: number;
  recorded_lifecycle_records: number;
  recorded_exits: number;
  recent_exits_90_days: number;
  recent_joiners_90_days: number;
  status_breakdown: Record<string, number>;
  exit_reason_breakdown: Record<string, number>;
  monthly_exits: Array<{ month: string; label: string; count: number }>;
  unrecorded_inactive: number;
  average_tenure_at_exit_months: number | null;
  exit_reason_coverage: number;
  exit_department_breakdown: Record<string, number>;
  exit_location_breakdown: Record<string, number>;
  insights: Array<{ type: "info" | "attention"; title: string; message: string }>;
  retention_insights: Array<{ type: "info" | "attention"; title: string; message: string }>;
  attrition_note: string;
};


type RecruitmentAnalytics = {
  total_candidates: number;
  open_pipeline: number;
  hired_candidates: number;
  rejected_candidates: number;
  withdrawn_candidates: number;
  hire_conversion_rate: number;
  average_time_to_hire_days: number | null;
  recent_hires_90_days: number;
  stage_breakdown: Record<string, number>;
  source_breakdown: Record<string, number>;
  department_breakdown: Record<string, number>;
  monthly_applications: Array<{ month: string; label: string; count: number }>;
  funnel_intelligence: {
    eligible_candidate_count: number;
    excluded_dispositions: Record<string, number>;
    stage_reach: Record<string, number>;
    stage_conversion: Record<string, number | null>;
    largest_drop: {
      from_stage: string;
      to_stage: string;
      from_count: number;
      to_count: number;
      drop_count: number;
      drop_rate: number;
    } | null;
    source_effectiveness: Record<string, { candidates: number; hires: number; hire_rate: number }>;
    insights: Array<{ type: "info" | "attention"; title: string; message: string }>;
  };
};

type Candidate = {
  id: number;
  candidate_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  source: string;
  stage: string;
  applied_date: string;
  interview_date: string | null;
  offer_date: string | null;
  hired_date: string | null;
  recruiter: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type AppUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  employee_id: number | null;
  employee_name: string | null;
  created_at: string;
  updated_at: string;
};

type AuditLog = {
  id: number;
  actor_user_id: number | null;
  actor_email: string;
  action: string;
  module: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  created_at: string;
};
type PerformanceGoal = {
  id: number;
  employee_id: number;
  title: string;
  description: string | null;
  category: string;
  cycle: string;
  due_date: string | null;
  progress: number;
  status: string;
  priority: string;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};
type GoalForm = {
  employee_id: string;
  title: string;
  description: string;
  category: string;
  cycle: string;
  due_date: string;
  progress: string;
  status: string;
  priority: string;
};

const GOAL_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
];

const GOAL_PRIORITIES = [
  "Low",
  "Medium",
  "High",
];

const EMPTY_GOAL_FORM: GoalForm = {
  employee_id: "",
  title: "",
  description: "",
  category: "General",
  cycle: "2026",
  due_date: "",
  progress: "0",
  status: "Not Started",
  priority: "Medium",
};

type UserForm = {
  email: string;
  password: string;
  role: string;
  employee_id: string;
};

const USER_ROLES = ["admin", "hr", "manager", "employee"] as const;

const EMPTY_USER_FORM: UserForm = {
  email: "",
  password: "",
  role: "employee",
  employee_id: "",
};

type CandidateForm = {
  candidate_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  source: string;
  stage: string;
  applied_date: string;
  interview_date: string;
  offer_date: string;
  hired_date: string;
  recruiter: string;
  notes: string;
};

type ImportCandidate = {
  candidate_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  source: string;
  stage: string;
  applied_date: string;
  interview_date: string | null;
  offer_date: string | null;
  hired_date: string | null;
  recruiter: string | null;
  notes: string | null;
};

type CandidateImportResult = {
  imported: number;
  failed: number;
  errors: string[];
  candidates: Candidate[];
};

const CANDIDATE_STAGES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
  "Withdrawn",
];

const EMPTY_CANDIDATE_FORM: CandidateForm = {
  candidate_id: "",
  full_name: "",
  email: "",
  role: "",
  department: "",
  source: "Direct",
  stage: "Applied",
  applied_date: "",
  interview_date: "",
  offer_date: "",
  hired_date: "",
  recruiter: "",
  notes: "",
};


type EmployeeLifecycle = {
  employee_id: number;
  employee_name: string;
  lifecycle_status: string;
  exit_date: string | null;
  exit_reason: string | null;
  exit_notes: string | null;
  has_lifecycle_record: boolean;
  updated_at: string | null;
};

type LifecycleForm = {
  lifecycle_status: string;
  exit_date: string;
  exit_reason: string;
  exit_notes: string;
};

const LIFECYCLE_STATUSES = ["Onboarding", "Active", "On Leave", "Offboarding", "Exited"];
const EXIT_REASONS = ["Resignation", "Termination", "Layoff", "Retirement", "Contract End", "Relocation", "Other"];

const EMPTY_LIFECYCLE_FORM: LifecycleForm = {
  lifecycle_status: "Active",
  exit_date: "",
  exit_reason: "",
  exit_notes: "",
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
   DISPLAY HELPERS
   ============================================================ */

const PLACEHOLDER_TEXTS = new Set([
  "string",
  "null",
  "none",
  "n/a",
  "na",
  "-",
  "—",
]);

function displayText(
  value: string | null | undefined,
  fallback = "Not provided"
) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const cleaned = value.trim();
  if (!cleaned || PLACEHOLDER_TEXTS.has(cleaned.toLowerCase())) {
    return fallback;
  }

  return cleaned;
}

function displayPerformance(score: number | null | undefined) {
  return score === null || score === undefined
    ? "Not scored"
    : `${score}`;
}


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
        ...(typeof window !== "undefined" && localStorage.getItem(AUTH_TOKEN_KEY)
          ? { Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}` }
          : {}),
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


  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    window.location.href = "/login";
    throw new Error("Your session has expired. Please sign in again.");
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
      `HumaveliOS API returned ${response.status}`
    );
  }


  return data as T;
}


/* ============================================================
   CSV IMPORT HELPERS
   ============================================================ */

const IMPORT_HEADERS = [
  "candidate_id",
  "full_name",
  "email",
  "role",
  "department",
  "source",
  "stage",
  "applied_date",
  "interview_date",
  "offer_date",
  "hired_date",
  "recruiter",
  "notes",
];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCandidateCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least one candidate row.");
  }

  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase().trim());
  const headerIndex = new Map(header.map((value, index) => [value, index]));
  const missingHeaders = IMPORT_HEADERS.filter((value) => !headerIndex.has(value));
  if (missingHeaders.length) {
    throw new Error(`Missing CSV columns: ${missingHeaders.join(", ")}`);
  }

  const validRows: ImportCandidate[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  const read = (values: string[], key: string) => values[headerIndex.get(key) ?? -1]?.trim() ?? "";
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  lines.slice(1).forEach((line, rowOffset) => {
    const rowNumber = rowOffset + 2;
    const values = parseCsvLine(line);
    const candidateId = read(values, "candidate_id");
    const fullName = read(values, "full_name");
    const email = read(values, "email").toLowerCase();
    const role = read(values, "role");
    const department = read(values, "department");
    const source = read(values, "source") || "Direct";
    const stage = read(values, "stage") || "Applied";
    const appliedDate = read(values, "applied_date");
    const interviewDate = read(values, "interview_date");
    const offerDate = read(values, "offer_date");
    const hiredDate = read(values, "hired_date");
    const recruiter = read(values, "recruiter");
    const notes = read(values, "notes");

    const rowErrors: string[] = [];
    if (!candidateId || !fullName || !email || !role || !department || !appliedDate) {
      rowErrors.push("required field missing");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      rowErrors.push("invalid email");
    }
    if (appliedDate && !validDate(appliedDate)) rowErrors.push("applied_date must be YYYY-MM-DD");
    for (const [label, value] of [["interview_date", interviewDate], ["offer_date", offerDate], ["hired_date", hiredDate]] as const) {
      if (value && !validDate(value)) rowErrors.push(`${label} must be YYYY-MM-DD`);
    }
    if (hiredDate && appliedDate && validDate(hiredDate) && validDate(appliedDate) && hiredDate < appliedDate) {
      rowErrors.push("hired_date cannot be before applied_date");
    }
    if (!CANDIDATE_STAGES.includes(stage)) rowErrors.push(`invalid stage: ${stage}`);
    if (candidateId && seenIds.has(candidateId)) rowErrors.push("duplicate candidate_id in file");
    if (email && seenEmails.has(email)) rowErrors.push("duplicate email in file");

    if (rowErrors.length) {
      errors.push(`Row ${rowNumber}: ${rowErrors.join("; ")}`);
      return;
    }

    seenIds.add(candidateId);
    seenEmails.add(email);
    validRows.push({
      candidate_id: candidateId,
      full_name: fullName,
      email,
      role,
      department,
      source,
      stage,
      applied_date: appliedDate,
      interview_date: interviewDate || null,
      offer_date: offerDate || null,
      hired_date: hiredDate || null,
      recruiter: recruiter || null,
      notes: notes || null,
    });
  });

  return { validRows, errors };
}

function downloadCandidateTemplate() {
  const csv = `${IMPORT_HEADERS.join(",")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "humavelios-candidate-import-template.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "\u2302", description: "Workforce health at a glance" },
{ id: "employees", label: "Employees", icon: "\u{1F465}", description: "Employee records and Employee 360" },
{ id: "analytics", label: "People Analytics", icon: "\u25D4", description: "Workforce, trends and performance" },
{ id: "recruitment", label: "Recruitment", icon: "\u2197", description: "Candidates, pipeline and funnel" },
{ id: "lifecycle", label: "Lifecycle", icon: "\u21BB", description: "Lifecycle, retention and exits" },
  { id: "goals", label: "Performance & Goals", icon: "\u2605", description: "Goals, progress and performance management" },
{ id: "users", label: "Users & Roles", icon: "\u2699", description: "Manage accounts and access levels" },
{ id: "audit", label: "Activity Logs", icon: "\u2637", description: "Review administrative activity history" },
] as const;

type ViewId = (typeof NAV_ITEMS)[number]["id"];

/* ============================================================
   PAGE
   ============================================================ */

export default function Home() {

  const [
    authReady,
    setAuthReady,
  ] = useState(false);


  const [
    authUser,
    setAuthUser,
  ] = useState<{ email: string; role: string } | null>(null);


  const [
    activeView,
    setActiveView,
  ] = useState<ViewId>("overview");


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


  const [
    viewingEmployee,
    setViewingEmployee,
  ] = useState<Employee | null>(null);

  const [
    viewingLifecycle,
    setViewingLifecycle,
  ] = useState<EmployeeLifecycle | null>(null);

  const [
    lifecycleLoading,
    setLifecycleLoading,
  ] = useState(false);

  const [
    showLifecycleModal,
    setShowLifecycleModal,
  ] = useState(false);

  const [
    lifecycleForm,
    setLifecycleForm,
  ] = useState<LifecycleForm>({ ...EMPTY_LIFECYCLE_FORM });

  const [
    lifecycleError,
    setLifecycleError,
  ] = useState("");

  const [
    lifecycleSaving,
    setLifecycleSaving,
  ] = useState(false);

  const [
    candidates,
    setCandidates,
  ] = useState<Candidate[]>([]);
  const [
    goals,
    setGoals,
  ] = useState<PerformanceGoal[]>([]);

  const [
    goalsLoading,
    setGoalsLoading,
  ] = useState(false);

  const [
    goalsError,
    setGoalsError,
  ] = useState("");

  const [
    showGoalModal,
    setShowGoalModal,
  ] = useState(false);

  const [
    goalForm,
    setGoalForm,
  ] = useState<GoalForm>({
    ...EMPTY_GOAL_FORM,
  });

  const [
    goalSaving,
    setGoalSaving,
  ] = useState(false);

  const [
    goalFormError,
    setGoalFormError,
  ] = useState("");

  const [
    editingGoal,
    setEditingGoal,
  ] = useState<PerformanceGoal | null>(null);

  const [
    deletingGoalId,
    setDeletingGoalId,
  ] = useState<number | null>(null);
const [
  users,
  setUsers,
] = useState<AppUser[]>([]);


  const [
    auditLogs,
    setAuditLogs,
  ] = useState<AuditLog[]>([]);

  const [
    auditLoading,
    setAuditLoading,
  ] = useState(false);

  const [
    auditError,
    setAuditError,
  ] = useState("");

  const [
    auditSearch,
    setAuditSearch,
  ] = useState("");

  const [
    auditActionFilter,
    setAuditActionFilter,
  ] = useState("All");

  const [
    auditModuleFilter,
    setAuditModuleFilter,
  ] = useState("All");

  const [
    auditPage,
    setAuditPage,
  ] = useState(1);

  const AUDIT_PAGE_SIZE = 10;

  const [
    showUserModal,
    setShowUserModal,
  ] = useState(false);

  const [
    userForm,
    setUserForm,
  ] = useState<UserForm>({ ...EMPTY_USER_FORM });

  const [
    userError,
    setUserError,
  ] = useState("");

  const [
    userSaving,
    setUserSaving,
  ] = useState(false);

  const [
    userDeletingId,
    setUserDeletingId,
  ] = useState<number | null>(null);

  const [
    showCandidateModal,
    setShowCandidateModal,
  ] = useState(false);

  const [
    editingCandidate,
    setEditingCandidate,
  ] = useState<Candidate | null>(null);

  const [
    candidateForm,
    setCandidateForm,
  ] = useState<CandidateForm>(EMPTY_CANDIDATE_FORM);

  const [
    candidateError,
    setCandidateError,
  ] = useState("");

  const [
    candidateSaving,
    setCandidateSaving,
  ] = useState(false);

  const [
    deletingCandidateId,
    setDeletingCandidateId,
  ] = useState<number | null>(null);

  const candidateFileInputRef = useRef<HTMLInputElement | null>(null);

  const [
    showImportModal,
    setShowImportModal,
  ] = useState(false);

  const [
    importRows,
    setImportRows,
  ] = useState<ImportCandidate[]>([]);

  const [
    importErrors,
    setImportErrors,
  ] = useState<string[]>([]);

  const [
    importSaving,
    setImportSaving,
  ] = useState(false);

  const [
    importMessage,
    setImportMessage,
  ] = useState("");


  /* ==========================================================
     LOAD DASHBOARD
     ========================================================== */

  async function loadDashboard(role = authUser?.role || "admin") {
    try {
      setLoading(true);
      setError("");

      const employeeData = await apiRequest<Employee[]>("/employees?skip=0&limit=100");
      const analyticsData = await apiRequest<Analytics>("/analytics/summary");
      setEmployees(employeeData);
      setAnalytics(analyticsData);
            await loadGoals();

      if (role === "admin" || role === "hr") {
        setCandidates(await apiRequest<Candidate[]>("/candidates?skip=0&limit=100"));
      } else {
        setCandidates([]);
      }

      if (role === "admin") {
        setUsers(await apiRequest<AppUser[]>("/users"));
        await loadAuditLogs();
      } else {
        setUsers([]);
        setAuditLogs([]);
      }
    } catch (err) {
      console.error("HumaveliOS API error:", err);
      setError(err instanceof Error ? `${err.message} — API: ${API_URL}` : `Unable to connect to HumaveliOS API — API: ${API_URL}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLogs() {
    if (authUser?.role !== "admin") {
      setAuditLogs([]);
      return;
    }

    try {
      setAuditLoading(true);
      setAuditError("");
      const logs = await apiRequest<AuditLog[]>("/audit-logs?skip=0&limit=200");
      setAuditLogs(logs);
    } catch (err) {
      setAuditError(
        err instanceof Error ? err.message : "Unable to load activity logs."
      );
    } finally {
      setAuditLoading(false);
    }
  }
      async function loadGoals() {
    try {
      setGoalsLoading(true);
      setGoalsError("");

      const data = await apiRequest<PerformanceGoal[]>(
        "/goals"
      );

      setGoals(data);
    } catch (err) {
      setGoalsError(
        err instanceof Error
          ? err.message
          : "Unable to load performance goals."
      );
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  }
  async function loadMyEmployeeProfile() {
    try {
      setLoading(true);
      setError("");
      const profile = await apiRequest<Employee>("/employees/me");
      setEmployees([profile]);
      setAnalytics(null);
      setCandidates([]);
      setUsers([]);
      setAuditLogs([]);
            await loadGoals();    
    } catch (err) {
      setEmployees([]);
      setError(err instanceof Error ? err.message : "Unable to load your employee profile.");
    } finally {
      setLoading(false);
    }
  }


  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (!token) {
      window.location.replace("/login");
      return;
    }

    let parsedUser: { email: string; role: string } | null = null;
    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser);
        setAuthUser(parsedUser);
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }

    if (!parsedUser) {
      window.location.replace("/login");
      return;
    }

    setAuthReady(true);
    if (parsedUser.role === "employee") {
      loadMyEmployeeProfile();
    } else {
      loadDashboard(parsedUser.role);
    }
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


  async function handleLogout() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout activity logging error:", err);
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      window.location.href = "/login";
    }
  }


  function calculateTenure(employee: Employee) {
    const joined = new Date(employee.date_of_joining);
    if (Number.isNaN(joined.getTime())) {
      return "Not available";
    }

    const now = new Date();
    let months =
      (now.getFullYear() - joined.getFullYear()) * 12 +
      (now.getMonth() - joined.getMonth());

    if (now.getDate() < joined.getDate()) {
      months -= 1;
    }

    if (months < 0) {
      return "Not available";
    }

    if (months < 12) {
      return `${months} month${months === 1 ? "" : "s"}`;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (!remainingMonths) {
      return `${years} year${years === 1 ? "" : "s"}`;
    }

    return `${years}y ${remainingMonths}m`;
  }


  function formatDate(value: string | null | undefined) {
    if (!value) {
      return "Not provided";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "Not provided";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  }


  function getSkillList(value: string | null | undefined) {
    if (!value) {
      return [];
    }

    return value
      .split(/[,;\n|]+/)
      .map((skill) => skill.trim())
      .filter((skill) =>
        skill && !PLACEHOLDER_TEXTS.has(skill.toLowerCase())
      );
  }


  function getEmployeeCompleteness(employee: Employee) {
    const checks = [
      employee.email,
      employee.department,
      employee.designation,
      employee.employment_type,
      employee.date_of_joining,
      employee.location,
      employee.manager,
      employee.skills,
    ];

    const completed = checks.filter((value) => {
      if (typeof value !== "string") {
        return Boolean(value);
      }

      const cleaned = value.trim();
      return Boolean(cleaned) && !PLACEHOLDER_TEXTS.has(cleaned.toLowerCase());
    }).length;

    return Math.round((completed / checks.length) * 100);
  }


  async function openEmployeeProfile(employee: Employee) {
    setViewingEmployee(employee);
    setViewingLifecycle(null);
    setLifecycleLoading(true);
    setLifecycleError("");

    try {
      const lifecycle = await apiRequest<EmployeeLifecycle>(
        `/employees/${employee.id}/lifecycle`
      );
      setViewingLifecycle(lifecycle);
    } catch (err) {
      setLifecycleError(
        err instanceof Error ? err.message : "Unable to load employee lifecycle."
      );
    } finally {
      setLifecycleLoading(false);
    }
  }


  function closeEmployeeProfile() {
    setViewingEmployee(null);
    setViewingLifecycle(null);
    setLifecycleError("");
  }


  function openLifecycleModal() {
    if (!viewingEmployee) return;
    setLifecycleForm({
      lifecycle_status: viewingLifecycle?.lifecycle_status || (viewingEmployee.is_active ? "Active" : "Exited"),
      exit_date: viewingLifecycle?.exit_date?.slice(0, 10) || "",
      exit_reason: viewingLifecycle?.exit_reason || "",
      exit_notes: viewingLifecycle?.exit_notes || "",
    });
    setLifecycleError("");
    setShowLifecycleModal(true);
  }


  function closeLifecycleModal() {
    if (lifecycleSaving) return;
    setShowLifecycleModal(false);
    setLifecycleError("");
  }


  async function handleLifecycleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewingEmployee) return;
    setLifecycleError("");

    if (lifecycleForm.lifecycle_status === "Exited" && !lifecycleForm.exit_date) {
      setLifecycleError("Exit date is required when lifecycle status is Exited.");
      return;
    }

    setLifecycleSaving(true);
    try {
      const saved = await apiRequest<EmployeeLifecycle>(
        `/employees/${viewingEmployee.id}/lifecycle`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lifecycle_status: lifecycleForm.lifecycle_status,
            exit_date: lifecycleForm.lifecycle_status === "Exited" ? lifecycleForm.exit_date : null,
            exit_reason: lifecycleForm.lifecycle_status === "Exited" ? (lifecycleForm.exit_reason || null) : null,
            exit_notes: lifecycleForm.lifecycle_status === "Exited" ? (lifecycleForm.exit_notes || null) : null,
          }),
        }
      );
      setViewingLifecycle(saved);
      await loadDashboard();
      setShowLifecycleModal(false);
    } catch (err) {
      setLifecycleError(
        err instanceof Error ? err.message : "Unable to save lifecycle information."
      );
    } finally {
      setLifecycleSaving(false);
    }
  }
  function openGoalModal() {
    setGoalForm({
      ...EMPTY_GOAL_FORM,
    });

    setGoalFormError("");
    setShowGoalModal(true);
  }

  function closeGoalModal() {
    if (goalSaving) return;

    setShowGoalModal(false);
    setGoalFormError("");
  }

  async function handleGoalSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setGoalFormError("");

    if (!goalForm.employee_id) {
      setGoalFormError("Please select an employee.");
      return;
    }

    if (!goalForm.title.trim()) {
      setGoalFormError("Goal title is required.");
      return;
    }

    const progress = Number(goalForm.progress);

    if (
      Number.isNaN(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      setGoalFormError(
        "Progress must be between 0 and 100."
      );
      return;
    }

    if (
      goalForm.status === "Completed" &&
      progress !== 100
    ) {
      setGoalFormError(
        "A completed goal must have 100% progress."
      );
      return;
    }

    setGoalSaving(true);

    try {
      await apiRequest<PerformanceGoal>(
        "/goals",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: Number(goalForm.employee_id),
            title: goalForm.title.trim(),
            description:
              goalForm.description.trim() || null,
            category: goalForm.category.trim() || "General",
            cycle: goalForm.cycle.trim() || "2026",
            due_date:
              goalForm.due_date || null,
            progress,
            status: goalForm.status,
            priority: goalForm.priority,
          }),
        }
      );

      await loadGoals();
      setShowGoalModal(false);
      setGoalForm({
        ...EMPTY_GOAL_FORM,
      });
    } catch (err) {
      setGoalFormError(
        err instanceof Error
          ? err.message
          : "Unable to save performance goal."
      );
    } finally {
      setGoalSaving(false);
    }
  }
  function openEditGoalModal(goal: PerformanceGoal) {
    setEditingGoal(goal);

    setGoalForm({
      employee_id: String(goal.employee_id),
      title: goal.title,
      description: goal.description || "",
      category: goal.category,
      cycle: goal.cycle,
      due_date: goal.due_date ? goal.due_date.slice(0, 10) : "",
      progress: String(goal.progress),
      status: goal.status,
      priority: goal.priority,
    });

    setGoalFormError("");
    setShowGoalModal(true);
  }

  async function handleGoalUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingGoal) return;

    setGoalFormError("");

    const progress = Number(goalForm.progress);

    if (Number.isNaN(progress) || progress < 0 || progress > 100) {
      setGoalFormError("Progress must be between 0 and 100.");
      return;
    }

    if (goalForm.status === "Completed" && progress !== 100) {
      setGoalFormError("A completed goal must have 100% progress.");
      return;
    }

    if (!goalForm.title.trim()) {
      setGoalFormError("Goal title is required.");
      return;
    }

    setGoalSaving(true);

    try {
      await apiRequest<PerformanceGoal>(
        `/goals/${editingGoal.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: Number(goalForm.employee_id),
            title: goalForm.title.trim(),
            description: goalForm.description.trim() || null,
            category: goalForm.category.trim() || "General",
            cycle: goalForm.cycle.trim() || "2026",
            due_date: goalForm.due_date || null,
            progress,
            status: goalForm.status,
            priority: goalForm.priority,
          }),
        }
      );

      await loadGoals();

      setShowGoalModal(false);
      setEditingGoal(null);
      setGoalForm({ ...EMPTY_GOAL_FORM });
    } catch (err) {
      setGoalFormError(
        err instanceof Error
          ? err.message
          : "Unable to update performance goal."
      );
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleGoalDelete(goalId: number) {
    if (deletingGoalId !== null) return;

    const confirmed = window.confirm(
      "Delete this performance goal? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingGoalId(goalId);

    try {
      await apiRequest(`/goals/${goalId}`, {
        method: "DELETE",
      });

      await loadGoals();
    } catch (err) {
      setGoalsError(
        err instanceof Error
          ? err.message
          : "Unable to delete performance goal."
      );
    } finally {
      setDeletingGoalId(null);
    }
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


  function setCandidateField(field: keyof CandidateForm, value: string) {
    setCandidateForm((current) => ({ ...current, [field]: value }));
  }

  function openAddCandidateModal() {
    setEditingCandidate(null);
    setCandidateForm({ ...EMPTY_CANDIDATE_FORM });
    setCandidateError("");
    setShowCandidateModal(true);
  }

  function openEditCandidateModal(candidate: Candidate) {
    setEditingCandidate(candidate);
    setCandidateForm({
      candidate_id: candidate.candidate_id,
      full_name: candidate.full_name,
      email: candidate.email,
      role: candidate.role,
      department: candidate.department,
      source: candidate.source,
      stage: candidate.stage,
      applied_date: candidate.applied_date.slice(0, 10),
      interview_date: candidate.interview_date?.slice(0, 10) ?? "",
      offer_date: candidate.offer_date?.slice(0, 10) ?? "",
      hired_date: candidate.hired_date?.slice(0, 10) ?? "",
      recruiter: candidate.recruiter ?? "",
      notes: candidate.notes ?? "",
    });
    setCandidateError("");
    setShowCandidateModal(true);
  }

  function closeCandidateModal() {
    if (candidateSaving) return;
    setShowCandidateModal(false);
    setEditingCandidate(null);
    setCandidateForm({ ...EMPTY_CANDIDATE_FORM });
    setCandidateError("");
  }

  async function handleCandidateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCandidateError("");

    if (!candidateForm.candidate_id.trim() || !candidateForm.full_name.trim() || !candidateForm.email.trim() || !candidateForm.role.trim() || !candidateForm.department.trim() || !candidateForm.applied_date) {
      setCandidateError("Candidate ID, name, email, role, department and applied date are required.");
      return;
    }

    setCandidateSaving(true);
    try {
      const payload = {
        candidate_id: candidateForm.candidate_id.trim(),
        full_name: candidateForm.full_name.trim(),
        email: candidateForm.email.trim(),
        role: candidateForm.role.trim(),
        department: candidateForm.department.trim(),
        source: candidateForm.source.trim() || "Direct",
        stage: candidateForm.stage,
        applied_date: candidateForm.applied_date,
        interview_date: candidateForm.interview_date || null,
        offer_date: candidateForm.offer_date || null,
        hired_date: candidateForm.hired_date || null,
        recruiter: candidateForm.recruiter.trim() || null,
        notes: candidateForm.notes.trim() || null,
      };

      const saved = editingCandidate
        ? await apiRequest<Candidate>(`/candidates/${editingCandidate.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiRequest<Candidate>("/candidates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      setCandidates((current) =>
        editingCandidate
          ? current.map((candidate) => candidate.id === saved.id ? saved : candidate)
          : [saved, ...current]
      );
      await loadDashboard();
      closeCandidateModal();
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : "Unable to save candidate.");
    } finally {
      setCandidateSaving(false);
    }
  }

  async function handleDeleteCandidate(candidate: Candidate) {
    if (!window.confirm(`Delete candidate ${candidate.full_name}?`)) return;
    setDeletingCandidateId(candidate.id);
    try {
      await apiRequest(`/candidates/${candidate.id}`, { method: "DELETE" });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete candidate.");
    } finally {
      setDeletingCandidateId(null);
    }
  }

  function openCandidateFilePicker() {
    candidateFileInputRef.current?.click();
  }

  async function handleCandidateCsvUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCandidateCsv(text);
      setImportRows(parsed.validRows);
      setImportErrors(parsed.errors);
      setImportMessage(
        parsed.validRows.length
          ? `${parsed.validRows.length} valid candidate${parsed.validRows.length === 1 ? "" : "s"} ready to import.`
          : "No valid candidate rows found."
      );
      setShowImportModal(true);
    } catch (err) {
      setImportRows([]);
      setImportErrors([]);
      setImportMessage(
        err instanceof Error ? err.message : "Unable to read the CSV file."
      );
      setShowImportModal(true);
    }
  }

  function closeImportModal() {
    if (importSaving) return;
    setShowImportModal(false);
    setImportRows([]);
    setImportErrors([]);
    setImportMessage("");
  }

  async function importCandidateRows() {
    if (!importRows.length) return;
    setImportSaving(true);
    setImportMessage("");

    try {
      const result = await apiRequest<CandidateImportResult>(
        "/candidates/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(importRows),
        }
      );

      setCandidates((current) => [
        ...result.candidates,
        ...current,
      ]);
      setImportRows([]);
      setImportErrors(result.errors);
      setImportMessage(
        `${result.imported} candidate${result.imported === 1 ? "" : "s"} imported${result.failed ? `; ${result.failed} skipped` : ""}.`
      );
      await loadDashboard();

      if (!result.failed) {
        setTimeout(() => closeImportModal(), 700);
      }
    } catch (err) {
      setImportMessage(
        err instanceof Error ? err.message : "Unable to import candidates."
      );
    } finally {
      setImportSaving(false);
    }
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


  async function saveUser(event: FormEvent) {
    event.preventDefault();
    try {
      setUserSaving(true);
      setUserError("");
      const created = await apiRequest<AppUser>("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          employee_id: userForm.role === "employee" && userForm.employee_id ? Number(userForm.employee_id) : null,
        }),
      });
      setUsers((current) => [...current, created]);
      setUserForm({ ...EMPTY_USER_FORM });
      setShowUserModal(false);
      await loadAuditLogs();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Unable to create user.");
    } finally {
      setUserSaving(false);
    }
  }

  async function updateUser(user: AppUser, changes: { role?: string; is_active?: boolean; password?: string }) {
    try {
      setUserError("");
      const saved = await apiRequest<AppUser>(`/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      setUsers((current) => current.map((item) => item.id === saved.id ? saved : item));
      await loadAuditLogs();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Unable to update user.");
    }
  }

  async function deleteUser(user: AppUser) {
    if (user.email === authUser?.email) {
      setUserError("You cannot delete the administrator account you are currently using.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the user account for ${user.email}?\n\nThis permanently removes the login account${user.employee_name ? ` and its link to ${user.employee_name}.` : "."}`
    );
    if (!confirmed) return;

    try {
      setUserDeletingId(user.id);
      setUserError("");
      await apiRequest<{ message: string; email: string }>(`/users/${user.id}`, {
        method: "DELETE",
      });
      setUsers((current) => current.filter((item) => item.id !== user.id));
      await loadAuditLogs();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Unable to delete user.");
    } finally {
      setUserDeletingId(null);
    }
  }

  async function linkUserEmployee(user: AppUser, employeeId: string) {
    try {
      setUserError("");
      const saved = await apiRequest<AppUser>(`/users/${user.id}/employee`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId ? Number(employeeId) : null }),
      });
      setUsers((current) => current.map((item) => item.id === saved.id ? saved : item));
      await loadAuditLogs();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Unable to link employee profile.");
      setUsers((current) => [...current]);
    }
  }

  const auditActions = useMemo(
    () => Array.from(new Set(auditLogs.map((log) => log.action))).sort(),
    [auditLogs]
  );

  const auditModules = useMemo(
    () => Array.from(new Set(auditLogs.map((log) => log.module))).sort(),
    [auditLogs]
  );

  const filteredAuditLogs = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const matchesAction =
        auditActionFilter === "All" || log.action === auditActionFilter;
      const matchesModule =
        auditModuleFilter === "All" || log.module === auditModuleFilter;

      const searchable = [
        log.actor_email,
        log.action,
        log.module,
        log.target_type ?? "",
        log.target_id ?? "",
        log.details ?? "",
      ].join(" ").toLowerCase();

      return matchesAction && matchesModule && (!query || searchable.includes(query));
    });
  }, [auditLogs, auditSearch, auditActionFilter, auditModuleFilter]);

  const auditTotalPages = Math.max(
    1,
    Math.ceil(filteredAuditLogs.length / AUDIT_PAGE_SIZE)
  );

  const paginatedAuditLogs = useMemo(() => {
    const safePage = Math.min(auditPage, auditTotalPages);
    const start = (safePage - 1) * AUDIT_PAGE_SIZE;
    return filteredAuditLogs.slice(start, start + AUDIT_PAGE_SIZE);
  }, [filteredAuditLogs, auditPage, auditTotalPages]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditSearch, auditActionFilter, auditModuleFilter]);

  useEffect(() => {
    if (auditPage > auditTotalPages) {
      setAuditPage(auditTotalPages);
    }
  }, [auditPage, auditTotalPages]);


  function getAuditActionClass(action: string) {
    if (action.includes("FAILED") || action.includes("DELETED")) {
      return "audit-action audit-action-attention";
    }
    if (action.includes("CREATED") || action.includes("IMPORTED") || action.includes("LINKED")) {
      return "audit-action audit-action-success";
    }
    if (action.includes("LOGOUT") || action.includes("UNLINKED")) {
      return "audit-action audit-action-muted";
    }
    return "audit-action audit-action-info";
  }


  function formatDateTime(value: string | null | undefined) {
    if (!value) return "Not provided";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Not provided";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
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

  if (!authReady) {
    return (
      <main className="dashboard">
        <div className="message-card">Checking your HumaveliOS session...</div>
      </main>
    );
  }


  if (authUser?.role === "employee") {
    const employee = employees[0];
    const profileCompleteness = employee ? getEmployeeCompleteness(employee) : 0;

    return (
      <main className="dashboard employee-dashboard">
        <div className="employee-workspace">
          <header className="employee-workspace-topbar">
            <div className="self-brand">
              <div className="brand-icon">
                <img src="/humavelios-logo.png" alt="HumaveliOS logo" />
              </div>
              <div>
                <strong>HumaveliOS</strong>
                <span>People. Work. Intelligence.</span>
              </div>
            </div>

            <div className="employee-topbar-actions">
              <div className="employee-account">
                <div className="account-avatar">
                  {authUser?.email?.charAt(0).toUpperCase() || "E"}
                </div>
                <div>
                  <strong>{authUser?.email || "Employee"}</strong>
                  <span>Employee</span>
                </div>
              </div>
              <button type="button" className="sidebar-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          {loading ? (
            <div className="message-card">Loading your Employee Workspace...</div>
          ) : employee ? (
            <>
              <section className="employee-welcome-card">
                <div>
                  <span className="eyebrow">Employee Workspace</span>
                  <h1>Welcome back, {displayText(employee.full_name, "Employee")}</h1>
                  <p>
                    Your HumaveliOS workspace brings your employment information,
                    people data and personal HR snapshot into one place.
                  </p>
                </div>
                <div className="employee-welcome-badge">
                  <span>Current status</span>
                  <strong>{displayText(employee.status, "Not provided")}</strong>
                </div>
              </section>

              <section className="employee-self-kpi-grid">
                <div className="employee-self-kpi">
                  <span>Department</span>
                  <strong>{displayText(employee.department)}</strong>
                </div>
                <div className="employee-self-kpi">
                  <span>Designation</span>
                  <strong>{displayText(employee.designation)}</strong>
                </div>
                <div className="employee-self-kpi">
                  <span>Tenure</span>
                  <strong>{calculateTenure(employee)}</strong>
                </div>
                <div className="employee-self-kpi">
                  <span>Performance</span>
                  <strong>{displayPerformance(employee.performance_score)}</strong>
                </div>
                <div className="employee-self-kpi">
                  <span>Manager</span>
                  <strong>{displayText(employee.manager)}</strong>
                </div>
                <div className="employee-self-kpi">
                  <span>Location</span>
                  <strong>{displayText(employee.location)}</strong>
                </div>
              </section>

              <section className="employee-dashboard-grid">
                <div className="panel employee-profile-card">
                  <div className="panel-header">
                    <div>
                      <h2>My Profile</h2>
                      <p>Your current employee information</p>
                    </div>
                    <span className="employee-count">{profileCompleteness}% complete</span>
                  </div>

                  <div className="employee-profile-summary">
                    <div className="employee-profile-avatar">
                      {displayText(employee.full_name, "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3>{displayText(employee.full_name, "Unnamed employee")}</h3>
                      <p>{displayText(employee.employee_id, "No employee ID")} · {displayText(employee.email, "No email")}</p>
                    </div>
                  </div>

                  <div className="self-profile-grid">
                    <div><span>Employee ID</span><strong>{displayText(employee.employee_id)}</strong></div>
                    <div><span>Email</span><strong>{displayText(employee.email)}</strong></div>
                    <div><span>Employment Type</span><strong>{displayText(employee.employment_type)}</strong></div>
                    <div><span>Date of Joining</span><strong>{formatDate(employee.date_of_joining)}</strong></div>
                    <div><span>Location</span><strong>{displayText(employee.location)}</strong></div>
                    <div><span>Manager</span><strong>{displayText(employee.manager)}</strong></div>
                    <div><span>Status</span><strong>{displayText(employee.status)}</strong></div>
                    <div><span>Skills</span><strong>{displayText(employee.skills)}</strong></div>
                  </div>
                </div>

                <div className="panel employee-snapshot-card">
                  <div className="panel-header">
                    <div>
                      <h2>My HR Snapshot</h2>
                      <p>Information currently recorded for your account</p>
                    </div>
                  </div>

                  <div className="employee-snapshot-list">
                    <div>
                      <span>Lifecycle</span>
                      <strong>Available through your employee record</strong>
                    </div>
                    <div>
                      <span>Performance</span>
                      <strong>{displayPerformance(employee.performance_score)}</strong>
                    </div>
                    <div>
                      <span>Profile completeness</span>
                      <strong>{profileCompleteness}%</strong>
                    </div>
                    <div>
                      <span>Data source</span>
                      <strong>HumaveliOS employee profile</strong>
                    </div>
                  </div>

                  <div className="employee-data-note">
                    <strong>Data transparency</strong>
                    <span>
                      This workspace shows information currently stored in HumaveliOS.
                      It does not infer missing HR or employment information.
                    </span>
                  </div>
                </div>
              </section>

              <section className="panel employee-modules-panel">
                <div className="panel-header">
                  <div>
                    <h2>Employee Services</h2>
                    <p>Self-service modules planned for your workspace</p>
                  </div>
                  <span className="employee-count">Coming next</span>
                </div>

                <div className="employee-module-grid">
                  <div className="employee-module-card">
                    <div className="employee-module-icon">◷</div>
                    <div><strong>Leave</strong><span>Leave balance and requests</span></div>
                    <small>Coming next</small>
                  </div>
                  <div className="employee-module-card">
                    <div className="employee-module-icon">✓</div>
                    <div><strong>Attendance</strong><span>Attendance and work-time summary</span></div>
                    <small>Coming next</small>
                  </div>
                  <div className="employee-module-card">
                    <div className="employee-module-icon">◎</div>
                    <div><strong>Goals & Performance</strong><span>Goals, reviews and performance history</span></div>
                    <small>Coming next</small>
                  </div>
                  <div className="employee-module-card">
                    <div className="employee-module-icon">▤</div>
                    <div><strong>Documents</strong><span>HR documents and employee records</span></div>
                    <small>Coming next</small>
                  </div>
                </div>
              </section>

              <div className="employee-workspace-footer">
                <span>HumaveliOS · People. Work. Intelligence.</span>
                <button type="button" className="secondary-button" onClick={loadMyEmployeeProfile} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh My Profile"}
                </button>
              </div>
            </>
          ) : (
            <section className="panel employee-missing-profile">
              <div className="employee-missing-icon">!</div>
              <div>
                <h2>No linked employee profile</h2>
                <p>{error || "Ask HR to link your work account to your employee profile."}</p>
              </div>
              <button type="button" className="secondary-button" onClick={loadMyEmployeeProfile} disabled={loading}>
                Retry
              </button>
            </section>
          )}
        </div>
      </main>
    );
  }

  if (
    loading &&
    !analytics
  ) {

    return (
      <main className="dashboard">

        <div className="message-card">
          Loading HumaveliOS data...
        </div>

      </main>
    );
  }


  /* ==========================================================
     PAGE
     ========================================================== */

  return (
    <main className="dashboard">

      <div className="app-layout">

        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-icon"><img src="/humavelios-logo.png" alt="HumaveliOS logo" /></div>
            <div>
              <strong>HumaveliOS</strong>
              <span>People. Work. Intelligence.</span>
            </div>
          </div>

          <div className="sidebar-section-label">Workspace</div>

          <nav className="sidebar-nav" aria-label="HumaveliOS navigation">
            {NAV_ITEMS.filter((item) => {
              const role = authUser?.role || "employee";
              if (item.id === "audit") return role === "admin";
              if (role === "admin" || role === "hr") return true;
              if (role === "manager") {
  return ["overview", "employees", "analytics", "goals"].includes(item.id);
}
              return false;
            }).map((item) => (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${activeView === item.id ? "active" : ""}`}
                onClick={() => setActiveView(item.id)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-account">
              <div className="account-avatar">{authUser?.email?.charAt(0).toUpperCase() || "P"}</div>
              <div>
                <strong>{authUser?.email || "HumaveliOS Admin"}</strong>
                <span>{authUser?.role || "Admin"}</span>
              </div>
            </div>
            <button type="button" className="sidebar-logout" onClick={handleLogout}>Logout</button>
          </div>
        </aside>

        <div className="dashboard-content">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="topbar">

        <div className="page-heading">
          <span className="eyebrow">HumaveliOS Workspace</span>
          <h1>{NAV_ITEMS.find((item) => item.id === activeView)?.label}</h1>
          <p>{NAV_ITEMS.find((item) => item.id === activeView)?.description}</p>
        </div>

        <div className="header-actions">
          {authUser && (
            <span className="auth-user">{authUser.email}</span>
          )}
          <button
            className="refresh-button"
            onClick={() => loadDashboard()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh Data"}
          </button>
          <button
            className="logout-button"
            onClick={() => handleLogout()}
          >
            Logout
          </button>
        </div>

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

          <section className={`stats-grid view-section ${activeView === "overview" ? "view-section-active" : "view-section-hidden"}`}>

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
                  Active Rate
                </span>

                <div className="stat-icon orange">
                  %
                </div>

              </div>

              <strong>
                {analytics.active_rate}%
              </strong>

              <small>
                Share of recorded workforce
              </small>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <span>
                  Avg. Tenure
                </span>

                <div className="stat-icon purple">
                  ◷
                </div>

              </div>

              <strong>
                {analytics.average_tenure_months === null
                  ? "—"
                  : `${analytics.average_tenure_months} mo`}
              </strong>

              <small>
                Based on date of joining
              </small>

            </div>

          </section>


          {/* ==================================================
              PEOPLE INSIGHTS
              ================================================== */}

          <section className={`insights-grid view-section ${activeView === "overview" ? "view-section-active" : "view-section-hidden"}`}>

            <div className="panel insights-panel">
              <div className="panel-header">
                <div>
                  <h2>People Insights</h2>
                  <p>Signals generated from the current workforce data</p>
                </div>
              </div>

              <div className="insight-list">
                {analytics.insights.length > 0 ? (
                  analytics.insights.map((insight, index) => (
                    <div className={`insight-item ${insight.type}`} key={`${insight.title}-${index}`}>
                      <div className="insight-marker">{insight.type === "attention" ? "!" : "i"}</div>
                      <div>
                        <strong>{insight.title}</strong>
                        <p>{insight.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-chart">No insights available yet.</div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Performance Coverage</h2>
                  <p>How complete the performance dataset is</p>
                </div>
              </div>

              <div className="coverage-value">
                <strong>{analytics.performance_coverage}%</strong>
                <span>{analytics.performance_scored_count} of {analytics.total_employees} employees scored{analytics.average_performance_score === null ? "" : ` · Average score ${analytics.average_performance_score}`}</span>
              </div>
              <div className="status-progress">
                <div className="status-progress-active" style={{ width: `${analytics.performance_coverage}%` }} />
              </div>

              <div className="mini-breakdown">
                {Object.entries(analytics.performance_distribution).map(([range, count]) => (
                  <div className="mini-breakdown-row" key={range}>
                    <span>{range}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>

              {Object.values(analytics.data_quality).some((count) => count > 0) && (
                <div className="data-quality-note">
                  <strong>Data quality</strong>
                  <span>Some employee records have missing or placeholder values and are excluded from relevant analytics.</span>
                  <div className="data-quality-list">
                    {Object.entries(analytics.data_quality)
                      .filter(([, count]) => count > 0)
                      .map(([field, count]) => (
                        <span key={field}>{field.replace(/_/g, " ")} · {count}</span>
                      ))}
                  </div>
                </div>
              )}
            </div>

          </section>

          {/* ==================================================
              ANALYTICS
              ================================================== */}

          <section className={`analytics-grid view-section ${activeView === "analytics" ? "view-section-active" : "view-section-hidden"}`}>

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
                              {displayText(department)}
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
                              {displayText(location)}
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
                              {displayText(employmentType)}
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
              WORKFORCE TRENDS
              ================================================== */}

          <section className={`analytics-grid workforce-trends-grid view-section ${activeView === "analytics" ? "view-section-active" : "view-section-hidden"}`}>

            <div className="panel">

              <div className="panel-header">
                <div>
                  <h2>Hiring Trend</h2>
                  <p>Recorded employee joiners over the last 12 months</p>
                </div>
              </div>

              <div className="trend-summary">
                <strong>{analytics.recent_joiners_90_days}</strong>
                <span>joined in the last 90 days</span>
              </div>

              <div className="chart-list trend-list">
                {analytics.monthly_hiring_trend.map((item) => (
                  <div className="chart-item" key={item.month}>
                    <div className="chart-item-top">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill blue-fill"
                        style={{
                          width: `${barWidth(
                            item.count,
                            Object.fromEntries(
                              analytics.monthly_hiring_trend.map((trend) => [
                                trend.month,
                                trend.count,
                              ])
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="analytics-note">
                Based on recorded joining dates. This is a hiring-activity trend, not a reconstructed historical headcount.
              </p>

            </div>


            <div className="panel">

              <div className="panel-header">
                <div>
                  <h2>Tenure Distribution</h2>
                  <p>Current workforce grouped by recorded tenure</p>
                </div>
              </div>

              <div className="chart-list">
                {Object.entries(analytics.tenure_distribution).map(([range, count]) => (
                  <div className="chart-item" key={range}>
                    <div className="chart-item-top">
                      <span>{range}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill purple-fill"
                        style={{
                          width: `${barWidth(count, analytics.tenure_distribution)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </section>


          {/* ==================================================
              EMPLOYEE LIFECYCLE
              ================================================== */}

          <section className={`lifecycle-section view-section ${activeView === "lifecycle" ? "view-section-active" : "view-section-hidden"}`}>

            <div className="panel">
              <div className="panel-header lifecycle-header">
                <div>
                  <h2>Employee Lifecycle</h2>
                  <p>Track workforce stages and recorded exits without assuming historical attrition data.</p>
                </div>
                <span className="lifecycle-scope-badge">{analytics.lifecycle.recorded_lifecycle_records} recorded</span>
              </div>

              <div className="lifecycle-kpi-grid">
                <div className="recruitment-kpi"><span>Recent Joiners</span><strong>{analytics.lifecycle.recent_joiners_90_days}</strong><small>Last 90 days</small></div>
                <div className="recruitment-kpi"><span>Recorded Exits</span><strong>{analytics.lifecycle.recorded_exits}</strong><small>Exit dates recorded</small></div>
                <div className="recruitment-kpi"><span>Recent Exits</span><strong>{analytics.lifecycle.recent_exits_90_days}</strong><small>Last 90 days</small></div>
                <div className="recruitment-kpi"><span>Unrecorded Inactive</span><strong>{analytics.lifecycle.unrecorded_inactive}</strong><small>Need lifecycle review</small></div>
              </div>

              <div className="lifecycle-grid">
                <div>
                  <h3>Lifecycle status</h3>
                  <div className="chart-list">
                    {Object.entries(analytics.lifecycle.status_breakdown).map(([status, count]) => (
                      <div className="chart-item" key={status}>
                        <div className="chart-item-top"><span>{status}</span><strong>{count}</strong></div>
                        <div className="bar-track"><div className="bar-fill green-fill" style={{ width: `${barWidth(count, analytics.lifecycle.status_breakdown)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3>Exit reasons</h3>
                  {Object.keys(analytics.lifecycle.exit_reason_breakdown).length ? (
                    <div className="chart-list">
                      {Object.entries(analytics.lifecycle.exit_reason_breakdown).map(([reason, count]) => (
                        <div className="chart-item" key={reason}>
                          <div className="chart-item-top"><span>{reason}</span><strong>{count}</strong></div>
                          <div className="bar-track"><div className="bar-fill purple-fill" style={{ width: `${barWidth(count, analytics.lifecycle.exit_reason_breakdown)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="profile-empty">No recorded exit reasons yet.</div>
                  )}
                </div>
              </div>

              <div className="lifecycle-grid lifecycle-secondary-grid">
                <div>
                  <h3>Monthly recorded exits</h3>
                  <div className="chart-list trend-list">
                    {analytics.lifecycle.monthly_exits.map((item) => (
                      <div className="chart-item" key={item.month}>
                        <div className="chart-item-top"><span>{item.label}</span><strong>{item.count}</strong></div>
                        <div className="bar-track"><div className="bar-fill orange-fill" style={{ width: `${barWidth(item.count, Object.fromEntries(analytics.lifecycle.monthly_exits.map((x) => [x.month, x.count])))}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3>Lifecycle insights</h3>
                  <div className="insight-list">
                    {analytics.lifecycle.insights.map((insight) => (
                      <div className={`insight-item ${insight.type}`} key={`${insight.title}-${insight.message}`}>
                        <div className="insight-marker">{insight.type === "attention" ? "!" : "i"}</div>
                        <div><strong>{insight.title}</strong><p>{insight.message}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="analytics-note">{analytics.lifecycle.attrition_note}</p>
            </div>
          </section>


          {/* ==================================================
              RETENTION & EXIT ANALYTICS
              ================================================== */}

          <section className={`retention-section view-section ${activeView === "lifecycle" ? "view-section-active" : "view-section-hidden"}`}>
            <div className="panel">
              <div className="panel-header lifecycle-header">
                <div>
                  <h2>Retention &amp; Exit Analytics</h2>
                  <p>Evidence-based exit patterns from recorded lifecycle data.</p>
                </div>
                <span className="lifecycle-scope-badge">{analytics.lifecycle.recorded_exits} exits recorded</span>
              </div>

              <div className="lifecycle-kpi-grid">
                <div className="recruitment-kpi"><span>Recorded Exits</span><strong>{analytics.lifecycle.recorded_exits}</strong><small>Exit dates recorded</small></div>
                <div className="recruitment-kpi"><span>Recent Exits</span><strong>{analytics.lifecycle.recent_exits_90_days}</strong><small>Last 90 days</small></div>
                <div className="recruitment-kpi"><span>Avg. Tenure at Exit</span><strong>{analytics.lifecycle.average_tenure_at_exit_months === null ? "—" : `${analytics.lifecycle.average_tenure_at_exit_months} mo`}</strong><small>Based on recorded exits</small></div>
                <div className="recruitment-kpi"><span>Exit Reason Coverage</span><strong>{analytics.lifecycle.exit_reason_coverage}%</strong><small>Exits with a reason</small></div>
              </div>

              <div className="lifecycle-grid">
                <div>
                  <h3>Recorded exits by department</h3>
                  {Object.keys(analytics.lifecycle.exit_department_breakdown).length ? (
                    <div className="chart-list">
                      {Object.entries(analytics.lifecycle.exit_department_breakdown).map(([department, count]) => (
                        <div className="chart-item" key={department}>
                          <div className="chart-item-top"><span>{department}</span><strong>{count}</strong></div>
                          <div className="bar-track"><div className="bar-fill blue-fill" style={{ width: `${barWidth(count, analytics.lifecycle.exit_department_breakdown)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="profile-empty">No recorded department exit data yet.</div>
                  )}
                </div>

                <div>
                  <h3>Recorded exits by location</h3>
                  {Object.keys(analytics.lifecycle.exit_location_breakdown).length ? (
                    <div className="chart-list">
                      {Object.entries(analytics.lifecycle.exit_location_breakdown).map(([location, count]) => (
                        <div className="chart-item" key={location}>
                          <div className="chart-item-top"><span>{location}</span><strong>{count}</strong></div>
                          <div className="bar-track"><div className="bar-fill purple-fill" style={{ width: `${barWidth(count, analytics.lifecycle.exit_location_breakdown)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="profile-empty">No recorded location exit data yet.</div>
                  )}
                </div>
              </div>

              <div className="lifecycle-grid lifecycle-secondary-grid">
                <div>
                  <h3>Exit reasons</h3>
                  {Object.keys(analytics.lifecycle.exit_reason_breakdown).length ? (
                    <div className="chart-list">
                      {Object.entries(analytics.lifecycle.exit_reason_breakdown).map(([reason, count]) => (
                        <div className="chart-item" key={reason}>
                          <div className="chart-item-top"><span>{reason}</span><strong>{count}</strong></div>
                          <div className="bar-track"><div className="bar-fill orange-fill" style={{ width: `${barWidth(count, analytics.lifecycle.exit_reason_breakdown)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="profile-empty">No recorded exit reasons yet.</div>
                  )}
                </div>

                <div>
                  <h3>Retention insights</h3>
                  <div className="insight-list">
                    {analytics.lifecycle.retention_insights.map((insight) => (
                      <div className={`insight-item ${insight.type}`} key={`${insight.title}-${insight.message}`}>
                        <div className="insight-marker">{insight.type === "attention" ? "!" : "i"}</div>
                        <div><strong>{insight.title}</strong><p>{insight.message}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="analytics-note">{analytics.lifecycle.attrition_note}</p>
            </div>
          </section>


          {/* ==================================================
              RECRUITMENT HUB
              ================================================== */}

          <section className={`recruitment-section view-section ${activeView === "recruitment" ? "view-section-active" : "view-section-hidden"}`}>
            <div className="panel recruitment-overview">
              <div className="panel-header recruitment-header">
                <div>
                  <h2>Recruitment Hub</h2>
                  <p>Candidate pipeline and hiring analytics based on recorded recruitment data</p>
                </div>
                <div className="recruitment-header-actions">
                  <input
                    ref={candidateFileInputRef}
                    className="hidden-file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCandidateCsvUpload}
                  />
                  <button className="secondary-button" onClick={downloadCandidateTemplate}>Template</button>
                  <button className="secondary-button" onClick={openCandidateFilePicker}>Import CSV</button>
                  <button className="add-button" onClick={openAddCandidateModal}>+ Add Candidate</button>
                </div>
              </div>

              <div className="recruitment-kpi-grid">
                <div className="recruitment-kpi"><span>Total Candidates</span><strong>{analytics.recruitment.total_candidates}</strong><small>Recorded applicants</small></div>
                <div className="recruitment-kpi"><span>Open Pipeline</span><strong>{analytics.recruitment.open_pipeline}</strong><small>Applied to offer</small></div>
                <div className="recruitment-kpi"><span>Hired</span><strong>{analytics.recruitment.hired_candidates}</strong><small>Recorded hires</small></div>
                <div className="recruitment-kpi"><span>Avg. Time to Hire</span><strong>{analytics.recruitment.average_time_to_hire_days === null ? "—" : `${analytics.recruitment.average_time_to_hire_days} d`}</strong><small>Hired candidates with dates</small></div>
                <div className="recruitment-kpi"><span>Hire Conversion</span><strong>{analytics.recruitment.hire_conversion_rate}%</strong><small>Hires / recorded candidates</small></div>
              </div>

              <div className="recruitment-analytics-grid">
                <div>
                  <h3>Pipeline by stage</h3>
                  <div className="pipeline-grid">
                    {Object.entries(analytics.recruitment.stage_breakdown).map(([stage, count]) => (
                      <div className="pipeline-stage" key={stage}>
                        <div><span>{stage}</span><strong>{count}</strong></div>
                        <div className="bar-track"><div className="bar-fill blue-fill" style={{ width: `${Math.min(100, Math.max(0, (count / Math.max(1, analytics.recruitment.total_candidates)) * 100))}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Application trend</h3>
                  <div className="trend-list recruitment-trend-list">
                    {analytics.recruitment.monthly_applications.map((item) => (
                      <div className="chart-item" key={item.month}>
                        <div className="chart-item-top"><span>{item.label}</span><strong>{item.count}</strong></div>
                        <div className="bar-track"><div className="bar-fill purple-fill" style={{ width: `${Math.min(100, Math.max(0, (item.count / Math.max(1, ...analytics.recruitment.monthly_applications.map((x) => x.count))) * 100))}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="funnel-intelligence">
                <div className="funnel-intelligence-header">
                  <div>
                    <h3>Funnel Intelligence</h3>
                    <p>Current-stage funnel reach and source-level hiring signals</p>
                  </div>
                  <span className="funnel-scope-badge">{analytics.recruitment.funnel_intelligence.eligible_candidate_count} in funnel</span>
                </div>

                <div className="funnel-intelligence-grid">
                  <div>
                    <div className="funnel-stage-list">
                      {Object.entries(analytics.recruitment.funnel_intelligence.stage_reach).map(([stage, count]) => (
                        <div className="funnel-stage-row" key={stage}>
                          <div className="funnel-stage-row-top">
                            <span>{stage}</span>
                            <strong>{count}</strong>
                          </div>
                          <div className="bar-track">
                            <div
                              className="bar-fill blue-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, (count / Math.max(1, analytics.recruitment.funnel_intelligence.eligible_candidate_count)) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="conversion-list">
                      {Object.entries(analytics.recruitment.funnel_intelligence.stage_conversion).map(([transition, rate]) => (
                        <div className="conversion-item" key={transition}>
                          <span>{transition}</span>
                          <strong>{rate === null ? "—" : `${rate}%`}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4>Funnel signal</h4>
                    {analytics.recruitment.funnel_intelligence.largest_drop && analytics.recruitment.funnel_intelligence.largest_drop.drop_count > 0 ? (
                      <div className="funnel-signal-card attention">
                        <strong>Largest recorded drop</strong>
                        <span>
                          {analytics.recruitment.funnel_intelligence.largest_drop.from_stage} â†’ {analytics.recruitment.funnel_intelligence.largest_drop.to_stage}
                        </span>
                        <small>
                          {analytics.recruitment.funnel_intelligence.largest_drop.drop_count} candidate(s) · {analytics.recruitment.funnel_intelligence.largest_drop.drop_rate}% drop
                        </small>
                      </div>
                    ) : (
                      <div className="funnel-signal-card">
                        <strong>No material funnel drop detected</strong>
                        <small>More stage history is needed for deeper conversion analysis.</small>
                      </div>
                    )}

                    <h4 className="source-effectiveness-title">Source effectiveness</h4>
                    <div className="source-effectiveness-list">
                      {Object.entries(analytics.recruitment.funnel_intelligence.source_effectiveness).map(([source, details]) => (
                        <div className="source-effectiveness-item" key={source}>
                          <div>
                            <span>{source}</span>
                            <small>{details.hires} hire(s) / {details.candidates} candidate(s)</small>
                          </div>
                          <strong>{details.hire_rate}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="funnel-insights">
                  {analytics.recruitment.funnel_intelligence.insights.map((insight) => (
                    <div className={`funnel-insight ${insight.type}`} key={`${insight.title}-${insight.message}`}>
                      <strong>{insight.title}</strong>
                      <span>{insight.message}</span>
                    </div>
                  ))}
                </div>

                <p className="analytics-note">Funnel reach uses the candidate's current recorded stage. Rejected and withdrawn records are excluded because HumaveliOS does not yet store full stage-history events.</p>
              </div>

              <div className="recruitment-breakdowns">
                <div><h3>Candidate sources</h3>{Object.keys(analytics.recruitment.source_breakdown).length ? Object.entries(analytics.recruitment.source_breakdown).map(([source,count]) => <div className="breakdown-line" key={source}><span>{source}</span><strong>{count}</strong></div>) : <div className="profile-empty">No recruitment source data recorded yet.</div>}</div>
                <div><h3>Hiring departments</h3>{Object.keys(analytics.recruitment.department_breakdown).length ? Object.entries(analytics.recruitment.department_breakdown).map(([department,count]) => <div className="breakdown-line" key={department}><span>{department}</span><strong>{count}</strong></div>) : <div className="profile-empty">No department data recorded yet.</div>}</div>
              </div>

              <p className="analytics-note">Recruitment metrics are based only on candidate records stored in HumaveliOS. No applicant, hire, or conversion data is inferred.</p>
            </div>

            <div className="panel candidate-panel">
              <div className="panel-header">
                <div>
                  <h2>Candidate Pipeline</h2>
                  <p>Manage and track candidate progress</p>
                </div>
                <span className="employee-count">{candidates.length} recorded</span>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Candidate</th><th>Role</th><th>Department</th><th>Source</th><th>Stage</th><th>Applied</th><th>Actions</th></tr></thead>
                  <tbody>
                    {candidates.length ? candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td><div className="employee-cell"><div className="avatar">{displayText(candidate.full_name, "?").charAt(0).toUpperCase()}</div><div><div className="employee-name">{displayText(candidate.full_name, "Unnamed candidate")}</div><div className="employee-meta">{displayText(candidate.candidate_id, "No ID")} · {displayText(candidate.email, "No email")}</div></div></div></td>
                        <td>{displayText(candidate.role)}</td><td>{displayText(candidate.department)}</td><td>{displayText(candidate.source)}</td>
                        <td><span className={`candidate-stage stage-${candidate.stage.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{candidate.stage}</span></td>
                        <td>{formatDate(candidate.applied_date)}</td>
                        <td><div className="row-actions"><button className="view-button" onClick={() => openEditCandidateModal(candidate)}>Edit</button><button className="delete-button" onClick={() => handleDeleteCandidate(candidate)} disabled={deletingCandidateId === candidate.id}>{deletingCandidateId === candidate.id ? "Deleting..." : "Delete"}</button></div></td>
                      </tr>
                    )) : <tr><td colSpan={7} className="empty-state">No candidates recorded yet. Add a candidate to start building your recruitment analytics.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ==================================================
              EMPLOYEE MANAGEMENT
              ================================================== */}

          <section className={`panel view-section ${activeView === "audit" ? "view-section-active" : "view-section-hidden"}`}>
            <div className="panel-header">
              <div>
                <h2>Activity Logs</h2>
                <p>Read-only administrative history for authentication and workspace changes.</p>
              </div>
              <span className="employee-count">{auditLogs.length} recorded</span>
            </div>

            {auditError && (
              <div className="error-message compact-error">
                <strong>Activity logs</strong>
                <span>{auditError}</span>
                <button type="button" onClick={() => setAuditError("")}>Dismiss</button>
              </div>
            )}

            <div className="filters">
              <div className="search-box">
                <span>⌕</span>
                <input
                  type="text"
                  placeholder="Search user, action, target or details..."
                  value={auditSearch}
                  onChange={(event) => setAuditSearch(event.target.value)}
                />
              </div>

              <select value={auditModuleFilter} onChange={(event) => setAuditModuleFilter(event.target.value)}>
                <option value="All">All Modules</option>
                {auditModules.map((module) => <option value={module} key={module}>{module}</option>)}
              </select>

              <select value={auditActionFilter} onChange={(event) => setAuditActionFilter(event.target.value)}>
                <option value="All">All Actions</option>
                {auditActions.map((action) => <option value={action} key={action}>{action}</option>)}
              </select>

              <button type="button" className="secondary-button" onClick={loadAuditLogs} disabled={auditLoading}>
                {auditLoading ? "Loading..." : "Refresh Logs"}
              </button>
            </div>

            <div className="audit-summary">
              <div>
                <strong>{filteredAuditLogs.length}</strong>
                <span>activity record{filteredAuditLogs.length === 1 ? "" : "s"} shown</span>
              </div>
              <span>Page {Math.min(auditPage, auditTotalPages)} of {auditTotalPages}</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAuditLogs.length ? paginatedAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="audit-datetime">
                          <strong>{formatDateTime(log.created_at).split(",")[0]}</strong>
                          <span>{formatDateTime(log.created_at).split(",").slice(1).join(",").trim()}</span>
                        </div>
                      </td>
                      <td>
                        <div className="employee-cell">
                          <div className="avatar">{displayText(log.actor_email, "?").charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="employee-name">{displayText(log.actor_email, "System")}</div>
                            <div className="employee-meta">{log.actor_user_id ? `User #${log.actor_user_id}` : "System activity"}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={getAuditActionClass(log.action)}>{log.action.replace(/_/g, " ")}</span></td>
                      <td><span className="audit-module">{displayText(log.module)}</span></td>
                      <td>{log.target_type ? <span className="audit-target">{log.target_type}{log.target_id ? ` #${log.target_id}` : ""}</span> : "—"}</td>
                      <td><span className="audit-details">{displayText(log.details)}</span></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        {auditLoading ? "Loading activity history..." : "No activity records match the current filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredAuditLogs.length > 0 && (
              <div className="audit-pagination">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                  disabled={auditPage <= 1 || auditLoading}
                >
                  Previous
                </button>
                <div className="audit-page-numbers">
                  {Array.from({ length: auditTotalPages }, (_, index) => index + 1)
                    .slice(
                      Math.max(0, Math.min(auditPage - 3, auditTotalPages - 5)),
                      Math.min(auditTotalPages, Math.max(5, auditPage + 2))
                    )
                    .map((page) => (
                      <button
                        type="button"
                        key={page}
                        className={page === auditPage ? "audit-page-button active" : "audit-page-button"}
                        onClick={() => setAuditPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAuditPage((page) => Math.min(auditTotalPages, page + 1))}
                  disabled={auditPage >= auditTotalPages || auditLoading}
                >
                  Next
                </button>
              </div>
            )}

            <div className="role-permission-note">
              <strong>Audit policy</strong>
              <span>Activity Logs are read-only and available only to administrators. Password values are never stored in the activity details.</span>
            </div>
          </section>

          <section className={`panel users-panel view-section ${activeView === "users" ? "view-section-active" : "view-section-hidden"}`}>
            <div className="panel-header"><div><h2>Users & Roles</h2><p>Create accounts and control access to HumaveliOS modules.</p></div><button type="button" className="save-button" onClick={() => { setUserError(""); setUserForm({ ...EMPTY_USER_FORM }); setShowUserModal(true); }}>+ Add User</button></div>
            {userError && <div className="error-message compact-error"><strong>User management</strong><span>{userError}</span><button type="button" onClick={() => setUserError("")}>Dismiss</button></div>}
            <div className="role-summary-grid">
              {USER_ROLES.map((role) => <div className="role-summary-card" key={role}><span>{role}</span><strong>{users.filter((user) => user.role === role && user.is_active).length}</strong><small>active users</small></div>)}
            </div>
            <div className="users-table-wrap">
              <table className="users-table"><thead><tr><th>Email</th><th>Role</th><th>Employee Profile</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
                {users.map((user) => <tr key={user.id}><td><strong>{user.email}</strong></td><td><select value={user.role} disabled={user.email === authUser?.email} onChange={(event) => updateUser(user, { role: event.target.value })}>{USER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></td><td><select className="user-employee-select" value={user.employee_id ?? ""} disabled={user.role !== "employee" || user.email === authUser?.email} onChange={(event) => linkUserEmployee(user, event.target.value)}><option value="">Not linked</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.employee_id}</option>)}</select></td><td><span className={`status-pill ${user.is_active ? "active" : "inactive"}`}>{user.is_active ? "Active" : "Inactive"}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td><td><div className="row-actions"><button type="button" className="table-action-button" disabled={user.email === authUser?.email || userDeletingId === user.id} onClick={() => updateUser(user, { is_active: !user.is_active })}>{user.is_active ? "Deactivate" : "Activate"}</button><button type="button" className="delete-button" disabled={user.email === authUser?.email || userDeletingId === user.id} onClick={() => deleteUser(user)}>{userDeletingId === user.id ? "Deleting..." : "Delete"}</button></div></td></tr>)}
                {users.length === 0 && <tr><td colSpan={6}><div className="empty-chart">No users available.</div></td></tr>}
              </tbody></table>
            </div>
            <div className="role-permission-note"><strong>Access model</strong><span><b>Admin</b>: full access + user management · <b>HR</b>: employees, analytics, recruitment and lifecycle · <b>Manager</b>: overview, employees and people analytics · <b>Employee</b>: personal profile only.</span></div>
          </section>

          <section className={`panel employee-panel view-section ${activeView === "employees" ? "view-section-active" : "view-section-hidden"}`}>

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
                  âŒ•
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
                                    displayText(employee.full_name, "?")
                                      .charAt(0)
                                      .toUpperCase()
                                  }
                                </div>


                                <div>

                                  <div className="employee-name">
                                    {
                                      displayText(employee.full_name, "Unnamed employee")
                                    }
                                  </div>

                                  <div className="employee-meta">
                                    {
                                      displayText(employee.employee_id, "No ID")
                                    }{" "}
                                    ·{" "}
                                    {
                                      displayText(employee.email, "No email")
                                    }
                                  </div>

                                </div>

                              </div>

                            </td>


                            <td>
                              {
                                displayText(employee.department)
                              }
                            </td>


                            <td>
                              {
                                displayText(employee.designation)
                              }
                            </td>


                            <td>
                              {
                                displayText(employee.location)
                              }
                            </td>


                            <td>

                              <span className="performance">
                                {
                                  displayPerformance(employee.performance_score)
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
                                  className="view-button"
                                  onClick={() =>
                                    openEmployeeProfile(employee)
                                  }
                                >
                                  View
                                </button>

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
          CANDIDATE CSV IMPORT MODAL
          ====================================================== */}

      {showUserModal && (
        <div className="modal-overlay" onMouseDown={() => !userSaving && setShowUserModal(false)}>
          <div className="modal small-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><span className="eyebrow">Administration</span><h2>Create User</h2><p>Create a login account with a role and temporary password.</p></div><button type="button" className="close-button" onClick={() => setShowUserModal(false)} disabled={userSaving}>Ã—</button></div>
            <form className="form-grid" onSubmit={saveUser}>
              <div className="form-field"><label>Email</label><input type="email" required value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="form-field"><label>Role</label><select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value, employee_id: event.target.value === "employee" ? current.employee_id : "" }))}>{USER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></div>
              {userForm.role === "employee" && <div className="form-field"><label>Link employee profile</label><select value={userForm.employee_id} onChange={(event) => setUserForm((current) => ({ ...current, employee_id: event.target.value }))}><option value="">No profile linked yet</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.employee_id}</option>)}</select></div>}
              <div className="form-field full-field"><label>Temporary password</label><input type="password" required minLength={8} value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} placeholder="At least 8 characters" /></div>
              {userError && <div className="form-error full-field">{userError}</div>}
              <div className="modal-actions field-wide"><button type="button" className="cancel-button" onClick={() => setShowUserModal(false)} disabled={userSaving}>Cancel</button><button type="submit" className="save-button" disabled={userSaving}>{userSaving ? "Creating..." : "Create User"}</button></div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeImportModal(); }}>
          <div className="modal import-modal">
            <div className="modal-header">
              <div>
                <h2>Import Candidates</h2>
                <p>Review your CSV before adding candidates to HumaveliOS.</p>
              </div>
              <button className="close-button" onClick={closeImportModal} aria-label="Close import">Ã—</button>
            </div>

            {importMessage && <div className={importRows.length || importMessage.includes("imported") ? "import-message" : "form-error"}>{importMessage}</div>}

            {importErrors.length > 0 && (
              <div className="import-errors">
                <strong>Rows needing attention ({importErrors.length})</strong>
                <div>{importErrors.slice(0, 8).map((error) => <span key={error}>{error}</span>)}</div>
                {importErrors.length > 8 && <small>Showing the first 8 issues.</small>}
              </div>
            )}

            {importRows.length > 0 && (
              <div className="import-preview">
                <div className="import-preview-header">
                  <strong>Ready to import: {importRows.length}</strong>
                  <span>Maximum 500 rows per upload</span>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Candidate ID</th><th>Name</th><th>Role</th><th>Department</th><th>Source</th><th>Stage</th><th>Applied</th></tr></thead>
                    <tbody>
                      {importRows.slice(0, 8).map((candidate) => (
                        <tr key={candidate.candidate_id}>
                          <td>{candidate.candidate_id}</td>
                          <td>{candidate.full_name}</td>
                          <td>{candidate.role}</td>
                          <td>{candidate.department}</td>
                          <td>{candidate.source}</td>
                          <td>{candidate.stage}</td>
                          <td>{candidate.applied_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importRows.length > 8 && <p className="analytics-note">Showing the first 8 valid rows. All valid rows will be imported.</p>}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={closeImportModal} disabled={importSaving}>Cancel</button>
              <button type="button" className="save-button" onClick={importCandidateRows} disabled={importSaving || importRows.length === 0}>
                {importSaving ? "Importing..." : `Import ${importRows.length || ""} Candidate${importRows.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================
          CANDIDATE MODAL
          ====================================================== */}

      {showCandidateModal && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCandidateModal(); }}>
          <div className="modal">
            <div className="modal-header"><div><h2>{editingCandidate ? "Edit Candidate" : "Add Candidate"}</h2><p>Candidate pipeline record</p></div><button className="close-button" onClick={closeCandidateModal} aria-label="Close candidate form">Ã—</button></div>
            {candidateError && <div className="form-error">{candidateError}</div>}
            <form onSubmit={handleCandidateSubmit}>
              <div className="form-grid">
                <div className="form-field"><label>Candidate ID</label><input value={candidateForm.candidate_id} onChange={(e) => setCandidateField("candidate_id", e.target.value)} placeholder="CAN001" disabled={candidateSaving}/></div>
                <div className="form-field"><label>Full Name</label><input value={candidateForm.full_name} onChange={(e) => setCandidateField("full_name", e.target.value)} placeholder="Candidate name" disabled={candidateSaving}/></div>
                <div className="form-field"><label>Email</label><input type="email" value={candidateForm.email} onChange={(e) => setCandidateField("email", e.target.value)} placeholder="candidate@example.com" disabled={candidateSaving}/></div>
                <div className="form-field"><label>Role</label><input value={candidateForm.role} onChange={(e) => setCandidateField("role", e.target.value)} placeholder="HR Analyst" disabled={candidateSaving}/></div>
                <div className="form-field"><label>Department</label><input value={candidateForm.department} onChange={(e) => setCandidateField("department", e.target.value)} placeholder="Human Resources" disabled={candidateSaving}/></div>
                <div className="form-field"><label>Source</label><input value={candidateForm.source} onChange={(e) => setCandidateField("source", e.target.value)} placeholder="LinkedIn" disabled={candidateSaving}/></div>
                <div className="form-field"><label>Stage</label><select value={candidateForm.stage} onChange={(e) => setCandidateField("stage", e.target.value)} disabled={candidateSaving}>{CANDIDATE_STAGES.map((stage) => <option value={stage} key={stage}>{stage}</option>)}</select></div>
                <div className="form-field"><label>Applied Date</label><input type="date" value={candidateForm.applied_date} onChange={(e) => setCandidateField("applied_date", e.target.value)} disabled={candidateSaving}/></div>
                <div className="form-field"><label>Interview Date</label><input type="date" value={candidateForm.interview_date} onChange={(e) => setCandidateField("interview_date", e.target.value)} disabled={candidateSaving}/></div>
                <div className="form-field"><label>Offer Date</label><input type="date" value={candidateForm.offer_date} onChange={(e) => setCandidateField("offer_date", e.target.value)} disabled={candidateSaving}/></div>
                <div className="form-field"><label>Hired Date</label><input type="date" value={candidateForm.hired_date} onChange={(e) => setCandidateField("hired_date", e.target.value)} disabled={candidateSaving}/></div>
                <div className="form-field"><label>Recruiter</label><input value={candidateForm.recruiter} onChange={(e) => setCandidateField("recruiter", e.target.value)} placeholder="Recruiter name" disabled={candidateSaving}/></div>
              </div>
              <div className="form-field full-field"><label>Notes</label><textarea value={candidateForm.notes} onChange={(e) => setCandidateField("notes", e.target.value)} rows={3} placeholder="Interview notes or follow-up details" disabled={candidateSaving}/></div>
              <div className="modal-actions"><button type="button" className="cancel-button" onClick={closeCandidateModal} disabled={candidateSaving}>Cancel</button><button type="submit" className="save-button" disabled={candidateSaving}>{candidateSaving ? "Saving..." : editingCandidate ? "Save Changes" : "Create Candidate"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          EMPLOYEE 360 PROFILE
          ====================================================== */}

      {viewingEmployee && (

        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEmployeeProfile();
            }
          }}
        >

          <div className="modal profile-modal">

            <div className="modal-header">

              <div>
                <h2>Employee 360</h2>
                <p>Employee-level HR and people analytics snapshot</p>
              </div>

              <button
                className="close-button"
                onClick={closeEmployeeProfile}
                aria-label="Close employee profile"
              >
                Ã—
              </button>

            </div>

            <div className="profile-body">

              <div className="profile-hero">
                <div className="profile-avatar">
                  {displayText(viewingEmployee.full_name, "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="profile-hero-copy">
                  <h3>{displayText(viewingEmployee.full_name, "Unnamed employee")}</h3>
                  <p>
                    {displayText(viewingEmployee.designation, "Role not provided")} · {displayText(viewingEmployee.department, "Department not provided")}
                  </p>
                  <div className="profile-meta-row">
                    <span>{displayText(viewingEmployee.employee_id, "No ID")}</span>
                    <span className={viewingEmployee.is_active ? "status active" : "status inactive"}>
                      {viewingEmployee.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-kpi-grid">

                <div className="profile-kpi">
                  <span>Tenure</span>
                  <strong>{calculateTenure(viewingEmployee)}</strong>
                  <small>Since {formatDate(viewingEmployee.date_of_joining)}</small>
                </div>

                <div className="profile-kpi">
                  <span>Performance</span>
                  <strong>{displayPerformance(viewingEmployee.performance_score)}</strong>
                  <small>Latest recorded score</small>
                </div>

                <div className="profile-kpi">
                  <span>Data completeness</span>
                  <strong>{getEmployeeCompleteness(viewingEmployee)}%</strong>
                  <small>Profile fields completed</small>
                </div>

              </div>

              <section className="profile-section lifecycle-profile-section">
                <div className="profile-section-header">
                  <div className="lifecycle-profile-header">
                    <div>
                      <h3>Employee lifecycle</h3>
                      <p>Recorded employment stage and exit information</p>
                    </div>
                    <button className="secondary-button" onClick={openLifecycleModal} disabled={lifecycleLoading}>
                      {lifecycleLoading ? "Loading..." : "Manage Lifecycle"}
                    </button>
                  </div>
                </div>

                {lifecycleError && <div className="form-error">{lifecycleError}</div>}

                {lifecycleLoading ? (
                  <div className="profile-empty">Loading lifecycle information...</div>
                ) : viewingLifecycle ? (
                  <div className="profile-detail-grid">
                    <div><span>Lifecycle status</span><strong>{viewingLifecycle.lifecycle_status}</strong></div>
                    <div><span>Lifecycle record</span><strong>{viewingLifecycle.has_lifecycle_record ? "Recorded" : "Not recorded"}</strong></div>
                    <div><span>Exit date</span><strong>{viewingLifecycle.exit_date ? formatDate(viewingLifecycle.exit_date) : "Not recorded"}</strong></div>
                    <div><span>Exit reason</span><strong>{displayText(viewingLifecycle.exit_reason)}</strong></div>
                    <div><span>Lifecycle updated</span><strong>{formatDate(viewingLifecycle.updated_at)}</strong></div>
                    <div><span>Exit notes</span><strong>{displayText(viewingLifecycle.exit_notes)}</strong></div>
                  </div>
                ) : (
                  <div className="profile-empty">Lifecycle information could not be loaded.</div>
                )}
              </section>

              <div className="profile-section-grid">

                <section className="profile-section">
                  <div className="profile-section-header">
                    <h3>Employment details</h3>
                    <p>Core workforce information</p>
                  </div>

                  <div className="profile-detail-grid">
                    <div><span>Department</span><strong>{displayText(viewingEmployee.department)}</strong></div>
                    <div><span>Designation</span><strong>{displayText(viewingEmployee.designation)}</strong></div>
                    <div><span>Employment type</span><strong>{displayText(viewingEmployee.employment_type)}</strong></div>
                    <div><span>Location</span><strong>{displayText(viewingEmployee.location)}</strong></div>
                    <div><span>Manager</span><strong>{displayText(viewingEmployee.manager)}</strong></div>
                    <div><span>Joined</span><strong>{formatDate(viewingEmployee.date_of_joining)}</strong></div>
                  </div>
                </section>

                <section className="profile-section">
                  <div className="profile-section-header">
                    <h3>Contact</h3>
                    <p>Employee communication details</p>
                  </div>

                  <div className="profile-detail-grid single-column">
                    <div><span>Email</span><strong>{displayText(viewingEmployee.email)}</strong></div>
                    <div><span>Status</span><strong>{displayText(viewingEmployee.status)}</strong></div>
                    <div><span>Last updated</span><strong>{formatDate(viewingEmployee.updated_at)}</strong></div>
                  </div>
                </section>

              </div>

              <section className="profile-section">
                <div className="profile-section-header">
                  <h3>Skills</h3>
                  <p>Skills recorded in the employee profile</p>
                </div>

                {getSkillList(viewingEmployee.skills).length ? (
                  <div className="skill-list">
                    {getSkillList(viewingEmployee.skills).map((skill) => (
                      <span className="skill-chip" key={skill}>{skill}</span>
                    ))}
                  </div>
                ) : (
                  <div className="profile-empty">No skills have been recorded for this employee.</div>
                )}
              </section>

              <div className="profile-note">
                <strong>HumaveliOS profile insight</strong>
                <span>This view summarizes the data currently stored for this employee. It does not infer information that is not recorded in HumaveliOS.</span>
              </div>

            </div>

          </div>

        </div>
      )}


      {/* ======================================================
          LIFECYCLE MODAL
          ====================================================== */}

      {showLifecycleModal && viewingEmployee && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLifecycleModal(); }}>
          <div className="modal lifecycle-modal">
            <div className="modal-header">
              <div>
                <h2>Manage Employee Lifecycle</h2>
                <p>{displayText(viewingEmployee.full_name, "Employee")} · recorded lifecycle information</p>
              </div>
              <button className="close-button" onClick={closeLifecycleModal} aria-label="Close lifecycle form">Ã—</button>
            </div>

            {lifecycleError && <div className="form-error">{lifecycleError}</div>}

            <form onSubmit={handleLifecycleSave}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Lifecycle status</label>
                  <select value={lifecycleForm.lifecycle_status} onChange={(e) => setLifecycleForm((current) => ({ ...current, lifecycle_status: e.target.value }))} disabled={lifecycleSaving}>
                    {LIFECYCLE_STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}
                  </select>
                </div>

                <div className="form-field">
                  <label>Exit date</label>
                  <input type="date" value={lifecycleForm.exit_date} onChange={(e) => setLifecycleForm((current) => ({ ...current, exit_date: e.target.value }))} disabled={lifecycleSaving || lifecycleForm.lifecycle_status !== "Exited"} />
                </div>

                <div className="form-field">
                  <label>Exit reason</label>
                  <select value={lifecycleForm.exit_reason} onChange={(e) => setLifecycleForm((current) => ({ ...current, exit_reason: e.target.value }))} disabled={lifecycleSaving || lifecycleForm.lifecycle_status !== "Exited"}>
                    <option value="">Not specified</option>
                    {EXIT_REASONS.map((reason) => <option value={reason} key={reason}>{reason}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-field full-field">
                <label>Exit notes</label>
                <textarea rows={4} value={lifecycleForm.exit_notes} onChange={(e) => setLifecycleForm((current) => ({ ...current, exit_notes: e.target.value }))} placeholder="Optional context about the employee exit" disabled={lifecycleSaving || lifecycleForm.lifecycle_status !== "Exited"} />
              </div>

              <div className="lifecycle-form-note">
                <strong>Data rule</strong>
                <span>Choosing Exited requires an exit date. Saving Exited also marks the employee inactive. Other lifecycle stages keep the employee active.</span>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={closeLifecycleModal} disabled={lifecycleSaving}>Cancel</button>
                <button type="submit" className="save-button" disabled={lifecycleSaving}>{lifecycleSaving ? "Saving..." : "Save Lifecycle"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ======================================================
          CREATE GOAL MODAL
          ====================================================== */}

      {showGoalModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeGoalModal();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Create Performance Goal</h2>
                <p>
                  Assign and track a goal for an employee.
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={closeGoalModal}
                disabled={goalSaving}
                aria-label="Close goal form"
              >
                ×
              </button>
            </div>

            {goalFormError && (
              <div className="form-error">
                {goalFormError}
              </div>
            )}

            <form onSubmit={handleGoalSave}>
              <div className="form-grid">

                <div className="form-field">
                  <label>Employee *</label>

                  <select
                    value={goalForm.employee_id}
                    onChange={(event) =>
                      setGoalForm((current) => ({
                        ...current,
                        employee_id: event.target.value,
                      }))
                    }
                    disabled={goalSaving}
                  >
                    <option value="">
                      Select employee
                    </option>

                    {employees.map((employee) => (
                      <option
                        value={employee.id}
                        key={employee.id}
                      >
                        {employee.full_name} · {employee.employee_id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Goal Title *</label>

                  <input
                    type="text"
                    value={goalForm.title}
                    onChange={(event) =>
                      setGoalForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Improve recruitment turnaround time"
                    disabled={goalSaving}
                  />
                </div>

                <div className="form-field">
                  <label>Category</label>

                  <select
                    value={goalForm.category}
                    onChange={(event) =>
                      setGoalForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    disabled={goalSaving}
                  >
                    <option value="General">General</option>
                    <option value="Business">Business</option>
                    <option value="Customer">Customer</option>
                    <option value="People">People</option>
                    <option value="Learning">Learning</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Performance Cycle</label>

                  <input
                    type="text"
                    value={goalForm.cycle}
                    onChange={(event) =>
                      setGoalForm((current) => ({
                        ...current,
                        cycle: event.target.value,
                      }))
                    }
                    placeholder="2026"
                    disabled={goalSaving}
                  />
                </div>

                <div className="form-field">
                  <label>Priority</label>

                  <select
                    value={goalForm.priority}
                    onChange={(event) =>
                      setGoalForm((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                    disabled={goalSaving}
                  >
                    {GOAL_PRIORITIES.map((priority) => (
                      <option
                        value={priority}
                        key={priority}
                      >
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Status</label>

                  <select
                    value={goalForm.status}
                    onChange={(event) =>
                      setGoalForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    disabled={goalSaving}
                  >
                    {GOAL_STATUSES.map((status) => (
                      <option
                        value={status}
                        key={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Due Date</label>

                  <input
                    type="date"
                    value={goalForm.due_date}
                    onChange={(event) =>
                      setGoalForm((current) => ({
                        ...current,
                        due_date: event.target.value,
                      }))
                    }
                    disabled={goalSaving}
                  />
                </div>

                <div className="form-field">
                  <label>Progress (%)</label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={goalForm.progress}
                    onChange={(event) =>
                      setGoalForm((current) => ({
                        ...current,
                        progress: event.target.value,
                      }))
                    }
                    disabled={goalSaving}
                  />
                </div>

              </div>

              <div className="form-field full-field">
                <label>Description</label>

                <textarea
                  rows={4}
                  value={goalForm.description}
                  onChange={(event) =>
                    setGoalForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the expected outcome, success criteria or key deliverables."
                  disabled={goalSaving}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeGoalModal}
                  disabled={goalSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={goalSaving}
                >
                  {goalSaving
                    ? "Creating..."
                    : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                Ã—
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

        </div>
      </div>

    </main>
  );
}