// server.js (Nouvelle approche simplifiée pour multi-topic)

// --- Imports ---
const express = require('express');
const cors = require('cors');
// Assurez-vous que cette ligne est bien présente et correcte !
const fetch = require('node-fetch');

// --- Initialisation Express ---
const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ntfy.sh ---
const NTFY_BASE_URL = 'https://ntfy.sh/';
// ------------------------------

// --- NOUVEAU: Définition complète des topics pour chaque Timer ID ---
// C'est le point central de configuration maintenant.
// Chaque ID liste TOUS les topics auxquels il doit envoyer.
const timerNotificationTopics = {
    // 'timerId': ['topic_1', 'topic_2', ...]
    'soler': ['agggggggressif', 'agggggggressif_soler'],
    'lefilsduforgeron': ['agggggggressif', 'agggggggressif_manny'],
    '69': ['agggggggressif', 'agggggggressif_1', 'agggggggressif_2', 'agggggggressif_3']
    // Si un timerId de knownTimerIds n'est pas listé ici, il n'enverra AUCUNE notification.
};
// --------------------------------------------------------------------

// --- Liste des Timers Connus ---
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
    // Vos valeurs actuelles
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
            threeMinWarningSent: false
        };
        console.log(`Initialized timer '${id}'. Duration: ${Math.floor(duration / 60)}m ${duration % 60}s. EndTime: ${new Date(timerStates[id].endTime * 1000)}`);
    });
}

/** Fonction d'envoi simplifiée pour tous les topics d'un timer ID */
// Remplace les deux fonctions précédentes (sendHttpRequestToNtfy et sendNotificationsForTimer)
async function sendNtfyNotificationsForTimer(timerId, message, title = "Alerte Timer") {
    // 1. Trouver la liste des topics pour cet ID dans notre map de configuration
    const topicsToSendTo = timerNotificationTopics[timerId];

    // 2. Si aucun topic n'est défini pour cet ID, ne rien faire
    if (!topicsToSendTo || topicsToSendTo.length === 0) {
        console.log(`Timer ${timerId}: No notification topics configured.`);
        return; // Sortir de la fonction
    }

    // 3. Envoyer une requête à chaque topic défini, l'une après l'autre (séquentiel)
    console.log(`Timer ${timerId}: Notifying topics sequentially: ${topicsToSendTo.join(', ')}`);
    for (const topic of topicsToSendTo) {
        const fullNtfyUrl = `${NTFY_BASE_URL}${topic}`;
        console.log(`  -> Sending to ${topic}...`);
        try {
            // Utilise le 'fetch' importé en haut du fichier
            await fetch(fullNtfyUrl, {
                method: 'POST',
                body: message,
                headers: { 'Title': title }
            });
            // console.log(`      Sent OK to ${topic}`); // Décommenter pour plus de logs
        } catch (error) {
            // Log l'erreur mais continue avec le topic suivant
            console.error(`  -> Failed to send ntfy notification to ${topic}:`, error);
        }
    }
    console.log(`Timer ${timerId}: Finished sending notifications.`);
}
// -----------------------------------------------------------------

// --- Middleware ---
app.use(cors());
// ------------------

// --- Initialisation des Timers au Démarrage ---
initializeTimers();
// --------------------------------------------

// --- Routes API ---

// Obtenir l'heure de fin (inchangé)
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

// Réinitialiser un timer (MODIFIÉ pour utiliser la nouvelle fonction d'envoi)
app.post('/reset/:timerId', async (req, res) => {
    const timerId = req.params.timerId;
    const now = Math.floor(Date.now() / 1000);
    console.log(`POST /reset/${timerId} request received. Current time: ${now}`);

    if (timerStates[timerId]) {
        const newDuration = getRandomDurationInSeconds();
        timerStates[timerId].currentDuration = newDuration;
        timerStates[timerId].endTime = now + newDuration;
        timerStates[timerId].threeMinWarningSent = false;

        console.log(`Timer '${timerId}' reset successful...`);

        // Envoyer la notification pour le clic (utilise la NOUVELLE fonction simplifiée)
        sendNtfyNotificationsForTimer( // Note: le nom a changé
            timerId,
            `Le bouton du Timer ${timerId} a été cliqué !`,
            "Clic Bouton"
        ); // On n'attend pas la fin ici (fire and forget)

        res.json({ success: true, newEndTime: timerStates[timerId].endTime });

    } else {
        console.log(`Error: Timer ID '${timerId}' not found during reset.`);
        res.status(404).json({ success: false, message: "Timer ID not found" });
    }
});
// ------------------

// --- Tâche de Fond : Vérification Alerte 3 Minutes (MODIFIÉE pour utiliser la nouvelle fonction d'envoi) ---
setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    Object.keys(timerStates).forEach(id => {
        const state = timerStates[id];
        if (!state) return;

        const remaining = state.endTime - now;

        if (remaining > 0 && remaining <= 180 && !state.threeMinWarningSent) {
            const minutes = Math.floor(remaining/60);
            const seconds = remaining % 60;
            const message = `Timer ${id}: Moins de 3 minutes restantes ! (${minutes}m${seconds}s)`;
            console.log("Generated 3min message:", message);

            // Envoyer la notification (utilise la NOUVELLE fonction simplifiée)
            sendNtfyNotificationsForTimer(id, message, "Alerte 3 Min"); // Note: le nom a changé

            state.threeMinWarningSent = true;
        }
    });
}, 15 * 1000); // Vérifier toutes les 15 secondes
// ----------------------------------------------------

// --- Démarrage du Serveur ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
// ----------------------------