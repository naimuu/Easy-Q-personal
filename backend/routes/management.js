const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'db.json');

// Helper function to read the database
const readDb = async () => {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
};

// Helper function to write to the database
const writeDb = async (data) => {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
};

// GET management metrics
router.get('/management', async (req, res) => {
    try {
        const db = await readDb();
        res.json(db.management);
    } catch (error) {
        res.status(500).json({ message: "Error reading management data" });
    }
});

// PUT (Update) management metrics
router.put('/management', async (req, res) => {
    const newMetrics = req.body;

    if (!newMetrics || typeof newMetrics.totalCollected === 'undefined' || typeof newMetrics.totalSubmittedToHeadmaster === 'undefined') {
        return res.status(400).json({ message: "Complete management metrics are required." });
    }
    
    try {
        const db = await readDb();
        db.management = newMetrics;
        await writeDb(db);
        res.json(db.management);
    } catch (error) {
        res.status(500).json({ message: "Error updating management data" });
    }
});

module.exports = router;
