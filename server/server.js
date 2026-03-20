const express = require("express");

const app = express();

// Порт для Railway (ВАЖЛИВО)
const PORT = process.env.PORT || 8080;

// Проста головна сторінка
app.get("/", (req, res) => {
  res.send("🚀 Zetalang server працює!");
});

// Приклад API
app.get("/api", (req, res) => {
  res.json({ message: "API працює 🔥" });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log("🔥 SERVER STARTED on port " + PORT);
});