const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use((req, res) => {
  res.send(`
    <h1>Truco Online 🔥</h1>

    <button onclick="criar()">Criar Sala</button>
    <input id="sala" placeholder="Código da sala">
    <button onclick="entrar()">Entrar</button>

    <div id="cartas"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();

      function criar() {
        socket.emit("criarSala");
      }

      function entrar() {
        const sala = document.getElementById("sala").value;
        socket.emit("entrarSala", sala);
      }

      socket.on("salaCriada", (sala) => {
        alert("Sala: " + sala);
      });

      socket.on("cartas", (cartas) => {
        document.getElementById("cartas").innerHTML =
          "<h3>Suas cartas:</h3>" + cartas.join(" | ");
      });
    </script>
  `);
});

let salas = {};

function gerarCartas() {
  const baralho = ["A","2","3","4","5","6","7","Q","J","K"];
  return baralho.sort(() => Math.random() - 0.5).slice(0,3);
}

io.on("connection", (socket) => {

  socket.on("criarSala", () => {
    const sala = Math.random().toString(36).substring(2,6);

    salas[sala] = { jogadores: [socket.id] };

    socket.join(sala);
    socket.emit("salaCriada", sala);
  });

  socket.on("entrarSala", (sala) => {
    if (!salas[sala]) return;

    salas[sala].jogadores.push(socket.id);
    socket.join(sala);

    const cartas = gerarCartas();
    socket.emit("cartas", cartas);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Rodando...");
});
