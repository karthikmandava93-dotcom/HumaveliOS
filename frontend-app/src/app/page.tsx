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
  anchor.download = "peopleos-candidate-import-template.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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


  const [
    viewingEmployee,
    setViewingEmployee,
  ] = useState<Employee | null>(null);

  const [
    candidates,
    setCandidates,
  ] = useState<Candidate[]>([]);

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

  async function loadDashboard() {

    try {

      setLoading(true);
      setError("");


      const [
        employeeData,
        analyticsData,
        candidateData,
      ] = await Promise.all([

        apiRequest<Employee[]>(
          "/employees?skip=0&limit=100"
        ),

        apiRequest<Analytics>(
          "/analytics/summary"
        ),

        apiRequest<Candidate[]>(
          "/candidates?skip=0&limit=100"
        ),
      ]);


      setEmployees(
        employeeData
      );


      setAnalytics(
        analyticsData
      );

      setCandidates(candidateData);

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


  function openEmployeeProfile(employee: Employee) {
    setViewingEmployee(employee);
  }


  function closeEmployeeProfile() {
    setViewingEmployee(null);
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

          <section className="insights-grid">

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

          <section className="analytics-grid workforce-trends-grid">

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
              RECRUITMENT HUB
              ================================================== */}

          <section className="recruitment-section">
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
                          {analytics.recruitment.funnel_intelligence.largest_drop.from_stage} → {analytics.recruitment.funnel_intelligence.largest_drop.to_stage}
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

                <p className="analytics-note">Funnel reach uses the candidate's current recorded stage. Rejected and withdrawn records are excluded because PeopleOS does not yet store full stage-history events.</p>
              </div>

              <div className="recruitment-breakdowns">
                <div><h3>Candidate sources</h3>{Object.keys(analytics.recruitment.source_breakdown).length ? Object.entries(analytics.recruitment.source_breakdown).map(([source,count]) => <div className="breakdown-line" key={source}><span>{source}</span><strong>{count}</strong></div>) : <div className="profile-empty">No recruitment source data recorded yet.</div>}</div>
                <div><h3>Hiring departments</h3>{Object.keys(analytics.recruitment.department_breakdown).length ? Object.entries(analytics.recruitment.department_breakdown).map(([department,count]) => <div className="breakdown-line" key={department}><span>{department}</span><strong>{count}</strong></div>) : <div className="profile-empty">No department data recorded yet.</div>}</div>
              </div>

              <p className="analytics-note">Recruitment metrics are based only on candidate records stored in PeopleOS. No applicant, hire, or conversion data is inferred.</p>
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

      {showImportModal && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeImportModal(); }}>
          <div className="modal import-modal">
            <div className="modal-header">
              <div>
                <h2>Import Candidates</h2>
                <p>Review your CSV before adding candidates to PeopleOS.</p>
              </div>
              <button className="close-button" onClick={closeImportModal} aria-label="Close import">×</button>
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
            <div className="modal-header"><div><h2>{editingCandidate ? "Edit Candidate" : "Add Candidate"}</h2><p>Candidate pipeline record</p></div><button className="close-button" onClick={closeCandidateModal} aria-label="Close candidate form">×</button></div>
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
                ×
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
                <strong>PeopleOS profile insight</strong>
                <span>This view summarizes the data currently stored for this employee. It does not infer information that is not recorded in PeopleOS.</span>
              </div>

            </div>

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