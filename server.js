const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// "БАЗА"
let users = {};
let banned = {};
let savedCode = {};

io.on("connection", (socket) => {

  let currentUser = null;

  // РЕЄСТРАЦІЯ
  socket.on("register", ({login, password}) => {
    if (users[login]) return;

    users[login] = {
      password: Buffer.from(password).toString("base64"), // типу шифр 💀
      admin: false
    };

    socket.emit("registerOk");
  });

  // ЛОГІН
  socket.on("login", ({login, password}) => {
    let user = users[login];
    if (!user) return socket.emit("loginFail");

    let hash = Buffer.from(password).toString("base64");

    if (user.password !== hash) return socket.emit("loginFail");

    if (banned[login]) return socket.emit("banned");

    currentUser = login;
    socket.emit("loginSuccess", login);
  });

  // АДМІН
  socket.on("adminLogin", (pass) => {
    if (pass === "adm456") {
      if (currentUser) {
        users[currentUser].admin = true;
        socket.emit("adminOk");
      }
    }
  });

  // RUN
  socket.on("runCode", (code) => {
    let output = "";

    let lines = code.split("\n");
    let vars = {};

    for (let line of lines) {
      line = line.trim();

      if (line.startsWith("say")) {
        let text = line.split('"')[1];
        output += text + "\n";
      }

      if (line.startsWith("set")) {
        let p = line.split(" ");
        vars[p[1]] = parseInt(p[3]);
      }

      if (line.startsWith("add")) {
        let p = line.split(" ");
        vars[p[1]] += parseInt(p[2]);
      }

      if (line.startsWith("print")) {
        let name = line.split(" ")[1];
        output += vars[name] + "\n";
      }
    }

    socket.emit("output", output);
  });

  // SAVE
  socket.on("saveCode", (code) => {
    if (!currentUser) return;
    savedCode[currentUser] = code;
  });

  // LOAD
  socket.on("loadCode", () => {
    if (!currentUser) return;
    socket.emit("loadCode", savedCode[currentUser] || "");
  });

  // БАН
  socket.on("ban", (userToBan) => {
    if (!currentUser) return;
    if (!users[currentUser].admin) return;

    banned[userToBan] = true;
  });

});

server.listen(3000, "0.0.0.0", () => {
  console.log("🔥 SERVER STARTED");
});