# Ruthless Viva Simulator 🎓💀

A "ruthless" AI examiner that conducts oral exams, detects filler words, and judges your confidence.

## 🌟 Features
- **AI Examiner**: Powered by Google Gemini.
- **Voice Interaction**: Realistic voices via ElevenLabs.
- **Syllabus Upload**: Upload PDF notes or paste text for specific questions.
- **Live Analysis**: Real-time detection of filler words ("um", "uh") and confidence tracking.
- **Detailed Reports**: Post-exam feedback with scores and improvement tips.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js installed (v18+ recommended).
- API Keys for:
    - **Google Gemini** (Generative AI)
    - **ElevenLabs** (Text-to-Speech)

### 2. Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd viva
    ```

2.  **Setup Server (Backend):**
    ```bash
    cd server
    npm install
    ```
    *Create a `.env` file in the `server` directory:*
    ```env
    PORT=5000
    GEMINI_API_KEY=your_gemini_key_here
    ELEVENLABS_API_KEY=your_elevenlabs_key_here
    ```

3.  **Setup Client (Frontend):**
    Open a new terminal.
    ```bash
    cd client
    npm install
    ```

### 3. Running the App

You need to run both the server and client simultaneously.

**Terminal 1 (Server):**
```bash
cd server
npm run dev
```
*Server runs on `http://localhost:5000`*

**Terminal 2 (Client):**
```bash
cd client
npm run dev
```
*Client runs on `http://localhost:3000`*

### 4. Usage
1.  Open `http://localhost:3000` in your browser.
2.  Select **Standard Subject** or **Upload Syllabus**.
3.  Choose your difficulty (Normal, Torment, Ruthless).
4.  Enable microphone and start the exam!
