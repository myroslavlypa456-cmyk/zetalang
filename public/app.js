const socket = io();
let currentUser = null;

function register() {
  socket.emit("register", {
    login: login.value,
    password: password.value
  });
}

function loginUser() {
  socket.emit("login", {
    login: login.value,
    password: password.value
  });
}

function runCode() {
  socket.emit("runCode", code.value);
}

function saveCode() {
  socket.emit("saveCode", code.value);
}

function loadCode() {
  socket.emit("loadCode");
}

socket.on("output", data => output.textContent = data);
socket.on("loginSuccess", u => currentUser = u);
socket.on("registerOk", () => alert("OK"));