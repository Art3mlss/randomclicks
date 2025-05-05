// script.js (Avec mouvement fluide réintégré)

// --- Récupération des éléments du DOM ---
const timerDisplay = document.getElementById('timer');
const resetButton = document.getElementById('resetButton');
const messageDisplay = document.getElementById('message');
const audioPlayer = document.getElementById('background-audio');

// --- Configuration Backend ---
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
let animationFrameId = null;  // ID pour requestAnimationFrame
let buttonX, buttonY;         // Position X, Y du bouton
let buttonVX, buttonVY;       // Vitesse X, Y du bouton
const buttonSpeed = 5;        // Vitesse de déplacement du bouton

// --- Variable pour la Musique ---
let musicCanPlay = false;

// --- Fonctions Utilitaires ---
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startMovingButton() {
    if (animationFrameId || !timerId) return; // Déjà en mouvement ou pas de timer actif
    const button = resetButton;
    button.style.position = 'fixed'; // Assurer la position fixe
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

    // CORRECTION: Démarrer la boucle d'animation correctement
    animationFrameId = requestAnimationFrame(updateButtonPosition);
}

function stopMovingButton() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log(`Timer ${timerId}: Stopping smooth move.`);
        // Optionnel: Réinitialiser la position si nécessaire
        // resetButton.style.left = '';
        // resetButton.style.top = '';
        // resetButton.style.transform = '';
    }
}

// Boucle d'animation récursive
function updateButtonPosition() {
    if (!animationFrameId && animationFrameId !== 0) return; // Arrêté entre-temps
    const button = resetButton;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
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
    if (!timerId) return;
    const now = Math.floor(Date.now() / 1000);
    const currentTargetEndTime = Number(targetEndTime) || 0;
    const remainingSeconds = currentTargetEndTime - now;

    if (remainingSeconds <= 0) {
        // Mode Overtime
        if (!isOvertime) {
            isOvertime = true;
            overtimeStart = currentTargetEndTime;
            startMovingButton(); // <<-- Démarrer le mouvement ici
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
            stopMovingButton(); // <<-- Arrêter le mouvement ici
            stopOvertimeCheck();
            console.log(`Timer ${timerId}: Countdown resumed.`);
        }
        timerDisplay.textContent = formatTime(remainingSeconds);
        resetButton.style.display = 'none';
        resetButton.classList.remove('active');
        stopMovingButton(); // Sécurité
        stopOvertimeCheck(); // Sécurité
    }
}

// --- Communication avec le Backend ---
async function fetchTimeFromServer() {
    if (!timerId) return;
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
                if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null;
                stopMovingButton(); stopOvertimeCheck();
                return;
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Timer ${timerId}: Received data:`, data);

        if (typeof data.endTime === 'number' && data.endTime > 0) {
            if (data.endTime !== targetEndTime) {
                console.log(`Timer ${timerId}: Updating targetEndTime from ${targetEndTime} to ${data.endTime}`);
                targetEndTime = data.endTime;
                const now = Math.floor(Date.now() / 1000);
                if (isOvertime && targetEndTime > now) {
                    console.log(`Timer ${timerId}: Exiting overtime due to server update.`);
                    isOvertime = false;
                    stopMovingButton(); // <<-- Arrêter mouvement si serveur update pendant overtime
                    stopOvertimeCheck();
                }
                updateLocalTimerDisplay();
            }
        } else {
            console.error(`Timer ${timerId}: Invalid endTime received:`, data.endTime);
            if(timerDisplay) timerDisplay.textContent = "Data invalide";
            targetEndTime = 0;
            updateLocalTimerDisplay();
        }
    } catch (error) {
        console.error(`Timer ${timerId}: Failed to fetch time:`, error);
        if(timerDisplay) timerDisplay.textContent = "Error";
        if (intervalId) clearInterval(intervalId); intervalId = null;
        if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null;
        stopMovingButton(); stopOvertimeCheck();
    }
}

// --- Gestion du clic Reset ---
resetButton.addEventListener('click', async () => {
    if (!timerId) return;
    console.log(`Timer ${timerId}: Reset request initiated...`);
    stopMovingButton(); // <<-- Arrêter le mouvement au clic
    stopOvertimeCheck();
    isOvertime = false;
    resetButton.style.display = 'none';
    resetButton.classList.remove('active');

    try {
        const response = await fetch(`${backendUrl}/reset/${timerId}`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok || !data.success) {
            console.warn(`Timer ${timerId}: Reset rejected or failed: ${response.status} - ${data.message || 'Unknown reason'}`);
            await fetchTimeFromServer();
        } else {
            console.log(`Timer ${timerId}: Reset successful. New server endTime: ${data.newEndTime}`);
            targetEndTime = data.newEndTime;
            updateLocalTimerDisplay();
        }
    } catch (error) {
        console.error(`Timer ${timerId}: Error during reset request:`, error);
        await fetchTimeFromServer();
    }
});

// --- Fonctions d'Initialisation et de Message ---
function initializeTimerFrontend() {
    if (!timerId) return;
    console.log(`Timer ${timerId}: Initializing Frontend...`);
    if (timerDisplay) timerDisplay.textContent = "Chargement...";
    fetchTimeFromServer();
    if (!pollingIntervalId) {
        pollingIntervalId = setInterval(fetchTimeFromServer, 15000);
    }
    if (!intervalId) {
        intervalId = setInterval(updateLocalTimerDisplay, 1000);
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
    if (intervalId) clearInterval(intervalId); intervalId = null;
    if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null;
    if (overtimeCheckIntervalId) stopOvertimeCheck();
    if (animationFrameId) stopMovingButton();
}

// --- Gestion de la musique de fond ---
function tryPlayMusic() {
    if (audioPlayer && !musicCanPlay) {
        audioPlayer.play().then(() => {
            console.log("La musique a démarré après interaction !");
            musicCanPlay = true;
            document.body.removeEventListener('click', tryPlayMusic);
        }).catch(error => {
            console.log("Tentative de lecture auto échouée, attente interaction...", error.name);
        });
    }
}
if (audioPlayer) {
    document.body.addEventListener('click', tryPlayMusic);
}

// --- Point d'Entrée Principal ---
const pathSegments = window.location.pathname.split('/');
const potentialId = pathSegments[1];

if (potentialId && validIds.includes(potentialId)) {
    timerId = potentialId;
    console.log(`Identified Timer ID: ${timerId}`);
    if (messageDisplay) messageDisplay.style.display = 'none';
    initializeTimerFrontend();
} else {
    displayWelcomeMessage();
}