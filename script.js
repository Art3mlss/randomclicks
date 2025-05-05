// script.js (Nettoyé et Corrigé pour état précédent)

// --- Récupération des éléments du DOM ---
const timerDisplay = document.getElementById('timer');
const resetButton = document.getElementById('resetButton');
const messageDisplay = document.getElementById('message');
const audioPlayer = document.getElementById('background-audio'); // Pour la musique

// --- Configuration Backend ---
// !!! VÉRIFIEZ CETTE URL !!!
const backendUrl = 'https://randomclicks.onrender.com'; // Votre URL Render backend

// --- Liste des IDs Valides (Doit correspondre à knownTimerIds dans server.js) ---
const validIds = ['soler', 'lefilsduforgeron', '69'];

// --- Variables d'état Globales ---
let timerId = null;
let intervalId = null;        // Pour updateLocalTimerDisplay
let pollingIntervalId = null; // Pour fetchTimeFromServer (polling)
let targetEndTime = 0;
let isOvertime = false;
let overtimeStart = 0;
let overtimeCheckIntervalId = null; // Pour check > 30s overtime

// --- Variables pour l'Animation du Bouton ---
let animationFrameId = null;
let buttonX, buttonY;
let buttonVX, buttonVY;
const buttonSpeed = 8;

// --- Variable pour la Musique ---
let musicCanPlay = false;

// --- Fonctions Utilitaires ---
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- Fonctions de Mouvement du Bouton ---
function startMovingButton() {
    if (animationFrameId || !timerId) return;
    const button = resetButton;
    button.style.position = 'fixed';
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const btnWidth = button.offsetWidth || 50;
    const btnHeight = button.offsetHeight || 20;
    buttonX = viewWidth / 2 - btnWidth / 2;
    buttonY = viewHeight / 2 - btnHeight / 2;
    let angle = Math.random() * 2 * Math.PI;
    buttonVX = Math.cos(angle) * buttonSpeed;
    buttonVY = Math.sin(angle) * buttonSpeed;
    if (Math.abs(buttonVX) < 1) buttonVX = Math.sign(buttonVX || 1) * buttonSpeed * 0.7;
    if (Math.abs(buttonVY) < 1) buttonVY = Math.sign(buttonVY || 1) * buttonSpeed * 0.7;
    console.log(`Timer ${timerId}: Starting smooth move...`);
    updateButtonPosition(); // Lance la boucle une fois
}

function stopMovingButton() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log(`Timer ${timerId}: Stopping smooth move.`);
    }
}

// Boucle d'animation pour le bouton (appelée par startMovingButton)
function updateButtonPosition() {
    if (!animationFrameId) return; // Sécurité si stop a été appelé entre-temps
    const button = resetButton;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    // Lire les dimensions à chaque frame peut être lourd, mais plus sûr si elles changent
    const btnWidth = button.offsetWidth;
    const btnHeight = button.offsetHeight;

    let nextX = buttonX + buttonVX;
    let nextY = buttonY + buttonVY;

    if (nextX <= 0) { nextX = 0; buttonVX = -buttonVX; }
    if (nextX + btnWidth >= viewWidth) { nextX = viewWidth - btnWidth; buttonVX = -buttonVX; }
    if (nextY <= 0) { nextY = 0; buttonVY = -buttonVY; }
    if (nextY + btnHeight >= viewHeight) { nextY = viewHeight - btnHeight; buttonVY = -buttonVY; }

    buttonX = nextX;
    buttonY = nextY;
    button.style.left = `${buttonX}px`;
    button.style.top = `${buttonY}px`;

    animationFrameId = requestAnimationFrame(updateButtonPosition); // Continue la boucle
}

// --- Fonctions de Gestion de l'Overtime ---
function startOvertimeCheck() {
    if (overtimeCheckIntervalId || !timerId) return;
    overtimeCheckIntervalId = setInterval(() => {
        if (!isOvertime) return;
        const now = Math.floor(Date.now() / 1000);
        const elapsedOvertime = now - overtimeStart;
        if (elapsedOvertime > 30) {
            document.body.classList.add('is-flashing');
        }
    }, 1000);
}

function stopOvertimeCheck() {
    if (overtimeCheckIntervalId) {
        clearInterval(overtimeCheckIntervalId);
        overtimeCheckIntervalId = null;
    }
    document.body.classList.remove('is-flashing');
}

// --- Mise à jour Principale de l'Affichage ---
function updateLocalTimerDisplay() {
    if (!timerId) return; // Ne rien faire si l'ID n'est pas valide

    const now = Math.floor(Date.now() / 1000);
    // Assurer que targetEndTime est un nombre avant de calculer
    const currentTargetEndTime = Number(targetEndTime) || 0;
    const remainingSeconds = currentTargetEndTime - now;

    // Log pour débogage
    // console.log(`Tick: ID=${timerId}, EndTime=${currentTargetEndTime}, Now=${now}, Remaining=${remainingSeconds}, Overtime=${isOvertime}`);

    if (remainingSeconds <= 0) {
        // Mode Overtime
        if (!isOvertime) {
            isOvertime = true;
            overtimeStart = currentTargetEndTime; // Le moment où ça a fini
            startMovingButton();
            startOvertimeCheck();
            console.log(`Timer ${timerId}: Overtime started.`);
        }
        const elapsedOvertime = now - overtimeStart;
        timerDisplay.textContent = `+${formatTime(elapsedOvertime)}`;
        resetButton.style.display = 'block';
        resetButton.classList.add('active');
    } else {
        // Mode Compte à rebours
        if (isOvertime) {
            isOvertime = false;
            stopMovingButton();
            stopOvertimeCheck();
            console.log(`Timer ${timerId}: Countdown resumed.`);
        }
        timerDisplay.textContent = formatTime(remainingSeconds);
        resetButton.style.display = 'none';
        resetButton.classList.remove('active');
        // S'assurer que les effets sont arrêtés
        stopMovingButton();
        stopOvertimeCheck();
    }
}

// --- Communication avec le Backend ---
async function fetchTimeFromServer() {
    if (!timerId) return; // Vérification supplémentaire
    console.log(`Timer ${timerId}: Fetching time...`);
    try {
        const response = await fetch(`${backendUrl}/time/${timerId}`);
        console.log(`Timer ${timerId}: Response status: ${response.status}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.error(`Error: Timer ID '${timerId}' not found on server.`);
                if(messageDisplay) messageDisplay.textContent = `Error: Timer '${timerId}' unknown.`;
                if(timerDisplay) timerDisplay.textContent = "N/A";
                if (intervalId) clearInterval(intervalId); intervalId = null;
                if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null; // Arrêter aussi le polling
                stopMovingButton(); stopOvertimeCheck();
                return;
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Timer ${timerId}: Received data:`, data);

        // Validation plus stricte de endTime
        if (typeof data.endTime === 'number' && data.endTime > 0) {
            if (data.endTime !== targetEndTime) {
                console.log(`Timer ${timerId}: Updating targetEndTime from ${targetEndTime} to ${data.endTime}`);
                targetEndTime = data.endTime;
                const now = Math.floor(Date.now() / 1000);
                if (isOvertime && targetEndTime > now) {
                    console.log(`Timer ${timerId}: Exiting overtime due to server update.`);
                    isOvertime = false; // Repasser en mode compte à rebours
                    stopMovingButton();
                    stopOvertimeCheck();
                }
                updateLocalTimerDisplay(); // Mettre à jour immédiatement
            }
        } else {
            console.error(`Timer ${timerId}: Invalid endTime received:`, data.endTime);
            if(timerDisplay) timerDisplay.textContent = "Data invalide";
            targetEndTime = 0; // Reset pour éviter NaN
            updateLocalTimerDisplay(); // Mettre à jour avec l'erreur/0
        }

    } catch (error) {
        console.error(`Timer ${timerId}: Failed to fetch time:`, error);
        if(timerDisplay) timerDisplay.textContent = "Error";
        if (intervalId) clearInterval(intervalId); intervalId = null;
        if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null; // Arrêter aussi le polling
        stopMovingButton(); stopOvertimeCheck();
    }
}

// --- Gestion du clic Reset (UNE SEULE FOIS) ---
resetButton.addEventListener('click', async () => {
    if (!timerId) return;
    console.log(`Timer ${timerId}: Reset request initiated...`);
    stopMovingButton();
    stopOvertimeCheck();
    isOvertime = false;
    resetButton.style.display = 'none';
    resetButton.classList.remove('active');

    try {
        const response = await fetch(`${backendUrl}/reset/${timerId}`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok || !data.success) {
            console.warn(`Timer ${timerId}: Reset rejected or failed: ${response.status} - ${data.message || 'Unknown reason'}`);
            await fetchTimeFromServer(); // Resync
        } else {
            console.log(`Timer ${timerId}: Reset successful. New server endTime: ${data.newEndTime}`);
            targetEndTime = data.newEndTime;
            updateLocalTimerDisplay(); // Update display immediately
        }
    } catch (error) {
        console.error(`Timer ${timerId}: Error during reset request:`, error);
        await fetchTimeFromServer(); // Resync
    }
});

// --- Fonctions d'Initialisation et de Message ---
function initializeTimerFrontend() {
    if (!timerId) return; // Ne rien faire si pas d'ID
    console.log(`Timer ${timerId}: Initializing Frontend...`);
    if (timerDisplay) timerDisplay.textContent = "Chargement...";

    // Premier fetch immédiat
    fetchTimeFromServer();

    // Démarrer les intervalles (s'ils ne tournent pas déjà)
    if (!pollingIntervalId) {
        pollingIntervalId = setInterval(fetchTimeFromServer, 15000); // Polling pour resync
    }
    if (!intervalId) {
        intervalId = setInterval(updateLocalTimerDisplay, 1000); // Mise à jour affichage local
    }
}

function displayWelcomeMessage() {
    console.log("Displaying welcome message.");
    if(timerDisplay) timerDisplay.style.display = 'none';
    if(resetButton) resetButton.style.display = 'none';
    if(messageDisplay) {
        messageDisplay.textContent = "t'as pas mis ton blazz dans l'URL bizuth de merde"; // Votre message
        messageDisplay.style.display = 'block';
        messageDisplay.style.color = 'yellow';
        messageDisplay.style.fontSize = '1.2em';
        messageDisplay.style.textAlign = 'center';
        messageDisplay.style.marginTop = '30px';
    }
    // Arrêter les intervalles s'ils tournaient (au cas où on navigue vers '/')
    if (intervalId) clearInterval(intervalId); intervalId = null;
    if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null;
    if (overtimeCheckIntervalId) stopOvertimeCheck(); // Utilise la fonction qui nettoie aussi la classe CSS
    if (animationFrameId) stopMovingButton();
}

// --- Gestion de la musique de fond ---
function tryPlayMusic() {
    if (audioPlayer && !musicCanPlay) {
        audioPlayer.play().then(() => {
            console.log("La musique a démarré après interaction !");
            musicCanPlay = true;
            document.body.removeEventListener('click', tryPlayMusic); // Se détacher une fois démarré
        }).catch(error => {
            console.log("Tentative de lecture auto échouée, attente interaction...", error.name);
        });
    }
}
// Écouteur pour le premier clic - Note: { once: true } a été retiré pour permettre le démarrage via le listener, même si play() est appelé ailleurs
if (audioPlayer) { // Ajouter l'écouteur seulement si l'élément audio existe
    document.body.addEventListener('click', tryPlayMusic);
}

// --- Point d'Entrée Principal ---
const pathSegments = window.location.pathname.split('/');
const potentialId = pathSegments[1];

if (potentialId && validIds.includes(potentialId)) {
    timerId = potentialId; // Définir l'ID global
    console.log(`Identified Timer ID: ${timerId}`);
    if (messageDisplay) messageDisplay.style.display = 'none';
    initializeTimerFrontend(); // Appeler la fonction d'initialisation correcte
} else {
    displayWelcomeMessage(); // Afficher le message si pas d'ID valide
}