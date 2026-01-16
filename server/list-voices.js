const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const fs = require('fs');

async function listVoices() {
    if (!ELEVENLABS_API_KEY) {
        console.error("API Key missing");
        return;
    }

    try {
        const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY
            }
        });

        console.log("Success! Found voices:");
        let output = "";
        response.data.voices.slice(0, 5).forEach(voice => {
            output += `- ${voice.name}: ${voice.voice_id}\n`;
            console.log(`- ${voice.name}: ${voice.voice_id}`);
        });
        fs.writeFileSync('voices_names.txt', output);

    } catch (error) {
        console.error("Error fetching voices:", error.response?.status);
        console.error(error.response?.data);
    }
}

listVoices();
