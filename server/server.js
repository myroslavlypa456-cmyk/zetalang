const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));

// -----------------------------
// 🔒 Anti-spam PRO
// -----------------------------
let requests = {};

function isSpam(ip) {
  let now = Date.now();

  if (!requests[ip]) requests[ip] = [];

  requests[ip] = requests[ip].filter(t => now - t < 5000);

  requests[ip].push(now);

  if (requests[ip].length > 5) {
    return true;
  }

  return false;
}

// -----------------------------
// 👑 ADMIN SYSTEM (hidden)
// -----------------------------
let ADMIN_KEY = "secret123"; // ти потім скажеш інший
let isAdmin = false;

app.get("/admin", (req, res) => {
  let key = req.query.key;

  if (key === ADMIN_KEY) {
    isAdmin = true;
    return res.send("👑 ADMIN MODE ACTIVATED");
  }

  res.send("⛔ Access denied");
});

// -----------------------------
// ZetaLang Interpreter
// -----------------------------
class ZetaInterpreter {
  constructor() {
    this.vars = {};
  }

  run(code) {
    let output = [];
    let lines = code.split("\n");

    if (code.length > 2000) return ["❌ Code too big"];

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;

      if (line.startsWith("say")) {
        let text = line.split('"')[1];
        output.push(text);
      }

      else if (line.startsWith("set")) {
        let parts = line.split(" ");
        let name = parts[1];
        let value = parts[3];
        this.vars[name] = isNaN(value) ? value : Number(value);
      }

      else if (line.startsWith("add")) {
        let [_, name, value] = line.split(" ");
        this.vars[name] += Number(value);
      }

      else if (line.startsWith("show")) {
        let [_, name] = line.split(" ");
        output.push(this.vars[name] ?? "undefined");
      }

      else if (line.startsWith("if")) {
        let parts = line.split(" ");
        let name = parts[1];
        let op = parts[2];
        let value = Number(parts[3]);

        if (op === ">" && this.vars[name] > value) {
          let text = line.split('"')[1];
          output.push(text);
        }
      }

      else if (line.startsWith("loop")) {
        let parts = line.split(" ");
        let count = Number(parts[1]);

        for (let i = 0; i < count; i++) {
          let text = line.split('"')[1];
          output.push(text);
        }
      }
    }

    return output.join("\n");
  }
}

const interpreter = new ZetaInterpreter();

// -----------------------------
// IDE ULTRA
// -----------------------------
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>ZetaLang IDE</title>

<script src="https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js"></script>

<style>
body { margin:0; background:#1e1e1e; color:white; font-family:sans-serif; display:flex; }

#left { width:75%; }
#right {
  width:25%;
  background:#111;
  padding:10px;
  border-left:2px solid #333;
}

#topbar {
  background:#333;
  padding:10px;
  display:flex;
  gap:5px;
}

button {
  background:#007acc;
  border:none;
  padding:8px 12px;
  color:white;
  cursor:pointer;
}

#editor { height:60vh; }
#output {
  height:30vh;
  background:black;
  padding:10px;
  overflow:auto;
  border-top:2px solid #333;
}

.file {
  cursor:pointer;
  padding:5px;
  border-bottom:1px solid #333;
}
</style>
</head>

<body>

<div id="left">
  <div id="topbar">
    <button onclick="runCode()">▶ Run</button>
    <button onclick="toggleAuto()">⚡ Auto</button>
    <button onclick="newFile()">📄 New</button>
    <button onclick="saveFile()">💾 Save</button>
  </div>

  <div id="editor"></div>
  <div id="output"></div>
</div>

<div id="right">
  <h3>📁 Files</h3>
  <div id="files"></div>

  <h3>📖 Commands</h3>
  <pre>
set x = 5
add x 10
say "text"
show x
if x > 10 say ""
loop 3 say ""
  </pre>
</div>

<script>
let editor;
let autoRun = false;
let currentFile = "main.zeta";

require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' }});
require(["vs/editor/editor.main"], function () {

  monaco.languages.register({ id: "zetalang" });

  monaco.languages.setMonarchTokensProvider("zetalang", {
    tokenizer: {
      root: [
        [/\\b(set|add|say|if|loop|show)\\b/, "keyword"],
        [/".*?"/, "string"],
        [/\\d+/, "number"]
      ]
    }
  });

  editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "zetalang",
    theme: "vs-dark"
  });

  loadFiles();
});

function runCode() {
  fetch("/run", {
    method: "POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded"},
    body: "code=" + encodeURIComponent(editor.getValue())
  })
  .then(r => r.text())
  .then(t => document.getElementById("output").innerText = t);
}

function toggleAuto() {
  autoRun = !autoRun;
}

function newFile() {
  let name = prompt("File name:");
  localStorage.setItem(name, "");
  loadFiles();
}

function saveFile() {
  localStorage.setItem(currentFile, editor.getValue());
}

function loadFiles() {
  let filesDiv = document.getElementById("files");
  filesDiv.innerHTML = "";

  for (let i=0;i<localStorage.length;i++) {
    let key = localStorage.key(i);

    let div = document.createElement("div");
    div.className = "file";
    div.innerText = key;

    div.onclick = () => {
      currentFile = key;
      editor.setValue(localStorage.getItem(key));
    };

    filesDiv.appendChild(div);
  }
}

setInterval(() => {
  if (autoRun) runCode();
}, 1000);

// ADMIN check
fetch("/admin?key=test");
</script>

</body>
</html>
`);
});

// -----------------------------
app.post("/run", (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (isSpam(ip)) return res.send("⛔ Too many requests");

  try {
    let result = interpreter.run(req.body.code);
    res.send(result);
  } catch (e) {
    res.send("Error: " + e.message);
  }
});

// -----------------------------
app.listen(PORT, () => {
  console.log("🔥 SERVER STARTED " + PORT);
});