import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KALYX — AI Course Content Generator" },
      { name: "description", content: "Generate slides, notes and quizzes from any syllabus with KALYX." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  component: Kalyx,
});

const C = {
  bg: "#060D18",
  card: "#0F1C2E",
  inset: "#0A1628",
  border: "rgba(14, 165, 233, 0.12)",
  borderStrong: "rgba(14, 165, 233, 0.3)",
  blue: "#0EA5E9",
  indigo: "#6366F1",
  text: "#F0F6FF",
  muted: "#64748B",
  subtle: "#94A3B8",
  body: "#CBD5E1",
  green: "#22C55E",
  yellow: "#F59E0B",
  red: "#EF4444",
};

const FONT = "'Inter', system-ui, -apple-system, sans-serif";
const API_URL = "https://YOUR-REPLIT-URL/api/generate";

const BLOOM_STYLES: Record<string, { bg: string; fg: string }> = {
  Remember: { bg: "rgba(14,165,233,0.15)", fg: "#0EA5E9" },
  Understand: { bg: "rgba(34,197,94,0.15)", fg: "#22C55E" },
  Apply: { bg: "rgba(245,158,11,0.15)", fg: "#F59E0B" },
  Analyze: { bg: "rgba(139,92,246,0.15)", fg: "#8B5CF6" },
  Evaluate: { bg: "rgba(239,68,68,0.15)", fg: "#EF4444" },
  Create: { bg: "rgba(236,72,153,0.15)", fg: "#EC4899" },
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
    const steps = ["Extracting units from syllabus...", "Generating Unit 1 slides...", "Generating Unit 2 slides...", "Drafting detailed notes...", "Composing quiz questions...", "Finalizing course content..."];
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

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.text }}>
      <GlobalStyles />
      <Header />

      <div style={{ maxWidth: result ? 1100 : 720, margin: "0 auto", padding: "48px 24px" }}>
        {!result ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h1 style={{ fontSize: 40, fontWeight: 700, margin: 0, color: C.text, letterSpacing: "-0.02em" }}>
                Generate Course Content
              </h1>
              <div style={{ marginTop: 10, color: C.blue, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <BoltIcon /> Powered by Groq LLaMA3
              </div>
            </div>

            <div style={cardStyle()}>
              {loading ? (
                <LoadingPanel progress={progress} step={step} />
              ) : (
                <>
                  <textarea
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    placeholder="Paste your full course syllabus here. Include unit titles, topics, and any learning objectives..."
                    className="kx-textarea"
                    style={{
                      width: "100%", height: 240, padding: 20, fontSize: 15,
                      background: C.inset, color: C.text, fontFamily: FONT,
                      border: `1px solid ${C.border}`, borderRadius: 12, resize: "vertical",
                      outline: "none", boxSizing: "border-box", transition: "all 0.25s ease",
                    }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 18 }}>
                    <Select label="Tone" value={tone} onChange={setTone} options={["formal", "conversational", "socratic"]} />
                    <Select label="Depth" value={depth} onChange={setDepth} options={["basic", "intermediate", "advanced"]} />
                    <Select label="Difficulty" value={difficulty} onChange={setDifficulty} options={["easy", "medium", "hard"]} />
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={!syllabus.trim()}
                    className="kx-generate"
                    style={{
                      marginTop: 22, width: "100%", height: 52,
                      background: "linear-gradient(135deg, #0EA5E9, #6366F1)",
                      color: "#fff", fontSize: 16, fontWeight: 600, letterSpacing: "0.05em",
                      border: "none", borderRadius: 12,
                      cursor: !syllabus.trim() ? "not-allowed" : "pointer",
                      opacity: !syllabus.trim() ? 0.5 : 1,
                      position: "relative", overflow: "hidden",
                      transition: "all 0.25s ease",
                      fontFamily: FONT,
                    }}
                  >
                    Generate
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <Dashboard result={result} tab={tab} setTab={setTab} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}

function cardStyle(): React.CSSProperties {
  return {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 28,
    transition: "all 0.25s ease",
  };
}

function Header() {
  return (
    <header style={{ background: C.bg, borderBottom: "1px solid rgba(14,165,233,0.1)", position: "relative" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "0.04em", textShadow: "0 0 20px rgba(14,165,233,0.5)" }}>
            KALYX
          </div>
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 4 }}>
            AI Course Content Generator
          </div>
        </div>
        <div style={{ border: `1px solid ${C.borderStrong}`, color: C.blue, padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
          Debug Devils
        </div>
      </div>
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: -1, height: 2, overflow: "hidden",
      }}>
        <div className="kx-sweep" style={{
          height: "100%", width: "100%",
          background: "linear-gradient(90deg, transparent, #0EA5E9, #6366F1, transparent)",
        }} />
      </div>
    </header>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const chevron = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`;
  return (
    <div>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="kx-select"
        style={{
          width: "100%", background: C.inset, color: C.text,
          border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 36px 10px 16px",
          fontSize: 14, fontFamily: FONT, outline: "none",
          appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
          backgroundImage: chevron, backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          textTransform: "capitalize", transition: "all 0.25s ease", cursor: "pointer",
        }}
      >
        {options.map((o) => <option key={o} value={o} style={{ background: C.inset }}>{o}</option>)}
      </select>
    </div>
  );
}

function LoadingPanel({ progress, step }: { progress: number; step: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", gap: 20 }}>
      <div className="kx-spinner" style={{
        width: 48, height: 48, borderRadius: "50%",
        border: "3px solid rgba(14,165,233,0.2)", borderTopColor: C.blue,
      }} />
      <div style={{ fontSize: 15, color: C.text }}>{step}</div>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ background: C.inset, height: 6, borderRadius: 3, overflow: "hidden", position: "relative" }}>
          <div style={{
            width: `${progress}%`, height: "100%",
            background: "linear-gradient(90deg, #0EA5E9, #6366F1)",
            transition: "width 0.25s ease", position: "relative", overflow: "hidden",
          }}>
            <div className="kx-shimmer" style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            }} />
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.blue, textAlign: "right", fontWeight: 600 }}>
          {progress}%
        </div>
      </div>
    </div>
  );
}

function Dashboard({ result, tab, setTab, onBack }: { result: any; tab: "slides" | "notes" | "quiz"; setTab: (t: "slides" | "notes" | "quiz") => void; onBack: () => void }) {
  const overall = Math.round(
    BLOOM_LEVELS.reduce((a, l) => a + (result.bloom_coverage?.[l] ?? 0), 0) / BLOOM_LEVELS.length
  );
  return (
    <>
      <button
        onClick={onBack}
        style={{
          background: "transparent", border: `1px solid ${C.border}`, color: C.text,
          padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: FONT,
          transition: "all 0.25s ease",
        }}
      >
        ← Back
      </button>

      <h1 style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 700, marginTop: 20, marginBottom: 8, color: C.text, letterSpacing: "-0.02em" }}>
        <span className="kx-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: C.green, boxShadow: `0 0 12px ${C.green}` }} />
        {result.course}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 28 }}>
        <MetricCard icon={<SlidesIcon />} value={result.total_slides} label="Slides" />
        <MetricCard icon={<QuizIcon />} value={result.total_quiz} label="Quiz Questions" />
        <MetricCard icon={<NotesIcon />} value={result.notes?.length ?? 0} label="Notes" />
      </div>

      <BloomCoverage coverage={result.bloom_coverage || {}} overall={overall} />

      <div style={{ background: C.inset, borderRadius: 12, padding: 4, display: "flex", marginTop: 28 }}>
        {(["slides", "notes", "quiz"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: 10, borderRadius: 10, border: "none", fontSize: 14, fontWeight: 500,
              cursor: "pointer", textTransform: "capitalize", fontFamily: FONT,
              background: tab === t ? C.card : "transparent",
              color: tab === t ? C.text : C.muted,
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16, animation: "kxFade 0.3s ease" }}>
        {tab === "slides" && result.slides?.map((s: any, i: number) => <SlideCard key={i} slide={s} />)}
        {tab === "notes" && result.notes?.map((n: any, i: number) => <NoteCard key={i} note={n} />)}
        {tab === "quiz" && result.quiz?.map((q: any, i: number) => <QuizCard key={i} q={q} index={i} />)}
      </div>
    </>
  );
}

function MetricCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="kx-metric" style={{ ...cardStyle(), padding: "20px 24px" }}>
      <div style={{ color: C.blue, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{label}</div>
    </div>
  );
}

function BloomCoverage({ coverage, overall }: { coverage: Record<string, number>; overall: number }) {
  return (
    <div style={{ ...cardStyle(), marginTop: 20, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 16, fontWeight: 700 }}>Bloom's Taxonomy Coverage</h3>
        <span style={{ background: "rgba(14,165,233,0.15)", color: C.blue, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
          {overall}% avg
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {BLOOM_LEVELS.map((lvl) => {
          const pct = Math.max(0, Math.min(100, coverage[lvl] ?? 0));
          const color = pct >= 20 ? C.green : pct >= 10 ? C.yellow : C.red;
          return (
            <div key={lvl} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 110, color: C.subtle, fontSize: 13 }}>{lvl}</div>
              <div style={{ flex: 1, background: C.inset, height: 8, borderRadius: 4, overflow: "hidden" }}>
                <div className="kx-bar" style={{
                  width: `${pct}%`, height: "100%", background: color, borderRadius: 4,
                  transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                }} />
              </div>
              <div style={{ width: 50, textAlign: "right", fontSize: 13, color: C.text, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                {pct < 10 && <span style={{ color: C.red }}>⚠</span>}
                {pct}%
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
    <div style={{ ...cardStyle(), borderLeft: `3px solid ${C.blue}`, padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ background: "rgba(14,165,233,0.15)", color: C.blue, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
          SLIDE {slide.number}
        </span>
        {slide.unit && (
          <span style={{ background: "rgba(99,102,241,0.15)", color: C.indigo, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
            {slide.unit}
          </span>
        )}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginTop: 12 }}>{slide.title}</div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {(slide.bullets || []).map((b: string, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginLeft: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.blue, marginTop: 10, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: C.body, lineHeight: 1.8 }}>{b}</span>
          </div>
        ))}
      </div>
      {slide.takeaway && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: C.muted, fontStyle: "italic", display: "flex", alignItems: "center", gap: 8 }}>
          <BookmarkIcon /> {slide.takeaway}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: any }) {
  return (
    <div style={{ ...cardStyle(), borderLeft: `3px solid ${C.green}`, padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{note.title}</div>
        {note.unit && (
          <span style={{ background: "rgba(34,197,94,0.15)", color: C.green, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
            {note.unit}
          </span>
        )}
      </div>
      <Section label="Introduction" text={note.introduction} />
      <Section label="Explanation" text={note.explanation} />
      <Section label="Application" text={note.application} />
      {note.mistakes && (
        <div style={{ marginTop: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: C.yellow, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            ⚠ Common Mistakes
          </div>
          <div style={{ fontSize: 14, color: C.body }}>{note.mistakes}</div>
        </div>
      )}
      {note.summary && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: C.muted, fontStyle: "italic" }}>
          {note.summary}
        </div>
      )}
    </div>
  );
}

function Section({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: C.body, lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

function QuizCard({ q, index }: { q: any; index: number }) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const bloom = BLOOM_STYLES[q.bloom] || { bg: "rgba(100,116,139,0.15)", fg: C.muted };

  return (
    <div style={{ ...cardStyle(), padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Q{index + 1}</span>
        {q.bloom && (
          <span style={{ background: bloom.bg, color: bloom.fg, padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
            {q.bloom}
          </span>
        )}
      </div>
      <div style={{ fontSize: 16, color: C.text, marginTop: 12, lineHeight: 1.5 }}>{q.question}</div>

      {q.type === "mcq" && (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {q.options.map((opt: string, i: number) => {
            const isCorrect = revealed && i === q.answer;
            const isWrong = revealed && selected === i && i !== q.answer;
            const base: React.CSSProperties = {
              textAlign: "left", padding: "12px 16px", borderRadius: 10, fontSize: 14,
              fontFamily: FONT, cursor: revealed ? "default" : "pointer",
              border: "1px solid rgba(255,255,255,0.08)",
              background: C.inset, color: C.body, transition: "all 0.25s ease",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            };
            const correctStyle: React.CSSProperties = isCorrect ? {
              borderColor: C.green, background: "rgba(34,197,94,0.08)", color: C.green,
            } : {};
            const wrongStyle: React.CSSProperties = isWrong ? {
              borderColor: C.red, background: "rgba(239,68,68,0.08)", color: C.red,
            } : {};
            return (
              <button
                key={i}
                onClick={() => !revealed && setSelected(i)}
                className={revealed ? "" : "kx-option"}
                style={{ ...base, ...correctStyle, ...wrongStyle }}
              >
                <span>{String.fromCharCode(65 + i)}. {opt}</span>
                {isCorrect && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "truefalse" && revealed && (
        <div style={{ marginTop: 14, padding: 14, background: "rgba(34,197,94,0.08)", border: `1px solid rgba(34,197,94,0.25)`, color: C.green, borderRadius: 10, fontWeight: 600 }}>
          Answer: {q.answer}
        </div>
      )}

      {q.type === "short" && revealed && (
        <div style={{ marginTop: 14, padding: 14, background: "rgba(34,197,94,0.08)", border: `1px solid rgba(34,197,94,0.25)`, color: C.body, borderRadius: 10 }}>
          <strong style={{ color: C.green }}>Expected:</strong> {q.answer}
        </div>
      )}

      {q.type === "case" && (
        <div style={{ marginTop: 14, padding: 14, background: "rgba(14,165,233,0.08)", border: `1px solid rgba(14,165,233,0.25)`, color: C.body, borderRadius: 10 }}>
          {revealed ? <><strong style={{ color: C.blue }}>Model answer:</strong> {q.answer}</> : <em style={{ color: C.muted }}>Case study — reveal for a model answer.</em>}
        </div>
      )}

      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => setRevealed(true)}
          disabled={revealed}
          className="kx-reveal"
          style={{
            background: "transparent",
            border: `1px solid ${revealed ? "rgba(100,116,139,0.3)" : "rgba(14,165,233,0.3)"}`,
            color: revealed ? C.muted : C.blue,
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: revealed ? "default" : "pointer", fontFamily: FONT,
            transition: "all 0.25s ease",
          }}
        >
          {revealed ? "Answer revealed" : "Reveal Answer"}
        </button>
        {q.unit && <span style={{ fontSize: 11, color: "#475569" }}>{q.unit}</span>}
      </div>
    </div>
  );
}

/* Icons */
function BoltIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5h6L9 22l8.5-11.5h-6L13 2z" /></svg>;
}
function SlidesIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><line x1="8" y1="22" x2="16" y2="22" /><line x1="12" y1="18" x2="12" y2="22" /></svg>;
}
function QuizIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}
function NotesIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>;
}
function BookmarkIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
}

function GlobalStyles() {
  return (
    <style>{`
      html, body { background: ${C.bg}; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.3); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(14,165,233,0.5); }

      @keyframes kxFade { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: none; } }
      @keyframes kxSpin { to { transform: rotate(360deg); } }
      @keyframes kxPulse { 0%, 100% { opacity: 1; transform: scale(1);} 50% { opacity: 0.5; transform: scale(1.2);} }
      @keyframes kxShimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
      @keyframes kxSweep { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }

      .kx-spinner { animation: kxSpin 0.9s linear infinite; }
      .kx-pulse { animation: kxPulse 1.8s ease-in-out infinite; }
      .kx-shimmer { animation: kxShimmer 1.5s linear infinite; }
      .kx-sweep { animation: kxSweep 3s linear infinite; }

      .kx-textarea::placeholder { color: #334155; }
      .kx-textarea:focus {
        border-color: ${C.blue} !important;
        box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
      }
      .kx-select:hover { border-color: rgba(14,165,233,0.5) !important; }

      .kx-generate { position: relative; }
      .kx-generate::after {
        content: ""; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        transition: left 0.6s ease;
      }
      .kx-generate:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
      .kx-generate:hover:not(:disabled)::after { left: 130%; }
      .kx-generate:active:not(:disabled) { transform: translateY(0); }

      .kx-metric:hover { border-color: rgba(14,165,233,0.4) !important; transform: translateY(-2px); }
      .kx-option:hover { border-color: rgba(14,165,233,0.4) !important; background: rgba(14,165,233,0.05) !important; }
      .kx-reveal:hover:not(:disabled) { background: rgba(14,165,233,0.1) !important; }
    `}</style>
  );
}
