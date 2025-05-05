// server.js (MODIFIÉ pour plusieurs compteurs)
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ntfy.sh ---
const NTFY_TOPIC = 'agggggggressif'; // !!! REMPLACEZ PAR VOTRE TOPIC SECRET !!!
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

const timerSpecificTopics = {
    // 'timerId': ['topic_specifique_1', 'topic_specifique_2', ...]
    'soler': ['agggggggressif_soler'],
    'lefilsduforgeron': ['agggggggressif_manny'],
    // Les IDs non listés ici n'enverront qu'au topic global.
};

const knownTimerIds = ['soler', 'lefilsduforgeron', '69']; // Les identifiants des compteurs que nous gérons

// --- Fonction pour obtenir une durée aléatoire en secondes (INCHANGÉE) ---
function getRandomDurationInSeconds() {
    const minSeconds = 185 ; // 1158 (19 * 60) + 18
    const maxSeconds = 200 ; // 2385 (39 * 60) + 45
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

const timerStates = {
    // 'timerId': { endTime: timestamp, currentDuration: seconds, threeMinWarningSent: boolean }
};


// --- Fonction pour envoyer une notification --- (NOUVEAU)
async function sendHttpRequestToNtfy(topic, message, title = "Alerte Timer") {
    const fullNtfyUrl = `${NTFY_BASE_URL}${topic}`;
    console.log(`Sending ntfy to ${topic}: ${message}`);
    try {
        await fetch(fullNtfyUrl, { // Utilise l'URL complète avec le topic
            method: 'POST',
            body: message,
            headers: { 'Title': title }
        });
    } catch (error) {
        console.error(`Failed to send ntfy notification to ${topic}:`, error);
    }
}

// --- NOUVEAU : Fonction pour gérer l'envoi multi-topics ---
async function sendNotificationsForTimer(timerId, message, title) {
    // 1. Envoyer TOUJOURS au topic global
    await sendHttpRequestToNtfy(NTFY_GLOBAL_TOPIC, message, title);

    // 2. Vérifier s'il y a des topics spécifiques pour cet ID
    const specificTopics = timerSpecificTopics[timerId];
    if (specificTopics && specificTopics.length > 0) {
        console.log(`Timer ${timerId} also notifying specific topics: ${specificTopics.join(', ')}`);
        // Envoyer à chaque topic spécifique trouvé dans le mapping
        // On peut utiliser Promise.all pour les envoyer en parallèle (optionnel)
        await Promise.all(
            specificTopics.map(topic => sendHttpRequestToNtfy(topic, message, title))
        );
    }
}

// --- Initialisation des états au démarrage (NOUVEAU) ---
function initializeTimers() {
    const now = Math.floor(Date.now() / 1000);
    knownTimerIds.forEach(id => {
        const duration = getRandomDurationInSeconds();
        timerStates[id] = {
            currentDuration: duration,
            endTime: now + duration,
            threeMinWarningSent: false
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
        timerStates[timerId].threeMinWarningSent = false

        console.log(`Timer '${timerId}' reset successful. New duration: ${Math.floor(newDuration / 60)}m ${newDuration % 60}s. New endTime: ${timerStates[timerId].endTime} (${new Date(timerStates[timerId].endTime * 1000)})`);

        // Envoyer la notification ntfy pour le clic ! (Appel ASYNCHRONE)
        sendNotificationsForTimer(
            timerId,
            `Le bouton du Timer ${timerId} a été cliqué !`,
            "Clic Bouton"
        );

        res.json({ success: true, newEndTime: timerStates[timerId].endTime });

    } else {
        console.log(`Error: Timer ID '${timerId}' not found during reset.`);
        res.status(404).json({ success: false, message: "Timer ID not found" });
    }
});

// --- Vérification périodique pour l'alerte 3 minutes (NOUVEAU et COMPLEXE) ---
// ATTENTION: Ceci ajoute de la charge au serveur et de la complexité.
// Vous pouvez commenter/supprimer ce bloc si vous ne voulez que la notif au clic.
setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    Object.keys(timerStates).forEach(id => {
        const state = timerStates[id];
        if (!state) return; // Sécurité

        const remaining = state.endTime - now;

        // Condition pour l'alerte 3 minutes (180 secondes)
        if (remaining > 0 && remaining <= 180 && !state.threeMinWarningSent) {
            const minutes = Math.floor(remaining/60);
            const seconds = remaining%60;
            const message = `Timer ${id}: Moins de 3 minutes restantes ! (${minutes}m${seconds}s)`;
            console.log("Generated 3min message:", message);

            // APPEL MODIFIÉ : Utiliser la nouvelle fonction
            sendNotificationsForTimer(id, message, "Alerte 3 Min");
            state.threeMinWarningSent = true; // Marquer comme envoyé pour ce cycle
        }

        // Optionnel: Réinitialiser le flag si le temps est écoulé mais pas encore reset
        // (pour éviter des notifications manquées si le serveur redémarre juste avant 3min)
        if (remaining <= 0 && state.threeMinWarningSent) {
            //   Note: Ce reset pourrait causer une nouvelle notif si le serveur redémarre
            //   et que le temps est toujours < 3min après redémarrage.
            //   Pour être parfait, il faudrait stocker l'état de manière persistante.
            //   Pour l'instant, on le laisse comme ça. Ou on ne reset le flag QUE dans /reset.
            //   state.threeMinWarningSent = false;
        }
    });
}, 15 * 1000); // Vérifier toutes les 15 secondes (ajuster si besoin)
// -----------------------------------------------------------------------

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    // L'initialisation affiche déjà les détails des timers
});