require('dotenv').config({path: '.env.dev'});

const express = require('express');
const { wordSet } = require('../paraules.js');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const { CronJob } = require('cron');
const cors = require('cors');
// import cron from './cron.js';

const app = express();

// Vercel cronJob
// cron();

// Connectar BBDD
const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurar CORS
app.use(cors({
  origin: process.env.NEXT_URL_FRONT,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware para analizar el cuerpo de las solicitudes
app.use(bodyParser.json());
app.use(cookieParser());

const seleccionarParaulaDiaria = async () => {
  const { data, error } = await supabase
    .from('ParaulesDiaries')
    .select('correct, withoutAccent')
    .order('date', { ascending: false })  // per obtenir la més recent
    .limit(1);
    console.log("Paraula diària:", data?.[0]);
    if (error) 
    console.error("Error al llegir la paraula diaria", error);

  return data[0];
};

// Endpoint para comprobar la palabra existe en el conjunto de palabras
app.post('/CheckWord', async (req, res) => {
  const { word, attempt } = req.body;
  const userId = JSON.parse(decodeURIComponent(req.cookies.connectId)).userId;
  const paraulaDiaria = await seleccionarParaulaDiaria();

  // Verificar si la palabra es la correcta
  const isCorrect = paraulaDiaria.withoutAccent === word;

  // Verificar si la palabra existe en el conjunto de palabras
  const exists = wordSet.some(item => item.withoutAccent === word);

  // Determinar l'estat de cada lletra i deshabilitar les incorrectes
  const disabledLetters = [];
  const rowState = [];
  if (exists) {
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];

      const correct = paraulaDiaria.withoutAccent[i] === letter
      const almost = letter !== "" && paraulaDiaria.withoutAccent.includes(letter)
      const letterState = correct ? "correct" : almost ? "almost" : "error";

      rowState.push(letterState);

      if (!paraulaDiaria.withoutAccent.includes(letter)) {
        disabledLetters.push(letter);
      }
    }
  }

  // Si ha finalitzat el joc actualitzem les estadístiques
  if (isCorrect || attempt === 6) {
    updateStats(userId, isCorrect, attempt);
  }

  // Enviar la resposta al front
  res.json({ exists, isCorrect, disabledLetters, rowState });
});

const updateStats = async (userId, isCorrect, attempt) => {
  const { data: oldStats, error } = await supabase.from('UserStats').select('*').eq('userId', userId).single();

  if (oldStats) {
    // L'usuari ja existeix, actualitzem les estadístiques
    const currentStreak = calculateCurrentStreak(oldStats, isCorrect);
    const updatedStats = {
      nPlayed: oldStats.nPlayed + 1,
      nGuessed: isCorrect ? oldStats.nGuessed + 1 : oldStats.nGuessed,
      attempts1: attempt === 1 ? oldStats.attempts1 + 1 : oldStats.attempts1,
      attempts2: attempt === 2 ? oldStats.attempts2 + 1 : oldStats.attempts2,
      attempts3: attempt === 3 ? oldStats.attempts3 + 1 : oldStats.attempts3,
      attempts4: attempt === 4 ? oldStats.attempts4 + 1 : oldStats.attempts4,
      attempts5: attempt === 5 ? oldStats.attempts5 + 1 : oldStats.attempts5,
      attempts6: isCorrect && attempt === 6 ? oldStats.attempts6 + 1 : oldStats.attempts6,
      currentStreak: currentStreak,
      bestStreak: Math.max(oldStats.bestStreak, currentStreak),
      lastPlayed: new Date().toISOString()
    };
    const attempts = [
      updatedStats.attempts1,
      updatedStats.attempts2,
      updatedStats.attempts3,
      updatedStats.attempts4,
      updatedStats.attempts5,
      updatedStats.attempts6
    ];
    const filteredAttempts = attempts.filter(attempt => attempt > 0);

    const bestTry = isCorrect ? Math.min(...filteredAttempts) : oldStats.bestTry;
    updatedStats.bestTry = bestTry

    const { error: updateError } = await supabase.from('UserStats').update(updatedStats).eq('userId', userId);

    if (updateError) {
      console.error('Error updating stats', updateError);
    }
  } else {
    // Primera vegada que completa el joc, insertem registre    
    const newStats = {
      userId: userId,
      nPlayed: 1,
      nGuessed: isCorrect ? 1 : 0,
      attempts1: attempt === 1 ? 1 : 0,
      attempts2: attempt === 2 ? 1 : 0,
      attempts3: attempt === 3 ? 1 : 0,
      attempts4: attempt === 4 ? 1 : 0,
      attempts5: attempt === 5 ? 1 : 0,
      attempts6: isCorrect && attempt === 6 ? 1 : 0,
      currentStreak: isCorrect ? 1 : 0,
      bestStreak: isCorrect ? 1 : 0,
      bestTry: isCorrect ? attempt : 0,
      lastPlayed: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('UserStats').insert(newStats);

    if (insertError) {
      console.error('Error inserting stats', insertError);
    }
  }
};

const calculateCurrentStreak = (stats, isCorrect) => {
  if (isCorrect) {
    return stats.currentStreak + 1;
  } else {
    return 0;
  }
};

app.post('/UpdateCookie', async (req, res) => {
  const now = Date.now();
  const ttl = 86400000; // 24h
  let connectId = req.cookies.connectId ? JSON.parse(decodeURIComponent(req.cookies.connectId)) : null;
  
  if (connectId) {
    connectId.lastUsed = now;
    const { data, error } = await supabase.from('UserStats').select('lastPlayed').eq('userId', connectId.userId).single();
    if(error) {
      console.error('Error al llegir la data de l\'usuari', error);
      return res.status(500).send('Error al llegir la data de l\'usuari');
    }
    const lastPlayed = new Date(data.lastPlayed).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    if (lastPlayed === today)
      return res.send({ playedToday: true });

    if (!connectId.userId) // Debería tener userId asignado, si no lo tiene generamos uno nuevo o intentamos recuperarlo (to)
      connectId.userId = uuidv4();
  } else {
    connectId = {
      ttl: ttl,
      lastUsed: now,
      lastSynced: now,
      userId: uuidv4()&& connectId.playedToday === true
    };
  }

  res.cookie('connectId', encodeURIComponent(JSON.stringify(connectId)), {
    maxAge: ttl,
    httpOnly: process.env.HTTP_ONLY, // asegura que la cookie no sea accesible desde JavaScript
    secure: process.env.SECURE,   // asegura que la cookie solo sea enviada a través de HTTPS
    sameSite: process.env.SAME_SITE // previene el envío de la cookie en solicitudes cross-site
  });

  res.send({ message: 'Cookie updated', userId: connectId.userId });
});

app.get('/GetParaulaDiaria', async (req, res) => {
  const paraulaDiaria = await seleccionarParaulaDiaria();
  res.send(paraulaDiaria);
});

const emptyStats = { userId: 0, nPlayed: 0, nGuessed: 0, attempts1: 0, attempts2: 0, attempts3: 0, attempts4: 0, attempts5: 0, attempts6: 0, currentStreak: 0, bestStreak: 0, bestTry: 0 };

app.get('/GetUserStats', async (req, res) => {
  if (req.cookies.connectId == undefined)// Primera vegada que entra, no té usuari
    return res.send(emptyStats);

  try {
    const userId = JSON.parse(decodeURIComponent(req.cookies.connectId)).userId;
    const { data: result, error } = await supabase.from('UserStats').select('*').eq('userId', userId).single();
    if (error || !result)
      return res.send(emptyStats);


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