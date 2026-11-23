# English → Hindi Word Learner (शब्दLearner)

A modern, full-stack Next.js web application for English to Hindi vocabulary learning. It provides instant Hindi translations, English definitions, Devanagari Hindi meanings, audio pronunciation, automatic Google Sheets synchronization, searchable vocabulary revision, 3D flashcards, and interactive quiz practice.

---

## 🏛️ System Architecture

```
┌────────────────────────┐      1. Lookup word       ┌────────────────────────┐
│     Client Browser     │ ────────────────────────► │   Next.js API Route    │
│ (React UI / Flashcards)│                           │      /api/lookup       │
└────────────────────────┘                           └───────────┬────────────┘
            ▲                                                    │
            │                                         2. Check Storage Cache
            │                                            (already saved?)
            │                                                    │
            │                                ┌───────────────────┴───────────────────┐
            │                                │ YES: return saved row (free & instant)│
            │                                │ NO:  call AI provider (OpenRouter)    │
            │                                │      → save new row to Google Sheet   │
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
- **Smart Duplicate Prevention**: If the word is already in your Sheet, it retrieves the saved entry instantly and increments your lookup counter without consuming AI credits.
- **Direct Status Toggle**: Mark words as *New*, *Learning*, or *Learned* directly from the result card.

### 📚 My Words / Revise Page (`/revise`)
- Search across English words, Hindi translations, and English/Hindi meanings in real time.
- Filter by status: `All`, `New`, `Learning`, `Learned`.
- Sort by: `Newest First`, `Oldest First`, `A to Z`, `Most Looked Up`.
- Quick Stats cards tracking your vocabulary growth.
- **Export to CSV**: One-click download with UTF-8 BOM encoding for perfect Hindi Devanagari rendering in Excel and Google Sheets.
- Refresh / Sync button to pull fresh data from your Google Sheet.

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
- **Zero-Setup Local Mode**: If Google Sheets or OpenRouter keys are not yet configured, the app runs smoothly with local JSON storage (`.data/words.json`) and free dictionary services.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend & Backend** | **Next.js 14** (App Router) | Unified React UI and serverless API routes |
| **Styling** | **Tailwind CSS** | Responsive mobile-first layout with Devanagari typography |
| **Primary AI Provider** | **OpenRouter API** | Access to Claude 3.5 Sonnet, Gemini 2.0 Flash, GPT-4o, etc. |
| **Cloud Storage** | **Google Sheets API v4** | Google Service Account authentication for automatic sync |
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
Copy the `.env.example` file to `.env.local`:
```bash
cp .env.example .env.local
```

Open `.env.local` and add your keys:
```env
# AI Translation Provider (OpenRouter API)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Google Sheets Configuration (Optional for local testing)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_google_sheet_id_from_url
```

> 💡 **Tip**: If you leave `.env.local` empty, the app runs in **Local Storage Mode** with free dictionary services immediately!

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 OpenRouter Model Configuration

OpenRouter gives you access to top LLMs via a single API key. You can customize the model by setting `OPENROUTER_MODEL` in `.env.local`:

| Model Identifier | Provider | Strengths |
|---|---|---|
| `anthropic/claude-3.5-sonnet` (Default) | Anthropic | Highest Hindi translation nuance and rich definitions |
| `google/gemini-2.0-flash-001` | Google | Ultra fast, cost-effective |
| `openai/gpt-4o-mini` | OpenAI | Fast, inexpensive |
| `deepseek/deepseek-chat` | DeepSeek | Very low cost |

---

## 📊 Google Sheets Setup Guide (One-Time)

To sync your lookups to Google Sheets:

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project (e.g. `WordLearner`).

2. **Enable Google Sheets API**:
   - Go to **APIs & Services** → **Library**.
   - Search for **Google Sheets API** and click **Enable**.

3. **Create Service Account**:
   - Go to **APIs & Services** → **Credentials**.
   - Click **Create Credentials** → **Service Account**.
   - Name it `sheets-writer` and click **Done**.
   - Click on the newly created service account → **Keys** tab → **Add Key** → **Create new key** → Choose **JSON**.
   - Download the file (do NOT commit this file to Git!).

4. **Prepare the Google Sheet**:
   - Open [Google Sheets](https://sheets.new) and create a new spreadsheet.
   - Rename the first tab to **`Words`**.
   - Paste these headers into row 1 (columns A through K):
     ```
     id | word | part_of_speech | hindi_translation | english_meaning | hindi_meaning | example_sentence | status | lookup_count | date_added | last_viewed
     ```
   - Click **Share** (top right) and invite the **Service Account Email** (found in your downloaded JSON key) with **Editor** access.

5. **Copy Sheet ID into `.env.local`**:
   - Your Sheet URL looks like: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
   - Copy the string between `/d/` and `/edit` into `GOOGLE_SHEET_ID`.
   - Copy `client_email` into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - Copy `private_key` into `GOOGLE_PRIVATE_KEY` (keep the `\n` linebreaks intact inside quotes).

---

## 🔌 API Reference

### `POST /api/lookup`
Look up an English word. If already in your Sheet/database, returns the cached entry; otherwise queries OpenRouter and appends to the Sheet.

**Request Body:**
```json
{
  "word": "resilient"
}
```

**Response (200 OK):**
```json
{
  "id": "1",
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
Retrieve saved vocabulary. Supports filtering and sorting.

**Query Parameters:**
- `q`: Search string (e.g. `?q=book`)
- `status`: `all` | `new` | `learning` | `learned`
- `sort`: `newest` | `oldest` | `alpha` | `lookups`

### `PATCH /api/words/:id`
Update a word's learning status.

**Request Body:**
```json
{
  "status": "learned"
}
```

### `DELETE /api/words/:id`
Remove a word from the Sheet or local database.

### `GET /api/status`
Check real-time configuration status for Google Sheets, OpenRouter, and active word count.

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
│       ├── lookup/route.ts          # Word search, caching & auto-save API
│       ├── words/
│       │   ├── route.ts             # List words, search, sort, filter
│       │   └── [id]/route.ts        # PATCH status & DELETE word
│       └── status/route.ts          # Diagnostic status check
├── components/
│   ├── Navbar.tsx                   # Top navigation with dark mode & status
│   ├── SearchBox.tsx                # Auto-focused search input & quick chips
│   ├── ResultCard.tsx               # Devanagari translation & audio card
│   ├── WordTable.tsx                # Filterable vocabulary table & CSV export
│   ├── Flashcard.tsx                # 3D interactive flashcard deck
│   ├── QuizCard.tsx                 # Vocabulary multiple choice quiz
│   └── StatusBanner.tsx             # Setup instructions banner
├── lib/
│   ├── translate.ts                 # OpenRouter, Claude, Gemini & dictionary
│   ├── sheets.ts                    # Google Sheets API v4 & local fallback
│   ├── validate.ts                  # Input sanitization & schema validation
│   └── types.ts                     # TypeScript interfaces
├── .data/                           # Local fallback storage (gitignored)
├── .env.example                     # Environment template
├── .env.local                       # Local secrets (gitignored)
├── .gitignore                       # Git ignore configuration
└── package.json
```

---

## ❓ Frequently Asked Questions

<details>
<summary><strong>1. What happens if I haven't set up Google Sheets yet?</strong></summary>
The app includes an automatic fallback. When <code>GOOGLE_SHEET_ID</code> is absent, all lookups and status updates are saved to <code>.data/words.json</code> locally. Once you add your Google credentials, it will automatically sync directly to your Google Sheet without code changes.
</details>

<details>
<summary><strong>2. Why is my Google Private Key failing?</strong></summary>
Ensure the private key in <code>.env.local</code> is wrapped in double quotes and linebreaks are preserved or escaped as <code>\n</code>:
<pre>GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkq...\n-----END PRIVATE KEY-----\n"</pre>
</details>

<details>
<summary><strong>3. Can I use a model other than Claude 3.5 Sonnet on OpenRouter?</strong></summary>
Yes! Simply change <code>OPENROUTER_MODEL</code> in your <code>.env.local</code> to any model supported by OpenRouter (e.g. <code>google/gemini-2.0-flash-001</code>, <code>openai/gpt-4o-mini</code>, etc.).
</details>

---

## 📄 License

MIT License. Feel free to use and customize for your own language learning!
