// script.js (Gestion de plusieurs compteurs + mouvement fluide)

// --- Récupération des éléments du DOM ---
const timerDisplay = document.getElementById('timer');
const resetButton = document.getElementById('resetButton');
const messageDisplay = document.getElementById('message'); // Pour afficher les messages

// --- Configuration Backend ---
// !!! IMPORTANT : Assurez-vous que cette URL est correcte !!!
const backendUrl = 'https://randomclicks.onrender.com'; // Votre URL Render backend

// --- Variables d'état Globales ---
let timerId = null;           // ID du compteur actuel ('1', '2', ou null)
let intervalId = null;        // ID pour setInterval (mise à jour affichage)
let targetEndTime = 0;      // Heure de fin cible reçue du serveur
let isOvertime = false;       // Indicateur si le temps est dépassé
let overtimeStart = 0;      // Timestamp du début du dépassement
let overtimeCheckIntervalId = null; // ID pour setInterval (check > 30s overtime)

// --- Variables pour l'Animation du Bouton ---
let animationFrameId = null;  // ID pour requestAnimationFrame
let buttonX, buttonY;         // Position X, Y du bouton
let buttonVX, buttonVY;         // Vitesse X, Y du bouton
const buttonSpeed = 8;        // Vitesse de déplacement du bouton

// --- Initialisation: Obtenir et Valider l'ID du Compteur depuis l'URL ---
const pathSegments = window.location.pathname.split('/');
if (pathSegments.length > 1 && (pathSegments[1] === 'soler' || pathSegments[1] === 'lefilsduforgeron')) {
    timerId = pathSegments[1];
    console.log(`Identified Timer ID: ${timerId}`);
    if(messageDisplay) messageDisplay.style.display = 'none'; // Cacher message si ID ok
} else {
    console.log("No valid Timer ID found in URL path. Timer functionality disabled.");
    if(timerDisplay) timerDisplay.style.display = 'none';
    if(resetButton) resetButton.style.display = 'none';
    if(messageDisplay) {
        messageDisplay.textContent = "t'as pas mis ton blazz dans l'URL bizuth de merde";
        messageDisplay.style.display = 'block';
        // Styles ajoutés pour la visibilité
        messageDisplay.style.color = 'yellow';
        messageDisplay.style.fontSize = '1.2em';
        messageDisplay.style.textAlign = 'center';
        messageDisplay.style.marginTop = '30px';
    }
    // On n'arrête pas complètement le script, mais les fonctions clés vérifieront timerId
}
// ----------------------------------------------------------------------


// --- Fonctions Utilitaires ---

/** Formate les secondes en MM:SS */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- Fonctions de Mouvement du Bouton ---

/** Démarre l'animation fluide du bouton */
function startMovingButton() {
    if (animationFrameId || !timerId) return; // Déjà en mouvement ou pas de timer actif

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

    function updateButtonPosition() {
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

        animationFrameId = requestAnimationFrame(updateButtonPosition);
    }
    animationFrameId = requestAnimationFrame(updateButtonPosition);
}

/** Arrête l'animation fluide du bouton */
function stopMovingButton() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log(`Timer ${timerId}: Stopping smooth move.`);
    }
}

// --- Fonctions de Gestion de l'Overtime ---

/** Démarre la vérification du dépassement de 30s */
function startOvertimeCheck() {
    if (overtimeCheckIntervalId || !timerId) return;

    overtimeCheckIntervalId = setInterval(() => {
        if (!isOvertime) return; // Double check

        const now = Math.floor(Date.now() / 1000);
        const elapsedOvertime = now - overtimeStart;

        if (elapsedOvertime > 30) {
            document.body.classList.add('is-flashing');
        }
    }, 1000);
}

/** Arrête la vérification du dépassement et le clignotement */
function stopOvertimeCheck() {
    if (overtimeCheckIntervalId) {
        clearInterval(overtimeCheckIntervalId);
        overtimeCheckIntervalId = null;
    }
    document.body.classList.remove('is-flashing'); // Toujours enlever la classe
}

// --- Mise à jour Principale de l'Affichage ---

/** Met à jour l'affichage du timer (compte à rebours ou overtime) */
function updateLocalTimerDisplay() {
    if (!timerId) return; // Ne rien faire si on n'est pas sur /1 ou /2

    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = targetEndTime - now;

    if (remainingSeconds <= 0) {
        // --- Mode Overtime ---
        if (!isOvertime) {
            isOvertime = true;
            overtimeStart = targetEndTime; // Heure exacte de fin
            if (!intervalId) { // Relancer l'intervalle s'il s'était arrêté
                intervalId = setInterval(updateLocalTimerDisplay, 1000);
            }
            startMovingButton();
            startOvertimeCheck();
            console.log(`Timer ${timerId}: Overtime started.`);
        }
        const elapsedOvertime = now - overtimeStart;
        timerDisplay.textContent = `+${formatTime(elapsedOvertime)}`;
        resetButton.style.display = 'block';
        resetButton.classList.add('active');

    } else {
        // --- Mode Compte à rebours ---
        if (isOvertime) { // Si on sort du mode overtime (après un reset)
            isOvertime = false;
            stopMovingButton();
            stopOvertimeCheck();
            console.log(`Timer ${timerId}: Countdown resumed.`);
        }
        timerDisplay.textContent = formatTime(remainingSeconds);
        resetButton.style.display = 'none';
        resetButton.classList.remove('active');
        // Sécurités pour arrêter les effets si on revient en mode normal
        stopMovingButton();
        stopOvertimeCheck();

        if (!intervalId) { // S'assurer que l'intervalle tourne
            intervalId = setInterval(updateLocalTimerDisplay, 1000);
        }
    }
}

// --- Communication avec le Backend ---

/** Récupère l'heure de fin depuis le serveur */
async function fetchTimeFromServer() {
    if (!timerId) return; // Ne pas fetch si pas d'ID valide
    try {
        const response = await fetch(`${backendUrl}/time/${timerId}`); // Ajout de l'ID
        if (!response.ok) {
            if(response.status === 404) {
                console.error(`Error: Timer ID '${timerId}' not found on server.`);
                if(messageDisplay) messageDisplay.textContent = `Error: Timer '${timerId}' unknown.`;
                if(timerDisplay) timerDisplay.textContent = "N/A";
                if (intervalId) clearInterval(intervalId); intervalId = null;
                stopMovingButton(); stopOvertimeCheck();
                return; // Stop further processing for this timer
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        if (data.endTime !== targetEndTime) {
            console.log(`Timer ${timerId}: New endTime received: ${data.endTime} (${new Date(data.endTime * 1000)})`);
            targetEndTime = data.endTime;
            // Si on était en overtime mais que le serveur donne une nouvelle heure future,
            // il faut repasser en mode compte à rebours.
            const now = Math.floor(Date.now() / 1000);
            if (isOvertime && targetEndTime > now) {
                console.log(`Timer ${timerId}: Exiting overtime due to server update.`);
                isOvertime = false;
                stopMovingButton();
                stopOvertimeCheck();
            }
            updateLocalTimerDisplay(); // Mettre à jour l'affichage
        }
    } catch (error) {
        console.error(`Timer ${timerId}: Failed to fetch time:`, error);
        if(timerDisplay) timerDisplay.textContent = "Error";
        if (intervalId) clearInterval(intervalId); intervalId = null;
        stopMovingButton(); stopOvertimeCheck();
    }
}

/** Gère le clic sur le bouton Reset */
resetButton.addEventListener('click', async () => {
    if (!timerId) return; // Ne rien faire si pas d'ID

    console.log(`Timer ${timerId}: Reset request initiated...`);
    // Arrêter immédiatement les effets visuels et cacher bouton
    stopMovingButton();
    stopOvertimeCheck();
    isOvertime = false;
    resetButton.style.display = 'none';
    resetButton.classList.remove('active');

    try {
        // Inclure l'ID dans l'URL de l'API reset
        const response = await fetch(`${backendUrl}/reset/${timerId}`, { method: 'POST' });
        const data = await response.json(); // Lire la réponse même si échec HTTP

        if (!response.ok || !data.success) {
            console.warn(`Timer ${timerId}: Reset rejected or failed: ${response.status} - ${data.message || 'Unknown reason'}`);
            // Resynchroniser pour obtenir l'état actuel (peut-être qqn d'autre a reset?)
            await fetchTimeFromServer();
        } else {
            console.log(`Timer ${timerId}: Reset successful. New server endTime: ${data.newEndTime}`);
            targetEndTime = data.newEndTime; // Mettre à jour notre cible
            // L'appel à fetchTimeFromServer (via polling ou ci-dessus) mettra à jour,
            // mais on peut forcer pour réactivité immédiate :
            updateLocalTimerDisplay();
        }
    } catch (error) {
        console.error(`Timer ${timerId}: Error during reset request:`, error);
        await fetchTimeFromServer(); // Resynchroniser en cas d'erreur réseau
    }
});


// --- Initialisation et Polling ---
if (timerId) {
    // Démarrer les opérations uniquement si un ID valide a été trouvé
    console.log(`Timer ${timerId}: Initializing...`);
    fetchTimeFromServer(); // Premier fetch
    setInterval(fetchTimeFromServer, 15000); // Polling toutes les 15s
    if (!intervalId) {
        // Démarrer l'intervalle pour la mise à jour de l'affichage local
        intervalId = setInterval(updateLocalTimerDisplay, 1000);
    }
    // Afficher un état initial en attendant la réponse serveur
    if(timerDisplay) timerDisplay.textContent = "Chargement...";

} else {
    // Ce cas est géré au début du script (affichage message, etc.)
    console.log("Script initialised without a valid timer ID.");
}