const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));

// -----------------------------
// 🔒 Anti-spam
// -----------------------------
let lastRequest = {};

function isSpam(ip) {
  let now = Date.now();

  if (lastRequest[ip] && now - lastRequest[ip] < 1000) {
    return true;
  }

  lastRequest[ip] = now;
  return false;
}

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

    if (lines.length > 100) {
      return ["❌ Too much code"];
    }

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
// IDE
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

#left {
  width: 75%;
}

#right {
  width: 25%;
  background:#111;
  padding:10px;
  border-left:2px solid #333;
}

#topbar {
  background:#333;
  padding:10px;
}

button {
  background:#007acc;
  border:none;
  padding:8px 15px;
  color:white;
  cursor:pointer;
  margin-right:5px;
}

#editor { height:60vh; }
#output {
  height:30vh;
  background:black;
  padding:10px;
  overflow:auto;
  border-top:2px solid #333;
  font-family:monospace;
}
</style>
</head>

<body>

<div id="left">
  <div id="topbar">
    <button onclick="runCode()">▶ Run</button>
    <button onclick="clearOutput()">🧹 Clear</button>
    <button onclick="saveCode()">💾 Save</button>
    <button onclick="loadCode()">📂 Load</button>
  </div>

  <div id="editor"></div>
  <div id="output"></div>
</div>

<div id="right">
  <h3>📖 Commands</h3>
  <pre>
set x = 5        → створити змінну
add x 10         → додати
say "text"       → вивести текст
show x           → показати змінну
if x > 10 say "" → умова
loop 3 say ""    → цикл
  </pre>
</div>

<script>
let editor;

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
    value: \`# ZetaLang Demo
set x = 5
add x 10
if x > 10 say "BIG"
loop 3 say "🔥"
show x\`,
    language: "zetalang",
    theme: "vs-dark"
  });
});

async function runCode() {
  let code = editor.getValue();

  let res = await fetch("/run", {
    method: "POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded"},
    body: "code=" + encodeURIComponent(code)
  });

  let text = await res.text();
  document.getElementById("output").innerText = text;
}

function clearOutput() {
  document.getElementById("output").innerText = "";
}

function saveCode() {
  localStorage.setItem("zetalang_code", editor.getValue());
}

function loadCode() {
  let code = localStorage.getItem("zetalang_code");
  if (code) editor.setValue(code);
}
</script>

</body>
</html>
`);
});

// -----------------------------
// RUN CODE
// -----------------------------
app.post("/run", (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (isSpam(ip)) {
    return res.send("⛔ Too fast, slow down!");
  }

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