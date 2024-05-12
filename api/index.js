require('dotenv').config();

const express = require('express');
const { wordSet } = require('../paraules.js');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
// import cron from './cron.js';

const app = express();

// Vercel cronJob
// cron();

// Connectar BBDD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.URL_FRONT); // Permitir acceso desde cualquier origen
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); // Permitir métodos específicos
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Permitir encabezados específicos
  next();
});

// Middleware para analizar el cuerpo de las solicitudes
app.use(bodyParser.json());

// Obtenemos una palabra aleatoria
let paraulaDiaria;
const seleccionarParaulaDiaria = () => {
  const indice = Math.floor(Math.random() * wordSet.length);
  paraulaDiaria = wordSet[indice];
};
seleccionarParaulaDiaria();

// Endpoint para comprobar la palabra existe en el conjunto de palabras
app.post('/CheckWord', (req, res) => {  
  const { word } = req.body;

  // Verificar si la palabra es la correcta
  const isCorrect = palabraDiaria.withoutAccent === word;
  
  // Verificar si la palabra existe en el conjunto de palabras
  const exists = wordSet.some(item => item.withoutAccent === word);
  
  // Determinar l'estat de cada lletra i deshabilitar les incorrectes
  const disabledLetters = [];
  const rowState = [];
  if(exists){    
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      
      const correct = palabraDiaria.withoutAccent[i] === letter
      const almost =letter !== "" && palabraDiaria.withoutAccent.includes(letter)      
      const letterState = correct ? "correct" : almost ? "almost" : "error";
      
      rowState.push(letterState);
      
      if (!palabraDiaria.withoutAccent.includes(letter)) {
        disabledLetters.push(letter);
      }   
    }
  }

  // Enviar una respuesta al front
  res.json({ exists, isCorrect, disabledLetters, rowState });
});

app.get('/GetParaulaDiaria', (req, res) => {
  res.send(paraulaDiaria);
});

app.get('/GetUserStats', async (req, res) => {
  try {
    const { data: result, error } = await supabase.from('UserStats').select('*').eq('userId', req.query.userId);
    if (error) {
      console.error('Error: ', error.message);
      res.status(500).send('Error');
      return;
    }
    res.send(result);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Error');
  }
});


// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor iniciat en el port ${PORT}`);
});

module.exports = app;