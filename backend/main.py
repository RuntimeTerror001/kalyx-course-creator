from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parent / ".env")

from agent.agent import groq_configured, run_kalyx_agent
from routes.export import router as export_router

app = FastAPI(title="KALYX API")
app.include_router(export_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://kalyx-course-creator.vercel.app",  # your vercel URL
        "https://kalyx-course-creator-x14z.vercel.app",  # new deployed vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    syllabus_text: str
    tone: str = "formal"
    depth: str = "intermediate"
    difficulty: str = "medium"
    max_units: int | None = None
    max_topics: int | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/status")
def status():
    return {
        "status": "ok",
        "groq_configured": groq_configured(),
    }


@app.post("/api/generate")
def generate(req: GenerateRequest):
    try:
        return run_kalyx_agent(
            req.syllabus_text,
            tone=req.tone,
            depth=req.depth,
            difficulty=req.difficulty,
            max_units=req.max_units,
            max_topics=req.max_topics,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        print("generate error:", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
