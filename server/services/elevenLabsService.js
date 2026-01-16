const axios = require('axios');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// Voice ID for a strict male/female voice. Example: "Josh" (deep, calm) or "Fin"
const VOICE_ID = "IKne3meq5aSn9XLyUdCD"; // Charlie 

async function generateSpeech(text) {
    if (!ELEVENLABS_API_KEY) {
        console.warn("ElevenLabs API Key missing. Returning null.");
        return null;
    }

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                text: text,
                model_id: "eleven_turbo_v2",
                voice_settings: {
                    stability: 0.45,   // Slightly lower for more emotion/range
                    similarity_boost: 0.75, // Higher to force the deep/confident tone
                    style: 0.3        // Add style exaggeration (supported in v2)
                }
            },
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );

        // In a real app, upload this buffer to S3/Cloudinary and return URL.
        // For now, we will return base64 for direct frontend play (small files)
        const audioBase64 = Buffer.from(response.data, 'binary').toString('base64');
        return `data:audio/mpeg;base64,${audioBase64}`;

    } catch (error) {
        const status = error.response ? error.response.status : 'Unknown';
        let data = error.message;
        if (error.response && error.response.data) {
            // Since responseType is 'arraybuffer', we need to decode the error text
            const textDecoder = new TextDecoder('utf-8');
            try {
                // Check if it's a buffer/arraybuffer
                const buffer = error.response.data instanceof ArrayBuffer ? error.response.data : error.response.data;
                const text = typeof buffer === 'string' ? buffer : textDecoder.decode(new Uint8Array(buffer));
                data = text;
            } catch (e) {
                data = "Could not decode error response";
            }
        }
        console.error(`ElevenLabs Error [${status}]:`, data);

        if (status === 401 || status === 403) {
            console.error("CRITICAL: Invalid API Key or Quota Exceeded for ElevenLabs.");
        }
        throw new Error(`TTS Failed: ${data}`); // Throw to let the router handle logging
    }
}

module.exports = { generateSpeech };
