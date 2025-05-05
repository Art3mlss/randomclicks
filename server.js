// server.js (modifié)
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// --- Fonction pour obtenir une durée aléatoire en secondes ---
function getRandomDurationInSeconds() {
    //const minSeconds = (19 * 60) + 18; // 1158
    //const maxSeconds = (39 * 60) + 45; // 2385
    const minSeconds = (1 * 60) - 18; // 1158
    const maxSeconds = (1 * 60) + 45; // 2385

    // Formule pour obtenir un entier aléatoire entre min et max (inclus)
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}
// -----------------------------------------------------------

// --- Variable clé : endTime ---
let currentDuration = getRandomDurationInSeconds(); // Obtenir une durée initiale
let endTime = Math.floor(Date.now() / 1000) + currentDuration;
console.log(`Initial random duration: ${Math.floor(currentDuration / 60)}m ${currentDuration % 60}s`);
// --------------------------------

app.use(cors());

app.get('/time', (req, res) => {
    console.log(`GET /time request. Sending endTime: <span class="math-inline">\{endTime\} \(</span>{new Date(endTime * 1000)})`);
    res.json({ endTime: endTime });
});

app.post('/reset', (req, res) => {
    const now = Math.floor(Date.now() / 1000);
    console.log(`POST /reset request. Current time: ${now}, End time: ${endTime}`);

    // On peut reset à tout moment si le bouton est cliquable côté client,
    // mais on peut garder une sécurité serveur si on veut (ex: if now >= endTime)
    // Ici, on fait confiance au client qui ne montre le bouton qu'après la fin.

    currentDuration = getRandomDurationInSeconds(); // Nouvelle durée aléatoire
    endTime = now + currentDuration; // Nouvelle heure de fin
    console.log(`Timer reset successful. New random duration: ${Math.floor(currentDuration / 60)}m ${currentDuration % 60}s. New endTime: <span class="math-inline">\{endTime\} \(</span>{new Date(endTime * 1000)})`);
    res.json({ success: true, newEndTime: endTime });

    // Ancienne logique si on voulait être strict sur le serveur:
    // if (now >= endTime) {
    //   currentDuration = getRandomDurationInSeconds();
    //   endTime = now + currentDuration;
    //   console.log(`Timer reset successful...`);
    //   res.json({ success: true, newEndTime: endTime });
    // } else {
    //   console.log("Reset rejected by server: Timer not finished yet.");
    //   res.status(400).json({ success: false, message: "Le compteur n'est pas terminé." });
    // }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Initial end time set to: ${new Date(endTime * 1000)}`);
});