import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MAX_UNITS = int(os.environ.get("KALYX_MAX_UNITS", "5"))
MAX_TOPICS = int(os.environ.get("KALYX_MAX_TOPICS", "4"))
LLM_WORKERS = int(os.environ.get("KALYX_LLM_WORKERS", "5"))


def _get_llm():
    return ChatGroq(
        model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        groq_api_key=os.environ.get("GROQ_API_KEY", ""),
        temperature=0.7,
    )


def _extract_json(raw: str):
    """Parse JSON from LLM output, tolerating markdown and extra text."""
    clean = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass

    for opener, closer in (("[", "]"), ("{", "}")):
        start = clean.find(opener)
        end = clean.rfind(closer)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(clean[start : end + 1])
            except json.JSONDecodeError:
                continue
    return None


def ask_ai_long(prompt):
    try:
        response = _get_llm().invoke(prompt).content
        parsed = _extract_json(response)
        return parsed if parsed is not None else {}
    except Exception as exc:
        print("ask_ai_long error:", exc)
        return {}


def ask_ai_array(prompt, debug_label=""):
    try:
        response = _get_llm().invoke(prompt).content
        print(f"[{debug_label}] Raw response:", response[:500])
        parsed = _extract_json(response)
        if isinstance(parsed, list):
            print(f"[{debug_label}] Parsed {len(parsed)} items")
            return parsed
        print(f"[{debug_label}] Expected array, got:", type(parsed))
        return []
    except Exception as exc:
        print(f"[{debug_label}] error:", exc)
        return []


def groq_configured() -> bool:
    return bool(os.environ.get("GROQ_API_KEY", "").strip())


def extract_units(syllabus_text):
    return ask_ai_long(
        f"""
    Carefully read this syllabus and extract every unit and topic.

    Return ONLY valid JSON. Start with {{ and end with }}.
    No markdown. No backticks.

    {{
      "course": "exact course name",
      "units": [
        {{
          "unit_number": 1,
          "title": "unit title",
          "topics": ["topic 1", "topic 2", "topic 3"],
          "outcomes": ["outcome 1"]
        }}
      ]
    }}

    Extract minimum 3 topics per unit.
    Syllabus: {syllabus_text}
    """
    )


def _generate_slide_batch(
    topic, unit_title, tone, depth, start_num, count, section_desc
):
    return ask_ai_array(
        f"""
    Create exactly {count} presentation slides for topic: {topic}
    Unit: {unit_title} | Tone: {tone} | Depth: {depth}
    Section: {section_desc}
    Number slides {start_num} through {start_num + count - 1}.

    Each slide: slide_number, title, bullets (8 sentences), real_world_example,
    key_takeaway, unit "{unit_title}", topic "{topic}"

    Return ONLY a JSON array. Start with [ and end with ].
  """,
        debug_label=f"slides-{topic}-{start_num}",
    )


def generate_slides_for_topic(topic, unit_title, tone, depth):
    print("Generating slides for:", topic)
    llm = _get_llm()
    slide_groups = [
        (1, 5, "introduction and definitions"),
        (6, 10, "core concepts"),
        (11, 15, "technical details"),
        (16, 20, "advanced topics"),
        (21, 25, "applications"),
        (26, 30, "case studies")
    ]
    
    all_slides = []
    
    for start, end, focus in slide_groups:
        prompt = f"""Create 5 slides about {topic}.
Focus: {focus}
Unit: {unit_title}

Return only a JSON array.
First character must be [
Last character must be ]

[{{"slide_number":{start},"title":"Slide title about {topic}","bullets":["Point one about {topic} explained clearly","Point two with technical detail","Point three with real world example","Point four with key insight","Point five summarizing concept","Point six for deeper understanding"],"key_takeaway":"Key insight from this slide","unit":"{unit_title}","topic":"{topic}"}}]"""
        
        try:
            response = llm.invoke(prompt).content
            clean = response.strip()
            start_idx = clean.find('[')
            end_idx = clean.rfind(']')
            
            if start_idx != -1 and end_idx != -1:
                json_str = clean[start_idx:end_idx+1]
                batch = json.loads(json_str)
                if isinstance(batch, list):
                    all_slides.extend(batch)
                    print(f"Slides {start}-{end}: got",
                          len(batch))
                else:
                    print(f"Slides {start}-{end}: failed")
            else:
                print(f"Slides {start}-{end}: no brackets")
                
        except Exception as e:
            print(f"Slides {start}-{end} ERROR:", str(e))

    all_slides.sort(key=lambda s: s.get("slide_number", 0))
    for i, slide in enumerate(all_slides, start=1):
        slide["slide_number"] = i
        slide.setdefault("unit", unit_title)
        slide.setdefault("topic", topic)

    print(f"Total slides generated for {topic}:", len(all_slides))
    return all_slides


def _generate_mcq_batch(topic, unit_title, difficulty, batch_index, levels):
    return ask_ai_array(
        f"""
    Create exactly 10 MCQ questions about: {topic}
    Unit: {unit_title} | Difficulty: {difficulty}
    Bloom levels (distribute evenly): {levels}

    Each question: question_number, type "MCQ", question (15+ words),
    4 options, answer (exact option text), explanation (20+ words),
    bloom_level, unit, topic.

    Return ONLY a JSON array. Start with [ and end with ].
    """,
        debug_label=f"mcq-{topic}-batch{batch_index + 1}",
    )


def generate_mcq_for_topic(
        topic, unit_title, difficulty):
    
    llm = _get_llm()
    all_questions = []
    
    bloom_levels_list = [
        "Remember",
        "Understand", 
        "Apply",
        "Analyze",
        "Evaluate",
        "Create"
    ]
    
    for batch_idx, bloom in enumerate(
            bloom_levels_list):
        
        start_num = batch_idx * 8 + 1
        
        prompt = f"""Create 8 multiple choice questions.
Topic: {topic}
Bloom level: {bloom}
Difficulty: {difficulty}

Return only a JSON array.
First character must be [
Last character must be ]
Nothing else.

[{{"question_number":{start_num},"type":"MCQ","question":"Question about {topic} at {bloom} level here","options":["Option A","Option B","Option C","Option D"],"answer":"Option A","explanation":"Explanation here","bloom_level":"{bloom}","unit":"{unit_title}","topic":"{topic}"}}]"""
        
        try:
            response = llm.invoke(prompt).content
            print(f"Quiz {bloom} raw:", 
                  response[:100])
            
            clean = response.strip()
            
            # Remove any text before [
            start = clean.find('[')
            end = clean.rfind(']')
            
            if start != -1 and end != -1:
                json_str = clean[start:end+1]
                batch = json.loads(json_str)
                if isinstance(batch, list):
                    print(f"Quiz {bloom}: got",
                          len(batch), "questions")
                    all_questions.extend(batch)
                else:
                    print(f"Quiz {bloom}: not a list")
            else:
                print(f"Quiz {bloom}: no brackets found")
                print("Full response:", response[:300])
                
        except Exception as e:
            print(f"Quiz {bloom} ERROR:", str(e))
            print("Response was:", 
                  response[:200] 
                  if 'response' in dir() 
                  else "no response")
    
    for idx, q in enumerate(all_questions, start=1):
        q["question_number"] = idx
        q.setdefault("unit", unit_title)
        q.setdefault("topic", topic)
        q.setdefault("type", "MCQ")

    print(f"Total questions generated: {len(all_questions)}")
    return all_questions


def generate_notes_for_topic(topic, unit_title, tone):
    prompt = f"""
Write detailed comprehensive lecture notes.
Topic: {topic}
Unit: {unit_title}
Tone: {tone}

Return a JSON object.
Start with {{
End with }}
No other text before or after.

{{
  "topic": "{topic}",
  "unit": "{unit_title}",
  "introduction": "Write exactly 5 complete sentences. First sentence introduces the topic. Second explains why it matters. Third gives historical context or background. Fourth connects to previous knowledge. Fifth previews what will be covered.",
  "core_concepts": "Write exactly 8 complete sentences explaining the core concepts. Cover definitions, principles, and fundamental ideas. Use simple language with technical accuracy. Include at least 2 specific examples.",
  "deep_explanation": "Write exactly 8 complete sentences going deeper. Cover advanced aspects, edge cases, and nuances. Explain how components interact. Include technical details that experts know.",
  "real_world_application": "Write exactly 5 complete sentences. Give 3 specific industry examples. Explain how companies use this today. Connect to career relevance for students.",
  "common_mistakes": "Write exactly 5 sentences. List 4 specific mistakes students make. For each mistake explain exactly how to avoid it. Be specific not generic.",
  "exam_tips": "Write exactly 4 sentences with specific exam advice. What examiners typically ask. How to structure answers. Key terms to always include.",
  "summary": "Write exactly 3 sentences. First summarizes main concept. Second gives most important takeaway. Third motivates further study."
}}
"""

    result = ask_ai_long(prompt)

    if not result or not isinstance(result, dict):
        return {
            "topic": topic,
            "unit": unit_title,
            "introduction": f"{topic} is a core concept within {unit_title} that every student must understand deeply. It forms the foundation for many advanced topics in this subject. The concept has evolved significantly over time through research and practical application. Students familiar with basic principles will find this builds naturally on prior knowledge. This section covers definitions, mechanisms, applications, and assessment strategies for {topic}.",
            "core_concepts": f"The fundamental idea behind {topic} is understanding how its components interact systematically. At its core, {topic} relies on well-defined principles that govern its behavior. The first key concept involves the structure and organization of {topic}. The second concept addresses how {topic} processes information or performs operations. Third, {topic} interacts with related systems in predictable ways. Fourth, the efficiency and performance of {topic} depends on implementation choices. Fifth, standard practices have emerged from years of research into {topic}. Finally, {topic} can be extended and modified to suit specific requirements.",
            "deep_explanation": f"At an advanced level, {topic} involves subtle interactions that beginners often overlook. Experts in {topic} understand edge cases that cause problems in practice. The internal workings of {topic} reveal important design decisions made by its creators. When {topic} fails, it is usually due to misunderstanding these deeper principles. Comparing {topic} to similar concepts reveals its unique strengths and limitations. The theoretical foundations of {topic} are grounded in established computer science principles. Optimizing {topic} requires understanding both its time and space complexity characteristics. Advanced practitioners use {topic} as a building block for more sophisticated solutions.",
            "real_world_application": f"{topic} is actively used in major technology companies to solve real production problems. Software engineers encounter {topic} regularly when building scalable and reliable systems. Companies like Google, Amazon, and Microsoft rely on principles from {topic} in their core infrastructure. Understanding {topic} prepares students for technical interviews at top technology firms. The skills gained from mastering {topic} translate directly to higher salaries and better career opportunities.",
            "common_mistakes": f"The most common mistake students make with {topic} is memorizing definitions without understanding underlying principles. Second, students often skip practicing implementation which is essential for mastery. Third, many students confuse {topic} with superficially similar concepts leading to errors in exams and projects. Fourth, not connecting {topic} to real applications makes it harder to remember and apply. Always practice implementing {topic} from scratch multiple times until it becomes natural.",
            "exam_tips": f"Examiners testing {topic} most commonly ask about time complexity, implementation steps, and comparison with alternatives. Always start your answer by defining {topic} clearly before explaining its mechanism. Use diagrams when possible as they demonstrate understanding better than text alone. Key technical terms to include are: algorithm, complexity, implementation, optimization, and trade-offs.",
            "summary": f"{topic} is an essential component of {unit_title} that has wide practical applications in software development. The most important takeaway is understanding not just what {topic} is but when and why to use it. Mastering {topic} requires consistent practice and application to real problems beyond just theoretical understanding.",
        }

    return result


def check_and_fix_blooms(all_quiz):
    bloom_count = {
        "Remember": 0,
        "Understand": 0,
        "Apply": 0,
        "Analyze": 0,
        "Evaluate": 0,
        "Create": 0,
    }
    for q in all_quiz:
        level = q.get("bloom_level", "Remember")
        if level in bloom_count:
            bloom_count[level] += 1

    missing = [l for l, c in bloom_count.items() if c == 0]

    if missing and len(missing) <= 3:
        extra = ask_ai_array(
            f"""
        Create {len(missing)} MCQ questions at Bloom levels: {missing}
        Return ONLY a JSON array. Start with [ and end with ].
        """,
            debug_label="bloom-fix",
        )
        if isinstance(extra, list):
            all_quiz.extend(extra)

    total = max(len(all_quiz), 1)
    bloom_coverage = {
        k: round((sum(1 for q in all_quiz if q.get("bloom_level") == k) / total) * 100)
        for k in bloom_count
    }

    return all_quiz, bloom_coverage


def run_kalyx_agent(
    syllabus_text,
    tone="formal",
    depth="intermediate",
    difficulty="medium",
    max_units=None,
    max_topics=None,
):
    if not groq_configured():
        raise ValueError(
            "GROQ_API_KEY is not set. Add it to backend/.env and restart the server."
        )

    cap_units = max_units if max_units is not None else MAX_UNITS
    cap_topics = max_topics if max_topics is not None else MAX_TOPICS

    course_data = extract_units(syllabus_text)

    if not course_data or not course_data.get("units"):
        course_data = {
            "course": "Course",
            "units": [
                {
                    "unit_number": 1,
                    "title": "Main Content",
                    "topics": [syllabus_text[:150] or "Main topic"],
                    "outcomes": ["Understand main concepts"],
                }
            ],
        }

    units = course_data.get("units", [])[:cap_units]

    all_slides = []
    all_notes = []
    all_quiz = []

    print(f"Processing up to {cap_units} units, {cap_topics} topics per unit")

    for unit in units:
        topics = unit.get("topics", [unit["title"]])[:cap_topics]

        for topic_idx, topic in enumerate(topics):
            print(f"  Processing topic {topic_idx + 1}/{len(topics)}:", topic)

            slides = generate_slides_for_topic(
                topic, unit["title"], tone, depth
            )
            all_slides.extend(slides)

            notes = generate_notes_for_topic(
                topic, unit["title"], tone
            )
            if notes and isinstance(notes, dict):
                all_notes.append(notes)
                print(f"  Notes added for: {topic}")

            quiz = generate_mcq_for_topic(
                topic, unit["title"], difficulty
            )
            all_quiz.extend(quiz)

    all_quiz, bloom_coverage = check_and_fix_blooms(all_quiz)

    return {
        "course": course_data.get("course", "Course"),
        "total_units": len(units),
        "total_slides": len(all_slides),
        "total_quiz": len(all_quiz),
        "total_notes": len(all_notes),
        "units": [u["title"] for u in units],
        "slides": all_slides,
        "notes": all_notes,
        "quiz": all_quiz,
        "bloom_coverage": bloom_coverage,
    }
