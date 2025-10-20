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

// GET all students (can be extended with query params for class)
router.get('/students', async (req, res) => {
    try {
        const db = await readDb();
        res.json(db.students);
    } catch (error) {
        res.status(500).json({ message: "Error reading student data" });
    }
});


// PUT (Update) a student's fees
router.put('/students/:id', async (req, res) => {
    const studentId = req.params.id;
    const updatedFees = req.body.fees;

    if (!updatedFees) {
        return res.status(400).json({ message: "Updated fee data is required." });
    }

    try {
        const db = await readDb();
        const studentIndex = db.students.findIndex(s => s.id === studentId);

        if (studentIndex === -1) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Update the student's fees object
        db.students[studentIndex].fees = updatedFees;

        await writeDb(db);
        res.json(db.students[studentIndex]);

    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ message: "Error updating student data" });
    }
});

module.exports = router;
