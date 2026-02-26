import os
import json
import requests
import time
import re
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import anthropic
import sqlite3

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')
CORS(app)

# ── Config ────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY   = os.getenv("ANTHROPIC_API_KEY", "YOUR_ANTHROPIC_API_KEY")
ZAPIER_EMAIL_COACH  = os.getenv("ZAPIER_EMAIL_COACH_URL", "")
ZAPIER_EMAIL_CLIENT = os.getenv("ZAPIER_EMAIL_CLIENT_URL", "")
ZAPIER_WHATSAPP     = os.getenv("ZAPIER_WHATSAPP_URL", "")
ZAPIER_SMS          = os.getenv("ZAPIER_SMS_URL", "")

DB_PATH = os.getenv("DATABASE_PATH", "/app/backend/mpg_pods.db")

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# ── Database ──────────────────────────────────────────────────────────────────
def get_db():
    db_path = os.getenv("DATABASE_PATH", "/app/backend/mpg_pods.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS coaches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT,
            email TEXT,
            phone TEXT,
            whatsapp TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (coach_id) REFERENCES coaches(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL,
            client_id INTEGER,
            client_name_raw TEXT,
            session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            transcript_raw TEXT,
            transcript_anonymized TEXT,
            themes TEXT,
            drafted_message TEXT,
            status TEXT DEFAULT 'processed',
            FOREIGN KEY (coach_id) REFERENCES coaches(id),
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS podcast_recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            episode_title TEXT,
            podcast_name TEXT,
            listen_notes_id TEXT,
            listen_notes_url TEXT,
            apple_url TEXT,
            duration_seconds INTEGER,
            golden_nugget_timestamp TEXT,
            golden_nugget_reason TEXT,
            relevance_score REAL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS frameworks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            short_description TEXT NOT NULL,
            implementation_url TEXT,
            category TEXT,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS session_frameworks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            framework_id INTEGER NOT NULL,
            relevance_reason TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(id),
            FOREIGN KEY (framework_id) REFERENCES frameworks(id)
        )
    """)

    # Seed a default coach for single-user mode
    c.execute("""
        INSERT OR IGNORE INTO coaches (id, name, email)
        VALUES (1, 'MPG Coach', 'coach@mpgpods.com')
    """)

    conn.commit()
    conn.close()
    logger.info("Database initialized")

# ── Claude AI ─────────────────────────────────────────────────────────────────
def analyze_transcript_with_claude(transcript: str) -> dict:
    """Full transcript analysis: anonymize, extract themes, get frameworks, draft message."""

    prompt = f"""You are an Executive Coaching Assistant and strict Privacy Officer.

STEP 1 — ANONYMIZE
Redact every proper noun referring to a person, company, or project:
- Replace individual names with [Client] or [Stakeholder]
- Replace companies/entities with [Company]
- Replace specific projects with [Project]
- If even 1% unsure, REDACT IT.

STEP 2 — EXTRACT THEMES (3–5)
Focus on:
- Leadership & management challenges
- Strategic decision-making roadblocks
- Mindset shifts and emotional triggers
- Performance, productivity, delegation issues
- Health/wellness factors affecting executive performance (sleep, stress, energy)
- Current trends in business, coaching, and executive leadership
- Classic and emerging frameworks that apply

STEP 3 — RECOMMEND FRAMEWORKS (1–3)
For each theme, consider well-known business/leadership frameworks that could help.
Only recommend frameworks that genuinely apply. For each:
- Name of framework
- One-sentence description of what it is
- Why it applies to THIS session (generic, not client-specific)
- A real URL to an authoritative page explaining implementation. Use only stable, well-known URLs that are unlikely to 404. Prefer Wikipedia, MindTools, or official framework websites over specific HBR or McKinsey articles. Example good URLs: https://www.mindtools.com/pages/article/newPPM_91.htm or https://en.wikipedia.org/wiki/OKR. Never invent URLs.

STEP 4 — DRAFT SMS MESSAGE
Write a warm, casual peer-to-peer message (like texting a colleague).
- DO NOT mention company names
- DO NOT include a sign-off or closing question
- DO NOT end with questions like "Want me to send it over?" or "Let me know if you want more"
- The message IS the delivery — write it as if you are already sending the content, not asking permission
- Reference the themes and why the content is relevant
- Keep under 150 words — this will be read as a text message
- Sound personally curated, not automated
- End with a confident closing line like "Worth a look." or "Think it'll land well."

Respond ONLY with valid JSON in this exact structure:
{{
  "anonymized_transcript": "...",
  "themes": [
    {{
      "name": "Theme Name",
      "description": "Current situation and thinking",
      "coaching_need": "What would help"
    }}
  ],
  "search_keywords": ["keyword1", "keyword2", "keyword3"],
  "frameworks": [
    {{
      "name": "Framework Name",
      "short_description": "One sentence description",
      "relevance_reason": "Why this applies generically",
      "implementation_url": "https://..."
    }}
  ],
  "drafted_message": "SMS-style message here..."
}}

TRANSCRIPT:
{transcript}
"""

    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    # Strip markdown code fences if present
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'\s*```$', '', text)

    return json.loads(text)


# High-quality podcast allowlist mapped to executive coaching domains
QUALITY_PODCASTS = [
    # Executive Leadership Development & Advisory
    "HBR IdeaCast",
    "The McKinsey Podcast",
    "Coaching for Leaders",
    "The Leadership Podcast",
    "On Leadership",
    "Masters of Scale",
    "The CEO Podcast",
    "How I Built This",
    "Dare to Lead",
    "Dare to Lead with Brené Brown",

    # Business Strategy, Growth & Operational Thought Partnership
    "Acquired",
    "The Startup Podcast",
    "How I Built This",
    "The Tim Ferriss Show",
    "WorkLife with Adam Grant",
    "The Diary of a CEO",
    "Invest Like the Best",
    "The EntreLeadership Podcast",
    "Lenny's Podcast",
    "Masters of Scale",

    # High-Performance Mindset & Confidence Building
    "Finding Mastery",
    "Impact Theory",
    "The School of Greatness",
    "The Mindset Mentor",
    "The High Performance Podcast",
    "Good Life Project",
    "The Tony Robbins Podcast",
    "The James Altucher Show",
    "The Jordan Harbinger Show",

    # Strategic Decision-Making & Capacity Expansion
    "The Knowledge Project",
    "Deep Questions with Cal Newport",
    "Lex Fridman Podcast",
    "Making Sense with Sam Harris",
    "Hidden Brain",
    "Freakonomics Radio",

    # Cross-Functional Leadership & People Management
    "WorkLife with Adam Grant",
    "The Culture Code",
    "Radical Candor",
    "Manager Tools",
    "The Diary of a CEO",

    # Effective Communication, Influence & Executive Presence
    "TED Talks Daily",
    "The Art of Charm",
    "The Jordan Harbinger Show",
    "Exactly Right",
    "Speak Up with Laura Camacho",

    # Holistic Wellness & Performance (Physical, Nutrition, Sleep, Stress)
    "Huberman Lab",
    "The Drive with Peter Attia",
    "Feel Better Live More",
    "The Model Health Show",
    "On Purpose with Jay Shetty",
    "Ten Percent Happier",
    "The Rich Roll Podcast",
    "Optimal Living Daily",

    # Resilience in High-Stakes Environments
    "Jocko Podcast",
    "The Tim Ferriss Show",
    "Finding Mastery",
    "Armchair Expert",
    "No Stupid Questions",

    # Personal & Professional Transition Management
    "Life Kit",
    "Good Life Project",
    "The School of Greatness",
    "Unlocking Us with Brené Brown",

    # Family & Relationship Integration
    "Where Should We Begin",
    "On Purpose with Jay Shetty",
    "Unlocking Us with Brené Brown",
    "The Gottman Podcast",
]

def search_itunes(keywords: list) -> list:
    """Search iTunes/Apple Podcasts for high-quality relevant episodes."""
    all_episodes = []
    seen_ids = set()

    for keyword in keywords[:3]:
        try:
            params = {
                "term": keyword + " executive leadership coaching mindset performance",
                "media": "podcast",
                "entity": "podcastEpisode",
                "limit": 20,
                "lang": "en_us",
            }
            r = requests.get(
                "https://itunes.apple.com/search",
                params=params,
                timeout=10
            )
            if r.status_code == 200:
                for ep in r.json().get("results", []):
                    ep_id = ep.get("trackId")
                    if not ep_id or ep_id in seen_ids:
                        continue
                    score = score_itunes_episode(ep, keyword)
                    if score < 3:  # Skip low quality
                        continue
                    seen_ids.add(ep_id)
                    ep["_score"] = score
                    all_episodes.append(ep)
            time.sleep(0.1)
        except Exception as e:
            logger.warning(f"iTunes search error for '{keyword}': {e}")

    all_episodes.sort(key=lambda x: x.get("_score", 0), reverse=True)
    return all_episodes[:3]


def score_itunes_episode(ep: dict, keyword: str) -> float:
    score = 0.0
    title = ep.get("trackName", "").lower()
    desc  = ep.get("description", "").lower()
    podcast = ep.get("collectionName", "").lower()

    kw = keyword.lower()
    if kw in title: score += 5
    if kw in desc:  score += 2

    # Boost for quality podcast names
    for q in QUALITY_PODCASTS:
        if q.lower() in podcast:
            score += 6
            break

    # Boost for executive/leadership terms in title
    exec_terms = ["ceo", "executive", "leader", "strategy", "founder", "mindset", "coaching"]
    for t in exec_terms:
        if t in title:
            score += 1

    return score


def estimate_golden_nugget(duration_sec: int) -> str:
    """Estimate a golden nugget timestamp."""
    if duration_sec <= 0:
        return "00:10:00"
    start = max(300, int(duration_sec * 0.20))
    h = start // 3600
    m = (start % 3600) // 60
    s = start % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def upsert_frameworks(db, frameworks: list, session_id: int):
    """Insert new frameworks if they don't exist, link to session."""
    c = db.cursor()
    for fw in frameworks:
        name = fw.get("name", "").strip()
        if not name:
            continue
        # Check if exists
        c.execute("SELECT id FROM frameworks WHERE name = ?", (name,))
        row = c.fetchone()
        if row:
            fw_id = row["id"]
        else:
            c.execute("""
                INSERT INTO frameworks (name, short_description, implementation_url, category)
                VALUES (?, ?, ?, ?)
            """, (
                name,
                fw.get("short_description", ""),
                fw.get("implementation_url", ""),
                fw.get("category", "Leadership")
            ))
            fw_id = c.lastrowid

        c.execute("""
            INSERT INTO session_frameworks (session_id, framework_id, relevance_reason)
            VALUES (?, ?, ?)
        """, (session_id, fw_id, fw.get("relevance_reason", "")))


# ── Routes: Clients ───────────────────────────────────────────────────────────
@app.route("/api/clients", methods=["GET"])
def get_clients():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM clients WHERE coach_id = 1 ORDER BY first_name"
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/clients", methods=["POST"])
def create_client():
    data = request.json
    db = get_db()
    db.execute("""
        INSERT INTO clients (coach_id, first_name, last_name, email, phone, whatsapp, notes)
        VALUES (1, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("first_name",""),
        data.get("last_name",""),
        data.get("email",""),
        data.get("phone",""),
        data.get("whatsapp",""),
        data.get("notes","")
    ))
    db.commit()
    client_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    client = db.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
    db.close()
    return jsonify(dict(client)), 201


@app.route("/api/clients/<int:client_id>", methods=["PUT"])
def update_client(client_id):
    data = request.json
    db = get_db()
    db.execute("""
        UPDATE clients
        SET first_name=?, last_name=?, email=?, phone=?, whatsapp=?, notes=?
        WHERE id=? AND coach_id=1
    """, (
        data.get("first_name",""),
        data.get("last_name",""),
        data.get("email",""),
        data.get("phone",""),
        data.get("whatsapp",""),
        data.get("notes",""),
        client_id
    ))
    db.commit()
    client = db.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
    db.close()
    return jsonify(dict(client))


@app.route("/api/clients/search", methods=["GET"])
def search_clients():
    name = request.args.get("name", "").strip().lower()
    db = get_db()
    rows = db.execute("""
        SELECT * FROM clients
        WHERE coach_id = 1
        AND (LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ?)
    """, (f"%{name}%", f"%{name}%")).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


# ── Routes: Sessions ──────────────────────────────────────────────────────────
@app.route("/api/sessions/process", methods=["POST"])
def process_session():
    data = request.json
    transcript = data.get("transcript", "").strip()
    client_name = data.get("client_name", "").strip()
    client_id = data.get("client_id")

    if not transcript:
        return jsonify({"error": "Transcript is required"}), 400

    try:
        # 1. Claude analysis
        logger.info("Running Claude analysis...")
        analysis = analyze_transcript_with_claude(transcript)

        # 2. Save session to DB immediately after Claude analysis
        db = get_db()
        db.execute("""
            INSERT INTO sessions
            (coach_id, client_id, client_name_raw, transcript_raw, transcript_anonymized,
             themes, drafted_message)
            VALUES (1, ?, ?, ?, ?, ?, ?)
        """, (
            client_id,
            client_name,
            transcript,
            analysis.get("anonymized_transcript", ""),
            json.dumps(analysis.get("themes", [])),
            analysis.get("drafted_message", "")
        ))
        db.commit()
        session_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        upsert_frameworks(db, analysis.get("frameworks", []), session_id)
        db.commit()

        # 3. Search Listen Notes
        logger.info("Searching Listen Notes...")
        keywords = analysis.get("search_keywords", [client_name, "executive leadership"])
        episodes = []
        import signal
        def _ln_timeout(signum, frame): raise Exception("Listen Notes timeout")
        signal.signal(signal.SIGALRM, _ln_timeout)
        signal.alarm(25)
        try:
            episodes = search_itunes(keywords)
            signal.alarm(0)
        except Exception as e:
            signal.alarm(0)
            logger.warning(f"Listen Notes failed or timed out: {e}")
            episodes = []

        # 4. Build and save episode records
        episode_records = []
        for ep in episodes:
            duration_ms = ep.get("trackTimeMillis", 0)
            duration_sec = duration_ms // 1000 if duration_ms else 0
            track_id = ep.get("trackId", "")
            collection_id = ep.get("collectionId", "")
            # Build direct Apple Podcasts episode link
            apple_url = f"https://podcasts.apple.com/podcast/id{collection_id}?i={track_id}" if track_id and collection_id else ep.get("trackViewUrl", "")
            episode_records.append({
                "episode_title": ep.get("trackName", ""),
                "podcast_name": ep.get("collectionName", ""),
                "listen_notes_id": str(track_id),
                "listen_notes_url": apple_url,
                "apple_url": apple_url,
                "duration_seconds": duration_sec,
                "golden_nugget_timestamp": estimate_golden_nugget(duration_sec),
                "golden_nugget_reason": "High-value insight segment",
                "relevance_score": ep.get("_score", 0)
            })

        for ep in episode_records:
            db.execute("""
                INSERT INTO podcast_recommendations
                (session_id, episode_title, podcast_name, listen_notes_id,
                 listen_notes_url, duration_seconds, golden_nugget_timestamp,
                 golden_nugget_reason, relevance_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id, ep["episode_title"], ep["podcast_name"],
                ep["listen_notes_id"], ep["listen_notes_url"],
                ep["duration_seconds"], ep["golden_nugget_timestamp"],
                ep["golden_nugget_reason"], ep["relevance_score"]
            ))
        db.commit()

        # Fetch frameworks for response
        fw_rows = db.execute("""
            SELECT f.*, sf.relevance_reason
            FROM frameworks f
            JOIN session_frameworks sf ON f.id = sf.framework_id
            WHERE sf.session_id = ?
        """, (session_id,)).fetchall()

        db.close()

        return jsonify({
            "success": True,
            "session_id": session_id,
            "themes": analysis.get("themes", []),
            "drafted_message": analysis.get("drafted_message", ""),
            "episodes": episode_records,
            "frameworks": [dict(r) for r in fw_rows],
            "anonymized_transcript": analysis.get("anonymized_transcript", "")
        })

    except Exception as e:
        logger.error(f"Error processing session: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    client_id = request.args.get("client_id")
    db = get_db()
    if client_id:
        rows = db.execute("""
            SELECT s.*, c.first_name, c.last_name
            FROM sessions s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.coach_id = 1 AND s.client_id = ?
            ORDER BY s.session_date DESC
        """, (client_id,)).fetchall()
    else:
        rows = db.execute("""
            SELECT s.*, c.first_name, c.last_name
            FROM sessions s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.coach_id = 1
            ORDER BY s.session_date DESC LIMIT 50
        """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/sessions/<int:session_id>", methods=["GET"])
def get_session(session_id):
    db = get_db()
    session = db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not session:
        return jsonify({"error": "Not found"}), 404

    podcasts = db.execute(
        "SELECT * FROM podcast_recommendations WHERE session_id = ?", (session_id,)
    ).fetchall()

    frameworks = db.execute("""
        SELECT f.*, sf.relevance_reason
        FROM frameworks f
        JOIN session_frameworks sf ON f.id = sf.framework_id
        WHERE sf.session_id = ?
    """, (session_id,)).fetchall()

    db.close()
    result = dict(session)
    result["themes"] = json.loads(result.get("themes") or "[]")
    result["podcasts"] = [dict(r) for r in podcasts]
    result["frameworks"] = [dict(r) for r in frameworks]
    return jsonify(result)


# ── Routes: Frameworks ────────────────────────────────────────────────────────
@app.route("/api/frameworks", methods=["GET"])
def get_frameworks():
    db = get_db()
    rows = db.execute("SELECT * FROM frameworks ORDER BY name").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


# ── Routes: Delivery via Zapier ───────────────────────────────────────────────
@app.route("/api/deliver", methods=["POST"])
def deliver():
    data = request.json
    method = data.get("method")  # email_coach, email_client, whatsapp, sms
    payload = data.get("payload", {})

    url_map = {
        "email_coach":  ZAPIER_EMAIL_COACH,
        "email_client": ZAPIER_EMAIL_CLIENT,
        "whatsapp":     ZAPIER_WHATSAPP,
        "sms":          ZAPIER_SMS,
    }

    url = url_map.get(method)
    if not url:
        return jsonify({"error": f"No Zapier URL configured for method: {method}"}), 400

    try:
        r = requests.post(url, json=payload, timeout=10)
        return jsonify({"success": True, "status": r.status_code})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Serve React frontend ──────────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


init_db()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
