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

// GET all transactions
router.get('/transactions', async (req, res) => {
    try {
        const db = await readDb();
        res.json(db.transactions);
    } catch (error) {
        res.status(500).json({ message: "Error reading transaction data" });
    }
});

// POST a new transaction
router.post('/transactions', async (req, res) => {
    const newTransaction = req.body;
    if (!newTransaction || !newTransaction.studentId || !newTransaction.amountReceived) {
        return res.status(400).json({ message: "Invalid transaction data." });
    }

    try {
        const db = await readDb();
        db.transactions.unshift(newTransaction); // Add to the beginning of the array
        await writeDb(db);
        res.status(201).json(newTransaction);
    } catch (error) {
        res.status(500).json({ message: "Error saving transaction data" });
    }
});

// New combined route to get all initial state
router.get('/state', async (req, res) => {
    try {
        const db = await readDb();
        res.json({
            students: db.students,
            management: db.management,
            transactions: db.transactions
        });
    } catch (error) {
        console.error("Error reading initial state:", error);
        res.status(500).json({ message: "Error fetching initial application state" });
    }
});


module.exports = router;
