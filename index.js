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
<body style="background:#0b5e20;color:white;text-align:center;font-family:Arial">

<h1>TRUCO 🔥</h1>

<input id="nome" placeholder="Nome"><br><br>

<button onclick="modo='1x1'">1x1</button>
<button onclick="modo='2x2'">2x2</button>

<br><br>

<button onclick="criar()">Criar</button>

<input id="codigo">
<button onclick="entrar()">Entrar</button>

<h2 id="status"></h2>

<div id="mesa"></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket=io();

let modo="1x1";

function criar(){
  socket.emit("criar",{nome:nome.value,modo});
}

function entrar(){
  socket.emit("entrar",{codigo:codigo.value,nome:nome.value});
}

socket.on("codigo",(c)=>{
  status.innerText="Sala: "+c;
});

socket.on("esperando",(qtd)=>{
  status.innerText="Aguardando jogadores: "+qtd;
});

socket.on("inicio",(dados)=>{
  status.innerText="Jogo começou!";
  
  let html="<h3>Jogadores:</h3>";
  dados.jogadores.forEach(j=>{
    html+="<p>"+j+"</p>";
  });

  html+="<h3>Suas cartas:</h3>";

  dados.cartas.forEach(c=>{
    html+="<div>"+c+"</div>";
  });

  mesa.innerHTML=html;
});
</script>

</body>
</html>
`);
});

// BACK
io.on("connection",(socket)=>{

socket.on("criar",({nome,modo})=>{
  let codigo=Math.random().toString(36).substring(2,6);

  salas[codigo]={
    jogadores:[{id:socket.id,nome}],
    modo,
    maos:{}
  };

  socket.join(codigo);
  socket.emit("codigo",codigo);
  socket.emit("esperando",1);
});

socket.on("entrar",({codigo,nome})=>{
  let s=salas[codigo];
  if(!s)return;

  if(!s.jogadores.find(j=>j.id===socket.id)){
    s.jogadores.push({id:socket.id,nome});
  }

  socket.join(codigo);

  let max = s.modo==="2x2" ? 4 : 2;

  io.to(codigo).emit("esperando",s.jogadores.length);

  if(s.jogadores.length === max){

    let baralho=gerarBaralho();

    s.jogadores.forEach(j=>{
      s.maos[j.id]=baralho.splice(0,3);
    });

    s.jogadores.forEach(j=>{
      io.to(j.id).emit("inicio",{
        jogadores:s.jogadores.map(x=>x.nome),
        cartas:s.maos[j.id]
      });
    });

  }
});

});

server.listen(process.env.PORT||3000);
