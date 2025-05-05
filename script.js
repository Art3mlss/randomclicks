// script.js (modifié pour le serveur)
const timerDisplay = document.getElementById('timer');
const resetButton = document.getElementById('resetButton');

// !!! IMPORTANT : Mettez ici l'URL où votre serveur backend sera accessible !!!
// Par exemple: 'https://votre-app-timer.onrender.com' ou 'http://localhost:3000' si vous testez localement
const backendUrl = 'https://randomclicks.onrender.com';

let intervalId = null;
let targetEndTime = 0; // Stockera l'heure de fin reçue du serveur

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Met à jour l'affichage local en fonction de targetEndTime
function updateLocalTimerDisplay() {
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = Math.max(0, targetEndTime - now);

    timerDisplay.textContent = formatTime(remainingSeconds);

    if (remainingSeconds <= 0) {
        // Arrêter la mise à jour locale si elle tournait
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        resetButton.style.display = 'block';
        resetButton.classList.add('active');
    } else {
        resetButton.style.display = 'none';
        resetButton.classList.remove('active');
        // S'assurer que la mise à jour locale tourne s'il reste du temps
        if (!intervalId) {
            intervalId = setInterval(updateLocalTimerDisplay, 1000);
        }
    }
}

// Fonction pour demander l'heure de fin au serveur
async function fetchTimeFromServer() {
    try {
        const response = await fetch(`${backendUrl}/time`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (data.endTime !== targetEndTime) {
            console.log(`New endTime received from server: ${data.endTime} (${new Date(data.endTime * 1000)})`);
            targetEndTime = data.endTime; // Mettre à jour notre heure de fin cible
            updateLocalTimerDisplay(); // Mettre à jour l'affichage immédiatement
        }
    } catch (error) {
        console.error("Impossible de récupérer l'heure du serveur:", error);
        timerDisplay.textContent = "Erreur";
        if (intervalId) clearInterval(intervalId); // Arrêter le timer local en cas d'erreur serveur
        intervalId = null;
        resetButton.style.display = 'none'; // Cacher le bouton en cas d'erreur
        resetButton.classList.remove('active');
    }
}

// Fonction pour demander le reset au serveur
resetButton.addEventListener('click', async () => {
    // Vérif locale rapide avant d'envoyer la requête
    const now = Math.floor(Date.now() / 1000);
    if (now >= targetEndTime) {
        console.log("Sending reset request to server...");
        // Cacher le bouton immédiatement pour l'UX
        resetButton.style.display = 'none';
        resetButton.classList.remove('active');
        try {
            const response = await fetch(`${backendUrl}/reset`, { method: 'POST' });
            const data = await response.json(); // Essayer de lire la réponse même si erreur HTTP

            if (!response.ok) {
                // Le serveur a refusé le reset (ex: qqn d'autre l'a fait juste avant)
                console.warn(`Reset rejected by server: ${response.status} - ${data.message || 'Raison inconnue'}`);
                // Rafraîchir immédiatement l'heure pour obtenir la nouvelle heure de fin fixée par l'autre utilisateur ou le serveur
                await fetchTimeFromServer();
            } else if (data.success) {
                console.log(`Reset successful. New server endTime: ${data.newEndTime}`);
                targetEndTime = data.newEndTime; // Mettre à jour notre cible
                updateLocalTimerDisplay(); // Mettre à jour l'affichage
            } else {
                // Cas étrange où la réponse est OK mais success=false
                console.error("Reset semblait OK mais le serveur a indiqué un échec.");
                await fetchTimeFromServer(); // Resynchroniser
            }
        } catch (error) {
            console.error("Erreur lors de la tentative de reset:", error);
            // En cas d'erreur réseau etc., essayer de resynchroniser
            await fetchTimeFromServer();
        }
    } else {
        console.log("Reset non envoyé : l'heure locale n'est pas encore atteinte.");
        // Cacher le bouton au cas où il serait apparu par erreur
        resetButton.style.display = 'none';
        resetButton.classList.remove('active');
    }
});

// --- Initialisation et Polling ---
// 1. Récupérer l'heure initiale dès le chargement
fetchTimeFromServer();

// 2. Polling : Redemander l'heure au serveur toutes les X secondes
// pour se resynchroniser si qqn d'autre a fait un reset.
// Ajustez l'intervalle (en ms) selon vos besoins (15000ms = 15s)
setInterval(fetchTimeFromServer, 15000);