const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 📁 правильний шлях до public
const PUBLIC_PATH = path.join(__dirname, "../public");
app.use(express.static(PUBLIC_PATH));

// 📁 папка для даних
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// "база"
let users = {};
let banned = {};

io.on("connection", (socket) => {
  let currentUser = null;

  // ================= REGISTER =================
  socket.on("register", ({ login, password }) => {
    if (!login || !password) return;

    if (users[login]) {
      return socket.emit("registerFail");
    }

    users[login] = {
      password: Buffer.from(password).toString("base64"),
      admin: false
    };

    socket.emit("registerOk");
  });

  // ================= LOGIN =================
  socket.on("login", ({ login, password }) => {
    const user = users[login];
    if (!user) return socket.emit("loginFail");

    const hash = Buffer.from(password).toString("base64");

    if (user.password !== hash) {
      return socket.emit("loginFail");
    }

    if (banned[login]) {
      return socket.emit("banned");
    }

    currentUser = login;
    socket.emit("loginSuccess", login);
  });

  // ================= ADMIN =================
  socket.on("adminLogin", (pass) => {
    if (pass === "adm456" && currentUser) {
      users[currentUser].admin = true;
      socket.emit("adminOk");
    }
  });

  // ================= RUN CODE =================
  socket.on("runCode", (code) => {
    try {
      const result = runZetaLang(code);
      socket.emit("output", result);
    } catch (err) {
      socket.emit("output", "❌ ERROR: " + err.message);
    }
  });

  // ================= SAVE =================
  socket.on("saveCode", (code) => {
    if (!currentUser) return;

    const file = path.join(DATA_DIR, currentUser + ".txt");
    fs.writeFileSync(file, code);
  });

  // ================= LOAD =================
  socket.on("loadCode", () => {
    if (!currentUser) return;

    const file = path.join(DATA_DIR, currentUser + ".txt");

    try {
      const code = fs.readFileSync(file, "utf-8");
      socket.emit("loadCode", code);
    } catch {
      socket.emit("loadCode", "");
    }
  });

  // ================= BAN =================
  socket.on("ban", (userToBan) => {
    if (!currentUser) return;
    if (!users[currentUser].admin) return;

    banned[userToBan] = true;
  });
});

// ================= ZetaLang =================
function runZetaLang(code) {
  let output = "";
  let vars = {};

  const lines = code.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // say "text"
    if (line.startsWith("say")) {
      const match = line.match(/say\s+"(.+)"/);
      if (!match) throw new Error("say syntax error");
      output += match[1] + "\n";
      continue;
    }

    // set x = 5
    if (line.startsWith("set")) {
      const parts = line.split(" ");
      if (parts.length !== 4) throw new Error("set syntax error");

      const name = parts[1];
      const value = parseInt(parts[3]);

      if (isNaN(value)) throw new Error("invalid number");

      vars[name] = value;
      continue;
    }

    // add x 3
    if (line.startsWith("add")) {
      const parts = line.split(" ");
      const name = parts[1];
      const value = parseInt(parts[2]);

      if (!(name in vars)) throw new Error("variable not defined");

      vars[name] += value;
      continue;
    }

    // print x
    if (line.startsWith("print")) {
      const name = line.split(" ")[1];

      if (!(name in vars)) throw new Error("variable not defined");

      output += vars[name] + "\n";
      continue;
    }

    // loop 5
    if (line.startsWith("loop")) {
      const times = parseInt(line.split(" ")[1]);

      if (isNaN(times)) throw new Error("loop syntax error");

      for (let i = 0; i < times; i++) {
        output += "loop " + i + "\n";
      }
      continue;
    }

    throw new Error("unknown command: " + line);
  }

  return output;
}

// ================= START =================
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 SERVER STARTED on port " + PORT);
});