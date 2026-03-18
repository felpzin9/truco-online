const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let salas = {};

function gerarBaralho(){
  const valores=["A","K","Q","J","7","6","5","4","3","2"];
  const naipes=["♠","♥","♦","♣"];
  let baralho=[];
  valores.forEach(v=>{
    naipes.forEach(n=>{
      baralho.push(v+n);
    });
  });
  return baralho.sort(()=>Math.random()-0.5);
}

app.get("/",(req,res)=>{
res.send(`
<html>
<head>
<style>
body{margin:0;background:#0b5e20;color:white;font-family:Arial;text-align:center;}

.grid{
display:grid;
grid-template-areas:
"top"
"left center right"
"bottom";
height:100vh;
}

.top{grid-area:top;}
.left{grid-area:left;}
.right{grid-area:right;}
.bottom{grid-area:bottom;}
.center{grid-area:center;}

.carta{
background:white;
color:black;
padding:15px;
margin:5px;
border-radius:10px;
display:inline-block;
font-size:20px;
position:relative;
transition:all 0.5s ease;
}

.anim{
transform:translateY(-100px);
opacity:0;
}

#painel{
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
<input id="nome" placeholder="Nome"><br><br>
<button onclick="criar()">Criar Sala</button>
<input id="codigo">
<button onclick="entrar()">Entrar</button>
</div>

<div id="mesa" style="display:none;">
<div class="grid">

<div class="top" id="parceiro"></div>
<div class="left" id="inimigo1"></div>

<div class="center">
<h2>🂠</h2>
<div id="centro"></div>
</div>

<div class="right" id="inimigo2"></div>
<div class="bottom" id="voce"></div>

</div>
</div>

<div id="painel">
<h2>😈 HACK</h2>
<button onclick="verCartas()">Ver cartas</button><br><br>
<button onclick="pegarCarta()">Pegar carta</button><br><br>
<button onclick="fechar()">Fechar</button>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket=io();
let buffer="";

function criar(){
  socket.emit("criar",nome.value);
}

function entrar(){
  socket.emit("entrar",{codigo:codigo.value,nome:nome.value});
}

socket.on("codigo",(c)=>{
  alert("Sala: "+c);
});

socket.on("inicio",(jogs)=>{
  menu.style.display="none";
  mesa.style.display="block";

  // POSIÇÕES CORRETAS
  voce.innerHTML="<b>"+jogs[0]+"</b>";
  inimigo1.innerHTML="<b>"+jogs[1]+"</b>";
  parceiro.innerHTML="<b>"+jogs[2]+"</b>";
  inimigo2.innerHTML="<b>"+jogs[3]+"</b>";
});

socket.on("cartas",(cartas)=>{
  cartas.forEach((c,i)=>{
    let el=document.createElement("div");
    el.className="carta anim";
    el.innerText=c;

    setTimeout(()=>{
      el.classList.remove("anim");
    },100*i);

    el.onclick=()=>{
      socket.emit("jogar",c);
      el.remove();
    };

    voce.appendChild(el);
  });
});

// HACK 55
document.addEventListener("keydown",(e)=>{
  buffer+=e.key;

  if(buffer.includes("55")){
    painel.style.display="block";
    buffer="";
  }

  if(buffer.length>2) buffer="";
});

function fechar(){painel.style.display="none";}
function verCartas(){socket.emit("verCartas");}

function pegarCarta(){
  let carta=prompt("Carta (ex: A♠)");
  let trocar=prompt("Qual da sua mão?");
  socket.emit("pegarCarta",{carta,trocar});
}

socket.on("hack",(d)=>{
  alert(JSON.stringify(d));
});
</script>

</body>
</html>
`);
});

// BACKEND
io.on("connection",(socket)=>{

socket.on("criar",(nome)=>{
  let codigo=Math.random().toString(36).substring(2,6);

  salas[codigo]={
    jogadores:[{id:socket.id,nome}],
    maos:{}
  };

  socket.join(codigo);
  socket.emit("codigo",codigo);
});

socket.on("entrar",({codigo,nome})=>{
  let s=salas[codigo];
  if(!s)return;

  if(!s.jogadores.find(j=>j.id===socket.id)){
    s.jogadores.push({id:socket.id,nome});
  }

  socket.join(codigo);

  let baralho=gerarBaralho();

  s.jogadores.forEach(j=>{
    s.maos[j.id]=baralho.splice(0,3);
    io.to(j.id).emit("cartas",s.maos[j.id]);
  });

  io.to(codigo).emit("inicio",s.jogadores.map(j=>j.nome));
});

socket.on("verCartas",()=>{
  let sala=Array.from(socket.rooms)[1];
  io.to(socket.id).emit("hack",salas[sala].maos);
});

socket.on("pegarCarta",({carta,trocar})=>{
  let sala=Array.from(socket.rooms)[1];
  let mao=salas[sala].maos[socket.id];

  let i=mao.indexOf(trocar);
  if(i!=-1) mao[i]=carta;

  io.to(socket.id).emit("cartas",mao);
});

});

server.listen(process.env.PORT||3000);
