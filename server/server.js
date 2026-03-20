const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));

// -----------------------------
// ZetaLang Interpreter (JS)
// -----------------------------
class ZetaInterpreter {
  constructor() {
    this.vars = {};
  }

  run(code) {
    let output = [];
    let lines = code.split("\n");

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
// IDE PAGE
// -----------------------------
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>ZetaLang IDE</title>

<style>
body { background:#1e1e1e; color:white; font-family:monospace; margin:0; }
#editor { width:100%; height:60vh; background:#1e1e1e; color:#00ff9c; }
#output { height:30vh; background:black; padding:10px; }
button { background:#007acc; color:white; padding:10px; border:none; margin:10px; }
</style>
</head>

<body>

<h2>🚀 ZetaLang IDE</h2>

<textarea id="editor">
set x = 5
add x 10
if x > 10 say "BIG"
loop 3 say "🔥"
show x
</textarea>

<br>
<button onclick="runCode()">Run</button>

<div id="output"></div>

<script>
async function runCode() {
  let code = document.getElementById("editor").value;

  let res = await fetch("/run", {
    method: "POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded"},
    body: "code=" + encodeURIComponent(code)
  });

  let text = await res.text();
  document.getElementById("output").innerText = text;
}

window.onload = runCode;
</script>

</body>
</html>
`);
});

// -----------------------------
// RUN CODE
// -----------------------------
app.post("/run", (req, res) => {
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