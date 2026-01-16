const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Switching to gemini-2.5-flash as explicitly requested by user
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SLEEP_TIME = 3000; // 3 seconds wait on 429

async function callGeminiWithRetry(payload, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post(API_URL, payload);
            return response;
        } catch (error) {
            const status = error.response?.status;
            if (status === 429 && i < retries - 1) {
                console.warn(`[Gemini] Rate limited (429). Retrying in ${SLEEP_TIME / 1000}s... (Attempt ${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, SLEEP_TIME));
            } else {
                throw error;
            }
        }
    }
}

async function generateQuestion(subject, difficulty, previousQuestions, syllabusContext = null, phase = 'technical') {
    let prompt = "";

    if (phase === 'intro') {
        prompt = `
        You are an oral examiner starting a viva. 
        Goal: Ask a generic ice-breaker question to make the student comfortable.
        Examples: "Tell me about yourself", "How did you prepare for this exam?", "Are you nervous?", "Why is this subject important to you?".
        
        Previous questions: ${JSON.stringify(previousQuestions)}
        
        Output ONLY the question text. Keep it professional but conversational.
        `;
    } else if (syllabusContext) {
        prompt = `
        You are a RUTHLESS oral examiner conducting a viva based on a specific syllabus/context provided below.
        
        SYLLABUS CONTEXT:
        """
        ${syllabusContext}
        """

        Difficulty Level: ${difficulty}.
        Previous questions asked: ${JSON.stringify(previousQuestions)}.

        Your Goal:
        1. Ask a question strictly based on the provided SYLLABUS CONTEXT.
        2. Test depth of understanding of this specific material.
        3. Do not ask generic questions outside this scope.
        
        CRITICAL INSTRUCTION:
        If you have exhausted all meaningful questions from the context or if the context is too short to generate more unique questions, respond with EXACTLY: "END_OF_CONTEXT".

        Generate a single, sharp, specific question. Output ONLY the question text.
        `;
    } else {
        prompt = `
        You are a RUTHLESS oral examiner conducting a viva on the subject: "${subject}".
        Difficulty Level: ${difficulty}.
        
        Your goal is to test the student's depth of knowledge. Do not accept shallow definitions.
        
        Previous questions asked: ${JSON.stringify(previousQuestions)}.
        
        Generate a single, sharp, specific question to start or continue the viva. 
        Output ONLY the question text. Do not add "Here is the question" or quotes.
        `;
    }

    try {
        console.log(`[Gemini] Requesting question for: ${subject} (${difficulty}) - Phase: ${phase}`);
        // ... rest of the function (API call) remains same, just ensuring variables are in scope
        if (!GEMINI_API_KEY) console.error("CRITICAL: GEMINI_API_KEY is missing in .env!");

        const response = await callGeminiWithRetry({
            contents: [{ parts: [{ text: prompt }] }]
        });
        return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        // ... (Error handling is same as before, I will keep it implicitly or copy it if needed)
        console.error("Gemini Error:", error.message);
        return "Can you define the subject in your own words?"; // Fallback
    }
}

async function evaluateAnswer(subject, difficulty, question, answer, syllabusContext = null, currentQuestionCount = 0) {
    let prompt = "";

    // Determine next phase: 0-3 questions = Intro phase. 4th onwards (asking 5th) = Technical.
    const isIntro = currentQuestionCount < 4;
    const nextPhaseInstruction = isIntro
        ? "Next Question Strategy: Ask another generic/personal ice-breaker question (e.g. asking about their background, interest, or state of mind). Do NOT ask technical questions yet."
        : `Next Question Strategy: Now the exam begins for real. Ask a RUTHLESS technical question about ${subject} (or based on syllabus if provided).`;

    if (syllabusContext) {
        prompt = `
        Context: Viva based on provided Syllabus.
        Syllabus Content: """${syllabusContext}"""
        
        Examiner Question: "${question}"
        Student Answer: "${answer}"
        
        Current Phase: ${isIntro ? "Ice-Breaker (Warmup)" : "Technical Exam"}

        You are a ruthless examiner. Evaluate the answer.
        
        1. Reaction: Be natural. If it's an ice-breaker, be polite but firm. If technical, be strict.
        2. Score: 0-10. (For ice-breakers, give full marks for confidence/clarity, irrelevant of accuracy).
        3. Next Question: ${nextPhaseInstruction}
        
        Return JSON format:
        {
            "reaction": "...",
            "score": number,
            "nextQuestion": "..." 
        }
        `;
    } else {
        prompt = `
        Context: Viva on "${subject}" (${difficulty}).
        Examiner Question: "${question}"
        Student Answer: "${answer}"

        Current Phase: ${isIntro ? "Ice-Breaker (Warmup)" : "Technical Exam"}

        You are a ruthless examiner. Evaluate the answer.
        
        1. Reaction: If ice-breaker, acknowledge answer. If technical, critique aggressively.
        2. Score: 0-10. (Ice-breakers = generous scoring).
        3. Next Question: ${nextPhaseInstruction}

        Return JSON format:
        {
            "reaction": "...",
            "score": number,
            "nextQuestion": "..."
        }
        `;
    }

    // ... existing API call and parsing logic
    try {
        const response = await callGeminiWithRetry({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
        });

        let text = response.data.candidates[0].content.parts[0].text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(text);

        return {
            reaction: json.reaction || json.Reaction || "I heard you.",
            score: json.score || json.Score || 0,
            nextQuestion: json.nextQuestion || json.NextQuestion || "Proceed."
        };

    } catch (error) {
        console.error("Gemini Evaluation Error:", error.response?.data || error.message);
        return {
            reaction: "I didn't quite catch that. Moving on.",
            score: 0,
            nextQuestion: "Let's try something else."
        };
    }
}

module.exports = { generateQuestion, evaluateAnswer };
