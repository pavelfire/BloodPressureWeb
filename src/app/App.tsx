import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BloodPressureReading, SessionState } from "../core/types";
import { loadSession, saveSession } from "../core/auth/sessionStore";
import { ApiClient } from "../core/api/client";
import { calculateAnalytics, type AnalyticsPeriod } from "../core/analytics/analytics";
import { createReading, deleteReading, listReadings, runSync, updateReading } from "../core/sync/sync";
import { readingCategory, validateReading } from "../core/validation/validation";

const queryClient = new QueryClient();
const DEFAULT_API_URL = import.meta.env.VITE_DEFAULT_API_URL || "http://localhost:8080";

const emptyForm = { systolic: "", diastolic: "", pulse: "", note: "" };

function useSession() {
  const [session, setSessionRaw] = useState<SessionState>(loadSession());
  const setSession = (next: SessionState) => {
    setSessionRaw(next);
    saveSession(next);
  };
  return { session, setSession };
}

function AppInner() {
  const { session, setSession } = useSession();
  const [serverUrl, setServerUrl] = useState(localStorage.getItem("bpw_server_url") ?? DEFAULT_API_URL);
  const [strictValidation, setStrictValidation] = useState(localStorage.getItem("bpw_strict_validation") !== "false");
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const api = useMemo(() => new ApiClient(() => serverUrl, () => session, setSession), [serverUrl, session]);

  useEffect(() => {
    listReadings().then(setReadings);
  }, []);

  useEffect(() => {
    localStorage.setItem("bpw_server_url", serverUrl);
    localStorage.setItem("bpw_strict_validation", String(strictValidation));
  }, [serverUrl, strictValidation]);

  const refreshReadings = async () => setReadings(await listReadings());
  const doSync = async () => {
    try {
      await runSync(api, session, setSession);
      await refreshReadings();
      setError("");
    } catch {
      setError("Ошибка синхронизации");
    }
  };

  return (
    <BrowserRouter>
      <div className="layout">
        <header>
          <h1>BloodPressureWeb</h1>
          <nav>
            <Link to="/">Home</Link><Link to="/history">History</Link><Link to="/add">Add</Link>
            <Link to="/analytics">Analytics</Link><Link to="/export">Export</Link><Link to="/settings">Settings</Link>
          </nav>
        </header>
        {error && <p className="error">{error}</p>}
        <Routes>
          <Route path="/auth" element={<AuthPage api={api} session={session} setSession={setSession} />} />
          <Route path="/" element={<Protected session={session}><HomePage readings={readings} /></Protected>} />
          <Route path="/history" element={<Protected session={session}><HistoryPage readings={readings.filter((r) => (r.note ?? "").toLowerCase().includes(search.toLowerCase()))} search={search} onSearch={setSearch} onDelete={async (r) => { await deleteReading(r, session, setSession); await refreshReadings(); }} /></Protected>} />
          <Route path="/add" element={<Protected session={session}><AddEditPage strict={strictValidation} onSave={async (form) => { await createReading(form); await refreshReadings(); }} /></Protected>} />
          <Route path="/edit/:id" element={<Protected session={session}><EditWrapper readings={readings} strict={strictValidation} onUpdate={async (r) => { await updateReading(r); await refreshReadings(); }} /></Protected>} />
          <Route path="/analytics" element={<Protected session={session}><AnalyticsPage readings={readings} /></Protected>} />
          <Route path="/export" element={<Protected session={session}><ExportPage readings={readings} /></Protected>} />
          <Route path="/settings" element={<Protected session={session}><SettingsPage serverUrl={serverUrl} setServerUrl={setServerUrl} strictValidation={strictValidation} setStrictValidation={setStrictValidation} onSync={doSync} session={session} setSession={setSession} api={api} /></Protected>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function Protected({ session, children }: { session: SessionState; children: React.ReactNode }) {
  return session.isLoggedIn ? <>{children}</> : <Navigate to="/auth" replace />;
}

function AuthPage({ api, session, setSession }: { api: ApiClient; session: SessionState; setSession: (s: SessionState) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  if (session.isLoggedIn) return <Navigate to="/" replace />;
  const submit = async () => {
    try {
      if (password.length < 8) throw new Error("Пароль минимум 8 символов");
      const tokens = isRegister ? await api.register({ email, password }) : await api.login({ email, password });
      setSession({ ...session, ...tokens, isLoggedIn: true });
      navigate("/");
    } catch {
      setError(isRegister ? "Ошибка регистрации" : "Неверный email или пароль");
    }
  };
  return <section><h2>{isRegister ? "Register" : "Login"}</h2><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" /><button onClick={submit}>{isRegister ? "Register" : "Login"}</button><button onClick={() => setIsRegister(!isRegister)}>Switch</button>{error && <p className="error">{error}</p>}</section>;
}

function HomePage({ readings }: { readings: BloodPressureReading[] }) {
  const last = readings[0];
  const week = calculateAnalytics(readings, "DAYS_7");
  return <section><h2>Home</h2>{last ? <p>Last: {last.systolic}/{last.diastolic} ({readingCategory(last)})</p> : <p>Нет записей</p>}<p>7d avg: {Math.round(week.averageSystolic)}/{Math.round(week.averageDiastolic)}</p></section>;
}

function HistoryPage({ readings, search, onSearch, onDelete }: { readings: BloodPressureReading[]; search: string; onSearch: (v: string) => void; onDelete: (r: BloodPressureReading) => Promise<void>; }) {
  return <section><h2>History</h2><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search notes" />{readings.map((r) => <article key={r.id}><Link to={`/edit/${r.id}`}>{new Date(r.measuredAt).toLocaleString()} - {r.systolic}/{r.diastolic}</Link><button onClick={() => onDelete(r)}>Delete</button></article>)}</section>;
}

function AddEditPage({ strict, onSave }: { strict: boolean; onSave: (r: Omit<BloodPressureReading, "id" | "serverId" | "syncStatus" | "updatedAt" | "deletedAt">) => Promise<void>; }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const submit = async () => {
    const reading: BloodPressureReading = { id: 0, systolic: Number(form.systolic || 0), diastolic: Number(form.diastolic || 0), pulse: form.pulse ? Number(form.pulse) : null, measuredAt: new Date().toISOString(), note: form.note || null, serverId: null, syncStatus: "PENDING", updatedAt: new Date().toISOString(), deletedAt: null };
    const validationError = validateReading(reading, strict);
    if (validationError) return setError(validationError);
    await onSave({ systolic: reading.systolic, diastolic: reading.diastolic, pulse: reading.pulse, measuredAt: reading.measuredAt, note: reading.note });
    navigate("/history");
  };
  return <section><h2>Add</h2><ReadingForm form={form} setForm={setForm} /><button onClick={submit}>Save</button>{error && <p className="error">{error}</p>}</section>;
}

function EditWrapper({ readings, strict, onUpdate }: { readings: BloodPressureReading[]; strict: boolean; onUpdate: (r: BloodPressureReading) => Promise<void> }) {
  const id = Number(window.location.pathname.split("/").pop());
  const reading = readings.find((r) => r.id === id);
  const navigate = useNavigate();
  const [form, setForm] = useState(reading ? { systolic: String(reading.systolic), diastolic: String(reading.diastolic), pulse: reading.pulse?.toString() ?? "", note: reading.note ?? "" } : emptyForm);
  if (!reading) return <section>Not found</section>;
  return <section><h2>Edit</h2><ReadingForm form={form} setForm={setForm} /><button onClick={async () => { const next = { ...reading, systolic: Number(form.systolic || 0), diastolic: Number(form.diastolic || 0), pulse: form.pulse ? Number(form.pulse) : null, note: form.note || null, updatedAt: new Date().toISOString() }; const validationError = validateReading(next, strict); if (validationError) return; await onUpdate(next); navigate("/history"); }}>Update</button></section>;
}

function ReadingForm({ form, setForm }: { form: typeof emptyForm; setForm: (next: typeof emptyForm) => void }) {
  return <div className="form-grid"><input placeholder="Systolic" value={form.systolic} onChange={(e) => setForm({ ...form, systolic: e.target.value })} /><input placeholder="Diastolic" value={form.diastolic} onChange={(e) => setForm({ ...form, diastolic: e.target.value })} /><input placeholder="Pulse" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} /><textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>;
}

function AnalyticsPage({ readings }: { readings: BloodPressureReading[] }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("DAYS_7");
  const data = calculateAnalytics(readings, period);
  return <section><h2>Analytics</h2><select value={period} onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}><option value="DAYS_7">7 days</option><option value="DAYS_30">30 days</option><option value="DAYS_90">90 days</option><option value="ALL">All</option></select><p>Average: {Math.round(data.averageSystolic)}/{Math.round(data.averageDiastolic)}</p><div className="chart"><ResponsiveContainer width="100%" height={220}><LineChart data={data.readings}><XAxis dataKey="measuredAt" hide /><YAxis /><Tooltip /><Line dataKey="systolic" stroke="#f87171" /><Line dataKey="diastolic" stroke="#60a5fa" /></LineChart></ResponsiveContainer></div><div className="chart"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={Object.entries(data.categoryDistribution).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" outerRadius={80} /></PieChart></ResponsiveContainer></div></section>;
}

function ExportPage({ readings }: { readings: BloodPressureReading[] }) {
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(readings, null, 2)], { type: "application/json" });
    downloadBlob(blob, "blood-pressure.json");
  };
  const exportCsv = () => {
    const csv = ["date,systolic,diastolic,pulse,note", ...readings.map((r) => `${r.measuredAt},${r.systolic},${r.diastolic},${r.pulse ?? ""},"${r.note ?? ""}"`)].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "blood-pressure.csv");
  };
  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(readings);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Readings");
    XLSX.writeFile(wb, "blood-pressure.xlsx");
  };
  return <section><h2>Export/Import</h2><button onClick={exportJson}>Export JSON</button><button onClick={exportCsv}>Export CSV</button><button onClick={exportXlsx}>Export XLSX</button><input type="file" accept=".json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const parsed = JSON.parse(await file.text()) as BloodPressureReading[]; for (const item of parsed) { await createReading({ systolic: item.systolic, diastolic: item.diastolic, pulse: item.pulse, measuredAt: item.measuredAt, note: item.note }); } window.location.reload(); }} /></section>;
}

function SettingsPage({ serverUrl, setServerUrl, strictValidation, setStrictValidation, onSync, session, setSession, api }: { serverUrl: string; setServerUrl: (v: string) => void; strictValidation: boolean; setStrictValidation: (v: boolean) => void; onSync: () => Promise<void>; session: SessionState; setSession: (s: SessionState) => void; api: ApiClient; }) {
  return <section><h2>Settings</h2><label>Server URL<input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} /></label><label><input type="checkbox" checked={strictValidation} onChange={(e) => setStrictValidation(e.target.checked)} />Validate fields on save</label><button onClick={onSync}>Sync now</button><button onClick={async () => { try { if (session.refreshToken) await api.logout({ refreshToken: session.refreshToken }); } finally { setSession({ accessToken: "", refreshToken: "", isLoggedIn: false, lastSyncAt: null, pendingDeletedServerIds: [] }); } }}>Logout</button></section>;
}

function downloadBlob(blob: Blob, fileName: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
