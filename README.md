# 🔍 TruthEngine — AI Fake News Detector

> A full-stack fake news detection app powered by **Groq API (LLaMA3-70B)** with a dark, animated cyberpunk frontend.

---

## 📁 Project Structure

```
fake-news-detector/
├── backend/
│   ├── server.js          ← Express API server
│   ├── package.json
│   └── .env.example       ← Copy to .env and add your Groq key
│
└── frontend/
    ├── index.html         ← Main HTML
    ├── css/
    │   ├── style.css      ← All component styles
    │   └── animations.css ← All keyframes & motion effects
    └── js/
        ├── particles.js   ← Animated particle network canvas
        ├── scanner.js     ← Scanning animation & state machine
        ├── renderer.js    ← Maps AI JSON → DOM elements
        └── app.js         ← Main logic, API calls, examples
```

---

## 🚀 Quick Start

### 1. Get a Free Groq API Key

Go to [https://console.groq.com](https://console.groq.com) → Create account → **API Keys** → **Create new key**.

### 2. Setup the Backend

```bash
cd backend
cp .env.example .env
# Edit .env and paste your Groq key:
# GROQ_API_KEY=gsk_your_key_here

npm install
npm start
# → Server runs on http://localhost:3001
```

### 3. Open the Frontend

Simply open `frontend/index.html` in your browser, or serve it with any static server:

```bash
cd frontend
npx serve .          # or: python3 -m http.server 8080
```

---

## 🧠 What It Analyzes

The AI returns a full JSON report with the following fields:

| Field | Description |
|---|---|
| `verdict` | `FAKE` / `REAL` / `MISLEADING` / `UNVERIFIABLE` / `SATIRE` |
| `credibility_score` | Integer from 0–100 |
| `about` | What the news is actually about |
| `red_flags` | Specific red flags found |
| `green_flags` | Credibility indicators |
| `bias_type` | Political / corporate / emotional bias |
| `manipulation_techniques` | Propaganda patterns detected |
| `recommendation` | What to do with this information |
| `fact_check_queries` | Search queries to verify claims |
| `full_analysis` | 4–5 paragraph deep-dive report |
| `signals` | 6 linguistic signal scores (0–100 each) |
| `tags` | Summary tags |
| `category` | Politics / Health / Science / etc. |
| `severity` | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |

---

## ✨ Frontend Features

- 🌐 Particle network background with mouse repulsion (canvas)
- 🔲 Animated grid with infinite drift
- 📺 Scanline CRT overlay effect
- 📡 Live ticker tape with scanning status
- 🔄 6-step scanning animation sequence
- 🔵 Credibility ring SVG with animated `stroke-dashoffset`
- 📊 Signal bars with staggered fill animations
- ⚡ Verdict glitch text animation on reveal
- 🏷️ Tag pop-in with staggered delays
- ✨ Shimmer sweep on the input card
- 🔮 Floating orbs with blur and float animations
- ⌨️ `Ctrl+Enter` keyboard shortcut to analyze
- 🎮 Demo mode when backend isn't running

---

## 🛠 API Reference

### `POST /api/analyze`

Analyze a news article or text snippet.

**Request**
```json
{ "text": "Your news article here..." }
```

**Response**
```json
{ "success": true, "result": { ...analysis JSON... } }
```

---

### `GET /api/health`

Check server status.

```json
{ "status": "ok", "model": "llama3-70b-8192", "timestamp": "..." }
```

---

## 🔧 Customization

| What | Where |
|---|---|
| Change AI model | Edit `model` in `backend/server.js` (e.g. `mixtral-8x7b-32768`) |
| Change server port | Set `PORT=3002` in `.env` |
| Adjust AI prompt | Edit `SYSTEM_PROMPT` in `backend/server.js` |
| Edit color theme | Modify CSS variables in `frontend/css/style.css` |

---

## 📦 Backend Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server |
| `groq-sdk` | Official Groq client |
| `cors` | Cross-origin requests |
| `dotenv` | Environment variables |

---

## ⚠️ Disclaimer

AI analysis results are **indicative only**. Always verify news claims through trusted primary sources and established fact-checking organizations:

- [Snopes](https://www.snopes.com)
- [PolitiFact](https://www.politifact.com)
- [FactCheck.org](https://www.factcheck.org)
- [AP Fact Check](https://apnews.com/ap-fact-check)
- [Reuters Fact Check](https://www.reuters.com/fact-check)

---

## 📄 License

This project is open source. Feel free to fork, modify, and build upon it.
