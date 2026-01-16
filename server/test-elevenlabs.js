const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "IKne3meq5aSn9XLyUdCD"; // Charlie

async function testTTS() {
    console.log("Testing ElevenLabs with Key:", ELEVENLABS_API_KEY ? "Present" : "Missing");
    if (!ELEVENLABS_API_KEY) return;

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                text: "This is a test of the emergency broadcast system.",
                model_id: "eleven_turbo_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            },
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer' // Important for binary data
            }
        );

        console.log("Success! Received audio bytes:", response.data.length);

    } catch (error) {
        console.error("Error Status:", error.response?.status);
        console.error("Error Data:");
        if (error.response?.data) {
            // Try to parse buffer if it's sent as buffer error
            try {
                const textDecoder = new TextDecoder('utf-8');
                console.error(textDecoder.decode(error.response.data));
            } catch (e) {
                console.error(error.response.data);
            }
        } else {
            console.error(error.message);
        }
    }
}

testTTS();
