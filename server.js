const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// статика (сайт)
app.use(express.static("public"));

// --- простий чат ---
let users = [];

io.on("connection", (socket) => {
  console.log("🟢 user connected");

  socket.on("join", (username) => {
    users.push({ id: socket.id, username });
    io.emit("users", users);
  });

  socket.on("message", (msg) => {
    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("users", users);
    console.log("🔴 user disconnected");
  });
});

// --- PORT ДЛЯ RAILWAY ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🔥 SERVER WORKING ON " + PORT);
});