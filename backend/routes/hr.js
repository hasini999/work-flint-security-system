const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root123",
    database: "workflint_db"
});

// =========================
// EMPLOYEE LIST
// =========================
router.get("/employees", (req, res) => {
    db.query("SELECT * FROM users WHERE role='employee'", (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

// =========================
// SALARY DETAILS
// =========================
router.get("/salary", (req, res) => {
    db.query("SELECT * FROM salary_details", (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

// =========================
// ATTENDANCE
// =========================
router.get("/attendance", (req, res) => {
    db.query("SELECT * FROM attendance", (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

// =========================
// PENDING REQUESTS
// =========================
router.get("/requests", (req, res) => {
    db.query("SELECT * FROM hr_requests WHERE status='pending'", (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

router.post("/requests/approve/:id", (req, res) => {
    db.query("UPDATE hr_requests SET status='approved' WHERE id=?",
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ message: "Approved" });
        });
});

module.exports = router;