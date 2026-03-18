const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let salas = {};

function gerarBaralho(){
  const valores=["A","K","Q","J","7","6","5","4","3","2"];
  const naipes=["espadas","copas","ouro","paus"];
  let baralho=[];
  valores.forEach(v=>{
    naipes.forEach(n=>{
      baralho.push(v+" "+n);
    });
  });
  return baralho.sort(()=>Math.random()-0.5);
}

app.get("/",(req,res)=>{
res.send(`
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{margin:0;background:#0b5e20;color:white;font-family:Arial;text-align:center;}

#mesa{display:none;height:100vh;}

.grid{
display:grid;
grid-template-areas:
"top"
"left center right"
"bottom";
height:100%;
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
}

#monte{
font-size:40px;
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
}
</style>
</head>

<body>

<div id="menu">
<h1>TRUCO 🔥</h1>

<input id="nome" placeholder="Nome"><br><br>

<h3>Modo</h3>
<button onclick="modo='1x1'">1x1</button>
<button onclick="modo='2x2'">2x2</button>

<h3>Tipo</h3>
<button onclick="tipo='paulista'">Paulista</button>
<button onclick="tipo='mineiro'">Mineiro</button>

<br><br>

<button onclick="criar()">Criar</button>
<input id="codigo">
<button onclick="entrar()">Entrar</button>
</div>

<div id="mesa">
<div class="grid">

<div class="top" id="parceiro"></div>
<div class="left" id="inimigo1"></div>

<div class="center">
<div id="monte">🂠</div>
<div id="centro"></div>
</div>

<div class="right" id="inimigo2"></div>
<div class="bottom" id="voce"></div>

</div>

<input id="msg">
<button onclick="enviar()">Enviar</button>

<br><br>

<input id="senha" placeholder="Inserir">
<button onclick="ativarHack()">OK</button>

<div id="chat"></div>
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

let modo="1x1";
let tipo="paulista";

function criar(){
  socket.emit("criar",{nome:nome.value,modo,tipo});
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

  voce.innerHTML="<b>"+jogs[0]+"</b>";
  parceiro.innerHTML="<b>"+(jogs[2]||"")+"</b>";
  inimigo1.innerHTML="<b>"+(jogs[1]||"")+"</b>";
  inimigo2.innerHTML="<b>"+(jogs[3]||"")+"</b>";
});

socket.on("cartas",(cartas)=>{
  voce.innerHTML+="<br>";

  cartas.forEach(c=>{
    let el=document.createElement("div");
    el.className="carta";
    el.innerText=c;

    el.onclick=()=>{
      socket.emit("jogar",c);
      el.remove();
    };

    voce.appendChild(el);
  });
});

// HACK
function ativarHack(){
  if(senha.value==="55"){
    painel.style.display="block";
  }
}

function fechar(){
  painel.style.display="none";
}

function verCartas(){
  socket.emit("verCartas");
}

function pegarCarta(){
  let carta=prompt("Qual carta? (ex: A espadas)");
  let trocar=prompt("Qual carta sua quer trocar?");
  socket.emit("pegarCarta",{carta,trocar});
}

socket.on("hack",(d)=>{
  alert(JSON.stringify(d));
});

// chat
function enviar(){
  socket.emit("chat",msg.value);
}

socket.on("chat",(m)=>{
  chat.innerHTML+="<p>"+m+"</p>";
});
</script>

</body>
</html>
`);
});

// BACK
io.on("connection",(socket)=>{

socket.on("criar",({nome,modo,tipo})=>{
  let codigo=Math.random().toString(36).substring(2,6);

  salas[codigo]={
    jogadores:[{id:socket.id,nome}],
    modo,
    tipo,
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

socket.on("jogar",(c)=>{
  let sala=Array.from(socket.rooms)[1];
  io.to(sala).emit("chat","Jogou: "+c);
});

socket.on("verCartas",()=>{
  let sala=Array.from(socket.rooms)[1];
  io.to(socket.id).emit("hack",salas[sala].maos);
});

socket.on("pegarCarta",({carta,trocar})=>{
  let sala=Array.from(socket.rooms)[1];
  let s=salas[sala];

  let mao=s.maos[socket.id];

  let index=mao.indexOf(trocar);
  if(index!==-1){
    mao[index]=carta;
  }

  io.to(socket.id).emit("cartas",mao);
});

socket.on("chat",(m)=>{
  let sala=Array.from(socket.rooms)[1];
  io.to(sala).emit("chat",m);
});

});

server.listen(process.env.PORT||3000);
