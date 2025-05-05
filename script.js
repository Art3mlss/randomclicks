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

// script.js (modifications pour mouvement fluide)

// ... (variables existantes : timerDisplay, resetButton, backendUrl, intervalId, targetEndTime)
// ... (variables : isOvertime, overtimeStart, overtimeCheckIntervalId)

// --- Variables pour le Mouvement du Bouton (MODIFIÉES) ---
let animationFrameId = null; // Remplace buttonMoveIntervalId
let buttonX, buttonY;        // Position actuelle
let buttonVX, buttonVY;        // Vélocité actuelle (pixels par frame)
const buttonSpeed = 8;       // Vitesse de base du mouvement (pixels par frame, à ajuster)
// -------------------------------------------------------

// ... (fonction formatTime) ...

// --- Fonction pour démarrer le mouvement fluide (REMPLACÉE) ---
function startMovingButton() {
    if (animationFrameId) return; // Déjà en mouvement

    const button = resetButton;
    button.style.position = 'fixed'; // Indispensable

    // --- Initialisation de la position et de la vitesse ---
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const btnWidth = button.offsetWidth || 50; // Utiliser une valeur par défaut si offsetWidth est 0 au début
    const btnHeight = button.offsetHeight || 20;

    // Position initiale (ex: centre, ou aléatoire mais pas trop près des bords)
    buttonX = viewWidth / 2 - btnWidth / 2;
    buttonY = viewHeight / 2 - btnHeight / 2;

    // Vitesse initiale aléatoire mais avec une magnitude constante
    let angle = Math.random() * 2 * Math.PI; // Angle aléatoire en radians
    buttonVX = Math.cos(angle) * buttonSpeed;
    buttonVY = Math.sin(angle) * buttonSpeed;
    // S'assurer qu'on ne démarre pas avec une vitesse quasi nulle sur un axe
    if (Math.abs(buttonVX) < 1) buttonVX = Math.sign(buttonVX || 1) * buttonSpeed * 0.7;
    if (Math.abs(buttonVY) < 1) buttonVY = Math.sign(buttonVY || 1) * buttonSpeed * 0.7;
    // -----------------------------------------------------

    console.log("Starting smooth move...");

    // --- Boucle d'animation principale ---
    function updateButtonPosition() {
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const btnWidth = button.offsetWidth;
        const btnHeight = button.offsetHeight;

        // Calculer la prochaine position
        let nextX = buttonX + buttonVX;
        let nextY = buttonY + buttonVY;

        // Détection de collision et rebond
        // Bord gauche
        if (nextX <= 0) {
            nextX = 0; // Clamper à la position 0
            buttonVX = -buttonVX; // Inverser vitesse X
        }
        // Bord droit
        if (nextX + btnWidth >= viewWidth) {
            nextX = viewWidth - btnWidth; // Clamper à la position max
            buttonVX = -buttonVX; // Inverser vitesse X
        }
        // Bord haut
        if (nextY <= 0) {
            nextY = 0; // Clamper
            buttonVY = -buttonVY; // Inverser vitesse Y
        }
        // Bord bas
        if (nextY + btnHeight >= viewHeight) {
            nextY = viewHeight - btnHeight; // Clamper
            buttonVY = -buttonVY; // Inverser vitesse Y
        }

        // Mettre à jour la position stockée et le style
        buttonX = nextX;
        buttonY = nextY;
        button.style.left = `${buttonX}px`;
        button.style.top = `${buttonY}px`;

        // Demander la prochaine frame
        animationFrameId = requestAnimationFrame(updateButtonPosition);
    }
    // -----------------------------------

    // Démarrer la boucle
    animationFrameId = requestAnimationFrame(updateButtonPosition);
}

// --- Fonction pour arrêter le mouvement fluide (MODIFIÉE) ---
function stopMovingButton() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // Arrêter la boucle d'animation
        animationFrameId = null;
        console.log("Stopping smooth move.");
        // Optionnel: replacer le bouton au centre ou laisser CSS gérer
        // resetButton.style.left = '50%';
        // resetButton.style.top = '50%';
        // resetButton.style.transform = 'translate(-50%, -50%)';
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


function updateLocalTimerDisplay() {
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = targetEndTime - now;

    if (remainingSeconds <= 0) {
        // --- Mode Overtime ---
        if (!isOvertime) {
            isOvertime = true;
            overtimeStart = targetEndTime;
            if (!intervalId) { // S'assurer que l'intervalle tourne pour maj l'overtime
                intervalId = setInterval(updateLocalTimerDisplay, 1000);
            }
            startMovingButton(); // Démarre le NOUVEAU mouvement fluide
            startOvertimeCheck();
        }
        const elapsedOvertime = now - overtimeStart;
        timerDisplay.textContent = `+${formatTime(elapsedOvertime)}`;
        resetButton.style.display = 'block';
        resetButton.classList.add('active');

    } else {
        // --- Mode Compte à rebours normal ---
        if (isOvertime) {
            isOvertime = false;
            stopMovingButton(); // Arrête le NOUVEAU mouvement fluide
            stopOvertimeCheck();
        }
        timerDisplay.textContent = formatTime(remainingSeconds);
        resetButton.style.display = 'none';
        resetButton.classList.remove('active');
        stopMovingButton(); // Sécurité
        stopOvertimeCheck(); // Sécurité
        if (!intervalId) { // S'assurer que l'intervalle tourne
            intervalId = setInterval(updateLocalTimerDisplay, 1000);
        }
    }
}


// --- Gestion du clic Reset (resetButton.addEventListener) ---
// Cette fonction reste EXACTEMENT LA MÊME que dans la version précédente.
// Elle appelle stopMovingButton() et stopOvertimeCheck() au début du clic.
resetButton.addEventListener('click', async () => {
    console.log("Reset request initiated by click...");
    stopMovingButton(); // Arrête le mouvement fluide
    stopOvertimeCheck();
    isOvertime = false;
    resetButton.style.display = 'none';
    resetButton.classList.remove('active');
    try {
        const response = await fetch(`${backendUrl}/reset`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok || !data.success) {
            console.warn(`Reset rejected or failed: ${response.status} - ${data.message || 'Unknown reason'}`);
            await fetchTimeFromServer();
        } else {
            console.log(`Reset successful. New server endTime: ${data.newEndTime}`);
            targetEndTime = data.newEndTime;
            updateLocalTimerDisplay(); // Mettre à jour immédiatement
        }
    } catch (error) {
        console.error("Error during reset request:", error);
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