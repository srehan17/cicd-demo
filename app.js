const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.json({ message: "New CI/CD pipeline 🚀" });
});

module.exports = app;
