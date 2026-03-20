const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const SECRET = "zeta-secret";
const PORT = process.env.PORT || 8080;

app.use(express.json());

// ---------------- USERS
let users = {}; // замінити на MongoDB пізніше

// ---------------- AUTH
app.post("/register", (req,res)=>{
  let {user,pass}=req.body;
  if(users[user]) return res.send("exists");
  users[user]=pass;
  res.send("ok");
});

app.post("/login",(req,res)=>{
  let {user,pass}=req.body;
  if(users[user]===pass){
    let token = jwt.sign({user}, SECRET);
    res.send(token);
  } else res.send("no");
});

// ---------------- SOCKET
let onlineUsers = {};

io.on("connection",(socket)=>{

  socket.on("auth",(token)=>{
    try{
      let data = jwt.verify(token, SECRET);
      socket.user = data.user;
      onlineUsers[socket.id] = data.user;

      io.emit("users", Object.values(onlineUsers));
    }catch{}
  });

  socket.on("chat",(msg)=>{
    if(!socket.user) return;
    io.emit("chat", socket.user + ": " + msg);
  });

  socket.on("joinRoom",(room)=>{
    socket.join(room);
  });

  socket.on("disconnect",()=>{
    delete onlineUsers[socket.id];
    io.emit("users", Object.values(onlineUsers));
  });
});

// ---------------- CODE (ADMIN)
let isAdmin = {};

app.post("/run",(req,res)=>{
  let code = req.body.code;
  let out = [];

  let lines = code.split("\\n");

  for(let l of lines){
    l=l.trim();

    if(l==="log Adm456"){
      isAdmin[req.ip]=true;
      out.push("👑 ADMIN MODE");
    }

    if(l.startsWith("say")){
      out.push(l.split('"')[1]);
    }
  }

  res.send(out.join("\\n"));
});

// ---------------- FRONT
app.get("/",(req,res)=>{
res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Zeta IDE PRO</title>

<script src="/socket.io/socket.io.js"></script>
<script src="https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js"></script>

<style>
body { margin:0; display:flex; height:100vh; background:#1e1e1e; color:white; }

#explorer { width:250px; background:#111; overflow:auto; }
#tabs { background:#222; padding:5px; display:flex; }
.tab { margin-right:5px; padding:5px; background:#333; cursor:pointer; }

#main { flex:1; display:flex; flex-direction:column; }
#editor { flex:1; }

#chat { width:250px; background:#000; display:flex; flex-direction:column; }
#msgs { flex:1; overflow:auto; }

#users { background:#111; padding:5px; }

#games { position:absolute; bottom:0; left:260px; background:#111; padding:10px; }

.file { padding:3px; cursor:pointer; }
</style>
</head>

<body>

<div id="explorer">
  <button onclick="addFile()">+ Add</button>
  <div id="tree"></div>
</div>

<div id="main">
  <div id="tabs"></div>
  <div id="editor"></div>
  <button onclick="run()">Run</button>
</div>

<div id="chat">
  <div id="users"></div>
  <div id="msgs"></div>
  <input id="msg">
  <button onclick="send()">Send</button>
</div>

<div id="games">
  🎮 Games:
  <button onclick="clicker()">Clicker</button>
  <button onclick="guess()">Guess</button>
</div>

<script>
let socket = io();
let editor;
let token = localStorage.token || "";
let files = {};
let tabs = [];

// -------- MONACO
require.config({ paths:{vs:'https://unpkg.com/monaco-editor@0.44.0/min/vs'}});
require(["vs/editor/editor.main"],()=>{
  editor = monaco.editor.create(document.getElementById("editor"),{
    value:"",
    theme:"vs-dark"
  });
});

// -------- FILES + DRAG
function addFile(){
  let name = prompt("file");
  files[name]="";
  renderTree();
}

function renderTree(){
  tree.innerHTML="";
  for(let f in files){
    let d=document.createElement("div");
    d.className="file";
    d.innerText=f;

    d.draggable=true;

    d.onclick=()=>openTab(f);

    tree.appendChild(d);
  }
}

function openTab(name){
  if(!tabs.includes(name)){
    tabs.push(name);

    let t=document.createElement("div");
    t.className="tab";
    t.innerText=name;

    t.onclick=()=>{
      editor.setValue(files[name]);
    };

    tabsDiv.appendChild(t);
  }
}

let tabsDiv = document.getElementById("tabs");

// -------- RUN
async function run(){
  let r = await fetch("/run",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({code:editor.getValue()})
  });

  let t = await r.text();
  alert(t);
}

// -------- CHAT
socket.emit("auth", token);

socket.on("chat", m=>{
  msgs.innerHTML += "<div>"+m+"</div>";
});

socket.on("users", u=>{
  users.innerText = "Online:\\n"+u.join("\\n");
});

function send(){
  socket.emit("chat", msg.value);
  msg.value="";
}

// -------- MINI GAMES
function clicker(){
  let score=0;
  let btn=document.createElement("button");
  btn.innerText="CLICK!";
  btn.onclick=()=>{score++; btn.innerText=score};
  document.body.appendChild(btn);
}

function guess(){
  let n=Math.floor(Math.random()*10);
  let g=prompt("0-9");
  alert(g==n?"WIN":"LOSE");
}

renderTree();
</script>

</body>
</html>
`);
});

// ---------------- START
server.listen(PORT,()=>console.log("🔥 PRO SERVER"));