const express = require('express');
const app = express();
const { wordSet } = require('./paraules.js');
const bodyParser = require('body-parser');
const cron = require('node-cron');

// Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Permitir acceso desde cualquier origen
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Permitir métodos específicos
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Permitir encabezados específicos
  next();
});

// Middleware para analizar el cuerpo de las solicitudes
app.use(bodyParser.json());

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Hola mundo desde Express.js!');
});

// Obtenemos una palabra aleatoria
let palabraDiaria;
const seleccionarPalabraDiaria = () => {
  const indice = Math.floor(Math.random() * wordSet.length);
  palabraDiaria = wordSet[indice];
};
seleccionarPalabraDiaria();
console.log(palabraDiaria)

// Tarea para seleccionar una nueva palabra diaria cada día a las 00:00
cron.schedule('0 0 * * *', () => {
  seleccionarPalabraDiaria();
  console.log('Nueva palabra diaria seleccionada:', palabraDiaria);
});

// Endpoint para comprobar la palabra existe en el conjunto de palabras
app.post('/CheckWord', (req, res) => {  
  const { word } = req.body;

  // Verificar si la palabra es la correcta
  const isCorrect = palabraDiaria.withoutAccent === word.toLowerCase();
  
  // Verificar si la palabra existe en el conjunto de palabras
  const exists = wordSet.some(item => item.withoutAccent === word.toLowerCase());
  
  // Determinar l'estat de cada lletra i deshabilitar les incorrectes
  const disabledLetters = [];
  const rowState = [];
  if(exists){    
    for (let i = 0; i < word.length; i++) {
      const letter = word[i].toLowerCase();
      
      const correct = palabraDiaria.withoutAccent[i] === letter
      const almost = !correct && letter !== "" && palabraDiaria.withoutAccent.includes(letter)      
      const letterState = correct ? "correct" : almost ? "almost" : "error";
      
      rowState.push(letterState);
      
      if (!palabraDiaria.withoutAccent.includes(letter)) {
        disabledLetters.push(letter.toUpperCase());
      }   
    }
  }

  // Enviar una respuesta al front
  res.json({ exists, isCorrect, disabledLetters, rowState });
});

app.get('/GetPalabraDiaria', (req, res) => {
  res.send(palabraDiaria);
});


// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});


