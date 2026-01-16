function detectFillers(transcript) {
    const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'sort of', 'kind of', 'i mean', 'right?'];
    const words = transcript.toLowerCase().split(/\s+/);
    let count = 0;

    words.forEach(word => {
        // Clean punctuation
        const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        if (fillerWords.includes(cleanWord)) {
            count++;
        }
    });

    return {
        count,
        ratio: count / words.length
    };
}

function calculateConfidence(transcript, fillerCount, audioConfidence = 1.0) {
    // Simple heuristic for now:
    // Confidence starts at 100
    // -5 for each filler word
    // -10 for "I think", "maybe"

    let confidence = 100;

    // Penalize fillers
    confidence -= (fillerCount * 5);

    const weakPhrases = ['i think', 'maybe', 'probably', 'not sure', 'guess', 'um', 'uh', 'hmm'];
    const lowerTranscript = transcript.toLowerCase();

    weakPhrases.forEach(phrase => {
        if (lowerTranscript.includes(phrase)) {
            confidence -= 10;
        }
    });

    // Ensure text-based confidence doesn't go below 0
    confidence = Math.max(0, confidence);

    // Factor in Speech-to-Text Audio Confidence (0.0 - 1.0)
    // If we have audio confidence, weigh it.
    // Weight: 60% Content/Fillers, 40% Voice/Audio Quality

    const audioScore = audioConfidence * 100;

    const finalConfidence = (confidence * 0.6) + (audioScore * 0.4);

    return Math.round(finalConfidence);
}

module.exports = { detectFillers, calculateConfidence };
