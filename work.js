// SITE-WIDE MUSIC AND ANIMATION
// Every HTML page loads this file with "defer".

(() => {
    "use strict";

    const musicButton = document.getElementById("music-button");
    const musicStatus = document.getElementById("music-status");
    const animationButton = document.getElementById("animation-button");
    const ambience = document.querySelector(".quest-ambience");

    if (!musicButton || !musicStatus || !animationButton || !ambience) {
        return;
    }

    // Storage may be unavailable in private browsing or for local files.
    function readSetting(key, fallback) {
        try {
            return localStorage.getItem(key) ?? fallback;
        } catch {
            return fallback;
        }
    }

    function saveSetting(key, value) {
        try {
            localStorage.setItem(key, String(value));
        } catch {
            // Controls still work even when the browser blocks storage.
        }
    }

    const music = new Audio("assets/music.mp3");
    music.loop = true;
    music.volume = 0.4;
    music.preload = "auto";

    let musicEnabled = readSetting("quest.music.enabled", "true") === "true";
    let walkerPaused = readSetting("quest.walker.paused", "false") === "true";
    let waitingForGesture = false;
    let lastSavedSecond = -1;

    // Restore the song position once its duration is available.
    music.addEventListener("loadedmetadata", () => {
        const position = Number(readSetting("quest.music.position", "0"));

        if (Number.isFinite(position) && position >= 0 && music.duration > 0) {
            music.currentTime = position % music.duration;
        }
    });

    function savePosition() {
        if (music.readyState >= 1 && Number.isFinite(music.currentTime)) {
            saveSetting("quest.music.position", music.currentTime);
        }
    }

    function updateMusicControls(message) {
        const playing = !music.paused;

        musicButton.textContent = playing ? "Turn Music Off" : "Play Music";
        musicButton.setAttribute("aria-pressed", String(playing));
        musicStatus.textContent = message || (
            playing ? "Music is playing." : "Music is off."
        );
    }

    async function startMusic() {
        if (!musicEnabled) {
            return;
        }

        try {
            await music.play();

            // A visitor may turn the music off while playback is starting.
            if (!musicEnabled) {
                music.pause();
                return;
            }

            waitingForGesture = false;
            updateMusicControls();
        } catch (error) {
            if (!musicEnabled) {
                return;
            }

            waitingForGesture = error.name === "NotAllowedError";
            updateMusicControls(waitingForGesture
                ? "Press Play Music to enable sound."
                : "Music is unavailable. Please try again.");
        }
    }

    musicButton.addEventListener("click", () => {
        if (!music.paused) {
            musicEnabled = false;
            waitingForGesture = false;
            saveSetting("quest.music.enabled", false);
            savePosition();
            music.pause();
            updateMusicControls();
        } else {
            musicEnabled = true;
            saveSetting("quest.music.enabled", true);
            startMusic();
        }
    });

    // Retry blocked autoplay on a genuine visitor interaction.
    function retryAfterInteraction(event) {
        if (event.target.closest?.("button, a, input, textarea, select")) {
            return;
        }

        if (event.type === "keydown" && !["Enter", " "].includes(event.key)) {
            return;
        }

        if (waitingForGesture && musicEnabled) {
            startMusic();
        }
    }

    document.addEventListener("pointerdown", retryAfterInteraction);
    document.addEventListener("keydown", retryAfterInteraction);

    music.addEventListener("play", () => updateMusicControls());
    music.addEventListener("pause", () => updateMusicControls());
    music.addEventListener("error", () => {
        waitingForGesture = false;
        updateMusicControls("Music could not load.");
    });

    // Save periodically and before navigation; a new page resumes this position.
    music.addEventListener("timeupdate", () => {
        const second = Math.floor(music.currentTime);

        if (second !== lastSavedSecond) {
            savePosition();
            lastSavedSecond = second;
        }
    });

    window.addEventListener("pagehide", savePosition);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            savePosition();
        }
    });

    // Keep open pages in sync when a visitor switches music off in another tab.
    window.addEventListener("storage", (event) => {
        if (event.key === "quest.music.enabled") {
            musicEnabled = event.newValue !== "false";

            if (!musicEnabled) {
                waitingForGesture = false;
                music.pause();
            }

            updateMusicControls();
        }
    });

    function updateWalker() {
        ambience.classList.toggle("walker-paused", walkerPaused);
        animationButton.textContent = walkerPaused ? "Resume Walker" : "Pause Walker";
        animationButton.setAttribute("aria-pressed", String(walkerPaused));
    }

    animationButton.addEventListener("click", () => {
        walkerPaused = !walkerPaused;
        saveSetting("quest.walker.paused", walkerPaused);
        updateWalker();
    });

    updateWalker();
    updateMusicControls();

    if (musicEnabled) {
        startMusic();
    }
})();
