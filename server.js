// server.js (Version avec UN SEUL canal de notification global)

// --- Imports ---
const express = require('express');
const cors = require('cors');
// Assurez-vous que cette ligne est bien présente et correcte !
const fetch = require('node-fetch');

// --- Initialisation Express ---
const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ntfy.sh (UN SEUL TOPIC) ---
const NTFY_TOPIC = 'agggggggressif'; // <-- Le seul topic utilisé
const NTFY_BASE_URL = 'https://ntfy.sh/';
// --------------------------------------------

// --- Liste des Timers Connus ---
// (Votre configuration actuelle)
const knownTimerIds = ['soler', 'lefilsduforgeron', '69'];
// -----------------------------

// --- Stockage de l'état des timers ---
const timerStates = {
    // Structure: 'timerId': { endTime: timestamp, currentDuration: seconds, threeMinWarningSent: boolean }
};
// -------------------------------------

// --- Fonctions Utilitaires ---

/** Retourne une durée aléatoire en secondes */
function getRandomDurationInSeconds() {
    // (Vos valeurs actuelles pour la durée)
    const minSeconds = 185 ;
    const maxSeconds = 200 ;
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

/** Initialise l'état de tous les timers connus au démarrage */
function initializeTimers() {
    const now = Math.floor(Date.now() / 1000);
    knownTimerIds.forEach(id => {
        const duration = getRandomDurationInSeconds();
        timerStates[id] = {
            currentDuration: duration,
            endTime: now + duration,
            threeMinWarningSent: false // Flag pour l'alerte 3min
        };
        console.log(`Initialized timer '${id}'. Duration: ${Math.floor(duration / 60)}m ${duration % 60}s. EndTime: ${new Date(timerStates[id].endTime * 1000)}`);
    });
}

/** Fonction d'envoi de notification (vers le topic global unique) */
// C'est la version simple qui envoie tout au même endroit
async function sendNtfyNotification(message, title = "Alerte Timer") {
    const fullNtfyUrl = `${NTFY_BASE_URL}${NTFY_TOPIC}`; // Utilise toujours NTFY_TOPIC
    console.log(`Sending ntfy notification: ${message}`);
    try {
        await fetch(fullNtfyUrl, { // Utilise le fetch importé
            method: 'POST',
            body: message,
            headers: { 'Title': title }
        });
    } catch (error) {
        console.error(`Failed to send ntfy notification to ${NTFY_TOPIC}:`, error);
    }
}
// -----------------------------------------------------------------

// --- Middleware ---
app.use(cors());
// ------------------

// --- Initialisation des Timers ---
initializeTimers();
// -------------------------------

// --- Routes API ---

// Obtenir l'heure de fin (Logique inchangée)
app.get('/time/:timerId', (req, res) => {
    const timerId = req.params.timerId;
    console.log(`GET /time/${timerId} request received.`);
    if (timerStates[timerId]) {
        res.json({ endTime: timerStates[timerId].endTime });
    } else {
        console.log(`Error: Timer ID '${timerId}' not found.`);
        res.status(404).json({ error: "Timer ID not found" });
    }
});

// Réinitialiser un timer (Utilise l'appel de notification simple)
app.post('/reset/:timerId', async (req, res) => { // async peut être retiré si sendNtfyNotification n'est plus attendu
    const timerId = req.params.timerId;
    const now = Math.floor(Date.now() / 1000);
    console.log(`POST /reset/${timerId} request received. Current time: ${now}`);

    if (timerStates[timerId]) {
        const newDuration = getRandomDurationInSeconds();
        timerStates[timerId].currentDuration = newDuration;
        timerStates[timerId].endTime = now + newDuration;
        timerStates[timerId].threeMinWarningSent = false; // Réinitialiser le flag

        console.log(`Timer '${timerId}' reset successful...`);

        // Envoyer la notification pour le clic (APPEL SIMPLE)
        sendNtfyNotification( // Appel direct à la fonction simple
            `Le bouton du Timer ${timerId} a été cliqué !`,
            "Clic Bouton"
        ); // Pas besoin d'attendre avec await ici

        res.json({ success: true, newEndTime: timerStates[timerId].endTime });

    } else {
        console.log(`Error: Timer ID '${timerId}' not found during reset.`);
        res.status(404).json({ success: false, message: "Timer ID not found" });
    }
});
// ------------------

// --- Tâche de Fond : Vérification Alerte 3 Minutes (Utilise l'appel de notification simple) ---
setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    Object.keys(timerStates).forEach(id => {
        const state = timerStates[id];
        if (!state) return;

        const remaining = state.endTime - now;

        // Condition pour l'alerte 3 minutes (180 secondes)
        if (remaining > 0 && remaining <= 180 && !state.threeMinWarningSent) {
            const minutes = Math.floor(remaining/60);
            const seconds = remaining % 60;
            const message = `Timer ${id}: Moins de 3 minutes restantes ! (${minutes}m${seconds}s)`;
            console.log("Generated 3min message:", message);

            // Envoyer la notification (APPEL SIMPLE)
            sendNtfyNotification(message, "Alerte 3 Min"); // Appel direct

            state.threeMinWarningSent = true; // Marquer comme envoyé pour ce cycle
        }
    });
}, 15 * 1000); // Vérifier toutes les 15 secondes
// ----------------------------------------------------

// --- Démarrage du Serveur ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
// ----------------------------