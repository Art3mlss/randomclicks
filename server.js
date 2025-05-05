// server.js (MODIFIÉ pour plusieurs compteurs)
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// --- Fonction pour obtenir une durée aléatoire en secondes (INCHANGÉE) ---
function getRandomDurationInSeconds() {
    const minSeconds = (19 * 60) + 18; // 1158 (19 * 60) + 18
    const maxSeconds = (39 * 60) + 45; // 2385
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

// --- Stockage des états pour chaque compteur (MODIFIÉ) ---
const timerStates = {
    // 'timerId': { endTime: timestamp, currentDuration: seconds }
};
const knownTimerIds = ['soler', 'lefilsduforgeron']; // Les identifiants des compteurs que nous gérons

// --- Initialisation des états au démarrage (NOUVEAU) ---
function initializeTimers() {
    const now = Math.floor(Date.now() / 1000);
    knownTimerIds.forEach(id => {
        const duration = getRandomDurationInSeconds();
        timerStates[id] = {
            currentDuration: duration,
            endTime: now + duration
        };
        console.log(`Initialized timer '${id}'. Duration: ${Math.floor(duration / 60)}m ${duration % 60}s. EndTime: ${new Date(timerStates[id].endTime * 1000)}`);
    });
}
initializeTimers(); // Appeler l'initialisation
// ------------------------------------------------------

app.use(cors());

// --- Route pour obtenir l'heure de fin (MODIFIÉE) ---
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

// --- Route pour demander une réinitialisation (MODIFIÉE) ---
app.post('/reset/:timerId', (req, res) => {
    const timerId = req.params.timerId;
    const now = Math.floor(Date.now() / 1000);
    console.log(`POST /reset/${timerId} request received. Current time: ${now}`);

    if (timerStates[timerId]) {
        // On fait confiance au client pour le moment où le reset est possible
        const newDuration = getRandomDurationInSeconds();
        timerStates[timerId].currentDuration = newDuration;
        timerStates[timerId].endTime = now + newDuration;

        console.log(`Timer '${timerId}' reset successful. New duration: ${Math.floor(newDuration / 60)}m ${newDuration % 60}s. New endTime: ${timerStates[timerId].endTime} (${new Date(timerStates[timerId].endTime * 1000)})`);
        res.json({ success: true, newEndTime: timerStates[timerId].endTime });

    } else {
        console.log(`Error: Timer ID '${timerId}' not found during reset.`);
        res.status(404).json({ success: false, message: "Timer ID not found" });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    // L'initialisation affiche déjà les détails des timers
});