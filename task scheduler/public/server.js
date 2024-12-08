const express = require("express");
const mysql = require("mysql2");
const nodemailer = require("nodemailer");
const schedule = require("node-schedule");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Configure MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root", // Replace with your MySQL username
    password: "root123", // Replace with your MySQL password
    database: "schedule"
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error("Error connecting to database:", err);
        process.exit(1);
    } else {
        console.log("Connected to MySQL database.");
    }
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "sona04b@gmail.com", // Replace with your email
        pass: "SonA04SonZ"  // Replace with your app-specific password
    }
});

app.post("/add-task", (req, res) => {
    console.log(req.body); // Log the task data received from the frontend
    const { task_title , due_date, email, reminder, reminder_time } = req.body;

    if (!task_title  || !due_date || !reminder || !additionalInfo) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // Use the correct column names based on your table
    const sql = `INSERT INTO tasks (task_title, due_date, email, reminder_time) VALUES (?, ?, ?, ?)`;

    db.query(sql, [task_title , due_date, email, reminder_time], (err, result) => {
        if (err) {
            console.error("Error inserting task:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        // Schedule email if reminder time is in the future
        const reminderTime = new Date(reminder_time);
        if (reminderTime > new Date()) {
            schedule.scheduleJob(reminderTime, () => {
                transporter.sendMail({
                    from: "sona04b@gmail.com",  // Make sure to use your valid email
                    to: additionalInfo,
                    subject: `Reminder: ${task_title }`,
                    text: `This is a reminder for your task: "${task_title }", due on ${new Date(due_date).toLocaleString()}.`
                }, (err, info) => {
                    if (err) {
                        console.error("Error sending email:", err);
                    } else {
                        console.log("Email sent:", info.response);
                    }
                });
            });
        }

        // Send response after both adding the task and scheduling the reminder
        return res.json({ success: true, message: "Task added and reminder scheduled." });
    });
});

app.put("/mark-task-completed/:id", (req, res) => {
    const taskId = req.params.id;
    const { completed } = req.body; // The 'completed' value sent from frontend (1 or 0)

    // Update the task's completed status in the database
    const sql = `UPDATE tasks SET completed = 1 WHERE id = ?`;
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

// Fetch all tasks
app.get("/tasks", (req, res) => {
    const sql = `SELECT * FROM tasks ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching tasks:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, tasks: results });
    });
});

// Start the server
const PORT = 3000;
