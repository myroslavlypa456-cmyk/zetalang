from flask import Flask, request
import io
import sys

# -----------------------------
# ZetaLang Interpreter
# -----------------------------

class ZetaInterpreter:
    def __init__(self):
        self.vars = {}

    def run(self, code):
        lines = code.split("\n")
        for line in lines:
            self.execute(line.strip())

    def execute(self, line):
        if not line or line.startswith("#"):
            return

        if line.startswith("say"):
            text = line.split('"')[1]
            print(text)

        elif line.startswith("set"):
            parts = line.split()
            name = parts[1]
            value = parts[3]
            self.vars[name] = self.parse_value(value)

        elif line.startswith("add"):
            _, name, value = line.split()
            self.vars[name] += int(value)

        elif line.startswith("show"):
            _, name = line.split()
            print(self.vars.get(name, "undefined"))

        elif line.startswith("if"):
            parts = line.split()
            var = parts[1]
            op = parts[2]
            value = int(parts[3])

            if op == ">" and self.vars.get(var, 0) > value:
                if parts[4] == "say":
                    text = line.split('"')[1]
                    print(text)

        elif line.startswith("loop"):
            parts = line.split()
            count = int(parts[1])

            for _ in range(count):
                if parts[2] == "say":
                    text = line.split('"')[1]
                    print(text)

    def parse_value(self, val):
        if val.isdigit():
            return int(val)
        return val.strip('"')


# -----------------------------
# WEB SERVER
# -----------------------------

app = Flask(__name__)
interpreter = ZetaInterpreter()


@app.route('/')
def home():
    return """
<!DOCTYPE html>
<html>
<head>
<title>ZetaLang IDE</title>

<style>
body {
    margin: 0;
    font-family: monospace;
    background: #1e1e1e;
    color: white;
}

header {
    background: #333;
    padding: 10px;
}

#editor {
    width: 100%;
    height: 60vh;
    background: #1e1e1e;
    color: #00ff9c;
    border: none;
    padding: 10px;
    font-size: 16px;
}

#output {
    height: 30vh;
    background: black;
    padding: 10px;
    overflow: auto;
    border-top: 2px solid #333;
}

button {
    background: #007acc;
    border: none;
    padding: 10px 20px;
    color: white;
    cursor: pointer;
    margin: 10px;
}
</style>

</head>

<body>

<header>
    <h2>🚀 ZetaLang IDE</h2>
</header>

<textarea id="editor">
# ZetaLang Demo

set x = 5
add x 10

if x > 10 say "BIG NUMBER"

loop 3 say "🔥"

show x
</textarea>

<br>
<button onclick="runCode()">▶ Run</button>

<div id="output"></div>

<script>
async function runCode() {
    let code = document.getElementById("editor").value;

    let res = await fetch('/run', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'code=' + encodeURIComponent(code)
    });

    let text = await res.text();
    document.getElementById("output").innerText = text;
}

window.onload = runCode;
</script>

</body>
</html>
"""


@app.route('/run', methods=['POST'])
def run_code():
    code = request.form['code']

    old_stdout = sys.stdout
    sys.stdout = buffer = io.StringIO()

    try:
        interpreter.run(code)
    except Exception as e:
        print("Error:", e)

    sys.stdout = old_stdout
    return buffer.getvalue()


# -----------------------------
# RUN
# -----------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)