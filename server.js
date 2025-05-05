// server.js (CORRIGÉ et COMPLET)

// --- Imports ---
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // <-- Ajout de l'import nécessaire

// --- Initialisation Express ---
const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ntfy.sh ---
const NTFY_GLOBAL_TOPIC = 'agggggggressif'; // <-- Utilisation d'un nom cohérent
const NTFY_BASE_URL = 'https://ntfy.sh/';   // <-- Définition de la base URL manquante
// ------------------------------

// --- Mapping des IDs de Timer vers leurs Topics Spécifiques ---
// (Ceci est votre configuration actuelle, adaptez si besoin)
const timerSpecificTopics = {
    'soler': ['agggggggressif_soler'],
    'lefilsduforgeron': ['agggggggressif_manny'],
    '69': ['agggggggressif_1', 'agggggggressif_2', 'agggggggressif_3'] // Assurez-vous que ces topics sont ceux que vous voulez pour '69'
};
// ------------------------------------------------------------

// --- Liste des Timers Connus (Source de vérité) ---
// (Ceci est votre configuration actuelle, adaptez si besoin)
const knownTimerIds = ['soler', 'lefilsduforgeron', '69'];
// ----------------------------------------------------

// --- Stockage de l'état des timers ---
const timerStates = {
    // Structure: 'timerId': { endTime: timestamp, currentDuration: seconds, threeMinWarningSent: boolean }
};
// -------------------------------------

// --- Fonction Utilitaires ---

/** Retourne une durée aléatoire en secondes */
function getRandomDurationInSeconds() {
    // (Vos valeurs actuelles, plage très courte de ~3min)
    const minSeconds = 185 ;
    const maxSeconds = 200 ;
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

/** Envoie une requête HTTP POST à un topic ntfy.sh */
async function sendHttpRequestToNtfy(topic, message, title = "Alerte Timer") {
    const fullNtfyUrl = `${NTFY_BASE_URL}${topic}`; // Utilise la base URL définie
    console.log(`Sending ntfy to ${topic}: ${message}`);
    try {
        // Utilise le 'fetch' importé en haut du fichier
        await fetch(fullNtfyUrl, {
            method: 'POST',
            body: message,
            headers: { 'Title': title }
        });
    } catch (error) {
        console.error(`Failed to send ntfy notification to ${topic}:`, error);
    }
}

/** Gère l'envoi des notifications vers le topic global et les topics spécifiques */
async function sendNotificationsForTimer(timerId, message, title) {
    // 1. Envoyer toujours au topic global
    await sendHttpRequestToNtfy(NTFY_GLOBAL_TOPIC, message, title); // Utilise la variable globale cohérente

    // 2. Vérifier et envoyer aux topics spécifiques pour cet ID
    const specificTopics = timerSpecificTopics[timerId];
    if (specificTopics && specificTopics.length > 0) {
        console.log(`Timer ${timerId} also notifying specific topics: ${specificTopics.join(', ')}`);
        await Promise.all(
            specificTopics.map(topic => sendHttpRequestToNtfy(topic, message, title))
        );
    }
}

/** Initialise l'état de tous les timers connus au démarrage */
function initializeTimers() {
    const now = Math.floor(Date.now() / 1000);
    knownTimerIds.forEach(id => {
        const duration = getRandomDurationInSeconds();
        timerStates[id] = {
            currentDuration: duration,
            endTime: now + duration,
            threeMinWarningSent: false // Initialiser le flag ici
        };
        console.log(`Initialized timer '${id}'. Duration: ${Math.floor(duration / 60)}m ${duration % 60}s. EndTime: ${new Date(timerStates[id].endTime * 1000)}`);
    });
}
// --------------------------

// --- Middleware ---
app.use(cors());
// ------------------

// --- Initialisation des Timers au Démarrage ---
initializeTimers();
// --------------------------------------------

// --- Routes API ---

// Obtenir l'heure de fin pour un timer spécifique
app.get('/time/:timerId', (req, res) => {
    const timerId = req.params.timerId;
    console.log(`GET /time/${timerId} request received.`);

    // Vérifier si l'ID est connu (bonne pratique)
    if (timerStates[timerId]) {
        res.json({ endTime: timerStates[timerId].endTime });
    } else {
        console.log(`Error: Timer ID '${timerId}' not found.`);
        res.status(404).json({ error: "Timer ID not found" });
    }
});

// Réinitialiser un timer spécifique
app.post('/reset/:timerId', async (req, res) => { // async est nécessaire pour await dans sendNotificationsForTimer
    const timerId = req.params.timerId;
    const now = Math.floor(Date.now() / 1000);
    console.log(`POST /reset/${timerId} request received. Current time: ${now}`);

    // Vérifier si l'ID est connu
    if (timerStates[timerId]) {
        const newDuration = getRandomDurationInSeconds();
        timerStates[timerId].currentDuration = newDuration;
        timerStates[timerId].endTime = now + newDuration;
        timerStates[timerId].threeMinWarningSent = false; // Réinitialiser le flag important !

        console.log(`Timer '${timerId}' reset successful. New duration: ${Math.floor(newDuration / 60)}m ${newDuration % 60}s. New endTime: ${timerStates[timerId].endTime} (${new Date(timerStates[timerId].endTime * 1000)})`);

        // Envoyer la notification pour le clic (utilise la fonction de routage)
        sendNotificationsForTimer(
            timerId,
            `Le bouton du Timer ${timerId} a été cliqué !`,
            "Clic Bouton"
        ); // Pas besoin d'await ici si on ne veut pas attendre la fin de l'envoi

        res.json({ success: true, newEndTime: timerStates[timerId].endTime });

    } else {
        console.log(`Error: Timer ID '${timerId}' not found during reset.`);
        res.status(404).json({ success: false, message: "Timer ID not found" });
    }
});

// ------------------

// --- Tâche de Fond : Vérification Alerte 3 Minutes ---
setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    Object.keys(timerStates).forEach(id => { // Itère sur les clés de l'état actuel
        const state = timerStates[id];
        if (!state) return; // Sécurité si un état était supprimé

        const remaining = state.endTime - now;

        // Condition pour l'alerte 3 minutes (180 secondes)
        if (remaining > 0 && remaining <= 180 && !state.threeMinWarningSent) {
            const minutes = Math.floor(remaining/60);
            const seconds = remaining % 60; // Modulo pour les secondes restantes
            const message = `Timer ${id}: Moins de 3 minutes restantes ! (${minutes}m${seconds}s)`;
            console.log("Generated 3min message:", message);

            // Envoyer la notification (utilise la fonction de routage)
            sendNotificationsForTimer(id, message, "Alerte 3 Min");

            state.threeMinWarningSent = true; // Marquer comme envoyé pour ce cycle
        }

        // Optionnel: Réinitialiser le flag si expiré (peut être géré uniquement au reset pour plus de simplicité)
        // if (remaining <= 0 && state.threeMinWarningSent) {
        //     state.threeMinWarningSent = false;
        // }
    });
}, 15 * 1000); // Vérifier toutes les 15 secondes
// ----------------------------------------------------

// --- Démarrage du Serveur ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
// ----------------------------