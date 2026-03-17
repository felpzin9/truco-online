const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let salas = {};

function gerarBaralho() {
  const valores = ["4","5","6","7","Q","J","K","A","2","3"];
  const naipes = ["♠","♥","♦","♣"];
  let baralho = [];
  for (let n of naipes) for (let v of valores) baralho.push(v+n);
  return baralho.sort(()=>Math.random()-0.5);
}

app.use((req,res)=>{
res.send(`
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body{
  margin:0;
  font-family:Arial;
  background:#0b5e20;
  color:white;
  text-align:center;
}

.tela{display:none;}
.ativa{display:block;}

#mesa{
  display:grid;
  grid-template-areas:
    "top"
    "left center right"
    "bottom";
  height:100vh;
}

.pos{padding:10px;}

.top{grid-area:top;}
.left{grid-area:left;}
.right{grid-area:right;}
.bottom{grid-area:bottom;}
.center{grid-area:center;}

.carta{
  display:inline-block;
  background:white;
  color:black;
  padding:18px;
  margin:6px;
  border-radius:12px;
  font-size:24px;
  transition:0.2s;
}

.carta:hover{
  transform:scale(1.1);
}

button{
  padding:12px;
  margin:6px;
  font-size:16px;
  border-radius:10px;
}

#chat{
  position:fixed;
  bottom:0;
  right:0;
  width:160px;
  height:160px;
  overflow:auto;
  background:black;
}
</style>
</head>

<body>

<!-- MENU -->
<div id="menu" class="tela ativa">
<h1>TRUCO 🔥</h1>
<input id="nome" placeholder="Nome"><br><br>
<button onclick="criar()">Criar Sala</button><br><br>
<input id="codigo" placeholder="Código">
<button onclick="entrar()">Entrar</button>
</div>

<!-- MESA -->
<div id="mesaTela" class="tela">
<h1 style="font-size:40px;">TRUCO</h1>

<div id="mesa">

<div class="pos top" id="parceiro">PARCEIRO</div>
<div class="pos left" id="inimigo1">INIMIGO</div>
<div class="pos right" id="inimigo2">INIMIGO</div>
<div class="pos bottom" id="voce"></div>
<div class="pos center" id="centro"></div>

</div>

<button onclick="truco()">TRUCO</button>
<button onclick="correr()">CORRER</button>

<div id="chat"></div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();

// MENU
function criar(){
  socket.emit("criarSala",document.getElementById("nome").value);
}

function entrar(){
  socket.emit("entrarSala",{
    sala:document.getElementById("codigo").value,
    nome:document.getElementById("nome").value
  });
}

// TROCA TELA
function irMesa(){
  document.getElementById("menu").classList.remove("ativa");
  document.getElementById("mesaTela").classList.add("ativa");
}

socket.on("salaCriada",(s)=>{
  alert("Código: "+s);
  irMesa();
});

socket.on("entrarOk",()=>{
  irMesa();
});

// CARTAS
socket.on("mao",(cartas)=>{
  const div=document.getElementById("voce");
  div.innerHTML="";

  cartas.forEach(c=>{
    let el=document.createElement("div");
    el.className="carta";
    el.innerText=c;

    el.onclick=()=>{
      socket.emit("jogar",c);
      el.style.opacity=0.3;
      el.onclick=null;
    };

    div.appendChild(el);
  });
});

// MESA
socket.on("mesa",(m)=>{
  document.getElementById("centro").innerText=m.join(" | ");
});

// CHAT
function enviar(){
  socket.emit("chat",document.getElementById("msg").value);
}

socket.on("chat",(m)=>{
  document.getElementById("chat").innerHTML+="<p>"+m+"</p>";
});

// AÇÕES
function truco(){socket.emit("truco");}
function correr(){socket.emit("correr");}
</script>

</body>
</html>
`);
});

// BACK
io.on("connection",(socket)=>{

socket.on("criarSala",(nome)=>{
  const sala=Math.random().toString(36).substring(2,6);

  salas[sala]={
    jogadores:[{id:socket.id,nome}],
    turno:0,
    mesa:[],
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

  const baralho=gerarBaralho();

  s.jogadores.forEach(j=>{
    s.maos[j.id]=baralho.splice(0,3);
    io.to(j.id).emit("mao",s.maos[j.id]);
  });

  io.to(socket.id).emit("entrarOk");
});

socket.on("jogar",(carta)=>{
  const sala=Array.from(socket.rooms)[1];
  const s=salas[sala];
  if(!s)return;

  // trava turno
  if(s.jogadores[s.turno].id !== socket.id) return;

  s.mesa.push(carta);

  io.to(sala).emit("mesa",s.mesa);

  s.turno=(s.turno+1)%s.jogadores.length;
});

socket.on("chat",(m)=>{
  const sala=Array.from(socket.rooms)[1];
  io.to(sala).emit("chat",m);
});

});

server.listen(process.env.PORT||3000);
