const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let salas = {};

function gerarBaralho(tipo) {
  if (tipo === "mineiro") {
    const valores = ["4","7","Q","J","K","A","2","3"];
    const naipes = ["♦","♥"];
    let baralho = [];

    for (let n of naipes) {
      for (let v of valores) {
        baralho.push(v + n);
      }
    }

    return baralho;
  }

  const valores = ["4","5","6","7","Q","J","K","A","2","3"];
  const naipes = ["♠","♥","♦","♣"];
  let baralho = [];

  for (let n of naipes) {
    for (let v of valores) {
      baralho.push(v + n);
    }
  }

  return baralho;
}

function valorCarta(carta, tipo, vira) {
  const ordem = ["4","5","6","7","Q","J","K","A","2","3"];
  const v = carta.slice(0, -1);

  if (tipo === "mineiro") {
    if (carta === "4♣") return 100;
    if (carta === "7♦" || carta === "7♥") return 90;
    return ordem.indexOf(v);
  }

  const valorVira = vira.slice(0, -1);
  let index = ordem.indexOf(valorVira) + 1;
  if (index >= ordem.length) index = 0;

  const manilha = ordem[index];

  if (v === manilha) {
    return 100 + ["♣","♥","♠","♦"].indexOf(carta.slice(-1));
  }

  return ordem.indexOf(v);
}

app.use((req, res) => {
  res.send(`
  <html>
  <head>
    <style>
      body { background:#0b5e20; color:white; text-align:center; font-family:Arial;}
      .carta {display:inline-block;padding:15px;margin:5px;background:white;color:black;border-radius:10px;font-size:20px;}
      #mesa {margin-top:20px;padding:20px;background:#146b2e;border-radius:10px;}
      #chat {height:100px;overflow-y:auto;border:1px solid white;}
    </style>
  </head>

  <body>

    <h1>Truco Online 🔥</h1>

    <input id="nome" placeholder="Seu nome"><br><br>

    <button onclick="setModo('1x1')">1x1</button>
    <button onclick="setModo('2x2')">2x2</button>

    <br>

    <button onclick="setTipo('paulista')">Paulista</button>
    <button onclick="setTipo('mineiro')">Mineiro</button>

    <br><br>

    <button onclick="criar()">Criar Sala</button><br><br>

    <input id="sala" placeholder="Código">
    <button onclick="entrar()">Entrar</button>

    <h3 id="info"></h3>

    <div id="cartas"></div>
    <div id="mesa"></div>
    <h3 id="placar"></h3>

    <button onclick="sinal()">🤫</button>

    <br><br>

    <input id="msg">
    <button onclick="enviar()">Enviar</button>
    <div id="chat"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();
      let modo="1x1", tipo="paulista";

      function setModo(m){modo=m;alert(m);}
      function setTipo(t){tipo=t;alert(t);}

      function criar(){
        const nome=document.getElementById("nome").value;
        socket.emit("criarSala",{nome,modo,tipo});
      }

      function entrar(){
        const sala=document.getElementById("sala").value;
        const nome=document.getElementById("nome").value;
        socket.emit("entrarSala",{sala,nome});
      }

      socket.on("salaCriada",s=>alert("Sala: "+s));

      socket.on("info",txt=>{
        document.getElementById("info").innerText=txt;
      });

      socket.on("vira",v=>{
        document.getElementById("mesa").innerHTML="<h3>Vira: "+v+"</h3>";
      });

      socket.on("cartas",cartas=>{
        const div=document.getElementById("cartas");
        div.innerHTML="";
        cartas.forEach(c=>{
          const el=document.createElement("div");
          el.className="carta";
          el.innerText=c;
          el.onclick=()=>{socket.emit("jogarCarta",c);el.remove();};
          div.appendChild(el);
        });
      });

      socket.on("mesa",m=>{
        document.getElementById("mesa").innerHTML+= "<br>"+m.join(" | ");
      });

      socket.on("placar",p=>{
        document.getElementById("placar").innerText=p[0]+" x "+p[1];
      });

      function sinal(){socket.emit("sinal","👀");}
      socket.on("sinal",msg=>alert("Parceiro: "+msg));

      function enviar(){
        const msg=document.getElementById("msg").value;
        socket.emit("chat",msg);
      }

      socket.on("chat",msg=>{
        document.getElementById("chat").innerHTML+="<p>"+msg+"</p>";
      });
    </script>

  </body>
  </html>
  `);
});

io.on("connection",(socket)=>{

  socket.on("criarSala",(user)=>{
    const sala=Math.random().toString(36).substring(2,6);

    salas[sala]={
      jogadores:[{id:socket.id,nome:user.nome}],
      modo:user.modo,
      tipo:user.tipo,
      turno:0,
      mesa:[],
      pontos:[0,0],
      vira:null
    };

    socket.join(sala);
    socket.emit("salaCriada",sala);
  });

  socket.on("entrarSala",({sala,nome})=>{
    if(!salas[sala])return;

    const s=salas[sala];

    s.jogadores.push({id:socket.id,nome});
    socket.join(sala);

    const baralho=gerarBaralho(s.tipo).sort(()=>Math.random()-0.5);

    if(s.tipo==="paulista"){
      s.vira=baralho.pop();
      io.to(sala).emit("vira",s.vira);
    }

    s.jogadores.forEach(j=>{
      io.to(j.id).emit("cartas",baralho.splice(0,3));
    });

    io.to(sala).emit("info",
      s.modo+" - "+s.tipo+" | "+s.jogadores.map(j=>j.nome).join(", ")
    );
  });

  socket.on("jogarCarta",(carta)=>{
    const sala=Array.from(socket.rooms)[1];
    if(!sala)return;

    const s=salas[sala];
    const i=s.jogadores.findIndex(j=>j.id===socket.id);

    if(i!==s.turno)return;

    s.mesa.push({jogador:i,carta});

    const limite = s.modo==="2x2"?4:2;

    if(s.mesa.length===limite){
      let vencedor=s.mesa[0];

      s.mesa.forEach(j=>{
        if(valorCarta(j.carta,s.tipo,s.vira)>
           valorCarta(vencedor.carta,s.tipo,s.vira)){
          vencedor=j;
        }
      });

      const time=vencedor.jogador%2;
      s.pontos[time]++;

      io.to(sala).emit("placar",s.pontos);

      s.mesa=[];
    }

    io.to(sala).emit("mesa",s.mesa.map(m=>m.carta));

    s.turno=(s.turno+1)%s.jogadores.length;
  });

  socket.on("sinal",(msg)=>{
    const sala=Array.from(socket.rooms)[1];
    const s=salas[sala];

    const i=s.jogadores.findIndex(j=>j.id===socket.id);
    const parceiro=s.jogadores.find((_,idx)=>idx%2===i%2 && idx!==i);

    if(parceiro){
      io.to(parceiro.id).emit("sinal",msg);
    }
  });

  socket.on("chat",(msg)=>{
    const sala=Array.from(socket.rooms)[1];
    io.to(sala).emit("chat",msg);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT,()=>console.log("Rodando..."));
