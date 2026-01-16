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

async function generateQuestion(subject, difficulty, previousQuestions, syllabusContext = null) {
    let prompt = "";

    if (syllabusContext) {
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
        
        CRITICIAL INSTRUCTION:
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
        console.log(`[Gemini] Requesting question for: ${subject} (${difficulty})`);
        if (!GEMINI_API_KEY) console.error("CRITICAL: GEMINI_API_KEY is missing in .env!");

        const response = await callGeminiWithRetry({
            contents: [{ parts: [{ text: prompt }] }]
        });
        return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;
        console.error("________________________________________");
        console.error("GEMINI API ERROR DETAILS:");
        console.error(`Status Code: ${status}`);
        console.error(`Message: ${error.message}`);
        console.error(`Response Data: ${JSON.stringify(data, null, 2)}`);
        console.error("________________________________________");

        return "Explain the basic principles of this subject."; // Fallback
    }
}

async function evaluateAnswer(subject, difficulty, question, answer, syllabusContext = null) {
    let prompt = "";

    if (syllabusContext) {
        prompt = `
        Context: Viva based on provided Syllabus.
        Syllabus Content: """${syllabusContext}"""
        
        Examiner Question: "${question}"
        Student Answer: "${answer}"

        You are a ruthless examiner. Evaluate the answer based strictly on the syllabus content provided.
        
        1. Reaction: If the answer contradicts the syllabus, correct them harshly.
        2. Score: 0-10 based on accuracy to the detailed syllabus.
        3. Next Question: Ask another question from the syllabus. If exhausted, return "END_OF_CONTEXT" as the nextQuestion.
        
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

        You are a ruthless examiner. Evaluate the answer.
        
        1. Give a "reaction" (string): Interrupt the student or comment on their answer. Be strict. If the answer is wrong, roast them slightly (professional but harsh).
        2. detailed "score" (0-10) based on correctness and depth.
        3. Generate the "nextQuestion" (string) valid follow-up or a new topic.

        Return JSON format:
        {
            "reaction": "...",
            "score": number,
            "nextQuestion": "..."
        }
        `;
    }

    try {
        const response = await callGeminiWithRetry({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
        });

        let text = response.data.candidates[0].content.parts[0].text;
        console.log("Gemini Raw Response:", text);

        // Sanitize text if it contains markdown code blocks
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const json = JSON.parse(text);

        // Ensure keys exist (case-insensitive fallback)
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
            nextQuestion: "Let's try something else. Define the core concept."
        };
    }
}

module.exports = { generateQuestion, evaluateAnswer };
