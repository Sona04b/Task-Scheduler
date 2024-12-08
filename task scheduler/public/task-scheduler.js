const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const moment = require("moment");

const app = express();
app.use(express.json());
app.use(cors());

// Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root123",
    database: "schedule",
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to database:", err);
        process.exit(1);
    } else {
        console.log("Connected to MySQL database.");
    }
});

// Add a new task
app.post("/add-task", (req, res) => {
    const { task_title, due_date, reminder_time, email } = req.body;

    if (!task_title || !due_date || !reminder_time || !email) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    try {
        // Convert reminder_time to HH:mm:ss format
        const formattedReminderTime = moment(reminder_time, moment.ISO_8601).format("HH:mm:ss");

        // Validate the time conversion
        if (!formattedReminderTime || formattedReminderTime === "Invalid date") {
            return res.status(400).json({ success: false, message: "Invalid reminder time format. Use ISO 8601 format (e.g., '2024-12-15T08:08:00')." });
        }

        const sql = `INSERT INTO tasks (task_title, due_date, email, reminder_time) VALUES (?, ?, ?, ?)`;
        db.query(sql, [task_title, due_date, email, formattedReminderTime], (err, result) => {
            if (err) {
                console.error("Error inserting task:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            res.json({ success: true, message: "Task added successfully." });
        });
    } catch (error) {
        console.error("Error processing reminder time:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// Update task title
app.put("/update-task-title/:id", (req, res) => {
    const taskId = req.params.id; // Get the taskId from the URL parameters
    const { task_title } = req.body; // Get the new task title from the request body

    if (!task_title) {
        return res.status(400).json({ success: false, message: "Task title is required." });
    }

    const sql = `UPDATE tasks SET task_title = ? WHERE id = ?`; // SQL query to update the task title
    db.query(sql, [task_title, taskId], (err, result) => {
        if (err) {
            console.error("Error updating task:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Task not found." });
        }

        res.json({ success: true, message: "Task title updated successfully." });
    });
});


// Fetch all tasks (excluding completed tasks)

app.get("/completed-tasks", (req, res) => {
    const sql = `SELECT * FROM tasks WHERE completed = 1 ORDER BY created_at DESC`; // 1 for completed tasks
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching tasks:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, tasks: results });
    });
});


// Mark task as completed
app.put("/mark-task-completed/:id", (req, res) => {
    const taskId = req.params.id;
    const { completed } = req.body; // The 'completed' value sent from frontend (1 or 0)

    // Update the task's completed status in the database
    const sql = `UPDATE tasks SET completed = ? WHERE id = ?`;
    db.query(sql, [completed, taskId], (err, result) => {
        if (err) {
            console.error("Error updating task:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        // Check if any row was affected
        if (result.affectedRows > 0) {
            return res.json({ success: true, message: "Task updated successfully." });
        } else {
            return res.status(404).json({ success: false, message: "Task not found." });
        }
    });
});



// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
