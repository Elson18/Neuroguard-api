# Agentic AI Platform

Production-style **Agent-as-a-Service** stack: vanilla HTML/CSS/JS frontend, FastAPI + MongoDB backend, JWT auth, per-agent API keys, LangGraph orchestration, Groq LLMs, and optional PDF RAG (FAISS + HuggingFace embeddings).

## Quick start (local)

1. Install and start **MongoDB** locally (or point `MONGO_URI` to MongoDB Atlas).
2. Copy environment template and fill secrets:

```bash
cp backend/.env.example backend/.env
```

Set at minimum:

- `MONGO_URI` (for example `mongodb://localhost:27017`)
- `GROQ_API_KEY` (from Groq Cloud)
- `JWT_SECRET` (long random string)

3. Create a virtual environment and install Python dependencies:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

4. Run the API + static UI:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open `http://127.0.0.1:8000/` in a browser.

## Core API surface

- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`
- `GET /api/dashboard/stats`
- `GET|POST|PATCH|DELETE /api/agents` (CRUD + `POST /api/agents/{id}/regenerate-key`)
- `POST /api/chat` (JWT session chat)
- `POST /api/agents/{id}/rag/upload` (multipart PDF upload for RAG-enabled agents)
- `POST /agent/{agent_name}` (public agent execution with `X-API-Key: sk_agent_...`)

Example public call:

```bash
curl -sS -X POST "http://127.0.0.1:8000/agent/My%20Agent" ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: sk_agent_your_key_here" ^
  -d "{\"message\":\"Hello\"}"
```

## Deployment notes

### Render / Railway (recommended for this repo)

- **Build**: install `backend/requirements.txt`.
- **Start** (from `backend/`): `uvicorn main:app --host 0.0.0.0 --port $PORT` (Railway/Render inject `PORT`).
- **Health check**: `GET /health`.
- Set environment variables from `backend/.env.example` in the provider UI (never commit real secrets).

### MongoDB Atlas

Use an Atlas SRV URI for `MONGO_URI` and allow your hosting egress IPs (or `0.0.0.0/0` for early prototypes only).

### Vercel / Netlify

These hosts are optimized for static sites and serverless functions. This project is a **long-running FastAPI** server plus heavy ML dependencies (sentence-transformers / FAISS), so the typical pattern is:

- Deploy the **backend** on Render/Railway/Fly.io.
- Deploy the **frontend** as static files **only if** you split hosting, and configure `CORS_ORIGINS` to include the static origin.

The default setup in this repository serves the UI from the same FastAPI process for simplicity.

## Security

- Passwords are hashed with **bcrypt**; API keys are stored as **SHA-256** digests for constant-time lookup.
- **JWT** protects dashboard/session APIs; **API keys** protect `POST /agent/{agent_name}`.
- **SlowAPI** rate limits sensitive endpoints (auth, chat, public agent execution).
- Tune `CORS_ORIGINS` for production.

## Future extension points

See `backend/future_extensions.py` for roadmap hooks (multi-agent, voice, vision, browser automation, marketplace, teams).
