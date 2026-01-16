const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;

const fs = require('fs');
async function listModels() {
    try {
        const response = await axios.get(URL);
        const models = response.data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name)
            .join('\n');

        fs.writeFileSync('models_list.txt', models);
        console.log("Models written to models_list.txt");
    } catch (error) {
        console.error("Error listing models:", error.response?.data || error.message);
    }
}

listModels();
