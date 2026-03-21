const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
let messagesLimit = {};

io.on("connection", (socket) => {
  console.log("🟢 connect");

  socket.on("join", (username) => {
    socket.username = username;
    socket.isAdmin = false;

    users.push({ id: socket.id, username });

    io.emit("users", users);
    io.emit("online", users.length);
  });

  socket.on("message", (msg) => {
    // 🔥 анти-спам
    if (!messagesLimit[socket.id]) messagesLimit[socket.id] = 0;
    messagesLimit[socket.id]++;

    if (messagesLimit[socket.id] > 5) {
      socket.emit("message", "🚫 не спамь");
      return;
    }

    setTimeout(() => {
      messagesLimit[socket.id] = 0;
    }, 3000);

    // 👑 адмін секрет
    if (msg === "log Adm456") {
      socket.isAdmin = true;
      socket.emit("message", "👑 ТИ АДМІН");
      socket.emit("admin", true);
      return;
    }

    // 🧠 команди адміна
    if (socket.isAdmin && msg === "/help") {
      socket.emit("message", "👑 команди: /online /clear");
      return;
    }

    if (socket.isAdmin && msg === "/online") {
      socket.emit("message", "👥 онлайн: " + users.length);
      return;
    }

    if (socket.isAdmin && msg === "/clear") {
      io.emit("clear");
      return;
    }

    io.emit("message", socket.username + ": " + msg);
  });

  socket.on("disconnect", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("users", users);
    io.emit("online", users.length);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🔥 SERVER WORKING ON " + PORT);
});