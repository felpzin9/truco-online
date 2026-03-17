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
body{margin:0;font-family:Arial;background:#0b5e20;color:white;text-align:center;}

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
transition:0.3s;
}

.carta:hover{transform:scale(1.1);}

.virada{background:black;color:black;}

.animar{animation:subir 0.3s;}
@keyframes subir{
from{transform:translateY(50px);}
to{transform:translateY(0);}
}

button{
padding:12px;
margin:6px;
font-size:16px;
border-radius:10px;
}

#timer{font-size:20px;color:yellow;}

#chat{
position:fixed;
bottom:0;
right:0;
width:180px;
height:180px;
overflow:auto;
background:black;
}
</style>
</head>

<body>

<h1 style="font-size:40px;">TRUCO 🔥</h1>

<input id="nome" placeholder="Nome"><br><br>
<button onclick="criar()">Criar Sala</button><br><br>
<input id="codigo" placeholder="Código">
<button onclick="entrar()">Entrar</button>

<h2 id="timer"></h2>

<div id="mesa">

<div class="pos top" id="parceiro"></div>
<div class="pos left" id="inimigo1"></div>
<div class="pos right" id="inimigo2"></div>
<div class="pos bottom" id="voce"></div>
<div class="pos center" id="centro"></div>

</div>

<button onclick="truco()">TRUCO</button>
<button onclick="correr()">CORRER</button>
<button onclick="sinal()">🤫</button>

<input id="msg">
<button onclick="enviar()">Enviar</button>

<div id="chat"></div>

<audio id="somTruco">
<source src="https://www.myinstants.com/media/sounds/truco.mp3">
</audio>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();

let hack=false;
let buffer="";
let tempo=10;
let intervalo;

function startTimer(){
tempo=10;
clearInterval(intervalo);
intervalo=setInterval(()=>{
tempo--;
document.getElementById("timer").innerText="Tempo: "+tempo;

if(tempo<=0){
clearInterval(intervalo);
socket.emit("tempoAcabou");
}
},1000);
}

function criar(){
socket.emit("criarSala",document.getElementById("nome").value);
}

function entrar(){
socket.emit("entrarSala",{
sala:document.getElementById("codigo").value,
nome:document.getElementById("nome").value
});
}

socket.on("entrarOk",(jogs)=>{
document.getElementById("voce").innerHTML="<b>"+jogs[0]+"</b>";
document.getElementById("parceiro").innerHTML="<b>"+(jogs[2]||"")+"</b>";
document.getElementById("inimigo1").innerHTML="<b>"+(jogs[1]||"")+"</b>";
document.getElementById("inimigo2").innerHTML="<b>"+(jogs[3]||"")+"</b>";
});

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
};

div.appendChild(el);
});
});

socket.on("mesa",(m)=>{
const centro=document.getElementById("centro");
centro.innerHTML="";

m.forEach(c=>{
let el=document.createElement("div");
el.className="carta animar";
el.innerText=c;
centro.appendChild(el);
});

startTimer();
});

socket.on("truco",(v)=>{
document.getElementById("somTruco").play();
alert("TRUCO VALENDO "+v);
});

function truco(){socket.emit("truco");}
function correr(){socket.emit("correr");}
function sinal(){socket.emit("sinal","👀");}

socket.on("sinal",(msg)=>alert("Parceiro: "+msg));

function enviar(){
socket.emit("chat",document.getElementById("msg").value);
}

socket.on("chat",(m)=>{
document.getElementById("chat").innerHTML+="<p>"+m+"</p>";
});

// HACK 55
document.addEventListener("keydown",(e)=>{
buffer+=e.key;

if(buffer.includes("55")){
hack=true;
alert("HACK ATIVO 😈");
socket.emit("hack");
buffer="";
}

if(buffer.length>2) buffer="";
});

socket.on("hack",(dados)=>{
alert("Cartas: "+JSON.stringify(dados));
});
</script>

</body>
</html>
`);
});

io.on("connection",(socket)=>{

socket.on("criarSala",(nome)=>{
const sala=Math.random().toString(36).substring(2,6);

salas[sala]={
jogadores:[{id:socket.id,nome}],
turno:0,
mesa:[],
maos:{},
valor:1
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

io.to(socket.id).emit("entrarOk",s.jogadores.map(j=>j.nome));
});

socket.on("jogar",(carta)=>{
const sala=Array.from(socket.rooms)[1];
const s=salas[sala];
if(!s)return;

if(s.jogadores[s.turno].id !== socket.id) return;

s.mesa.push(carta);
io.to(sala).emit("mesa",s.mesa);

s.turno=(s.turno+1)%s.jogadores.length;
});

socket.on("tempoAcabou",()=>{
const sala=Array.from(socket.rooms)[1];
const s=salas[sala];
if(!s)return;

s.turno=(s.turno+1)%s.jogadores.length;
});

socket.on("truco",()=>{
const sala=Array.from(socket.rooms)[1];
const s=salas[sala];

if(s.valor===1)s.valor=3;
else if(s.valor===3)s.valor=6;
else if(s.valor===6)s.valor=9;
else if(s.valor===9)s.valor=12;

io.to(sala).emit("truco",s.valor);
});

socket.on("hack",()=>{
const sala=Array.from(socket.rooms)[1];
const s=salas[sala];

io.to(socket.id).emit("hack",s.maos);
});

socket.on("chat",(m)=>{
const sala=Array.from(socket.rooms)[1];
io.to(sala).emit("chat",m);
});

socket.on("sinal",(msg)=>{
const sala=Array.from(socket.rooms)[1];
socket.to(sala).emit("sinal",msg);
});

});

server.listen(process.env.PORT||3000);
