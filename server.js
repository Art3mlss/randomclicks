// server.js
const express = require('express');
const cors = require('cors'); // Pour autoriser les requêtes depuis votre site web
const app = express();
const port = process.env.PORT || 3000; // Le port d'écoute

// --- La variable clé : l'heure de fin du compteur (en secondes depuis 1970) ---
// Initialisation : 30 minutes à partir du moment où le serveur démarre
let endTime = Math.floor(Date.now() / 1000) + (1 * 60);
// ---------------------------------------------------------------------------

app.use(cors()); // Activer CORS pour toutes les origines (à restreindre si besoin)

// Route pour obtenir l'heure de fin actuelle
app.get('/time', (req, res) => {
    console.log(`GET /time request received. Sending endTime: <span class="math-inline">\{endTime\} \(</span>{new Date(endTime * 1000)})`);
    res.json({ endTime: endTime });
});

// Route pour demander une réinitialisation
app.post('/reset', (req, res) => {
    const now = Math.floor(Date.now() / 1000);
    console.log(`POST /reset request received. Current time: ${now}, End time: ${endTime}`);
    // On ne reset que si le temps est effectivement écoulé
    if (now >= endTime) {
        endTime = now + (1 * 60); // Nouvelle heure de fin : maintenant + 30 minutes
        console.log(`Timer reset successful. New endTime: <span class="math-inline">\{endTime\} \(</span>{new Date(endTime * 1000)})`);
        res.json({ success: true, newEndTime: endTime });
    } else {
        console.log("Reset rejected: Timer not finished yet.");
        // Renvoyer une erreur pour indiquer que le reset n'est pas permis
        res.status(400).json({ success: false, message: "Le compteur n'est pas terminé." });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Initial end time set to: ${new Date(endTime * 1000)}`);
});