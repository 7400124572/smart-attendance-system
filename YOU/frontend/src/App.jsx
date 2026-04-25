import React, { useEffect, useMemo, useState } from "react";
import { apiFetch, clearStoredAuth, getStoredAuth, setStoredAuth } from "./api.js";

function Field({ label, value, setValue, type = "text", placeholder = "" }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__control"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );
}

function SelectField({ label, value, setValue, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="field__control" value={value} onChange={(e) => setValue(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

function Button({ children, onClick, disabled, variant = "primary", fullWidth = false }) {
  return (
    <button
      className={`button button--${variant}${fullWidth ? " button--full" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function StatusBanner({ tone = "info", children }) {
  if (!children) return null;
  return <div className={`status-banner status-banner--${tone}`}>{children}</div>;
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-state__title">{title}</div>
      <div className="empty-state__text">{text}</div>
    </div>
  );
}

function Countdown({ expiresAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  if (!expiresAt) return null;
  const remainingMs = Math.max(new Date(expiresAt).getTime() - now, 0);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  return (
    <div className="countdown">
      <span className="countdown__label">Time left</span>
      <span className="countdown__value">
        {m}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}

function AuthPanel({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("teacher");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const payload =
        mode === "register"
          ? { name, email, password, role }
          : { email, password, role };
      const data = await apiFetch(mode === "register" ? "/register" : "/login", {
        method: "POST",
        body: payload,
      });
      setStoredAuth(data);
      onAuthed(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="hero-card">
        <div className="hero-card__badge">Campus Ready</div>
        <h1>Attendance that feels modern, fast, and easy to use.</h1>
        <p>
          Manage live attendance, pulse checks, and class participation from one clean dashboard
          built for daily student use.
        </p>
        <div className="hero-points">
          <div className="hero-point">
            <strong>Instant join codes</strong>
            <span>No confusion at the start of class.</span>
          </div>
          <div className="hero-point">
            <strong>Live poll moments</strong>
            <span>Keep lectures interactive and responsive.</span>
          </div>
          <div className="hero-point">
            <strong>Student-friendly flow</strong>
            <span>Clear screens, fewer clicks, better focus.</span>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Smart Attendance</div>
            <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          </div>
          <div className="segmented-control">
            <button
              className={mode === "login" ? "is-active" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === "register" ? "is-active" : ""}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>
        </div>

        <SelectField label="Role" value={role} setValue={setRole}>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </SelectField>

        {mode === "register" && (
          <Field label="Name" value={name} setValue={setName} placeholder="Your full name" />
        )}
        <Field label="Email" value={email} setValue={setEmail} placeholder="you@college.edu" />
        <Field
          label="Password"
          value={password}
          setValue={setPassword}
          type="password"
          placeholder="Enter your password"
        />

        <Button onClick={submit} disabled={loading} fullWidth>
          {loading ? "Please wait..." : mode === "register" ? "Create account" : "Login"}
        </Button>

        <StatusBanner tone="error">{error}</StatusBanner>
      </section>
    </div>
  );
}

function TeacherDashboard({ auth }) {
  const token = auth.token;
  const [durationMinutes, setDurationMinutes] = useState("3");
  const [session, setSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollType, setPollType] = useState("mcq");
  const [pollOptions, setPollOptions] = useState("A,B,C");
  const [polls, setPolls] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState("");
  const [pollResults, setPollResults] = useState(null);
  const [error, setError] = useState("");

  async function createSession() {
    setError("");
    try {
      const data = await apiFetch("/session/create", {
        token,
        method: "POST",
        body: { durationMinutes: Number(durationMinutes || 3) },
      });
      setSession(data.session);
      setAttendance([]);
      setAnalytics(null);
      setPolls([]);
      setPollResults(null);
      setSelectedPollId("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!session?.id) return;
    let stop = false;
    async function refresh() {
      try {
        const s = await apiFetch(`/session/${session.id}`, { token });
        if (stop) return;
        setAttendance(s.session.presentStudents || []);
      } catch {
        // ignore
      }
      try {
        const a = await apiFetch(`/session/${session.id}/analytics`, { token });
        if (stop) return;
        setAnalytics(a.analytics);
      } catch {
        // ignore
      }
      try {
        const p = await apiFetch(`/poll/session/${session.id}`, { token });
        if (stop) return;
        setPolls(p.polls || []);
      } catch {
        // ignore
      }
    }
    refresh();
    const t = setInterval(refresh, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [session?.id, token]);

  async function createPoll() {
    setError("");
    try {
      if (!session?.id) throw new Error("Create a session first");
      const options =
        pollType === "yesno"
          ? undefined
          : pollOptions
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
      await apiFetch("/poll/create", {
        token,
        method: "POST",
        body: {
          sessionId: session.id,
          question: pollQuestion,
          options,
          type: pollType === "yesno" ? "yesno" : "mcq",
        },
      });
      setPollQuestion("");
      setPollResults(null);
      setSelectedPollId("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadResults() {
    setError("");
    try {
      if (!selectedPollId) return;
      const r = await apiFetch(`/poll/${selectedPollId}/results`, { token });
      setPollResults(r.results);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="dashboard-grid">
      <section className="card card--hero">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Teacher Studio</div>
            <h2>Run attendance and engagement from one place.</h2>
          </div>
        </div>
        <StatusBanner tone="error">{error}</StatusBanner>
        <div className="session-bar">
          <Field
            label="Duration (minutes)"
            value={durationMinutes}
            setValue={setDurationMinutes}
            placeholder="3"
          />
          <Button onClick={createSession}>Generate Code</Button>
        </div>
        {session ? (
          <div className="session-code-card">
            <div>
              <div className="field__label">Active attendance code</div>
              <div className="session-code">{session.code}</div>
            </div>
            <Countdown expiresAt={session.expiresAt} />
          </div>
        ) : (
          <EmptyState
            title="No active session yet"
            text="Start a session to unlock the live attendance board and poll tools."
          />
        )}
      </section>

      <section className="card metrics-card">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Class Snapshot</div>
            <h3>Attendance analytics</h3>
          </div>
        </div>
        {!session ? (
          <EmptyState title="Waiting for a session" text="Create a session to see class stats." />
        ) : !analytics ? (
          <EmptyState title="Loading analytics" text="Pulling the latest classroom numbers." />
        ) : (
          <div className="metric-grid">
            <div className="metric">
              <span>Total</span>
              <strong>{analytics.totalStudents}</strong>
            </div>
            <div className="metric">
              <span>Present</span>
              <strong>{analytics.presentStudents}</strong>
            </div>
            <div className="metric">
              <span>Absent</span>
              <strong>{analytics.absentStudents}</strong>
            </div>
            <div className="metric">
              <span>Attendance</span>
              <strong>{analytics.attendancePercentage}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Live Room</div>
            <h3>Students checked in</h3>
          </div>
        </div>
        {!session ? (
          <EmptyState title="No live room yet" text="Students will appear here after joining with the code." />
        ) : attendance.length ? (
          <ul className="list">
            {attendance.map((s) => (
              <li key={s._id} className="list-row">
                <div className="avatar-chip">{(s.name || "?").slice(0, 1).toUpperCase()}</div>
                <div>
                  <strong>{s.name}</strong>
                  <div className="muted">{s.email}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No students yet" text="Share the code and watch the roster fill live." />
        )}
      </section>

      <section className="card">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Pulse Check</div>
            <h3>Create a poll</h3>
          </div>
        </div>
        <Field
          label="Question"
          value={pollQuestion}
          setValue={setPollQuestion}
          placeholder="How confident are you with today's topic?"
        />
        <SelectField label="Type" value={pollType} setValue={setPollType}>
          <option value="mcq">MCQ</option>
          <option value="yesno">Yes/No</option>
        </SelectField>
        {pollType === "mcq" && (
          <Field
            label="Options (comma separated)"
            value={pollOptions}
            setValue={setPollOptions}
            placeholder="Very clear, Need recap, Still confused"
          />
        )}
        <Button onClick={createPoll}>Create Poll</Button>
      </section>

      <section className="card card--wide">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Insights</div>
            <h3>Poll results</h3>
          </div>
        </div>
        {!session ? (
          <EmptyState title="Create a session first" text="Polls become available after you start a class session." />
        ) : polls.length === 0 ? (
          <EmptyState title="No active polls" text="Create a poll to start gathering responses." />
        ) : (
          <div className="stack">
            <SelectField label="Choose poll" value={selectedPollId} setValue={setSelectedPollId}>
              <option value="">Select poll...</option>
              {polls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.question}
                </option>
              ))}
            </SelectField>
            <Button onClick={loadResults} disabled={!selectedPollId} variant="secondary">
              View Results
            </Button>
            {pollResults && (
              <div className="results-card">
                <div className="results-card__header">
                  <strong>{pollResults.question}</strong>
                  <span>{pollResults.totalResponses} responses</span>
                </div>
                <div className="results-bars">
                  {pollResults.options.map((opt) => {
                    const count = pollResults.counts[opt] ?? 0;
                    const percentage =
                      pollResults.totalResponses > 0
                        ? Math.round((count / pollResults.totalResponses) * 100)
                        : 0;
                    return (
                      <div key={opt} className="result-row">
                        <div className="result-row__top">
                          <span>{opt}</span>
                          <span>
                            {count} votes • {percentage}%
                          </span>
                        </div>
                        <div className="result-bar">
                          <div className="result-bar__fill" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StudentDashboard({ auth }) {
  const token = auth.token;
  const [code, setCode] = useState("");
  const [joinedSession, setJoinedSession] = useState(null);
  const [polls, setPolls] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function join() {
    setError("");
    setMessage("");
    try {
      const data = await apiFetch("/session/join", { token, method: "POST", body: { code } });
      setJoinedSession(data.session);
      setMessage("Attendance marked.");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    let stop = false;
    async function refreshHistory() {
      try {
        const h = await apiFetch("/student/attendance", { token });
        if (!stop) setHistory(h.history || []);
      } catch {
        // ignore
      }
    }
    refreshHistory();
    const t = setInterval(refreshHistory, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [token]);

  useEffect(() => {
    if (!joinedSession?.id) return;
    let stop = false;
    async function refreshPolls() {
      try {
        const p = await apiFetch(`/poll/session/${joinedSession.id}`, { token });
        if (!stop) setPolls(p.polls || []);
      } catch {
        // ignore
      }
    }
    refreshPolls();
    const t = setInterval(refreshPolls, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [joinedSession?.id, token]);

  async function answer(pollId) {
    setError("");
    setMessage("");
    try {
      const selected = selectedAnswers[pollId];
      if (!selected) throw new Error("Select an option first");
      await apiFetch("/poll/answer", { token, method: "POST", body: { pollId, selected } });
      setMessage("Answer submitted.");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="dashboard-grid">
      <section className="card card--hero">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Student Space</div>
            <h2>Check in fast and stay synced with your class.</h2>
          </div>
        </div>
        <StatusBanner tone="error">{error}</StatusBanner>
        <StatusBanner tone="success">{message}</StatusBanner>
        <div className="join-card">
          <Field
            label="Attendance Code"
            value={code}
            setValue={setCode}
            placeholder="Enter the code from your teacher"
          />
          <Button onClick={join}>Submit Code</Button>
        </div>
        {joinedSession ? (
          <div className="session-code-card">
            <div>
              <div className="field__label">Joined session</div>
              <div className="session-code session-code--small">{joinedSession.code}</div>
            </div>
            <Countdown expiresAt={joinedSession.expiresAt} />
          </div>
        ) : (
          <EmptyState
            title="Waiting for your class code"
            text="Join once and your live polls will appear automatically."
          />
        )}
      </section>

      <section className="card card--wide">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Live Polls</div>
            <h3>Answer class questions in real time</h3>
          </div>
        </div>
        {!joinedSession ? (
          <EmptyState title="Join a session first" text="Your teacher's live polls will show up here." />
        ) : polls.length === 0 ? (
          <EmptyState title="No active polls right now" text="You're all caught up for the moment." />
        ) : (
          <div className="poll-grid">
            {polls.map((p) => (
              <div key={p.id} className="poll-card">
                <div className="poll-card__question">{p.question}</div>
                <select
                  className="field__control"
                  value={selectedAnswers[p.id] || ""}
                  onChange={(e) => setSelectedAnswers((prev) => ({ ...prev, [p.id]: e.target.value }))}
                >
                  <option value="">Select option...</option>
                  {p.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <Button onClick={() => answer(p.id)} variant="secondary">
                  Submit Answer
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card card--wide">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Attendance Log</div>
            <h3>Your recent check-ins</h3>
          </div>
        </div>
        {history.length === 0 ? (
          <EmptyState title="No records yet" text="Your past attendance sessions will appear here." />
        ) : (
          <ul className="list">
            {history.map((s) => (
              <li key={s.id} className="list-row list-row--space">
                <div>
                  <strong>{new Date(s.createdAt).toLocaleString()}</strong>
                  <div className="muted">Attendance marked successfully</div>
                </div>
                <span className="pill">{s.code}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const user = useMemo(() => auth?.user || null, [auth]);

  function logout() {
    clearStoredAuth();
    setAuth(null);
  }

  if (!auth?.token || !user) {
    return (
      <div className="app-shell">
        <AuthPanel onAuthed={setAuth} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <div>
            <div className="eyebrow">Smart Attendance</div>
            <h1>{user.role === "teacher" ? "Teaching Dashboard" : "Student Dashboard"}</h1>
            <p className="topbar__subtitle">
              Logged in as <strong>{user.name}</strong> ({user.role})
            </p>
          </div>
          <Button onClick={logout} variant="ghost">
            Logout
          </Button>
        </header>

        {user.role === "teacher" ? <TeacherDashboard auth={auth} /> : <StudentDashboard auth={auth} />}
      </div>
    </div>
  );
}
