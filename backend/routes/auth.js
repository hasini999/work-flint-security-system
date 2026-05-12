const express = require("express");
const router = express.Router();

let failedAttempts = {};

const users = [
  {
    name: "Hasini",
    email: "hasini@workflint.com",
    password: "123456",
    role: "IT"
  },
  {
    name: "Admin",
    email: "admin@workflint.com",
    password: "admin123",
    role: "Admin"
  }
];

router.post("/login", (req, res) => {

  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email
  );

  // USER NOT FOUND
  if (!user) {

    failedAttempts[email] =
      (failedAttempts[email] || 0) + 1;

    console.log("🚨 Unknown user login attempt");

    console.log({
      email,
      attempts: failedAttempts[email],
      timestamp: new Date().toISOString()
    });

    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  // WRONG PASSWORD
  if (user.password !== password) {

    failedAttempts[email] =
      (failedAttempts[email] || 0) + 1;

    console.log("🚨 Failed login attempt");

    console.log({
      email,
      attempts: failedAttempts[email],
      timestamp: new Date().toISOString()
    });

    // ACCOUNT LOCK
    if (failedAttempts[email] >= 5) {

      console.log("⛔ ACCOUNT LOCKED:", email);

      return res.status(403).json({
        success: false,
        message:
          "Account temporarily locked due to multiple failed attempts"
      });
    }

    return res.status(401).json({
      success: false,
      message: `Invalid password. Attempts: ${failedAttempts[email]}`
    });
  }

  // SUCCESSFUL LOGIN
  failedAttempts[email] = 0;

  console.log("✅ Login Successful:", email);

  res.json({
    success: true,
    message: "Login successful",
    user: {
      name: user.name,
      email: user.email,
      role: user.role
    }
  });

});

module.exports = router;