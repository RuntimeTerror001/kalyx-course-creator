import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KALYX — AI Course Content Generator" },
      { name: "description", content: "Generate slides, notes and quizzes from any syllabus with KALYX." },
    ],
  }),
  component: Kalyx,
});

const COLORS = {
  navy: "#0D1B2A",
  blue: "#0EA5E9",
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  grey: "#6b7280",
  lightGrey: "#f3f4f6",
  border: "#e5e7eb",
};

const API_URL = "https://YOUR-REPLIT-URL/api/generate";

const BLOOM_COLORS: Record<string, string> = {
  Remember: "#3b82f6",
  Understand: "#22c55e",
  Apply: "#f59e0b",
  Analyze: "#a855f7",
  Evaluate: "#ef4444",
  Create: "#ec4899",
};

const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

function mockGenerate(syllabus: string) {
  const course = syllabus.split("\n")[0]?.trim().slice(0, 80) || "Sample Course";
  const slides = Array.from({ length: 6 }).map((_, i) => ({
    unit: `Unit ${Math.floor(i / 2) + 1}`,
    number: i + 1,
    title: `Topic ${i + 1}: Core Concepts`,
    bullets: [
      "Introduction to the foundational principles",
      "Historical background and motivation",
      "Key definitions and terminology",
      "Worked example demonstrating concept",
      "Common pitfalls to avoid",
      "Connection to next topic",
    ],
    takeaway: "Mastering this concept unlocks the next module.",
  }));
  const notes = Array.from({ length: 4 }).map((_, i) => ({
    unit: `Unit ${i + 1}`,
    title: `Detailed Notes — Topic ${i + 1}`,
    introduction: "This topic introduces the learner to the field and its goals.",
    explanation: "We break the topic into digestible parts, examining each in detail with examples.",
    application: "Applied in real-world systems such as recommendation engines and forecasting.",
    mistakes: "Confusing correlation with causation; ignoring data quality.",
    summary: "Solid grasp here is essential for upcoming units.",
  }));
  const quiz = [
    { type: "mcq", unit: "Unit 1", bloom: "Remember", question: "Which is a key term introduced in Unit 1?", options: ["Heuristic", "Gradient", "Token", "Schema"], answer: 0 },
    { type: "mcq", unit: "Unit 1", bloom: "Understand", question: "Why is normalization important?", options: ["Speed", "Stability", "Aesthetics", "Bandwidth"], answer: 1 },
    { type: "truefalse", unit: "Unit 2", bloom: "Apply", question: "Bias-variance tradeoff is irrelevant for deep nets.", answer: "False" },
    { type: "short", unit: "Unit 2", bloom: "Analyze", question: "Compare batch vs online learning in one sentence.", answer: "Batch trains on full datasets; online updates per sample." },
    { type: "case", unit: "Unit 3", bloom: "Evaluate", question: "A model overfits training data. Evaluate three remediation strategies.", answer: "Regularization, more data, simpler architecture." },
    { type: "mcq", unit: "Unit 3", bloom: "Create", question: "Design a feature for churn prediction.", options: ["Tenure_months", "RandomID", "RowNumber", "Timestamp"], answer: 0 },
  ];
  return {
    course,
    total_slides: slides.length,
    total_quiz: quiz.length,
    slides,
    notes,
    quiz,
    bloom_coverage: { Remember: 25, Understand: 22, Apply: 18, Analyze: 15, Evaluate: 12, Create: 8 },
  };
}

function Kalyx() {
  const [syllabus, setSyllabus] = useState("");
  const [tone, setTone] = useState("formal");
  const [depth, setDepth] = useState("intermediate");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<any>(null);
  const [tab, setTab] = useState<"slides" | "notes" | "quiz">("slides");
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!loading) return;
    const steps = ["Parsing syllabus...", "Generating Unit 1 slides...", "Generating Unit 2 slides...", "Drafting notes...", "Composing quiz...", "Finalizing..."];
    let p = 0;
    let i = 0;
    setStep(steps[0]);
    intervalRef.current = setInterval(() => {
      p = Math.min(p + 4, 95);
      setProgress(p);
      const idx = Math.min(Math.floor(p / 16), steps.length - 1);
      if (idx !== i) {
        i = idx;
        setStep(steps[idx]);
      }
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [loading]);

  const handleGenerate = async () => {
    if (!syllabus.trim()) return;
    setLoading(true);
    setProgress(0);
    try {
      const res = await axios.post(API_URL, { syllabus_text: syllabus, tone, depth, difficulty }, { timeout: 30000 });
      setResult(res.data);
    } catch {
      // Fallback to mock so the UI is usable without a backend
      await new Promise((r) => setTimeout(r, 1200));
      setResult(mockGenerate(syllabus));
    } finally {
      setProgress(100);
      setStep("Done");
      setTimeout(() => setLoading(false), 300);
    }
  };

  const handleBack = () => {
    setResult(null);
    setTab("slides");
    setProgress(0);
  };

  if (!result) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <Header />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 10px 30px rgba(13,27,42,0.08)", padding: 32 }}>
            <h2 style={{ margin: 0, color: COLORS.navy, fontSize: 24 }}>Paste Your Syllabus</h2>
            <textarea
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="Paste your full course syllabus here. Include unit titles, topics, and any learning objectives..."
              style={{
                marginTop: 16, width: "100%", height: 220, padding: 16, fontSize: 15,
                border: `1px solid ${COLORS.border}`, borderRadius: 8, resize: "vertical",
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
              <Select label="Tone" value={tone} onChange={setTone} options={["formal", "conversational", "socratic"]} />
              <Select label="Depth" value={depth} onChange={setDepth} options={["basic", "intermediate", "advanced"]} />
              <Select label="Difficulty" value={difficulty} onChange={setDifficulty} options={["easy", "medium", "hard"]} />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !syllabus.trim()}
              style={{
                marginTop: 24, width: "100%", padding: "16px 24px", fontSize: 17, fontWeight: 600,
                background: loading || !syllabus.trim() ? "#94a3b8" : COLORS.blue, color: "#fff",
                border: "none", borderRadius: 10, cursor: loading || !syllabus.trim() ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
            {loading && (
              <div style={{ marginTop: 20 }}>
                <div style={{ height: 10, background: COLORS.lightGrey, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: COLORS.blue, transition: "width 0.2s" }} />
                </div>
                <div style={{ marginTop: 8, color: COLORS.grey, fontSize: 14 }}>{step}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Header />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        <button
          onClick={handleBack}
          style={{ background: "transparent", border: `1px solid ${COLORS.border}`, padding: "8px 14px", borderRadius: 8, cursor: "pointer", color: COLORS.navy, fontSize: 14 }}
        >
          ← Back
        </button>
        <h1 style={{ color: COLORS.navy, marginTop: 16, fontSize: 34 }}>{result.course}</h1>
        <div style={{ display: "flex", gap: 24, color: COLORS.grey, fontSize: 15, marginTop: 4 }}>
          <span><strong style={{ color: COLORS.navy }}>{result.total_slides}</strong> slides</span>
          <span><strong style={{ color: COLORS.navy }}>{result.total_quiz}</strong> questions</span>
          <span><strong style={{ color: COLORS.navy }}>{result.notes?.length ?? 0}</strong> notes</span>
        </div>

        <BloomCoverage coverage={result.bloom_coverage || {}} />

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {(["slides", "notes", "quiz"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "10px 22px", border: "none", borderRadius: 8, cursor: "pointer",
                fontWeight: 600, fontSize: 14, textTransform: "capitalize",
                background: tab === t ? COLORS.blue : "#e5e7eb",
                color: tab === t ? "#fff" : "#475569",
                transition: "all 0.2s",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
          {tab === "slides" && result.slides?.map((s: any, i: number) => <SlideCard key={i} slide={s} />)}
          {tab === "notes" && result.notes?.map((n: any, i: number) => <NoteCard key={i} note={n} />)}
          {tab === "quiz" && result.quiz?.map((q: any, i: number) => <QuizCard key={i} q={q} index={i} />)}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: none; } }
        @keyframes growBar { from { width: 0; } }
      `}</style>
    </div>
  );
}

function Header() {
  return (
    <div style={{ background: COLORS.navy, padding: "28px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ color: COLORS.blue, fontSize: 32, margin: 0, letterSpacing: 1, fontWeight: 800 }}>KALYX</h1>
        <div style={{ color: "#cbd5e1", marginTop: 4, fontSize: 14 }}>AI Course Content Generator — Debug Devils</div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label style={{ display: "block", fontSize: 13, color: COLORS.grey, fontWeight: 600 }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          marginTop: 6, width: "100%", padding: "10px 12px", fontSize: 14,
          border: `1px solid ${COLORS.border}`, borderRadius: 8, background: "#fff",
          color: COLORS.navy, textTransform: "capitalize", outline: "none",
        }}
      >
        {options.map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
    </label>
  );
}

function BloomCoverage({ coverage }: { coverage: Record<string, number> }) {
  return (
    <div style={{ background: COLORS.navy, borderRadius: 12, padding: 24, marginTop: 24 }}>
      <h3 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Bloom's Taxonomy Coverage</h3>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {BLOOM_LEVELS.map((lvl) => {
          const pct = Math.max(0, Math.min(100, coverage[lvl] ?? 0));
          const color = pct >= 20 ? COLORS.green : pct >= 10 ? COLORS.yellow : COLORS.red;
          return (
            <div key={lvl}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0", fontSize: 13, marginBottom: 4 }}>
                <span>{lvl} {pct < 10 && <span>⚠️</span>}</span>
                <span>{pct}%</span>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, animation: "growBar 0.9s ease-out" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlideCard({ slide }: { slide: any }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, borderLeft: `5px solid ${COLORS.blue}`, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "relative" }}>
      {slide.unit && <Badge color={COLORS.blue} text={slide.unit} />}
      <div style={{ color: COLORS.navy, fontWeight: 700, fontSize: 18 }}>
        Slide {slide.number}: {slide.title}
      </div>
      <ul style={{ marginTop: 10, paddingLeft: 20, color: "#334155", lineHeight: 1.7 }}>
        {(slide.bullets || []).map((b: string, i: number) => <li key={i}>{b}</li>)}
      </ul>
      {slide.takeaway && (
        <div style={{ marginTop: 12, fontStyle: "italic", color: COLORS.grey, fontSize: 14 }}>
          Key takeaway: {slide.takeaway}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: any }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, borderLeft: `5px solid ${COLORS.green}`, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "relative" }}>
      {note.unit && <Badge color={COLORS.green} text={note.unit} />}
      <div style={{ color: COLORS.navy, fontWeight: 700, fontSize: 18 }}>{note.title}</div>
      <Para label="Introduction" text={note.introduction} />
      <Para label="Explanation" text={note.explanation} />
      <Para label="Application" text={note.application} />
      {note.mistakes && (
        <div style={{ marginTop: 12, background: "#fef3c7", border: "1px solid #fde68a", padding: 12, borderRadius: 8, color: "#78350f", fontSize: 14 }}>
          <strong>Common mistakes:</strong> {note.mistakes}
        </div>
      )}
      {note.summary && <div style={{ marginTop: 10, color: COLORS.grey, fontSize: 14 }}>{note.summary}</div>}
    </div>
  );
}

function Para({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.6, fontSize: 15 }}>
      <strong style={{ color: COLORS.navy }}>{label}: </strong>{text}
    </div>
  );
}

function QuizCard({ q, index }: { q: any; index: number }) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const bloomColor = BLOOM_COLORS[q.bloom] || COLORS.grey;

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "relative" }}>
      {q.bloom && <Badge color={bloomColor} text={q.bloom} />}
      <div style={{ color: COLORS.navy, fontWeight: 700, fontSize: 16, paddingRight: 100 }}>
        Q{index + 1}. {q.question}
      </div>

      {q.type === "mcq" && (
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {q.options.map((opt: string, i: number) => {
            const isCorrect = revealed && i === q.answer;
            const isWrongChoice = revealed && selected === i && i !== q.answer;
            return (
              <button
                key={i}
                onClick={() => !revealed && setSelected(i)}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 8, cursor: revealed ? "default" : "pointer",
                  border: `1px solid ${isCorrect ? COLORS.green : isWrongChoice ? COLORS.red : COLORS.border}`,
                  background: isCorrect ? "#dcfce7" : isWrongChoice ? "#fee2e2" : selected === i ? "#eff6ff" : "#fff",
                  color: COLORS.navy, fontSize: 14,
                }}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "truefalse" && revealed && (
        <div style={{ marginTop: 14, padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600 }}>
          Answer: {q.answer}
        </div>
      )}

      {q.type === "short" && revealed && (
        <div style={{ marginTop: 14, padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8 }}>
          <strong>Expected:</strong> {q.answer}
        </div>
      )}

      {q.type === "case" && (
        <div style={{ marginTop: 14, padding: 14, background: "#eff6ff", border: `1px solid #bae6fd`, borderRadius: 8, color: "#0c4a6e" }}>
          {revealed ? <><strong>Model answer:</strong> {q.answer}</> : <em>Case study — reveal for a model answer.</em>}
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => setRevealed(true)}
          disabled={revealed}
          style={{
            padding: "8px 16px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: revealed ? "#e5e7eb" : COLORS.blue, color: revealed ? COLORS.grey : "#fff",
            cursor: revealed ? "default" : "pointer",
          }}
        >
          {revealed ? "Answer revealed" : "Reveal Answer"}
        </button>
        {q.unit && <span style={{ fontSize: 12, color: COLORS.grey }}>{q.unit}</span>}
      </div>
    </div>
  );
}

function Badge({ color, text }: { color: string; text: string }) {
  return (
    <span style={{
      position: "absolute", top: 16, right: 16, background: color, color: "#fff",
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5,
    }}>{text}</span>
  );
}
