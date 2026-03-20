const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// -----------------------------
// 🧠 STORAGE (тимчасово)
let users = {};
let sessions = {};
let messages = [];

// -----------------------------
// 🔒 Anti-spam
let lastReq = {};
function spam(ip) {
  let now = Date.now();
  if (lastReq[ip] && now - lastReq[ip] < 500) return true;
  lastReq[ip] = now;
  return false;
}

// -----------------------------
// 👑 ADMIN
let isAdmin = false;

// -----------------------------
// 🧠 ZetaLang
class Zeta {
  constructor(){ this.vars = {}; }

  run(code){
    let out = [];
    let lines = code.split("\n");

    for(let l of lines){
      l = l.trim();
      if(!l) continue;

      if(l === "log Adm456"){
        isAdmin = true;
        out.push("👑 ADMIN MODE");
        continue;
      }

      if(l.startsWith("say")){
        out.push(l.split('"')[1]);
      }

      if(l.startsWith("set")){
        let p = l.split(" ");
        this.vars[p[1]] = Number(p[3]);
      }

      if(l.startsWith("add")){
        let [_,n,v] = l.split(" ");
        this.vars[n]+=Number(v);
      }

      if(l.startsWith("show")){
        let [_,n] = l.split(" ");
        out.push(this.vars[n]);
      }
    }

    return out.join("\n");
  }
}
const z = new Zeta();

// -----------------------------
// 🔐 AUTH
app.post("/register",(req,res)=>{
  let {user,pass}=req.body;
  if(users[user]) return res.send("❌ exists");
  users[user]=pass;
  res.send("ok");
});

app.post("/login",(req,res)=>{
  let {user,pass}=req.body;
  if(users[user]===pass){
    let token=Math.random()+"";
    sessions[token]=user;
    res.send(token);
  } else res.send("❌");
});

// -----------------------------
// 💬 CHAT
app.get("/chat",(req,res)=>{
  res.json(messages);
});

app.post("/chat",(req,res)=>{
  let {token,msg}=req.body;
  let user=sessions[token];

  if(!user) return res.send("❌ login");

  messages.push(user+": "+msg);
  if(messages.length>50) messages.shift();

  res.send("ok");
});

// -----------------------------
// RUN CODE
app.post("/run",(req,res)=>{
  let ip=req.headers["x-forwarded-for"]||req.socket.remoteAddress;
  if(spam(ip)) return res.send("⛔ spam");

  try{
    res.send(z.run(req.body.code));
  }catch(e){
    res.send("error");
  }
});

// -----------------------------
// 🌐 FRONTEND
app.get("/",(req,res)=>{
res.send(`
<!DOCTYPE html>
<html>
<head>
<title>ZetaLang IDE</title>
<script src="https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js"></script>

<style>
body{margin:0;display:flex;height:100vh;background:#1e1e1e;color:white;}
#side{width:200px;background:#111;padding:10px;}
#main{flex:1;display:flex;flex-direction:column;}
#editor{flex:1;}
#output{height:120px;background:black;}
#chat{width:250px;background:#000;padding:5px;}
</style>
</head>

<body>

<div id="side">
<h3>👤 Account</h3>
<input id="user" placeholder="login"><br>
<input id="pass" placeholder="pass" type="password"><br>
<button onclick="reg()">Register</button>
<button onclick="login()">Login</button>
</div>

<div id="main">
<div id="editor"></div>
<div id="output"></div>
<button onclick="run()">Run</button>
</div>

<div id="chat">
<h3>💬 Chat</h3>
<div id="msgs"></div>
<input id="msg">
<button onclick="send()">Send</button>
</div>

<script>
let editor,token="";

require.config({ paths:{vs:'https://unpkg.com/monaco-editor@0.44.0/min/vs'}});
require(["vs/editor/editor.main"],()=>{

editor=monaco.editor.create(document.getElementById("editor"),{
value:"set x = 5",
language:"javascript",
theme:"vs-dark"
});
});

// RUN
async function run(){
let code=editor.getValue();
let r=await fetch("/run",{method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({code})
});
let t=await r.text();
output.innerText=t;

if(t.includes("ADMIN")) alert("👑 ADMIN");
}

// AUTH
async function reg(){
await fetch("/register",{method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({user:user.value,pass:pass.value})
});
}

async function login(){
let r=await fetch("/login",{method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({user:user.value,pass:pass.value})
});
token=await r.text();
}

// CHAT
async function send(){
await fetch("/chat",{method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({token,msg:msg.value})
});
}

setInterval(async()=>{
let r=await fetch("/chat");
let data=await r.json();
msgs.innerText=data.join("\\n");
},1000);

</script>
</body>
</html>
`);
});

// -----------------------------
app.listen(PORT,()=>console.log("🔥 RUNNING"));