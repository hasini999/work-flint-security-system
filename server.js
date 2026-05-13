const express = require("express");
const path = require("path");
const mysql = require("mysql2");
// const bodyParser = require("body-parser");
const cors = require("cors");
const securityRoutes = require("./backend/routes/security");
const authRoutes = require("./backend/routes/auth");
const hrRoutes = require("./backend/routes/hr");
const app = express();
const sessions = {};
const SESSION_TIMEOUT = 1000 * 60 * 60; // 1 hour
const { v4: uuidv4 } = require("uuid");
const PDFDocument = require("pdfkit");
const http = require("http");
const { Server } = require("socket.io");


app.use(cors());
// app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", securityRoutes);
app.use("/api", authRoutes);

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("🔴 Client disconnected:", socket.id);
    });
});


/* =========================
   STATIC FRONTEND
========================= */

app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

/* =========================
   MYSQL CONNECTION
========================= */

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "root123",
    database: process.env.DB_NAME || "workflint_db"
});

db.connect((err) => {
    if (err) {
        console.log("❌ Database connection failed");
        console.log(err);
    } else {
        console.log("✅ MySQL Connected");
    }
});

/* =========================
   REGISTER API
========================= */

app.post("/register", (req, res) => {

    const {
    name,
    email,
    password,
    role,
    question,
    answer
} = req.body;

    const checkQuery =
        "SELECT * FROM users WHERE email = ?";

    db.query(checkQuery, [email], (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (result.length > 0) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const insertQuery = `
    INSERT INTO users
    (name, email, password, role, question, answer)
    VALUES (?, ?, ?, ?, ?, ?)
`;

        db.query(
            insertQuery,
            [name, email, password, role, question, answer],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Registration failed"
                    });
                }

                res.status(200).json({
                    message: "User registered successfully"
                });
            }
        );
    });
});

/* =========================
   LOGIN API
========================= */

app.post("/login", (req, res) => {

    const {
        email,
        password,
        question,
        answer
    } = req.body;

    const query =
        "SELECT * FROM users WHERE email = ?";

    db.query(query, [email], (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (result.length === 0) {
            return res.status(401).json({
                message: "Invalid email"
            });
        }

        const user = result[0];

// 🚨 AUTO BLOCK CHECK (NEW SYSTEM)
if (user.is_blocked) {
    return res.status(403).json({
        message: "Account permanently blocked by security system"
    });
}

// 🔥 Risk-based auto block
if ((user.risk_score || 0) >= 80) {

    db.query(
        "UPDATE users SET is_blocked = TRUE WHERE email = ?",
        [user.email]
    );

    return res.status(403).json({
        message: "Account auto-blocked due to high risk activity"
    });
}

// ⚠ Warning level
if (user.risk_score >= 50) {
    console.log("⚠ HIGH RISK USER:", user.email);
}

        if (
            password !== user.password ||
            question !== user.question ||
            answer !== user.answer
        ) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const sessionId = uuidv4();

        sessions[sessionId] = {
            email: user.email,
            role: user.role.toLowerCase(),
            name: user.name,
            createdAt: Date.now()
        };

        res.status(200).json({
            message: "Login successful",
            role: user.role.toLowerCase(),
            name: user.name,
            sessionId: sessionId
        });
    });
});


app.post("/create-ticket", (req, res) => {

    const { title, description, priority } = req.body;

    const sql = `
        INSERT INTO tickets (title, description, priority, status)
        VALUES (?, ?, ?, 'Open')
    `;

    db.query(sql, [title, description, priority], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send("Database Error");
        }

        res.send("Ticket Created Successfully");

    });

});

app.get("/api/hr/salaries", authMiddleware, roleCheck(["hr","admin"]), (req, res) => {

    db.query("SELECT * FROM salaries", (err, result) => {

        if (err) return res.status(500).send("DB Error");

        res.json(result);
    });

});

app.get("/api/hr/requests", authMiddleware, roleCheck(["hr","admin"]), (req, res) => {

    db.query("SELECT * FROM hr_requests", (err, result) => {

        if (err) return res.status(500).send("DB Error");

        res.json(result);
    });

});

app.post("/api/hr/requests/update", authMiddleware, roleCheck(["hr","admin"]), (req, res) => {

    const { id, status } = req.body;

    db.query(
        "UPDATE hr_requests SET status=? WHERE id=?",
        [status, id],
        (err) => {
            if (err) return res.status(500).send("DB Error");

            res.json({ message: "Updated" });
        }
    );

});

app.post("/api/hr/letters", authMiddleware, roleCheck(["hr","admin"]), (req, res) => {

    const { employee_name, letter_type, content } = req.body;

    db.query(
        "INSERT INTO letters (employee_name, letter_type, content) VALUES (?, ?, ?)",
        [employee_name, letter_type, content],
        (err) => {
            if (err) return res.status(500).send("DB Error");

            res.json({ message: "Letter created" });
        }
    );

});

app.get("/api/hr/analytics", authMiddleware, roleCheck(["hr","admin"]), (req, res) => {

    db.query(`
        SELECT 
            COUNT(*) AS totalRequests,
            SUM(status='Pending') AS pending,
            SUM(status='Approved') AS approved
        FROM hr_requests
    `, (err, result) => {

        if (err) return res.status(500).send("DB Error");

        res.json(result[0]);
    });

});

app.get(
    "/api/hr/letters/pdf/:id",
    authMiddleware,
    roleCheck(["admin", "hr"]),
    (req, res) => {

    db.query(
        "SELECT * FROM letters WHERE id=?",
        [req.params.id],
        (err, result) => {

            if (err || result.length === 0) {
                return res.send("Not found");
            }

            const letter = result[0];

            const doc = new PDFDocument();

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "attachment; filename=letter.pdf");

            doc.pipe(res);

            doc.fontSize(20).text("Work Flint HR Letter", { align: "center" });
            doc.moveDown();
            doc.fontSize(14).text(`Employee: ${letter.employee_name}`);
            doc.text(`Type: ${letter.letter_type}`);
            doc.moveDown();
            doc.text(letter.content);

            doc.end();
        }
    );

});

/* =========================
   HONEYPOT LOGGING
========================= */

app.post("/honeypot-log", (req, res) => {

    const {
        page,
        action,
        time
    } = req.body;

    console.log("🚨 Honeypot Triggered");
    console.log("Page:", page);
    console.log("Action:", action);
    console.log("Time:", time);

    res.status(200).json({
        message: "Honeypot activity logged"
    });
});


/* =========================
   GET ALL TICKETS
========================= */

app.get("/tickets", (req, res) => {

    const sql = "SELECT * FROM tickets ORDER BY id DESC";

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).send("Database Error");
        }

        res.json(results);

    });

});


/* =========================
   SECURITY ALERT API
========================= */

app.post("/api/security-alert", (req, res) => {

    const { event, page, timestamp, employee, role, sessionId } = req.body;

    let points = 0;
    let severity = "LOW";

    const e = event.toLowerCase();
    if (e.includes("honeypot")) {
        points = 20;
        severity = "MEDIUM";
    }

    if (e.includes("root")) {
        points = 50;
        severity = "CRITICAL";
    }

    if (e.includes("disable")) {
        points = 40;
        severity = "HIGH";
    }

    if (e.includes("master")) {
        points = 60;
        severity = "CRITICAL";
    }

    if (e.includes("surveillance")) {
        points = 45;
        severity = "HIGH";
    }

    if (e.includes("export")) {
        points = 30;
        severity = "MEDIUM";
    }

    // 1. log security event
     const logSql = `
        INSERT INTO security_logs
        (event_type, description, severity)
        VALUES (?, ?, ?)
    `;


    // 2. update risk score in USERS table
    db.query(
        logSql,
        [
            event,
            `${employee} triggered ${event} on ${page}`,
            severity
        ],
        (err) => {
            if (err) {
                console.log("Risk update error:", err);
                return res.status(500).send("DB Error");
            }
            // UPDATE USER RISK SCORE

            const riskSql = `
                UPDATE users
                SET risk_score = COALESCE(risk_score,0) + ?
                WHERE name = ?
            `;

            db.query(
                riskSql,
                [points, employee],
                (err2) => {

                    if (err2) {
                        console.log(err2);
                    }

                    // 🚫 AUTO BLOCK SYSTEM
                    db.query(
                        "SELECT risk_score FROM users WHERE name=?",
                        [employee],
                        (err3, result) => {

                            if (
                                result &&
                                result[0] &&
                                result[0].risk_score >= 80
                            ) {
                               db.query(
                                    "UPDATE users SET is_blocked=TRUE WHERE name=?",
                                    [employee]
                                );

                                console.log("🚫 USER AUTO BLOCKED:", employee);
                            }
                        }
                    );
                    

                    io.emit("security-alert", {
                        employee,
                        event,
                        points,
                        severity,
                        page,
                        risk:points,
                        time: new Date()
                    });

                    console.log(
                        `🚨 ${employee} risk increased by ${points}`
                    );

                    res.json({
                        success: true,
                        riskAdded: points
                    });

                }
            );
        }
    );
});

/* =========================
   GET SECURITY LOGS
========================= */

app.get(
    "/api/security-logs",
    authMiddleware,
    roleCheck(["admin"]), (req, res) => {

    const sql = `
        SELECT *
        FROM security_logs
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).send("Database Error");
        }

        res.json(results);

    });

});

app.get(
    "/api/users",
    authMiddleware,
    roleCheck(["admin"]), (req, res) => {

    db.query(
        "SELECT name, email, role, risk_score FROM users ORDER BY risk_score DESC",
        (err, result) => {

            if (err) return res.status(500).json({ error: "DB error" });

            res.json(result);
        }
    );

});


app.get(
    "/api/blocked-users",
    authMiddleware,
    roleCheck(["admin"]), (req, res) => {

    db.query(
        "SELECT name, email, risk_score FROM users WHERE is_blocked = TRUE",
        (err, result) => {

            if (err) return res.status(500).send("DB Error");

            res.json(result);
        }
    );
});



app.post(
    "/api/block-user",
    authMiddleware,
    roleCheck(["admin"]),
    (req, res) => {

    const { email } = req.body;

    db.query(
        "UPDATE users SET is_blocked = TRUE WHERE email=?",
        [email],
        (err) => {

            if (err) {
                return res.status(500).json({
                    message: "DB Error"
                });
            }

            res.json({
                success: true,
                message: "User blocked successfully"
            });
        }
    );
});

app.post(
    "/api/unblock-user",
    authMiddleware,
    roleCheck(["admin"]),
    (req, res) => {

    const { email } = req.body;

    db.query(
        "UPDATE users SET is_blocked = FALSE WHERE email=?",
        [email],
        (err) => {

            if (err) {
                return res.status(500).json({
                    message: "DB Error"
                });
            }

            res.json({
                success: true,
                message: "User unblocked successfully"
            });
        }
    );
});

app.post(
    "/api/reset-risk",
    authMiddleware,
    roleCheck(["admin"]),
    (req, res) => {

    const { email } = req.body;

    db.query(
        "UPDATE users SET risk_score = 0 WHERE email=?",
        [email],
        (err) => {

            if (err) {
                return res.status(500).json({
                    message: "DB Error"
                });
            }

            res.json({
                success: true,
                message: "Risk score reset"
            });
        }
    );
});


app.get("/api/security/report/pdf/:id", (req, res) => {

    db.query(
        "SELECT * FROM security_logs WHERE id=?",
        [req.params.id],
        (err, result) => {

            if (err || result.length === 0) {
                return res.status(404).send("Report not found");
            }

            const log = result[0];

            const ai = generateIncidentSummary(log);

            const doc = new PDFDocument();

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=incident-report-${log.id}.pdf`
            );

            doc.pipe(res);

            // HEADER
            doc.fontSize(20).text("🛡 Work Flint AI Security Incident Report", {
                align: "center"
            });

            doc.moveDown();

            // BASIC INFO
            doc.fontSize(14).text(`Incident ID: ${log.id}`);
            doc.text(`Event: ${log.event_type}`);
            doc.text(`Time: ${log.created_at}`);

            doc.moveDown();

            // AI SECTION
            doc.fontSize(16).text("AI Security Analysis", {
                underline: true
            });

            doc.fontSize(12).text(`Severity: ${ai.severity}`);

            doc.moveDown();

            doc.fontSize(12).text("Explanation:");
            doc.text(ai.explanation);

            doc.moveDown();

            doc.fontSize(12).text("Recommendation:");
            doc.text(ai.recommendation);

            doc.end();
        }
    );
});


function authMiddleware(req, res, next) {

    const sessionId = req.headers["x-session-id"];

    if (!sessionId || !sessions[sessionId]) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const session = sessions[sessionId];

    // ⛔ SESSION EXPIRY CHECK
    if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
        delete sessions[sessionId];
        return res.status(401).json({ message: "Session expired" });
    }

    req.user = session;
    next();
}


function blockCheck(req, res, next) {

    const sessionId = req.headers["x-session-id"];
    const session = sessions[sessionId];

    if (!session) return next();

    db.query(
        "SELECT is_blocked FROM users WHERE email=?",
        [session.email],
        (err, result) => {

            if (result?.[0]?.is_blocked) {
                return res.status(403).json({
                    message: "User blocked by security system"
                });
            }

            next();
        }
    );
}

app.use(blockCheck);

function roleCheck(roles) {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        next();
    };
}


function generateIncidentSummary(log) {

    const event = (log.event_type || "").toLowerCase();

    let severity = "LOW";
    let explanation = "";
    let recommendation = "";

    // 🔥 Rule-based "AI logic"
    if (event.includes("root") || event.includes("privilege")) {

        severity = "CRITICAL";

        explanation = "An attempt to gain root or elevated system privileges was detected. This indicates possible unauthorized admin access attempt.";

        recommendation = "Immediately review user session and block account if suspicious activity continues.";

    } else if (event.includes("disable") || event.includes("firewall")) {

        severity = "HIGH";

        explanation = "A security control or firewall configuration change attempt was detected. This may indicate tampering with system protection layers.";

        recommendation = "Verify firewall logs and restrict admin access permissions.";

    } else if (event.includes("honeypot")) {

        severity = "HIGH";

        explanation = "User interacted with a decoy (honeypot) system designed to detect malicious internal activity.";

        recommendation = "Flag user for insider threat analysis.";

    } else if (event.includes("access")) {

        severity = "MEDIUM";

        explanation = "Unauthorized or unusual access attempt was detected on a restricted system resource.";

        recommendation = "Monitor user activity closely.";

    } else {

        severity = "LOW";

        explanation = "Normal system activity detected with no immediate security threat.";

        recommendation = "No action required.";
    }

    return {
        severity,
        explanation,
        recommendation
    };
}


app.use(
    "/api/hr",
    authMiddleware,
    roleCheck(["admin", "hr"]),
    hrRoutes
);


/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});