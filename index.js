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
body{
  background:#0b5e20;
  color:white;
  font-family:Arial;
  text-align:center;
}

#mesa{display:none;}

button{
  padding:10px;
  margin:5px;
  border-radius:8px;
}

.carta{
  background:white;
  color:black;
  padding:15px;
  margin:5px;
  border-radius:10px;
  display:inline-block;
}

#monte{
  position:absolute;
  top:20px;
  right:20px;
  font-size:40px;
}
</style>
</head>

<body>

<div id="menu">
<h1>TRUCO 🔥</h1>

<input id="nome" placeholder="Seu nome"><br><br>

<h3>Modo</h3>
<button onclick="modo='1x1'">1x1</button>
<button onclick="modo='2x2'">2x2</button>

<h3>Tipo</h3>
<button onclick="tipo='paulista'">Paulista</button>
<button onclick="tipo='mineiro'">Mineiro</button>

<br><br>

<button onclick="criar()">Criar Sala</button><br><br>

<input id="codigo" placeholder="Código">
<button onclick="entrar()">Entrar</button>

<h3 id="infoSala"></h3>
</div>

<div id="mesa">
<h2 id="topo"></h2>

<div id="monte">🂠</div>

<div id="cartas"></div>

<input id="msg">
<button onclick="enviar()">Enviar</button>

<div id="chat"></div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();

let modo="1x1";
let tipo="paulista";

function criar(){
  const nome=document.getElementById("nome").value;

  socket.emit("criarSala",{nome,modo,tipo});
}

function entrar(){
  const nome=document.getElementById("nome").value;
  const sala=document.getElementById("codigo").value;

  socket.emit("entrarSala",{sala,nome});
}

socket.on("salaCriada",(dados)=>{
  document.getElementById("infoSala").innerText=
    "Sala: "+dados.codigo+" | "+dados.modo+" | "+dados.tipo;

  // entra automático
  socket.emit("entrarSala",{sala:dados.codigo,nome:document.getElementById("nome").value});
});

socket.on("inicio",(dados)=>{
  document.getElementById("menu").style.display="none";
  document.getElementById("mesa").style.display="block";

  document.getElementById("topo").innerText=
    "Modo: "+dados.modo+" | Tipo: "+dados.tipo;
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

// chat
function enviar(){
  socket.emit("chat",document.getElementById("msg").value);
}

socket.on("chat",(m)=>{
  document.getElementById("chat").innerHTML+="<p>"+m+"</p>";
});
</script>

</body>
</html>
`);
});

// BACKEND
io.on("connection",(socket)=>{

socket.on("criarSala",({nome,modo,tipo})=>{
  const codigo=Math.random().toString(36).substring(2,6);

  salas[codigo]={
    jogadores:[{id:socket.id,nome}],
    modo,
    tipo,
    maos:{}
  };

  socket.join(codigo);

  socket.emit("salaCriada",{codigo,modo,tipo});
});

socket.on("entrarSala",({sala,nome})=>{
  const s=salas[sala];
  if(!s)return;

  // evita duplicar jogador
  if(!s.jogadores.find(j=>j.id===socket.id)){
    s.jogadores.push({id:socket.id,nome});
  }

  socket.join(sala);

  s.jogadores.forEach(j=>{
    s.maos[j.id]=gerarCartas();
    io.to(j.id).emit("cartas",s.maos[j.id]);
  });

  io.to(sala).emit("inicio",{modo:s.modo,tipo:s.tipo});
});

socket.on("jogar",(carta)=>{
  const sala=Array.from(socket.rooms)[1];
  io.to(sala).emit("chat","Jogou: "+carta);
});

socket.on("chat",(msg)=>{
  const sala=Array.from(socket.rooms)[1];
  io.to(sala).emit("chat",msg);
});

});

server.listen(process.env.PORT||3000);
