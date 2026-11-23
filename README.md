# English → Hindi Word Learner (शब्दLearner)

A modern, full-stack Next.js web application for English to Hindi vocabulary learning. It provides instant Hindi translations, English definitions, Devanagari Hindi meanings, audio pronunciation, automatic **Firebase Firestore** synchronization, searchable vocabulary revision, 3D flashcards, and interactive quiz practice.

---

## 🏛️ System Architecture

```
┌────────────────────────┐      1. Lookup word       ┌────────────────────────┐
│     Client Browser     │ ────────────────────────► │   Next.js API Route    │
│ (React UI / Flashcards)│                           │      /api/lookup       │
└────────────────────────┘                           └───────────┬────────────┘
            ▲                                                    │
            │                                         2. Check Firestore Cache
            │                                            (already saved?)
            │                                                    │
            │                                ┌───────────────────┴───────────────────┐
            │                                │ YES: return saved doc (free & instant)│
            │                                │ NO:  call AI provider (OpenRouter)    │
            │                                │      → save new doc to Firestore      │
            │                                └───────────────────┬───────────────────┘
            │          3. Return result JSON                     │
            └────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🔍 Instant Word Lookup (`/`)
- Type any English word and get:
  1. **हिंदी अनुवाद (Hindi Translation)**: Accurate, multi-sense Devanagari translations.
  2. **Part of Speech**: Noun, verb, adjective, adverb, etc.
  3. **English Meaning**: Clear, concise dictionary definition.
  4. **हिंदी में अर्थ (Meaning in Hindi)**: Full conceptual explanation written in Hindi Devanagari.
  5. **Example Sentence**: Real-world contextual usage.
  6. **Audio Pronunciation**: Real recorded dictionary phonetics audio + Web Speech synthesis fallback.
- **Smart Duplicate Prevention**: If the word is already in your Firestore database, it retrieves the saved entry instantly and increments your lookup counter without consuming AI credits.
- **Direct Status Toggle**: Mark words as *New*, *Learning*, or *Learned* directly from the result card.

### 📚 My Words / Revise Page (`/revise`)
- Search across English words, Hindi translations, and English/Hindi meanings in real time.
- Filter by status: `All`, `New`, `Learning`, `Learned`.
- Sort by: `Newest First`, `Oldest First`, `A to Z`, `Most Looked Up`.
- Quick Stats cards tracking your vocabulary growth.
- **Export to CSV**: One-click download with UTF-8 BOM encoding for perfect Hindi Devanagari rendering in Excel and Google Sheets.
- Refresh / Sync button to pull fresh data from your Firestore database.

### 🎴 3D Flashcards Mode (`/revise/flashcards`)
- Interactive front/back card flip animation.
- Front: English word, part of speech, pronunciation speaker.
- Back: Hindi translations, English meaning, Hindi meaning, example sentence.
- **Keyboard Shortcuts**:
  - `Space` or `Enter`: Flip card
  - `→` (Right Arrow): Next card
  - `←` (Left Arrow): Previous card
  - `1`: Mark as "Still Learning"
  - `2`: Mark as "Knew It! (Learned)"
- Confetti celebration upon finishing the deck!

### 🎯 Interactive Quiz Mode (`/revise/quiz`)
- Multiple-choice questions auto-generated from your saved vocabulary.
- Real-time score counter and streak tracker.
- Immediate visual feedback on correct/incorrect choices.

### 🌗 Theme & Resilience
- **Dark / Light Mode**: Persistent theme toggle.
- **Zero-Setup Local Fallback**: If Firebase or OpenRouter keys are not yet configured, the app runs smoothly with local JSON storage (`.data/words.json`) and free dictionary services.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend & Backend** | **Next.js 14** (App Router) | Unified React UI and serverless API routes |
| **Styling** | **Tailwind CSS** | Responsive mobile-first layout with Devanagari typography |
| **Primary AI Provider** | **OpenRouter API** | Access to Claude 3.5 Sonnet, Gemini 2.0 Flash, GPT-4o, etc. |
| **Cloud Storage** | **Firebase Firestore** (`firebase-admin`) | Scalable NoSQL cloud document database for vocabulary storage |
| **Audio Pronunciation** | **Free Dictionary API + Web Speech** | Recorded audio phonetics with browser TTS fallback |
| **Icons & Effects** | **Lucide React & Canvas Confetti** | Crisp UI icons and celebration effects |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.17.0 or newer (tested on Node v22)
- **npm** or **pnpm** / **yarn**

### 2. Installation
```bash
git clone <repository-url>
cd Translator
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# AI Translation Provider (OpenRouter API)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Firebase Firestore Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

> 💡 **Tip**: If you leave `.env.local` empty, the app runs in **Local Storage Mode** with free dictionary services immediately!

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔥 Firebase Firestore Setup Guide (One-Time)

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/).
   - Click **Add Project** and give it a name (e.g. `word-learner`).

2. **Enable Cloud Firestore**:
   - In the left sidebar, click **Build** → **Firestore Database**.
   - Click **Create database**, choose a location (e.g. `asia-south1` or `us-central1`), and start in **Production mode** (or Test mode).

3. **Generate Service Account Credentials**:
   - Click the gear icon ⚙️ next to **Project Overview** → **Project settings**.
   - Navigate to the **Service accounts** tab.
   - Click **Generate new private key** → **Generate key**.
   - A `.json` credentials file will download.

4. **Copy Credentials to `.env.local`**:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (ensure `\n` linebreaks are preserved in quotes).

---

## 🔌 API Reference

### `POST /api/lookup`
Look up an English word. If already in your Firestore database, returns the cached document; otherwise queries OpenRouter and saves a new document to Firestore.

**Request Body:**
```json
{
  "word": "resilient"
}
```

**Response (200 OK):**
```json
{
  "id": "resilient",
  "word": "resilient",
  "partOfSpeech": "adjective",
  "hindiTranslation": ["लचीला", "सहनशील", "दृढ़"],
  "englishMeaning": "Able to withstand or recover quickly from difficult conditions.",
  "hindiMeaning": "कठिनाइयों या संकट से जल्दी उबरने में सक्षम।",
  "example": "He is a resilient person who never gives up during tough times.",
  "saved": true,
  "fromCache": false,
  "lookupCount": 1,
  "status": "new",
  "audioUrl": "https://api.dictionaryapi.dev/media/pronunciations/en/resilient-us.mp3"
}
```

### `GET /api/words`
Retrieve saved vocabulary from Firestore. Supports filtering and sorting.

**Query Parameters:**
- `q`: Search string (e.g. `?q=book`)
- `status`: `all` | `new` | `learning` | `learned`
- `sort`: `newest` | `oldest` | `alpha` | `lookups`

### `PATCH /api/words/:id`
Update a word's learning status (`new`, `learning`, `learned`).

### `DELETE /api/words/:id`
Remove a word document from the Firestore `words` collection.

### `GET /api/status`
Check real-time configuration status for Firebase Firestore, OpenRouter, and total saved words.

---

## 📁 Project Structure

```
Translator/
├── app/
│   ├── page.tsx                     # Home / word search & translation card
│   ├── layout.tsx                   # Root layout, theme provider & navigation
│   ├── globals.css                  # Tailwind styles & 3D card flip CSS
│   ├── revise/
│   │   ├── page.tsx                 # My Words vocabulary table & stats
│   │   ├── flashcards/page.tsx      # 3D Flashcard revision deck
│   │   └── quiz/page.tsx            # Multiple-choice vocabulary quiz
│   └── api/
│       ├── lookup/route.ts          # Word search, caching & Firestore auto-save
│       ├── words/
│       │   ├── route.ts             # List words, search, sort, filter
│       │   └── [id]/route.ts        # PATCH status & DELETE word
│       └── status/route.ts          # Diagnostic status check
├── components/
│   ├── Navbar.tsx                   # Top navigation with dark mode & Firestore status
│   ├── SearchBox.tsx                # Auto-focused search input & quick chips
│   ├── ResultCard.tsx               # Devanagari translation & audio card
│   ├── WordTable.tsx                # Filterable vocabulary table & CSV export
│   ├── Flashcard.tsx                # 3D interactive flashcard deck
│   ├── QuizCard.tsx                 # Vocabulary multiple choice quiz
│   └── StatusBanner.tsx             # Firebase setup instructions banner
├── lib/
│   ├── firestore.ts                 # Firebase Admin Firestore read/write & cache
│   ├── translate.ts                 # OpenRouter, Claude, Gemini & dictionary
│   ├── validate.ts                  # Input sanitization & schema validation
│   └── types.ts                     # TypeScript interfaces
├── .data/                           # Local fallback storage (gitignored)
├── .env.example                     # Environment template
├── .env.local                       # Local secrets (gitignored)
├── .gitignore                       # Git ignore configuration
└── package.json
```

---

## 📄 License

MIT License.
