const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const elevenLabsService = require('../services/elevenLabsService');

const multer = require('multer');
const pdfParse = require('pdf-parse');

// Configure upload
// Configure upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// In-memory session store (Replace with DB later)
const sessions = {};

// POST /api/viva/start
router.post('/start', upload.single('syllabus'), async (req, res) => {
    try {
        const { subject, difficulty, studentName, syllabusText } = req.body;
        const sessionId = Date.now().toString();

        let context = "";

        // Handle PDF Upload
        if (req.file) {
            try {
                const pdfData = await pdfParse(req.file.buffer);
                // Truncate to ~10k chars to stay safe on tokens (approx 2-3k words)
                context = pdfData.text.slice(0, 15000);
                console.log(`[Upload] PDF parsed. text length: ${context.length}`);
            } catch (err) {
                console.error("PDF Parse Error:", err);
            }
        }
        // Handle Text Paste
        else if (syllabusText) {
            context = syllabusText.slice(0, 15000);
            console.log(`[Upload] Text input received. length: ${context.length}`);
        }

        // Initialize session
        sessions[sessionId] = {
            id: sessionId,
            subject: context ? "Custom Syllabus" : subject,
            originalSubject: subject, // Keep original input subject for fallback reference
            difficulty,
            studentName,
            syllabusContext: context || null,
            history: [],
            scores: []
        };

        // Get first question from Gemini
        // PHASE: INTRO (First question is always intro)
        let question = await geminiService.generateQuestion(
            sessions[sessionId].subject,
            difficulty,
            [],
            sessions[sessionId].syllabusContext,
            'intro' // Force intro phase
        );

        if (question === "END_OF_CONTEXT") {
            question = "I have examined all relevant areas of your provided notes. The viva is concluded.";
        }

        sessions[sessionId].history.push({ role: 'examiner', text: question });

        // Generate Audio for first question
        let audioUrl = null;
        try {
            // Clean text for TTS (emphasis formatting)
            let cleanQuestion = question.replace(/\*\*([^*]+)\*\*/g, (match, p1) => p1.toUpperCase());
            cleanQuestion = cleanQuestion.replace(/\*([^*]+)\*/g, (match, p1) => p1.toUpperCase());
            cleanQuestion = cleanQuestion.replace(/[_~`]/g, "");

            audioUrl = await elevenLabsService.generateSpeech(cleanQuestion);
        } catch (audioError) {
            console.error("Audio generation failed (ignoring):", audioError.message);
        }

        res.json({ sessionId, question, audioUrl: audioUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to start viva' });
    }
});

const analysis = require('../utils/analysis');

const fs = require('fs');

// POST /api/viva/respond
router.post('/respond', async (req, res) => {
    try {
        const { sessionId, answerText, audioConfidence } = req.body;
        const session = sessions[sessionId];

        if (!session) {
            return res.status(404).json({ error: 'Session not found. Please restart.' });
        }

        // 1. Analyze Confidence & Fillers
        const fillers = analysis.detectFillers(answerText);
        const confidence = analysis.calculateConfidence(answerText, fillers.count, audioConfidence || 1.0);

        // 2. Gemini Evaluation
        // Calculate how many questions have been asked (history length / 2 roughly, since it's pairs)
        // Actually, 'scores' array length tells us how many rounds completed. 
        // We are currently answering the "current" question, so the *next* question will be count + 1.
        // Let's pass the number of COMPLETED rounds so far (which is session.scores.length).
        // Actually, we need to count how many questions including the one we just answered.
        // Since we push to history AFTER evaluation in the original code, we might need to adjust.
        // Wait, 'evaluateAnswer' determines the NEXT question.
        // So if we have answered 0 questions so far (this is the first answer), currentQuestionCount is 1.
        // If count < 4, next is Intro.

        const questionsAskedSoFar = (session.history.length + 1) / 2; // e.g. Examiner said Q1 (len=1). We answer (len will be 2). So 1 question.

        const evaluation = await geminiService.evaluateAnswer(
            session.subject,
            session.difficulty,
            session.history[session.history.length - 1].text,
            answerText + ` [System Note: Confidence Score: ${confidence}%]`,
            session.syllabusContext,
            questionsAskedSoFar // Pass count
        );

        if (evaluation.nextQuestion === "END_OF_CONTEXT") {
            evaluation.nextQuestion = "I have no further questions from this material. We are done.";
        }

        // 3. Generate Audio (Safe Mode)
        const speechText = `${evaluation.reaction} ${evaluation.nextQuestion}`;

        // Clean text for TTS:
        // Replace *word* with WORD (uppercase usually triggers emphasis in ElevenLabs)
        // Check for double asterisks too just in case (**word**)
        let cleanSpeechText = speechText.replace(/\*\*([^*]+)\*\*/g, (match, p1) => p1.toUpperCase());
        cleanSpeechText = cleanSpeechText.replace(/\*([^*]+)\*/g, (match, p1) => p1.toUpperCase());

        // Remove other markdown chars if any remain
        cleanSpeechText = cleanSpeechText.replace(/[_~`]/g, "");

        let audioUrl = null;
        try {
            audioUrl = await elevenLabsService.generateSpeech(cleanSpeechText);
        } catch (audioError) {
            console.error("Audio generation failed (ignoring):", audioError.message);
        }

        // Update history
        session.history.push({ role: 'student', text: answerText, confidence });
        session.history.push({ role: 'examiner', text: speechText });
        session.scores.push(evaluation.score);

        res.json({
            reaction: evaluation.reaction,
            nextQuestion: evaluation.nextQuestion,
            audioUrl: audioUrl,
            analysis: { confidence, fillers }
        });

    } catch (error) {
        const errorMsg = `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${error.stack}\n`;
        fs.appendFileSync('server_error.log', errorMsg);
        console.error(error);
        res.status(500).json({ error: 'Failed to process response. Check server_error.log' });
    }
});

// GET /api/viva/session/:sessionId
router.get('/session/:sessionId', (req, res) => {
    const session = sessions[req.params.sessionId];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Calculate final stats
    const totalScore = session.scores.reduce((a, b) => a + b, 0);
    const avgScore = session.scores.length ? (totalScore / session.scores.length).toFixed(1) : 0;

    // Calculate Average Confidence
    const studentTurns = session.history.filter(msg => msg.role === 'student' && typeof msg.confidence === 'number');
    const totalConfidence = studentTurns.reduce((sum, msg) => sum + msg.confidence, 0);
    const avgConfidence = studentTurns.length ? Math.round(totalConfidence / studentTurns.length) : 0;

    res.json({ ...session, avgScore, avgConfidence });
});

module.exports = router;
