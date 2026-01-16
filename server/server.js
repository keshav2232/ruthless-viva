const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/viva', require('./routes/viva'));

app.get('/', (req, res) => {
    res.send('Viva Simulator Backend is Running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
