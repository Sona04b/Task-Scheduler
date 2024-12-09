const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const schedule = require("node-schedule");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// MySQL database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",          // Your MySQL username
    password: "root123",   // Your MySQL password
    database: "schedule",  // Your MySQL database name
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err);
        return;
    }
    console.log("Connected to MySQL database.");
});

// Nodemailer setup for email notifications
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "",  // Replace with your email
        pass: "",   // Replace with your app-specific password
    },
});

// Register user endpoint
app.post('/register', (req, res) => {
    const { username, password, department } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const query = 'INSERT INTO users (username, password, department) VALUES (?, ?, ?)';
    db.query(query, [username, hashedPassword, department], (err, results) => {
        if (err) {
            console.error('Error registering user:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        res.status(201).json({ success: true, message: 'User registered successfully' });
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }

            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid username or password' });
            }

            res.status(200).json({ success: true, message: 'Login successful' });
        });
    });
});

// Serve static files (HTML, CSS, JS)
app.use(express.static("public"));

app.get('/task-manager.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'task-manager.html'));
});

// API endpoint to fetch tasks
app.get("/tasks", (req, res) => {
    db.query("SELECT * FROM tasks", (err, results) => {
        if (err) {
            console.error("Error fetching tasks:", err);
            res.json({ success: false, message: "Failed to fetch tasks." });
        } else {
            res.json({ success: true, tasks: results });
        }
    });
});

// API endpoint to add a task
app.post("/add-task", (req, res) => {
    const { task_title, due_date, email, reminder_time } = req.body;
    const sql = "INSERT INTO tasks (task_title, due_date, email, reminder_time) VALUES (?, ?, ?, ?)";
    db.query(sql, [task_title, due_date, email, reminder_time], (err, result) => {
        if (err) {
            console.error("Error adding task:", err);
            res.json({ success: false, message: "Failed to add task." });
        } else {
            // Schedule an email reminder
            schedule.scheduleJob(reminder_time, function () {
                const mailOptions = {
                    from: "your-email@gmail.com",
                    to: email,
                    subject: "Task Reminder",
                    text: `Reminder: You have a task "${task_title}" due on ${due_date}.`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error("Error sending email:", error);
                    } else {
                        console.log("Email sent:", info.response);
                    }
                });
            });

            res.json({ success: true, task: { id: result.insertId, ...req.body } });
        }
    });
});

// API endpoint to update task completion status
app.post("/update-task/:id", (req, res) => {
    const taskId = req.params.id;
    const { is_completed } = req.body;

    const sql = "UPDATE tasks SET is_completed = ? WHERE id = ?";
    db.query(sql, [is_completed, taskId], (err, result) => {
        if (err) {
            console.error("Error updating task:", err);
            return res.json({ success: false, message: "Failed to update task." });
        }

        res.json({ success: true, message: "Task updated successfully." });
    });
});

// Fetch completed tasks
app.get("/completed-tasks", (req, res) => {
    const sql = `SELECT task_title, due_date FROM tasks WHERE is_completed = 1 ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching completed tasks:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, tasks: results });
    });
});

// API endpoint to update a task
// API endpoint to update a task's title without changing the reminder time
app.post("/update-task-title/:taskId", (req, res) => {
    const { taskId } = req.params;  // Get task ID from URL
    const { task_title } = req.body;  // Get updated task title from request body

    // SQL query to update only the task title
    const sql = "UPDATE tasks SET task_title = ? WHERE id = ?";
    db.query(sql, [task_title, taskId], (err, result) => {
        if (err) {
            console.error("Error updating task:", err);
            res.json({ success: false, message: "Failed to update task." });
        } else if (result.affectedRows > 0) {
            // Task title updated successfully, no change to reminder time

            // No change in reminder time, so no need to reschedule the reminder
            res.json({ success: true, message: "Task title updated successfully." });
        } else {
            res.json({ success: false, message: "No task found with this ID." });
        }
    });
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
