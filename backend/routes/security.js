const express = require("express");
const router = express.Router();

router.post("/security-alert", (req, res) => {

  console.log("\n🚨 SECURITY ALERT RECEIVED");
  console.log(req.body);

  res.json({
    success: true,
    message: "Security alert stored"
  });

});

module.exports = router;