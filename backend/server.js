const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const studentRoutes = require('./routes/students');
const managementRoutes = require('./routes/management');
const transactionRoutes = require('./routes/transactions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // To parse JSON bodies

// Serve static files from the frontend's public directory
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// API Routes
app.use('/api', studentRoutes);
app.use('/api', managementRoutes);
app.use('/api', transactionRoutes);

// Catch-all route to serve the frontend's index.html for any other request
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
