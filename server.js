const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.static("public"));

// ===== DATABASE =====
const DB_FILE = "db.json";

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }));
}

let db = JSON.parse(fs.readFileSync(DB_FILE));

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ===== AUTH =====
app.post("/register", (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.json({ ok: false, msg: "дані не введені" });
  }

  if (db.users.find(u => u.login === login)) {
    return res.json({ ok: false, msg: "вже існує" });
  }

  db.users.push({ login, password });
  saveDB();

  res.json({ ok: true });
});

app.post("/login", (req, res) => {
  const { login, password } = req.body;

  const user = db.users.find(
    u => u.login === login && u.password === password
  );

  if (!user) return res.json({ ok: false });

  res.json({ ok: true });
});

// ===== ONLINE SYSTEM =====
let sockets = new Map();

io.on("connection", (socket) => {
  console.log("🟢 connect");

  socket.on("join", (username) => {
    if (sockets.has(socket.id)) return;

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

    setTimeout(() => (spam = 0), 3000);

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

// ===== ZetaLang ULTRA =====
class ZetaInterpreter {
  constructor() {
    this.vars = {};
    this.output = [];
    this.funcs = {};
  }

  async run(code, inputValue = "") {
    this.vars = {};
    this.output = [];
    this.funcs = {};

    if (inputValue) this.vars["input"] = inputValue;

    const lines = code.split("\n");

    let currentFunc = null;

    for (let line of lines) {
      line = line.trim();

      if (line.startsWith("func")) {
        currentFunc = line.split(" ")[1];
        this.funcs[currentFunc] = [];
        continue;
      }

      if (line === "end") {
        currentFunc = null;
        continue;
      }

      if (currentFunc) {
        this.funcs[currentFunc].push(line);
      } else {
        await this.execute(line);
      }
    }

    return this.output.join("\n");
  }

  async execute(line) {
    if (!line || line.startsWith("#")) return;

    const parts = line.split(" ");

    // SAY
    if (line.startsWith("say")) {
      let text = line.split('"')[1] || "";

      text = text.replace(/\{(.*?)\}/g, (_, v) => {
        return this.vars[v] ?? "undefined";
      });

      this.output.push(text);
    }

    // SET
    else if (line.startsWith("set")) {
      const name = parts[1];
      const value = parts[3];
      this.vars[name] = this.parse(value);
    }

    // MATH
    else if (line.startsWith("add")) {
      this.vars[parts[1]] = (this.vars[parts[1]] || 0) + parseInt(parts[2]);
    }

    else if (line.startsWith("sub")) {
      this.vars[parts[1]] -= parseInt(parts[2]);
    }

    else if (line.startsWith("mul")) {
      this.vars[parts[1]] *= parseInt(parts[2]);
    }

    else if (line.startsWith("div")) {
      this.vars[parts[1]] /= parseInt(parts[2]);
    }

    // SHOW
    else if (line.startsWith("show")) {
      this.output.push(this.vars[parts[1]] ?? "undefined");
    }

    // RANDOM
    else if (line.startsWith("random")) {
      const name = parts[1];
      const min = parseInt(parts[2]);
      const max = parseInt(parts[3]);
      this.vars[name] =
        Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // INPUT
    else if (line.startsWith("input")) {
      const name = parts[1];
      this.vars[name] = this.vars["input"] || "0";
    }

    // IF / ELSE
    else if (line.startsWith("if")) {
      const varName = parts[1];
      const op = parts[2];
      const value = parseInt(parts[3]);

      let cond = false;

      if (op === ">") cond = this.vars[varName] > value;
      if (op === "<") cond = this.vars[varName] < value;
      if (op === "==") cond = this.vars[varName] == value;
      if (op === "!=") cond = this.vars[varName] != value;

      if (cond) {
        await this.execute(parts.slice(4).join(" "));
      } else if (parts.includes("else")) {
        const i = parts.indexOf("else");
        await this.execute(parts.slice(i + 1).join(" "));
      }
    }

    // LOOP
    else if (line.startsWith("loop")) {
      let count = Math.min(parseInt(parts[1]), 100);

      for (let i = 0; i < count; i++) {
        await this.execute(parts.slice(2).join(" "));
      }
    }

    // FUNCTION
    else if (line.startsWith("call")) {
      const name = parts[1];
      const func = this.funcs[name] || [];

      for (let l of func) {
        await this.execute(l);
      }
    }

    // DELAY
    else if (line.startsWith("delay")) {
      const ms = Math.min(parseInt(parts[1]), 3000);
      await new Promise(r => setTimeout(r, ms));
    }

    // CLEAR
    else if (line === "clear") {
      this.output = [];
    }

    else {
      this.output.push("❌ " + line);
    }
  }

  parse(val) {
    if (!isNaN(val)) return parseInt(val);
    return val.replace(/"/g, "");
  }
}

const interpreter = new ZetaInterpreter();

// ===== RUN CODE API =====
app.post("/run", async (req, res) => {
  const { code, input } = req.body;

  if (!code) return res.json({ output: "❌ no code" });
  if (code.length > 3000)
    return res.json({ output: "🚫 too big code" });

  try {
    const result = await interpreter.run(code, input);
    res.json({ output: result });
  } catch (e) {
    res.json({ output: "💥 error: " + e.message });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING ON " + PORT);
});