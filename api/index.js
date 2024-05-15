require('dotenv').config();

const express = require('express');
const { wordSet } = require('../paraules.js');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

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
  res.setHeader('Access-Control-Allow-Origin', process.env.URL_FRONT); // Permitir accés des de qualsevol origen
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); // Permitir métodos específicos
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Permitir encabezados específicos
  res.setHeader('Access-Control-Allow-Credentials', 'true'); // Permitir cookies
  next();
});

// Middleware para analizar el cuerpo de las solicitudes
app.use(bodyParser.json());
app.use(cookieParser());

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
  const isCorrect = paraulaDiaria.withoutAccent === word;
  
  // Verificar si la palabra existe en el conjunto de palabras
  const exists = wordSet.some(item => item.withoutAccent === word);
  
  // Determinar l'estat de cada lletra i deshabilitar les incorrectes
  const disabledLetters = [];
  const rowState = [];
  if(exists){    
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      
      const correct = paraulaDiaria.withoutAccent[i] === letter
      const almost =letter !== "" && paraulaDiaria.withoutAccent.includes(letter)      
      const letterState = correct ? "correct" : almost ? "almost" : "error";
      
      rowState.push(letterState);
      
      if (!paraulaDiaria.withoutAccent.includes(letter)) {
        disabledLetters.push(letter);
      }   
    }
  }

  // Enviar una respuesta al front
  res.json({ exists, isCorrect, disabledLetters, rowState });
});

app.post('/UpdateCookie', (req, res) => {
  const now = Date.now();
  const ttl = 86400000; // 24h
  let connectId = req.cookies.connectId ? JSON.parse(decodeURIComponent(req.cookies.connectId)) : null;
  console.log('connectId', connectId)
  if (connectId) {
      connectId.lastUsed = now;
      if (!connectId.userId) // Debería tener userId asignado, si no lo tiene generamos uno nuevo o intentamos recuperarlo (to)
        connectId.userId = uuidv4();
  } else {
      connectId = {
          ttl: ttl,
          lastUsed: now,
          lastSynced: now,
          userId: uuidv4()
      };
  }

  res.cookie('connectId', encodeURIComponent(JSON.stringify(connectId)), {
      maxAge: ttl,
      httpOnly: true, // asegura que la cookie no sea accesible desde JavaScript
      secure: true,   // asegura que la cookie solo sea enviada a través de HTTPS
      sameSite: 'lax' // previene el envío de la cookie en solicitudes cross-site
  });

  res.send({ message: 'Cookie updated', userId: connectId.userId });
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
    res.send(result[0]);
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