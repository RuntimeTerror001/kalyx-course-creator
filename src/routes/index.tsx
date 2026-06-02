import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
    ],
  }),
  component: Kalyx,
});

const C = {
  bg: "#050B18",
  bg2: "#070F1F",
  card: "#0F1C2E",
  inset: "#060D18",
  border: "rgba(14, 165, 233, 0.15)",
  borderStrong: "rgba(14, 165, 233, 0.35)",
  blue: "#0EA5E9",
  indigo: "#6366F1",
  purple: "#8B5CF6",
  pink: "#EC4899",
  emerald: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  text: "#F0F6FF",
  muted: "#64748B",
  subtle: "#94A3B8",
  body: "#CBD5E1",
};

const FONT = "'Inter', system-ui, -apple-system, sans-serif";
let envBase = import.meta.env.VITE_API_BASE as string | undefined;
let envUrl = import.meta.env.VITE_API_URL as string | undefined;

if (envBase) envBase = envBase.replace(/\/$/, "");
if (envUrl) envUrl = envUrl.replace(/\/$/, "");

let resolvedUrl = envUrl;
if (resolvedUrl && !resolvedUrl.endsWith("/api/generate")) {
  resolvedUrl = `${resolvedUrl}/api/generate`;
}

let resolvedBase = envBase;
if (!resolvedBase) {
  if (resolvedUrl) {
    resolvedBase = resolvedUrl.replace(/\/api\/generate$/, "");
  } else {
    resolvedBase = typeof window !== "undefined" ? "" : "http://127.0.0.1:8765";
  }
}

const API_BASE = resolvedBase;
const API_URL = resolvedUrl || `${API_BASE}/api/generate`;

function estimateTopics(syllabus: string): number {
  const unitMatches = syllabus.match(/\bunit\s*[\dIVX]+/gi);
  const units = unitMatches?.length ?? 0;
  if (units > 0) return Math.min(15, units * 3);
  const lines = syllabus.split("\n").filter((l) => l.trim().length > 10);
  return Math.min(15, Math.max(3, Math.ceil(lines.length / 4) || 6));
}

function groupSlidesByTopic(slides: any[]): [string, any[]][] {
  const groups: Record<string, any[]> = {};
  for (const s of slides) {
    const key = s.topic || s.unit || "General";
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.entries(groups);
}

function groupQuizByUnit(quiz: any[]): [string, any[]][] {
  const groups: Record<string, any[]> = {};
  for (const q of quiz) {
    const key = q.unit || "General";
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  }
  return Object.entries(groups);
}

function normalizeQuizAnswer(q: any): number {
  if (typeof q.answer === "number") return q.answer;
  if (typeof q.answer === "string" && Array.isArray(q.options)) {
    const idx = q.options.findIndex(
      (o: string) => o.trim().toLowerCase() === q.answer.trim().toLowerCase(),
    );
    if (idx >= 0) return idx;
    const letter = q.answer.trim().toUpperCase();
    const letterIdx = letter.charCodeAt(0) - 65;
    if (letterIdx >= 0 && letterIdx < q.options.length) return letterIdx;
  }
  return 0;
}

function quizBloom(q: any): string {
  return q.bloom_level || q.bloom || "";
}

function quizType(q: any): string {
  return (q.type || "mcq").toLowerCase();
}

const GRAD_PRIMARY = "linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)";
const GRAD_SECONDARY = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
const GRAD_EMERALD = "linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)";
const GRAD_AMBER = "linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)";
const GRAD_TEXT = "linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 50%, #EC4899 100%)";

const BLOOM_COLORS: Record<string, string> = {
  Remember: "#0EA5E9",
  Understand: "#6366F1",
  Apply: "#8B5CF6",
  Analyze: "#EC4899",
  Evaluate: "#F59E0B",
  Create: "#10B981",
};

const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

const FUN_FACTS = [
  "Did you know? Bloom's Taxonomy has 6 cognitive levels.",
  "Tip: Active recall outperforms re-reading by 50%.",
  "Fact: Spaced repetition cuts memory loss by 80%.",
  "Tip: Teaching others is the fastest way to learn.",
  "Fact: Visual learners retain 65% more from diagrams.",
];

function mockGenerate(syllabus: string) {
  const course = syllabus.split("\n")[0]?.trim().slice(0, 80) || "Sample Course";
  const topics = ["Fundamentals", "Core Concepts", "Advanced Applications"];
  const unitTitle = "Unit 1";
  const longBullet =
    "This bullet explains the concept in depth with context, technical detail, and a connection to real world practice that students can apply immediately in projects.";
  const slides = topics.flatMap((topic, ti) =>
    Array.from({ length: 4 }).map((_, i) => ({
      slide_number: ti * 4 + i + 1,
      unit: unitTitle,
      topic,
      title: `${topic}: Detailed Slide ${i + 1}`,
      bullets: Array.from({ length: 8 }).map((_, bi) => `${longBullet} (point ${bi + 1})`),
      real_world_example: "A major tech company deployed this pattern to reduce latency by forty percent in production.",
      key_takeaway: "Understanding this slide's theme is essential before moving to applied scenarios.",
    })),
  );
  const notes = topics.map((topic) => ({
    topic,
    unit: unitTitle,
    introduction:
      "This topic opens the unit with motivation and scope. Students learn why the field matters in industry and academia. We connect prior knowledge to new material. The introduction sets expectations for depth and assessment. By the end, learners can articulate goals clearly.",
    core_concepts:
      "Core ideas are defined with precision and illustrated through worked examples. Each concept links to prerequisites students already know. We compare similar terms to prevent confusion. Diagrams are described verbally for accessibility. Examples span small classroom cases and larger systems. Terminology is used consistently throughout. Misconceptions are flagged early. Students practice identifying structures in novel prompts.",
    deep_explanation:
      "Advanced nuance covers edge cases practitioners encounter in production. We discuss tradeoffs between common approaches with quantitative intuition. Failure modes and debugging strategies are emphasized. Comparisons to alternative paradigms clarify when not to use this method. Security and ethics appear where relevant. Performance considerations include asymptotic and constant factors. Tooling choices reflect realistic team constraints. Experts' heuristics are made explicit for study.",
    real_world_application:
      "Industry teams use these ideas in recommendation, forecasting, and operations pipelines. Startups prototype quickly by reusing patterns from mature frameworks. Regulated domains document decisions for audit trails. Open source ecosystems provide reference implementations to study. Capstone projects mirror constrained timelines and incomplete data.",
    common_mistakes:
      "Students often confuse correlation with causation when interpreting results. They skip data validation and discover issues only at deployment. Another mistake is memorizing formulas without understanding assumptions. Teams also underestimate communication overhead in cross functional work.",
    exam_tips:
      "Examiners favor precise definitions followed by short applied scenarios. Show assumptions before calculations. Label diagrams clearly when sketched.",
    summary:
      "The topic integrates theory and practice. Master the vocabulary and one worked pipeline end to end. Review mistakes list before assessments.",
  }));
  const bloomSeq = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"] as const;
  const quiz = Array.from({ length: 12 }).map((_, i) => {
    const bloom = bloomSeq[i % bloomSeq.length];
    const options = ["First plausible option with detail", "Second plausible option with detail", "Third plausible option with detail", "Fourth plausible option with detail"];
    return {
      question_number: i + 1,
      type: "MCQ",
      unit: unitTitle,
      topic: topics[i % topics.length],
      bloom_level: bloom,
      question: `In the context of ${topics[i % topics.length]}, which statement best reflects the principle described in advanced study materials and lecture content? (Q${i + 1})`,
      options,
      answer: options[0],
      explanation:
        "Option A is correct because it aligns with the definition and applied scenarios discussed in class. The other options confuse related but distinct concepts or omit key constraints mentioned in the unit outcomes and worked examples.",
    };
  });
  const total = quiz.length;
  const bloom_coverage = Object.fromEntries(
    BLOOM_LEVELS.map((lvl) => [
      lvl,
      Math.round((quiz.filter((q) => q.bloom_level === lvl).length / total) * 100),
    ]),
  );
  return {
    course,
    total_slides: slides.length,
    total_quiz: quiz.length,
    total_notes: notes.length,
    slides,
    notes,
    quiz,
    bloom_coverage,
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
  const [apiError, setApiError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const topicTotal = useMemo(() => estimateTopics(syllabus), [syllabus]);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await axios.get(`${API_BASE}/api/status`, { timeout: 5000 });
        setBackendOk(r.data?.groq_configured === true);
      } catch {
        try {
          await axios.get(`${API_BASE}/health`, { timeout: 5000 });
          setBackendOk(true);
        } catch {
          setBackendOk(false);
        }
      }
    };
    check();
  }, []);

  useEffect(() => {
    if (!loading) return;
    let p = 0;
    let topicIdx = 1;
    setStep(`Generating topic ${topicIdx} of ${topicTotal}...`);
    intervalRef.current = setInterval(() => {
      p = Math.min(p + 2, 95);
      setProgress(p);
      const nextTopic = Math.min(topicTotal, Math.max(1, Math.ceil((p / 95) * topicTotal)));
      if (nextTopic !== topicIdx) {
        topicIdx = nextTopic;
        setStep(`Generating topic ${topicIdx} of ${topicTotal}...`);
      }
    }, 280);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading, topicTotal]);

  const handleGenerate = async () => {
    if (!syllabus.trim()) return;
    setLoading(true);
    setProgress(0);
    setApiError(null);
    try {
      const res = await axios.post(
        API_URL,
        {
          syllabus_text: syllabus,
          tone,
          depth,
          difficulty,
          max_units: 5,
          max_topics: 4,
        },
        { timeout: 600000 },
      );
      if (!res.data?.slides?.length && !res.data?.quiz?.length) {
        throw new Error("Backend returned empty content. Check the API key and server logs.");
      }
      setResult(res.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not reach the KALYX backend. Run: npm run dev:backend  (port 8765)";
      setApiError(msg);
      console.error("Generate failed:", err);
    } finally {
      setProgress(100);
      setStep("Done");
      setTimeout(() => setLoading(false), 350);
    }
  };

  const handleDemo = () => {
    setApiError(null);
    setResult(mockGenerate(syllabus));
  };

  const handleBack = () => {
    setResult(null);
    setTab("slides");
    setProgress(0);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.text }}>
        <GlobalStyles />
        <BackgroundFX />
        <Header />
        <FullLoading progress={progress} step={step} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.text, position: "relative" }}>
      <GlobalStyles />
      <BackgroundFX />
      <Header />

      <main style={{ maxWidth: result ? 1200 : 880, margin: "0 auto", padding: "64px 24px 80px", position: "relative", zIndex: 1 }}>
        {!result ? (
          <InputView
            syllabus={syllabus} setSyllabus={setSyllabus}
            tone={tone} setTone={setTone}
            depth={depth} setDepth={setDepth}
            difficulty={difficulty} setDifficulty={setDifficulty}
            onGenerate={handleGenerate}
            onDemo={handleDemo}
            apiError={apiError}
            backendOk={backendOk}
          />
        ) : (
          <Dashboard result={result} tab={tab} setTab={setTab} onBack={handleBack} />
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ---------------- Background ---------------- */

function BackgroundFX() {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 80%)",
      }} />
      <div style={{
        position: "fixed", top: -200, left: "10%", width: 600, height: 600, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(14,165,233,0.18), transparent 70%)",
        filter: "blur(60px)",
      }} className="kx-orb-a" />
      <div style={{
        position: "fixed", top: 100, right: "5%", width: 500, height: 500, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(139,92,246,0.16), transparent 70%)",
        filter: "blur(60px)",
      }} className="kx-orb-b" />
      <div style={{
        position: "fixed", bottom: -100, left: "30%", width: 700, height: 500, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(236,72,153,0.12), transparent 70%)",
        filter: "blur(80px)",
      }} className="kx-orb-c" />
    </>
  );
}

/* ---------------- Header ---------------- */

function Header() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(5, 11, 24, 0.75)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(14,165,233,0.1)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: GRAD_PRIMARY,
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18,
            boxShadow: "0 8px 24px rgba(14,165,233,0.35)",
          }}>K</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{
                margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "0.02em",
                background: GRAD_TEXT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>KALYX</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <span className="kx-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald, boxShadow: `0 0 8px ${C.emerald}` }} />
                <span style={{ fontSize: 10, color: C.emerald, fontWeight: 700, letterSpacing: "0.1em" }}>LIVE</span>
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 2, fontWeight: 600 }}>
              AI Course Content Generator
            </div>
          </div>
        </div>
        <div className="kx-gradient-border">
          <div style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, color: C.text, letterSpacing: "0.05em" }}>
            ⚡ Debug Devils
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.5), rgba(139,92,246,0.5), rgba(236,72,153,0.5), transparent)" }} />
    </header>
  );
}

/* ---------------- Input View ---------------- */

const PDFJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.pdfjsLib) {
      w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return resolve(w.pdfjsLib);
    }
    const existing = document.querySelector(`script[src="${PDFJS_SRC}"]`) as HTMLScriptElement | null;
    const onReady = () => {
      if (w.pdfjsLib) {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(w.pdfjsLib);
      } else reject(new Error("pdfjs failed to load"));
    };
    if (existing) { existing.addEventListener("load", onReady); existing.addEventListener("error", () => reject(new Error("pdfjs load error"))); return; }
    const s = document.createElement("script");
    s.src = PDFJS_SRC; s.async = true;
    s.onload = onReady;
    s.onerror = () => reject(new Error("pdfjs load error"));
    document.head.appendChild(s);
  });
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function InputView({
  syllabus, setSyllabus, tone, setTone, depth, setDepth, difficulty, setDifficulty, onGenerate,
  onDemo, apiError, backendOk,
}: any) {
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [dragOver, setDragOver] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number; type: string } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadErr, setUploadErr] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [textJustExtracted, setTextJustExtracted] = useState(false);
  const [recent, setRecent] = useState<{ name: string; size: number; type: string; text: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem("kalyx_recent_files") || "[]");
      if (Array.isArray(r)) setRecent(r.slice(0, 3));
    } catch {}
  }, []);

  const saveRecent = (entry: { name: string; size: number; type: string; text: string }) => {
    const next = [entry, ...recent.filter((r) => r.name !== entry.name)].slice(0, 3);
    setRecent(next);
    try { localStorage.setItem("kalyx_recent_files", JSON.stringify(next)); } catch {}
  };

  const applyExtracted = (text: string, meta: { name: string; size: number; type: string }, persist = true) => {
    setSyllabus(text);
    setUploadStatus("done");
    setUploadMsg("Text extracted successfully ✅");
    setTextJustExtracted(true);
    setTimeout(() => setTextJustExtracted(false), 1600);
    if (persist) saveRecent({ ...meta, text });
  };

  const processFile = async (file: File) => {
    setUploadErr("");
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isTxt = file.type === "text/plain" || /\.txt$/i.test(file.name);
    if (!isPdf && !isTxt) {
      setUploadStatus("error"); setUploadErr("Only PDF and TXT files supported"); return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadStatus("error"); setUploadErr("File too large — maximum 10 MB"); return;
    }
    const meta = { name: file.name, size: file.size, type: isPdf ? "pdf" : "txt" };
    setFileMeta(meta);
    setUploadProgress(0);
    setUploadStatus("reading");
    setUploadMsg("Reading file...");
    try {
      if (isTxt) {
        const text = await file.text();
        applyExtracted(text, meta);
      } else {
        const pdfjs = await loadPdfJs();
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const total = pdf.numPages;
        const pageTexts: string[] = [];
        for (let p = 1; p <= total; p++) {
          setUploadMsg(`Extracting text from page ${p} of ${total}...`);
          setUploadProgress(Math.round((p - 1) / total * 100));
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          // Reconstruct lines using y-coordinate from text transform matrix
          let line = "";
          let lastY: number | null = null;
          const lines: string[] = [];
          for (const it of content.items as any[]) {
            const y = it.transform ? it.transform[5] : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
              if (line.trim()) lines.push(line.trim());
              line = "";
            }
            line += it.str;
            if (it.hasEOL) { if (line.trim()) lines.push(line.trim()); line = ""; }
            else line += " ";
            lastY = y;
          }
          if (line.trim()) lines.push(line.trim());
          pageTexts.push(lines.join("\n"));
        }
        setUploadProgress(100);
        const full = pageTexts.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
        if (!full.trim()) throw new Error("No text found — this PDF may be a scanned image");
        applyExtracted(full.trim(), meta);
      }
    } catch (e: any) {
      setUploadStatus("error");
      setUploadErr(e?.message || "Failed to read file");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) processFile(f);
  };

  const clearFile = () => {
    setFileMeta(null); setUploadStatus("idle"); setUploadMsg(""); setUploadErr(""); setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const charCount = syllabus.length;
  const estMinutes = Math.max(1, Math.round(charCount / 2500));

  return (
    <div className="kx-fadeup">
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{
          fontSize: 56, fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: "-0.03em",
          background: GRAD_TEXT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Generate Course Content
        </h1>
        <div className="kx-shimmer-text" style={{ marginTop: 14, fontSize: 15, fontWeight: 500 }}>
          Powered by Groq LLaMA3 + LangChain AI Agent
        </div>
        <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <FeatureBadge>🧠 Bloom's Taxonomy AI</FeatureBadge>
          <FeatureBadge>⚡ 25 Slides Per Topic</FeatureBadge>
          <FeatureBadge>✅ 50 MCQs Per Topic</FeatureBadge>
        </div>
      </div>

      <div style={{
        background: "rgba(15, 28, 46, 0.6)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${C.borderStrong}`,
        borderRadius: 20, padding: 36,
        boxShadow: "0 20px 60px -20px rgba(14,165,233,0.25), 0 0 0 1px rgba(14,165,233,0.05) inset",
        position: "relative",
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22, borderBottom: `1px solid ${C.border}` }}>
          {[
            { id: "paste", label: "📝 Type or Paste" },
            { id: "upload", label: "📎 Upload File" },
          ].map((t) => {
            const active = mode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id as any)}
                style={{
                  position: "relative", background: "transparent", border: "none",
                  color: active ? C.text : C.muted, fontFamily: FONT, fontSize: 14, fontWeight: 600,
                  padding: "12px 18px", cursor: "pointer", transition: "color 0.25s ease",
                }}
              >
                {t.label}
                <span style={{
                  position: "absolute", left: 12, right: 12, bottom: -1, height: 2,
                  background: GRAD_PRIMARY, borderRadius: 2,
                  transform: active ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left",
                  transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
                }} />
              </button>
            );
          })}
        </div>

        {mode === "upload" && (
          <div style={{ marginBottom: 20 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                position: "relative", overflow: "hidden",
                background: dragOver ? "rgba(14,165,233,0.1)" : C.inset,
                borderRadius: 16, padding: 40, textAlign: "center",
                border: dragOver ? `2px solid ${C.blue}` : "2px dashed transparent",
                backgroundImage: dragOver
                  ? undefined
                  : `linear-gradient(${C.inset}, ${C.inset}), ${GRAD_PRIMARY}`,
                backgroundOrigin: "border-box",
                backgroundClip: dragOver ? undefined : "padding-box, border-box",
                boxShadow: dragOver
                  ? "0 0 30px rgba(14,165,233,0.4)"
                  : uploadStatus === "reading" ? "0 0 40px rgba(99,102,241,0.35)" : "none",
                transition: "all 0.25s ease",
              }}
            >
              {uploadStatus === "reading" && (
                <>
                  <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: "linear-gradient(90deg, transparent 0%, rgba(14,165,233,0.15) 45%, rgba(139,92,246,0.2) 50%, rgba(236,72,153,0.15) 55%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "kxScanSweep 1.6s linear infinite",
                  }} />
                  <div style={{
                    position: "absolute", left: 0, right: 0, bottom: 0, height: 3,
                    background: `linear-gradient(90deg, ${C.blue}, ${C.purple}, ${C.pink})`,
                    width: `${uploadProgress}%`,
                    transition: "width 0.3s ease",
                    boxShadow: "0 0 12px rgba(14,165,233,0.7)",
                  }} />
                </>
              )}
              {!fileMeta && (
                <>
                  <div className="kx-float" style={{ fontSize: 56, lineHeight: 1, transform: dragOver ? "scale(1.15)" : "scale(1)", transition: "transform 0.2s" }}>📤</div>
                  <div style={{ marginTop: 18, fontSize: 18, fontWeight: 700, color: C.text }}>
                    {dragOver ? "Drop it here!" : "Drag & drop your syllabus file here"}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: C.muted }}>Supports PDF and TXT files (max 10 MB)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px auto", maxWidth: 320 }}>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.4), transparent)" }} />
                    <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)" }} />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "10px 22px", borderRadius: 10, cursor: "pointer", fontFamily: FONT,
                      fontSize: 14, fontWeight: 600, color: C.text, background: C.inset,
                      backgroundImage: `linear-gradient(${C.inset}, ${C.inset}), ${GRAD_PRIMARY}`,
                      backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
                      border: "2px solid transparent", transition: "transform 0.15s ease",
                    }}
                  >
                    Browse Files
                  </button>
                </>
              )}

              {fileMeta && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: fileMeta.type === "pdf" ? "rgba(239,68,68,0.15)" : "rgba(14,165,233,0.15)",
                    color: fileMeta.type === "pdf" ? C.red : C.blue,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
                    border: `1px solid ${fileMeta.type === "pdf" ? "rgba(239,68,68,0.35)" : "rgba(14,165,233,0.35)"}`,
                  }}>
                    {fileMeta.type.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fileMeta.name}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {formatBytes(fileMeta.size)}
                      {uploadStatus === "reading" && <> · <span style={{ color: C.blue }}>{uploadMsg}</span></>}
                      {uploadStatus === "done" && <> · <span style={{ color: C.emerald }}>{uploadMsg}</span></>}
                    </div>
                  </div>
                  {uploadStatus === "done" && (
                    <div style={{ color: C.emerald, fontSize: 22, animation: "kxPop 0.4s ease" }}>✓</div>
                  )}
                  <button
                    onClick={clearFile}
                    style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14 }}
                  >✕</button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
              />
            </div>

            {uploadErr && (
              <div style={{
                marginTop: 12, padding: "10px 14px", borderRadius: 10,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)",
                color: C.red, fontSize: 13, fontWeight: 500,
                boxShadow: "0 0 20px rgba(239,68,68,0.2)",
              }}>⚠ {uploadErr}</div>
            )}

            {recent.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>Recent:</span>
                {recent.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => { setFileMeta({ name: r.name, size: r.size, type: r.type }); applyExtracted(r.text, { name: r.name, size: r.size, type: r.type }, false); }}
                    style={{
                      padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: "rgba(15,28,46,0.8)", color: C.body, fontFamily: FONT,
                      border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    {r.type === "pdf" ? "📕" : "📄"} {r.name.length > 22 ? r.name.slice(0, 20) + "…" : r.name}
                  </button>
                ))}
              </div>
            )}

            {syllabus && uploadStatus === "done" && (
              <div style={{
                marginTop: 14, padding: 14, borderRadius: 10,
                background: "rgba(100,116,139,0.1)", border: `1px solid ${C.border}`,
              }}>
                <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>PREVIEW</div>
                <div style={{ color: C.body, fontSize: 13, lineHeight: 1.5 }}>
                  {syllabus.slice(0, 200)}{syllabus.length > 200 ? "…" : ""}
                </div>
              </div>
            )}
          </div>
        )}

        <Label>{mode === "upload" ? "Extracted Text (editable)" : "Paste Your Syllabus"}</Label>
        <textarea
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          placeholder={mode === "upload"
            ? "Extracted text will appear here. You can edit it before generating."
            : "Paste your full course syllabus here. Include unit titles, topics, and any learning objectives..."}
          className="kx-textarea"
          style={{
            width: "100%", minHeight: 220, padding: 20, fontSize: 15, lineHeight: 1.6,
            background: C.inset, color: C.text, fontFamily: FONT,
            border: `1px solid ${textJustExtracted ? C.emerald : C.border}`, borderRadius: 12, resize: "vertical",
            outline: "none", boxSizing: "border-box", transition: "all 0.4s ease",
            marginTop: 10,
            boxShadow: textJustExtracted ? "0 0 0 3px rgba(16,185,129,0.2)" : "none",
          }}
        />

        {syllabus && (
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
            <span>{charCount.toLocaleString()} characters</span>
            <span>Estimated: ~{estMinutes} min to generate</span>
          </div>
        )}

        {backendOk === false && (
          <div style={{
            marginTop: 16, padding: "12px 16px", borderRadius: 10,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)",
            color: C.red, fontSize: 13,
          }}>
            ⚠ Backend offline or Groq API key missing. Run the backend from the <code style={{ color: C.text }}>backend</code> folder, then refresh.
          </div>
        )}
        {backendOk === true && (
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 10,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
            color: C.emerald, fontSize: 13,
          }}>
            ✓ Backend connected — AI generation ready (up to 5 units × 4 topics; 30 slides & 50 MCQs per topic).
          </div>
        )}
        {apiError && (
          <div style={{
            marginTop: 12, padding: "12px 16px", borderRadius: 10,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)",
            color: C.red, fontSize: 13, lineHeight: 1.5,
          }}>
            ⚠ {apiError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 22 }}>
          <Select label="Tone" value={tone} onChange={setTone} options={["formal", "conversational", "socratic"]} />
          <Select label="Depth" value={depth} onChange={setDepth} options={["basic", "intermediate", "advanced"]} />
          <Select label="Difficulty" value={difficulty} onChange={setDifficulty} options={["easy", "medium", "hard"]} />
        </div>

        <button
          onClick={onGenerate}
          disabled={!syllabus.trim()}
          className="kx-generate"
          style={{
            marginTop: 26, width: "100%", height: 56,
            background: GRAD_PRIMARY,
            color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: "0.01em",
            border: "none", borderRadius: 12,
            cursor: !syllabus.trim() ? "not-allowed" : "pointer",
            opacity: !syllabus.trim() ? 0.45 : 1,
            position: "relative", overflow: "hidden",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            fontFamily: FONT,
            boxShadow: "0 10px 30px -10px rgba(14,165,233,0.5)",
          }}
        >
          ✨ Generate with KALYX
        </button>

        <button
          type="button"
          onClick={onDemo}
          disabled={!syllabus.trim()}
          style={{
            marginTop: 12, width: "100%", height: 44,
            background: "transparent", color: C.subtle,
            fontSize: 14, fontWeight: 600, fontFamily: FONT,
            border: `1px solid ${C.border}`, borderRadius: 10,
            cursor: !syllabus.trim() ? "not-allowed" : "pointer",
            opacity: !syllabus.trim() ? 0.45 : 1,
          }}
        >
          Try demo (offline preview)
        </button>
      </div>
    </div>
  );
}

function FeatureBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="kx-feature">
      <div style={{
        padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: C.text,
        background: "rgba(15, 28, 46, 0.6)", backdropFilter: "blur(10px)",
      }}>
        {children}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700,
    }}>{children}</div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const chevron = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%230EA5E9' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`;
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="kx-select"
        style={{
          marginTop: 8,
          width: "100%", background: C.inset, color: C.text,
          border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 36px 12px 16px",
          fontSize: 14, fontFamily: FONT, fontWeight: 500, outline: "none",
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

/* ---------------- Full-screen Loading ---------------- */

function FullLoading({ progress, step }: { progress: number; step: string }) {
  const [factIdx, setFactIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFactIdx((i) => (i + 1) % FUN_FACTS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="kx-bg-shift" style={{
        position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none",
        background: "linear-gradient(120deg, rgba(14,165,233,0.15), rgba(139,92,246,0.15), rgba(236,72,153,0.15), rgba(14,165,233,0.15))",
        backgroundSize: "300% 300%",
      }} />

      <div className="kx-logo-pulse" style={{
        width: 96, height: 96, borderRadius: 24, background: GRAD_PRIMARY,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 44, fontWeight: 900, color: "#fff",
        boxShadow: "0 20px 60px rgba(14,165,233,0.5)",
      }}>K</div>

      <h2 style={{
        marginTop: 28, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em",
        background: GRAD_TEXT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      }}>KALYX is thinking...</h2>

      <div style={{ marginTop: 8, fontSize: 16, color: C.subtle, fontWeight: 500, minHeight: 24 }}>{step}</div>

      <div style={{ marginTop: 28, width: "100%", maxWidth: 480 }}>
        <div style={{ background: "rgba(255,255,255,0.05)", height: 8, borderRadius: 4, overflow: "hidden", position: "relative" }}>
          <div style={{
            width: `${progress}%`, height: "100%",
            background: GRAD_PRIMARY,
            transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)", position: "relative", overflow: "hidden",
            borderRadius: 4,
          }}>
            <div className="kx-shimmer" style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            }} />
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, fontWeight: 600 }}>
          <span>Processing</span>
          <span style={{ color: C.blue }}>{progress}%</span>
        </div>
      </div>

      <div style={{ marginTop: 40, padding: "12px 22px", borderRadius: 999, background: "rgba(15,28,46,0.7)", border: `1px solid ${C.border}`, fontSize: 13, color: C.subtle, maxWidth: 480, textAlign: "center" }}>
        💡 {FUN_FACTS[factIdx]}
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

function Dashboard({ result, tab, setTab, onBack }: { result: any; tab: "slides" | "notes" | "quiz"; setTab: (t: "slides" | "notes" | "quiz") => void; onBack: () => void }) {
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);
  const overall = Math.round(
    BLOOM_LEVELS.reduce((a, l) => a + (result.bloom_coverage?.[l] ?? 0), 0) / BLOOM_LEVELS.length
  );
  const grade = overall >= 18 ? "A" : overall >= 14 ? "B" : "C";
  const units = new Set<string>();
  (result.slides || []).forEach((s: any) => s.unit && units.add(s.unit));
  const unitCount = units.size || (result.notes?.length ?? 0);

  const handleExport = async (type: "pdf" | "pptx") => {
    try {
      setExporting(type);
      const response = await axios.post(
        `${API_BASE}/api/export/${type}`,
        {
          course: result.course,
          slides: result.slides,
          notes: result.notes,
          quiz: result.quiz,
          bloom_coverage: result.bloom_coverage,
        },
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${result.course}_KALYX.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="kx-fadeup">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          onClick={onBack}
          className="kx-back"
          style={{
            background: "rgba(15,28,46,0.6)", border: `1px solid ${C.border}`, color: C.text,
            padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: FONT,
            transition: "all 0.25s ease", fontWeight: 500,
          }}
        >
          ← Generate Another
        </button>
        <button
          onClick={() => handleExport("pdf")}
          disabled={!!exporting}
          style={{
            padding: "8px 18px", borderRadius: 10, border: "none", cursor: exporting ? "wait" : "pointer",
            fontSize: 13, fontWeight: 700, fontFamily: FONT, color: "#fff",
            background: "linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)",
            opacity: exporting && exporting !== "pdf" ? 0.5 : 1,
            boxShadow: "0 8px 24px -8px rgba(239,68,68,0.5)",
          }}
        >
          {exporting === "pdf" ? "Generating PDF..." : "📄 Export PDF"}
        </button>
        <button
          onClick={() => handleExport("pptx")}
          disabled={!!exporting}
          style={{
            padding: "8px 18px", borderRadius: 10, border: "none", cursor: exporting ? "wait" : "pointer",
            fontSize: 13, fontWeight: 700, fontFamily: FONT, color: "#fff",
            background: "linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%)",
            opacity: exporting && exporting !== "pptx" ? 0.5 : 1,
            boxShadow: "0 8px 24px -8px rgba(14,165,233,0.5)",
          }}
        >
          {exporting === "pptx" ? "Generating PPTX..." : "📊 Export PPTX"}
        </button>
      </div>

      <h1 style={{
        display: "flex", alignItems: "center", gap: 14, fontSize: 36, fontWeight: 800,
        marginTop: 20, marginBottom: 8, letterSpacing: "-0.02em",
        background: GRAD_TEXT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      }}>
        {result.course}
      </h1>
      <div style={{ color: C.subtle, fontSize: 14, marginBottom: 32 }}>Course generated successfully — all systems ready.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard icon="📊" value={result.total_slides ?? 0} label="Total Slides" gradient={GRAD_PRIMARY} />
        <StatCard icon="❓" value={result.total_quiz ?? 0} label="Total Questions" gradient={GRAD_SECONDARY} />
        <StatCard icon="📝" value={result.notes?.length ?? 0} label="Total Notes" gradient={GRAD_EMERALD} />
        <StatCard icon="🎯" value={unitCount} label="Total Units" gradient={GRAD_AMBER} />
      </div>

      <BloomCoverage coverage={result.bloom_coverage || {}} overall={overall} grade={grade} />

      <div style={{
        marginTop: 28, background: "rgba(15,28,46,0.6)", backdropFilter: "blur(16px)",
        border: `1px solid ${C.border}`, borderRadius: 14, padding: 6, display: "flex", gap: 4,
      }}>
        {([
          ["slides", "Slides", result.slides?.length ?? 0],
          ["notes", "Notes", result.notes?.length ?? 0],
          ["quiz", "Quiz", result.quiz?.length ?? 0],
        ] as const).map(([t, label, count]) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className="kx-tab"
            style={{
              flex: 1, padding: "12px 14px", borderRadius: 10, border: "none",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
              background: tab === t ? GRAD_PRIMARY : "transparent",
              color: tab === t ? "#fff" : C.muted,
              boxShadow: tab === t ? "0 8px 24px -8px rgba(14,165,233,0.5)" : "none",
              transition: "all 0.25s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {label}
            <span style={{
              padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: tab === t ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
              color: tab === t ? "#fff" : C.muted,
            }}>{count}</span>
          </button>
        ))}
      </div>

      <div key={tab} style={{ marginTop: 24 }} className="kx-tab-content">
        {tab === "slides" && <SlidesTab slides={result.slides || []} />}
        {tab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(result.notes || []).map((n: any, i: number) => (
              <NoteCard key={i} note={n} index={i} />
            ))}
          </div>
        )}
        {tab === "quiz" && <QuizTab quiz={result.quiz || []} />}
      </div>
    </div>
  );
}

/* ---------------- Stat Cards w/ animated counter ---------------- */

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function StatCard({ icon, value, label, gradient }: { icon: string; value: number; label: string; gradient: string }) {
  const v = useCountUp(value);
  return (
    <div className="kx-stat" style={{
      position: "relative", borderRadius: 16, padding: 22, overflow: "hidden",
      background: C.card, border: `1px solid ${C.border}`,
      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{ position: "absolute", inset: 0, background: gradient, opacity: 0.12 }} />
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: gradient, opacity: 0.25, filter: "blur(40px)", borderRadius: "50%" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: C.text, letterSpacing: "-0.02em" }}>{v}</div>
        <div style={{ fontSize: 12, color: C.subtle, marginTop: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      </div>
    </div>
  );
}

/* ---------------- Bloom coverage ---------------- */

function BloomCoverage({ coverage, overall, grade }: { coverage: Record<string, number>; overall: number; grade: string }) {
  return (
    <div style={{
      marginTop: 24, position: "relative", overflow: "hidden",
      background: "rgba(15,28,46,0.6)", backdropFilter: "blur(16px)",
      border: `1px solid ${C.border}`, borderRadius: 16, padding: 28,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>🧠 Bloom's Taxonomy Coverage</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Distribution across cognitive levels</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", background: "rgba(14,165,233,0.08)", border: `1px solid ${C.borderStrong}`, borderRadius: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Avg</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{overall}%</div>
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: GRAD_PRIMARY,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: "#fff",
            boxShadow: "0 8px 20px -6px rgba(14,165,233,0.5)",
          }}>{grade}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {BLOOM_LEVELS.map((lvl, i) => {
          const pct = Math.max(0, Math.min(100, coverage[lvl] ?? 0));
          const color = BLOOM_COLORS[lvl];
          return (
            <div key={lvl} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 110, fontSize: 13, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
                {lvl}
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", height: 10, borderRadius: 5, overflow: "hidden", position: "relative" }}>
                <div className="kx-bar" style={{
                  width: `${pct}%`, height: "100%", borderRadius: 5,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  boxShadow: `0 0 12px ${color}66`,
                  transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
                  transitionDelay: `${i * 80}ms`,
                }} />
              </div>
              <div style={{ width: 70, textAlign: "right", fontSize: 13, fontWeight: 700, color, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                {pct < 10 && <span style={{ color: C.amber }}>⚠</span>}
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Slides tab ---------------- */

function SlidesTab({ slides }: { slides: any[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return slides;
    return slides.filter((s) => (s.title || "").toLowerCase().includes(q));
  }, [slides, search]);
  const groups = useMemo(() => groupSlidesByTopic(filtered), [filtered]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ position: "relative" }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search slides by title..."
          className="kx-textarea"
          style={{
            width: "100%",
            padding: "12px 16px 12px 40px",
            fontSize: 14,
            background: C.inset,
            color: C.text,
            fontFamily: FONT,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.5 }}>
          🔍
        </span>
        {search && (
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.muted }}>
            {filtered.length} match{filtered.length !== 1 ? "es" : ""}
          </span>
        )}
      </div>
      {groups.length === 0 && (
        <div style={{ color: C.muted, textAlign: "center", padding: 32 }}>No slides match your search.</div>
      )}
      {groups.map(([topic, topicSlides]) => (
        <div key={topic}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.blue,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 14,
            paddingBottom: 8,
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span>📑</span>
            {topic}
            <span style={{ color: C.muted, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
              ({topicSlides.length} slides)
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {topicSlides.map((s, i) => (
              <SlideCard key={`${topic}-${s.slide_number ?? i}`} slide={s} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Quiz tab ---------------- */

function QuizTab({ quiz }: { quiz: any[] }) {
  const [bloomFilter, setBloomFilter] = useState<string>("all");
  const filtered = useMemo(() => {
    if (bloomFilter === "all") return quiz;
    return quiz.filter((q) => quizBloom(q) === bloomFilter);
  }, [quiz, bloomFilter]);
  const groups = useMemo(() => groupQuizByUnit(filtered), [filtered]);
  const total = quiz.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginRight: 4 }}>Bloom level:</span>
        <button
          onClick={() => setBloomFilter("all")}
          style={filterChipStyle(bloomFilter === "all", C.text)}
        >
          All ({quiz.length})
        </button>
        {BLOOM_LEVELS.map((lvl) => {
          const count = quiz.filter((q) => quizBloom(q) === lvl).length;
          if (!count) return null;
          const color = BLOOM_COLORS[lvl];
          return (
            <button
              key={lvl}
              onClick={() => setBloomFilter(lvl)}
              style={filterChipStyle(bloomFilter === lvl, color)}
            >
              {lvl} ({count})
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{ color: C.muted, textAlign: "center", padding: 32 }}>No questions match this filter.</div>
      )}
      {groups.map(([unit, unitQuiz]) => (
        <div key={unit}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: unitColorFor(unit),
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 14,
            paddingBottom: 8,
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span>📚</span>
            {unit}
            <span style={{ color: C.muted, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
              ({unitQuiz.length} questions)
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {unitQuiz.map((q, i) => {
              const globalIndex = quiz.indexOf(q);
              return (
                <QuizCard
                  key={`${unit}-${q.question_number ?? globalIndex}`}
                  q={q}
                  index={globalIndex >= 0 ? globalIndex : i}
                  total={total}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function filterChipStyle(active: boolean, accent: string): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: FONT,
    cursor: "pointer",
    border: active ? `1px solid ${accent}` : `1px solid ${C.border}`,
    background: active ? `${accent}22` : "rgba(15,28,46,0.6)",
    color: active ? accent : C.muted,
    transition: "all 0.2s ease",
  };
}

/* ---------------- Slide Card ---------------- */

function SlideCard({ slide, index }: { slide: any; index: number }) {
  const slideNum = slide.slide_number ?? slide.number ?? index + 1;
  const takeaway = slide.key_takeaway ?? slide.takeaway;
  const unitColor = unitColorFor(slide.unit);
  return (
    <div className="kx-card-hover" style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "24px 28px", position: "relative", overflow: "hidden",
      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      animation: `kxStaggerFade 0.5s ease ${index * 60}ms both`,
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${unitColor}, ${unitColor}55)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{
          padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#fff",
          background: GRAD_PRIMARY,
        }}>
          SLIDE {slideNum}
        </span>
        {slide.topic && (
          <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: C.purple, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)" }}>
            {slide.topic}
          </span>
        )}
        {slide.unit && (
          <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: unitColor, background: `${unitColor}1a`, border: `1px solid ${unitColor}40` }}>
            {slide.unit}
          </span>
        )}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginTop: 14, letterSpacing: "-0.01em" }}>{slide.title}</div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {(slide.bullets || []).map((b: string, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GRAD_PRIMARY, marginTop: 9, flexShrink: 0, boxShadow: `0 0 6px ${C.blue}` }} />
            <span style={{ fontSize: 14, color: C.body, lineHeight: 1.7 }}>{b}</span>
          </div>
        ))}
      </div>
      {slide.real_world_example && (
        <div style={{
          marginTop: 16, padding: "12px 16px", borderRadius: 10,
          background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)",
          fontSize: 13, color: C.body, display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span>🌍</span>
          <span><strong style={{ color: C.blue }}>Real world:</strong> {slide.real_world_example}</span>
        </div>
      )}
      {takeaway && (
        <div style={{
          marginTop: 18, padding: "12px 16px", borderRadius: 10,
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          fontSize: 13, color: C.amber, fontStyle: "italic", display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span>💡</span><span style={{ color: "#FCD34D" }}>{takeaway}</span>
        </div>
      )}
    </div>
  );
}

function unitColorFor(unit?: string) {
  if (!unit) return C.blue;
  const colors = [C.blue, C.indigo, C.purple, C.pink, C.amber, C.emerald];
  const n = parseInt(unit.replace(/\D/g, ""), 10) || 1;
  return colors[(n - 1) % colors.length];
}

/* ---------------- Note Card ---------------- */

function NoteCard({ note, index }: { note: any; index: number }) {
  const [open, setOpen] = useState(true);
  const unitColor = unitColorFor(note.unit);
  const title = note.title || note.topic || `Notes ${index + 1}`;
  return (
    <div className="kx-card-hover" style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "24px 28px", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      animation: `kxStaggerFade 0.5s ease ${index * 60}ms both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {note.unit && (
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: unitColor, background: `${unitColor}1a`, border: `1px solid ${unitColor}40` }}>
              {note.unit}
            </span>
          )}
          <button onClick={() => setOpen(!open)} style={{
            background: "transparent", border: `1px solid ${C.border}`, color: C.muted,
            width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: FONT,
          }}>{open ? "−" : "+"}</button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 16 }}>
          <NoteSection label="Introduction" text={note.introduction} color={C.blue} />
          <NoteSection label="Core Concepts" text={note.core_concepts || note.explanation} color={C.indigo} />
          <NoteSection label="Deep Explanation" text={note.deep_explanation} color={C.purple} />
          <NoteSection label="Application" text={note.real_world_application || note.application} color={C.pink} />
          {(note.common_mistakes || note.mistakes) && (
            <div style={{ marginTop: 14, borderLeft: `3px solid ${C.amber}`, paddingLeft: 14 }}>
              <div style={{ fontSize: 11, color: C.amber, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                ⚠ Common Mistakes
              </div>
              <div style={{ fontSize: 14, color: C.body, lineHeight: 1.7 }}>{note.common_mistakes || note.mistakes}</div>
            </div>
          )}
          <NoteSection label="Exam Tips" text={note.exam_tips} color={C.amber} />
          {note.summary && <NoteSection label="Summary" text={note.summary} color={C.emerald} />}
        </div>
      )}
    </div>
  );
}

function NoteSection({ label, text, color }: { label: string; text?: string; color: string }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 14, borderLeft: `3px solid ${color}`, paddingLeft: 14 }}>
      <div style={{ fontSize: 11, color, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: C.body, lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

/* ---------------- Quiz Card ---------------- */

function QuizCard({ q, index, total }: { q: any; index: number; total: number }) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const bloom = quizBloom(q);
  const bloomColor = BLOOM_COLORS[bloom] || C.muted;
  const unitColor = unitColorFor(q.unit);
  const qNum = q.question_number ?? index + 1;
  const correctIdx = normalizeQuizAnswer(q);
  const type = quizType(q);

  return (
    <div className="kx-card-hover" style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "24px 28px", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      animation: `kxStaggerFade 0.5s ease ${index * 50}ms both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#fff",
            background: GRAD_PRIMARY,
          }}>Q{qNum}</span>
          <span style={{ fontSize: 12, color: C.subtle, fontWeight: 600 }}>
            Question {index + 1} of {total}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {q.unit && (
            <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, color: unitColor, background: `${unitColor}1a`, border: `1px solid ${unitColor}40` }}>
              {q.unit}
            </span>
          )}
          {bloom && (
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: bloomColor, background: `${bloomColor}1a`, border: `1px solid ${bloomColor}40` }}>
              {bloom}
            </span>
          )}
          <button onClick={() => setBookmarked(!bookmarked)} style={{
            background: "transparent", border: "none", cursor: "pointer", fontSize: 16,
            color: bookmarked ? C.amber : C.muted, padding: 4,
          }} title="Bookmark">{bookmarked ? "★" : "☆"}</button>
        </div>
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginTop: 14, lineHeight: 1.5 }}>{q.question}</div>

      {type === "mcq" && q.options && (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {q.options.map((opt: string, i: number) => {
            const isCorrect = revealed && i === correctIdx;
            const isWrong = revealed && selected === i && i !== correctIdx;
            const base: React.CSSProperties = {
              textAlign: "left", padding: "14px 18px", borderRadius: 10, fontSize: 14, fontWeight: 500,
              fontFamily: FONT, cursor: revealed ? "default" : "pointer",
              border: "1px solid rgba(255,255,255,0.08)",
              background: C.inset, color: C.body, transition: "all 0.25s ease",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            };
            const correctStyle: React.CSSProperties = isCorrect ? {
              borderColor: "transparent",
              background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.1))",
              color: "#6EE7B7", fontWeight: 600,
              boxShadow: `0 0 0 1px ${C.emerald}80, 0 8px 24px -8px ${C.emerald}80`,
            } : {};
            const wrongStyle: React.CSSProperties = isWrong ? {
              borderColor: C.red, color: C.red,
            } : {};
            return (
              <button
                key={i}
                onClick={() => !revealed && setSelected(i)}
                className={revealed ? "" : "kx-option"}
                style={{ ...base, ...correctStyle, ...wrongStyle }}
              >
                <span><strong style={{ marginRight: 8, opacity: 0.7 }}>{String.fromCharCode(65 + i)}.</strong>{opt}</span>
                {isCorrect && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {type === "truefalse" && revealed && (
        <div className="kx-fadeup" style={{ marginTop: 14, padding: 16, background: "rgba(16,185,129,0.08)", border: `1px solid rgba(16,185,129,0.25)`, color: C.emerald, borderRadius: 10, fontWeight: 600 }}>
          Answer: {q.answer}
        </div>
      )}

      {type === "short" && revealed && (
        <div className="kx-fadeup" style={{ marginTop: 14, padding: 16, background: "rgba(245,158,11,0.08)", border: `1px solid rgba(245,158,11,0.25)`, color: C.body, borderRadius: 10 }}>
          <strong style={{ color: C.amber }}>Expected:</strong> {q.answer}
        </div>
      )}

      {type === "case" && (
        <div style={{ marginTop: 14, padding: 16, background: "rgba(14,165,233,0.08)", border: `1px solid rgba(14,165,233,0.25)`, color: C.body, borderRadius: 10 }}>
          {revealed ? <><strong style={{ color: C.blue }}>Model answer:</strong> {q.answer}</> : <em style={{ color: C.muted }}>Case study — reveal for a model answer.</em>}
        </div>
      )}

      {revealed && q.explanation && (
        <div className="kx-fadeup" style={{
          marginTop: 14, padding: 16, borderRadius: 10,
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)",
          fontSize: 14, color: C.body, lineHeight: 1.7,
        }}>
          <strong style={{ color: C.indigo }}>Explanation:</strong> {q.explanation}
        </div>
      )}

      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => setRevealed(!revealed)}
          className="kx-reveal"
          style={{
            position: "relative", background: "transparent",
            border: `1px solid ${revealed ? "rgba(100,116,139,0.3)" : C.borderStrong}`,
            color: revealed ? C.muted : C.blue,
            padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: FONT,
            transition: "all 0.25s ease",
          }}
        >
          {revealed ? "Hide Answer" : "Reveal Answer"}
        </button>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Question {index + 1} of {total}</span>
      </div>
    </div>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer style={{
      position: "relative", zIndex: 1, padding: "40px 24px 32px", textAlign: "center",
      borderTop: `1px solid ${C.border}`, marginTop: 40,
    }}>
      <div style={{
        fontSize: 18, fontWeight: 800, letterSpacing: "0.02em",
        background: GRAD_TEXT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      }}>
        KALYX by Debug Devils
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
        SRMIST
      </div>
    </footer>
  );
}

/* ---------------- Global Styles ---------------- */

function GlobalStyles() {
  return (
    <style>{`
      html, body { background: ${C.bg}; scroll-behavior: smooth; }
      * { box-sizing: border-box; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.3); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(14,165,233,0.5); }

      @keyframes kxFadeUp { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: none; } }
      @keyframes kxStaggerFade { from { opacity: 0; transform: translateY(12px);} to { opacity: 1; transform: none; } }
      @keyframes kxSpin { to { transform: rotate(360deg); } }
      @keyframes kxPulse { 0%, 100% { opacity: 1; transform: scale(1);} 50% { opacity: 0.5; transform: scale(1.3);} }
      @keyframes kxShimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
      @keyframes kxLogoPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 20px 60px rgba(14,165,233,0.5); }
        50% { transform: scale(1.05); box-shadow: 0 24px 80px rgba(139,92,246,0.6); }
      }
      @keyframes kxBgShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes kxOrbA { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(40px, 30px); } }
      @keyframes kxOrbB { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-30px, 40px); } }
      @keyframes kxOrbC { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(20px, -30px); } }
      @keyframes kxShimmerText {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes kxFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes kxPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); } }
      @keyframes kxScanSweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .kx-float { animation: kxFloat 2.4s ease-in-out infinite; display: inline-block; }

      .kx-fadeup { animation: kxFadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
      .kx-tab-content { animation: kxFadeUp 0.35s ease; }
      .kx-pulse-dot { animation: kxPulse 1.8s ease-in-out infinite; }
      .kx-shimmer { animation: kxShimmer 1.5s linear infinite; }
      .kx-logo-pulse { animation: kxLogoPulse 2.4s ease-in-out infinite; }
      .kx-bg-shift { animation: kxBgShift 12s ease-in-out infinite; }
      .kx-orb-a { animation: kxOrbA 18s ease-in-out infinite; }
      .kx-orb-b { animation: kxOrbB 22s ease-in-out infinite; }
      .kx-orb-c { animation: kxOrbC 26s ease-in-out infinite; }

      .kx-shimmer-text {
        background: linear-gradient(90deg, #64748B 0%, #F0F6FF 20%, #0EA5E9 50%, #F0F6FF 80%, #64748B 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: kxShimmerText 4s linear infinite;
      }

      .kx-gradient-border {
        position: relative;
        border-radius: 999px;
        background: linear-gradient(135deg, #0EA5E9, #8B5CF6, #EC4899);
        padding: 1px;
      }
      .kx-gradient-border > div {
        background: ${C.bg};
        border-radius: 999px;
      }

      .kx-textarea::placeholder { color: #475569; }
      .kx-textarea:focus {
        border-color: ${C.blue} !important;
        box-shadow: 0 0 0 4px rgba(14,165,233,0.15), 0 0 40px rgba(14,165,233,0.1);
      }
      .kx-select:hover, .kx-select:focus { border-color: ${C.borderStrong} !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.1); }

      .kx-generate { position: relative; }
      .kx-generate::after {
        content: ""; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
        transition: left 0.7s ease;
      }
      .kx-generate:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 16px 40px -10px rgba(14,165,233,0.6), 0 0 40px rgba(99,102,241,0.4);
      }
      .kx-generate:hover:not(:disabled)::after { left: 130%; }
      .kx-generate:active:not(:disabled) { transform: translateY(0) scale(1); }

      .kx-feature { position: relative; padding: 1px; border-radius: 999px; background: linear-gradient(135deg, rgba(14,165,233,0.4), rgba(139,92,246,0.4), rgba(236,72,153,0.4)); transition: all 0.3s ease; }
      .kx-feature:hover { background: linear-gradient(135deg, #0EA5E9, #8B5CF6, #EC4899); box-shadow: 0 8px 24px -8px rgba(139,92,246,0.5); transform: translateY(-2px); }

      .kx-stat:hover { transform: translateY(-4px); border-color: ${C.borderStrong} !important; box-shadow: 0 16px 40px -12px rgba(14,165,233,0.3); }
      .kx-card-hover:hover { transform: translateY(-3px); border-color: ${C.borderStrong} !important; box-shadow: 0 12px 30px -10px rgba(14,165,233,0.25); }
      .kx-tab:hover { color: ${C.text} !important; }
      .kx-back:hover { border-color: ${C.borderStrong} !important; background: rgba(14,165,233,0.08) !important; }
      .kx-option:hover { border-color: ${C.borderStrong} !important; background: rgba(14,165,233,0.06) !important; box-shadow: 0 0 0 1px rgba(14,165,233,0.2); }
      .kx-reveal:hover { background: rgba(14,165,233,0.1) !important; box-shadow: 0 0 20px rgba(14,165,233,0.15); }
    `}</style>
  );
}
