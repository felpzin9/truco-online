const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let salas = {};

function gerarCartas() {
  return ["A♠","K♠","Q♠","J♠","7♦","6♦","5♦"].sort(()=>Math.random()-0.5).slice(0,3);
}

app.get("/", (req,res)=>{
res.send(`
<html>
<head>
<style>
body{background:#0b5e20;color:white;text-align:center;font-family:Arial;}
#mesa{display:none;}
.carta{background:white;color:black;padding:15px;margin:5px;border-radius:10px;display:inline-block;}
button{padding:10px;margin:5px;border-radius:8px;}

#painelHack{
display:none;
position:fixed;
top:50%;
left:50%;
transform:translate(-50%,-50%);
background:black;
padding:20px;
border:3px solid red;
z-index:999;
}
</style>
</head>

<body>

<div id="menu">
<h1>TRUCO 🔥</h1>

<input id="nome" placeholder="Seu nome"><br><br>

<button onclick="criar()">Criar Sala</button><br><br>

<input id="codigo" placeholder="Código da sala">
<button onclick="entrar()">Entrar</button>

<h3 id="codigoSala"></h3>
</div>

<div id="mesa">
<h2 id="info"></h2>

<div id="cartas"></div>

<button onclick="abrirHack()">😈 HACK</button>

<br><br>

<input id="msg">
<button onclick="enviar()">Enviar</button>

<div id="chat"></div>
</div>

<div id="painelHack">
<h2>😈 HACK</h2>
<button onclick="verCartas()">Ver cartas</button><br><br>
<button onclick="pegarCarta()">Pegar carta</button><br><br>
<button onclick="fecharHack()">Fechar</button>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let buffer="";

function criar(){
  socket.emit("criarSala",document.getElementById("nome").value);
}

function entrar(){
  socket.emit("entrarSala",{
    sala:document.getElementById("codigo").value,
    nome:document.getElementById("nome").value
  });
}

socket.on("salaCriada",(sala)=>{
  document.getElementById("codigoSala").innerText="Sala: "+sala;
});

socket.on("entrou",(jogs)=>{
  document.getElementById("menu").style.display="none";
  document.getElementById("mesa").style.display="block";
  document.getElementById("info").innerText="Jogadores: "+jogs.join(", ");
});

socket.on("cartas",(cartas)=>{
  const div=document.getElementById("cartas");
  div.innerHTML="<h3>Suas cartas:</h3>";

  cartas.forEach(c=>{
    let el=document.createElement("div");
    el.className="carta";
    el.innerText=c;

    el.onclick=()=>{
      socket.emit("jogar",c);
      el.remove();
    };

    div.appendChild(el);
  });
});

// CHAT
function enviar(){
  socket.emit("chat",document.getElementById("msg").value);
}

socket.on("chat",(m)=>{
  document.getElementById("chat").innerHTML+="<p>"+m+"</p>";
});

// ===== HACK =====

function abrirHack(){
  document.getElementById("painelHack").style.display="block";
}

function fecharHack(){
  document.getElementById("painelHack").style.display="none";
}

// senha 55
document.addEventListener("keydown",(e)=>{
  buffer+=e.key;

  if(buffer.includes("55")){
    abrirHack();
    buffer="";
  }

  if(buffer.length>2) buffer="";
});

function verCartas(){
  socket.emit("hackVer");
}

function pegarCarta(){
  let c=prompt("Carta (ex: A♠)");
  socket.emit("hackPegar",c);
}

socket.on("hack",(dados)=>{
  alert("Cartas: "+JSON.stringify(dados));
});
</script>

</body>
</html>
`);
});

// BACKEND
io.on("connection",(socket)=>{

socket.on("criarSala",(nome)=>{
  const sala=Math.random().toString(36).substring(2,6);

  salas[sala]={
    jogadores:[{id:socket.id,nome}],
    maos:{}
  };

  socket.join(sala);
  socket.emit("salaCriada",sala);
});

socket.on("entrarSala",({sala,nome})=>{
  const s=salas[sala];
  if(!s)return;

  s.jogadores.push({id:socket.id,nome});
  socket.join(sala);

  s.jogadores.forEach(j=>{
    s.maos[j.id]=gerarCartas();
    io.to(j.id).emit("cartas",s.maos[j.id]);
  });

  io.to(sala).emit("entrou",s.jogadores.map(j=>j.nome));
});

socket.on("jogar",(carta)=>{
  const sala=Array.from(socket.rooms)[1];
  io.to(sala).emit("chat","Jogou: "+carta);
});

socket.on("chat",(msg)=>{
  const sala=Array.from(socket.rooms)[1];
  io.to(sala).emit("chat",msg);
});

// HACK
socket.on("hackVer",()=>{
  const sala=Array.from(socket.rooms)[1];
  io.to(socket.id).emit("hack",salas[sala].maos);
});

socket.on("hackPegar",(carta)=>{
  const sala=Array.from(socket.rooms)[1];
  const s=salas[sala];

  if(!s.maos[socket.id]) return;

  s.maos[socket.id].push(carta);

  io.to(socket.id).emit("cartas",s.maos[socket.id]);
});

});

server.listen(process.env.PORT||3000);
