require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const { wordSet } = require('../paraules');
const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

    // Funció per a seleccionar una paraula del diccionari
    const seleccionarParaulaDiaria = () => {
        const index = Math.floor(Math.random() * wordSet.length);
        const paraulaDiaria = wordSet[index];
        return paraulaDiaria;
    };

    // Funció per a guardar la paraula en bbdd
    const guardarParaulaDiaria = async (paraulaDiaria) => {
        const { data, error } = await supabase
            .from('ParaulesDiaries') 
            .insert([{ correct: paraulaDiaria.correct, withoutAccent: paraulaDiaria.withoutAccent, date: new Date() }]); 

        if (error)
            console.error('Error:', error);
    };


    export default async function handler(req, res) {
        if (req.method === 'GET') {
            const paraulaDiaria = seleccionarParaulaDiaria();
            await guardarParaulaDiaria(paraulaDiaria);
            res.status(200).send(`Palabra diaria guardada: ${paraulaDiaria}`);
        } else {
            res.status(405).send({ message: 'Método no permitido' });
        }
    }

// Vercel no executa
// Tasca programada a les 00h
// cron.schedule('0 0 * * *', async () => {
//     const paraulaDiaria = seleccionarParaulaDiaria();
//     await guardarParaulaDiaria(paraulaDiaria);
// });

// Executa al instant
// (async () => {
//     const paraulaDiaria = seleccionarParaulaDiaria();
//     console.log(paraulaDiaria);
//     await guardarParaulaDiaria(paraulaDiaria);
// })();
