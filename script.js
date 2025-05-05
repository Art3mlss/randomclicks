// script.js (modifié pour le serveur)
const timerDisplay = document.getElementById('timer');
const resetButton = document.getElementById('resetButton');

// !!! IMPORTANT : Mettez ici l'URL où votre serveur backend sera accessible !!!
// Par exemple: 'https://votre-app-timer.onrender.com' ou 'http://localhost:3000' si vous testez localement
const backendUrl = 'https://randomclicks.onrender.com';

let intervalId = null;
let targetEndTime = 0; // Stockera l'heure de fin reçue du serveur

let isOvertime = false;
let overtimeStart = 0;
let buttonMoveIntervalId = null; // Pour l'intervalle de mouvement du bouton
let overtimeCheckIntervalId = null; // Pour vérifier le dépassement de 30s

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startMovingButton() {
    if (buttonMoveIntervalId) return; // Déjà en mouvement

    const button = resetButton;
    button.style.position = 'fixed'; // Assurer la position fixe

    buttonMoveIntervalId = setInterval(() => {
        // Obtenir les dimensions de la fenêtre et du bouton
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const btnWidth = button.offsetWidth;
        const btnHeight = button.offsetHeight;

        // Calculer des positions aléatoires, en s'assurant que le bouton reste visible
        const newTop = Math.random() * (viewHeight - btnHeight);
        const newLeft = Math.random() * (viewWidth - btnWidth);

        button.style.top = `${newTop}px`;
        button.style.left = `${newLeft}px`;
    }, 75); // Intervalle très court pour un mouvement rapide (ajuster si besoin)
}

function stopMovingButton() {
    if (buttonMoveIntervalId) {
        clearInterval(buttonMoveIntervalId);
        buttonMoveIntervalId = null;
        // Remettre une position par défaut (optionnel, car il sera caché/stylé par CSS)
        // resetButton.style.top = '50%'; // Exemple
        // resetButton.style.left = '50%'; // Exemple
        // resetButton.style.transform = 'translate(-50%, -50%)'; // Pour centrer si top/left = 50%
    }
}

// --- Fonction pour vérifier le dépassement et clignotement ---
function startOvertimeCheck() {
    if (overtimeCheckIntervalId) return;

    overtimeCheckIntervalId = setInterval(() => {
        if (!isOvertime) return; // Ne rien faire si on n'est plus en overtime

        const now = Math.floor(Date.now() / 1000);
        const elapsedOvertime = now - overtimeStart;

        if (elapsedOvertime > 30) {
            document.body.classList.add('is-flashing');
        }
    }, 1000); // Vérifier chaque seconde
}

function stopOvertimeCheck() {
    if (overtimeCheckIntervalId) {
        clearInterval(overtimeCheckIntervalId);
        overtimeCheckIntervalId = null;
    }
    // Toujours enlever le clignotement quand on arrête la vérification
    document.body.classList.remove('is-flashing');
}


// --- Mise à jour de l'affichage principal (MODIFIÉE) ---
function updateLocalTimerDisplay() {
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = targetEndTime - now;

    if (remainingSeconds <= 0) {
        // --- Mode Overtime ---
        if (!isOvertime) {
            // Première fois qu'on entre en overtime
            isOvertime = true;
            overtimeStart = targetEndTime; // Le moment où le timer a fini
            // S'assurer que l'intervalle principal tourne toujours pour màj l'overtime
            if (!intervalId) {
                intervalId = setInterval(updateLocalTimerDisplay, 1000);
            }
            // Démarrer les nouvelles fonctionnalités
            startMovingButton();
            startOvertimeCheck();
        }

        const elapsedOvertime = now - overtimeStart;
        timerDisplay.textContent = `+${formatTime(elapsedOvertime)}`; // Affichage du temps dépassé

        // Gérer l'affichage du bouton (reste comme avant)
        resetButton.style.display = 'block';
        resetButton.classList.add('active');

    } else {
        // --- Mode Compte à rebours normal ---
        if (isOvertime) {
            // On sortait du mode overtime (suite à un reset)
            isOvertime = false;
            stopMovingButton();
            stopOvertimeCheck(); // Arrête aussi le clignotement
        }

        timerDisplay.textContent = formatTime(remainingSeconds); // Affichage normal

        // Cacher le bouton et s'assurer que les fonctionnalités overtime sont arrêtées
        resetButton.style.display = 'none';
        resetButton.classList.remove('active');
        stopMovingButton(); // Sécurité
        stopOvertimeCheck(); // Sécurité

        // S'assurer que l'intervalle tourne
        if (!intervalId) {
            intervalId = setInterval(updateLocalTimerDisplay, 1000);
        }
    }
}

// --- Gestion du clic Reset (MODIFIÉE) ---
resetButton.addEventListener('click', async () => {
    // Pas besoin de vérifier l'heure ici, on est forcément en overtime si le bouton est cliquable
    console.log("Reset request initiated by click...");

    // Arrêter immédiatement les effets visuels
    stopMovingButton();
    stopOvertimeCheck(); // Arrête clignotement + vérification
    isOvertime = false; // On sort du mode overtime

    // Cacher le bouton pendant la requête
    resetButton.style.display = 'none';
    resetButton.classList.remove('active');

    try {
        const response = await fetch(`${backendUrl}/reset`, { method: 'POST' });
        const data = await response.json();

        if (!response.ok || !data.success) {
            console.warn(`Reset rejected or failed: ${response.status} - ${data.message || 'Unknown reason'}`);
            // Essayer de resynchroniser avec le serveur
            await fetchTimeFromServer(); // Peut-être que qqn d'autre a reset ?
        } else {
            console.log(`Reset successful. New server endTime: ${data.newEndTime}`);
            targetEndTime = data.newEndTime; // Mettre à jour notre cible
            // UpdateLocalTimerDisplay sera appelé par le fetch ou le polling,
            // ou on peut l'appeler manuellement pour réactivité immédiate :
            updateLocalTimerDisplay();
        }
    } catch (error) {
        console.error("Error during reset request:", error);
        // En cas d'erreur réseau, essayer de resynchroniser
        await fetchTimeFromServer();
    }
});

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
fetchTimeFromServer();
setInterval(fetchTimeFromServer, 15000); // Polling existant
// Démarrer l'intervalle principal pour l'affichage local s'il n'existe pas
if (!intervalId) {
    intervalId = setInterval(updateLocalTimerDisplay, 1000);
}