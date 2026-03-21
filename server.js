const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

// ===== БАЗА =====
const DB_FILE = "db.json";
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }));
}
const db = JSON.parse(fs.readFileSync(DB_FILE));

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ===== AUTH =====
app.post("/register", (req, res) => {
  const { login, password } = req.body;

  if (db.users.find(u => u.login === login)) {
    return res.json({ ok: false, msg: "Вже існує" });
  }

  db.users.push({ login, password });
  saveDB();

  res.json({ ok: true });
});

app.post("/login", (req, res) => {
  const { login, password } = req.body;

  const user = db.users.find(u => u.login === login && u.password === password);

  if (!user) return res.json({ ok: false });

  res.json({ ok: true });
});

// ===== ОНЛАЙН =====
let sockets = new Map(); // id -> user

// ===== ЧАТ =====
io.on("connection", (socket) => {
  console.log("🟢 connect");

  socket.on("join", (username) => {
    if (sockets.has(socket.id)) return; // 🔥 фікс накрутки

    socket.username = username || "Guest";
    socket.isAdmin = false;

    sockets.set(socket.id, socket.username);

    io.emit("online", sockets.size);
    io.emit("users", Array.from(sockets.values()));
  });

  let spam = 0;

  socket.on("message", (msg) => {
    spam++;
    if (spam > 5) {
      socket.emit("message", "🚫 анти-спам");
      return;
    }
    setTimeout(() => spam = 0, 3000);

    if (msg === "log Adm456") {
      socket.isAdmin = true;
      socket.emit("admin", true);
      socket.emit("message", "👑 ти адмін");
      return;
    }

    if (socket.isAdmin && msg === "/online") {
      socket.emit("message", "👥 " + sockets.size);
      return;
    }

    io.emit("message", socket.username + ": " + msg);
  });

  socket.on("disconnect", () => {
    sockets.delete(socket.id);
    io.emit("online", sockets.size);
    io.emit("users", Array.from(sockets.values()));
  });
});

// ===== ТВОЯ МОВА =====
app.post("/run", (req, res) => {
  const { code } = req.body;

  // 🔥 тут можна парсити zetalang
  // поки демо:
  if (code.includes("print")) {
    return res.json({ output: "👉 " + code.replace("print", "") });
  }

  res.json({ output: "❌ невідома команда" });
});

// ===== PORT =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🔥 SERVER " + PORT);
});