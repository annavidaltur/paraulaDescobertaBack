const express = require('express');
const app = express();
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Hola mundo desde Express.js!');
});

// Ruta del archivo que contiene la lista de palabras
const archivoPalabras = path.join(__dirname, 'paraules.txt');

// Endpoint para obtener una palabra aleatoria
app.get('/GetPalabraDiaria', (req, res) => {
  // Leer el archivo de palabras
  const palabras = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(archivoPalabras),
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    palabras.push(line);
  });

  rl.on('close', () => {
    // Obtener un índice aleatorio dentro del rango de la lista
    const indiceAleatorio = Math.floor(Math.random() * palabras.length);

    // Obtener la palabra aleatoria
    const palabraAleatoria = palabras[indiceAleatorio];

    // Enviar la palabra aleatoria como respuesta
    res.send(palabraAleatoria);
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});
