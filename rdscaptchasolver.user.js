// ==UserScript==
// @name         RDS CAPTCHA Solver
// @namespace    Violentmonkey Scripts
// @homepage     https://github.com/fahim-ahmed05/rds-captcha-solver
// @version      3.1
// @description  Auto-recognize and fill CAPTCHA on NSU Portal login page with Image Preprocessing.
// @author       Fahim Ahmed
// @match        https://rds3.northsouth.edu/common/login/preLogin
// @match        https://rds3.northsouth.edu/common/login/index
// @downloadURL  https://github.com/fahim-ahmed05/rds-captcha-solver/raw/main/rdscaptchasolver.user.js
// @updateURL    https://github.com/fahim-ahmed05/rds-captcha-solver/raw/main/rdscaptchasolver.user.js
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js
// ==/UserScript==

(function () {
    'use strict';

    const imageURL = 'https://rds3.northsouth.edu/captcha';
    const maxRetries = 10;
    
    let tesseractWorker = null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    function showOverlay(message, isError = false) {
        let overlay = document.getElementById('captcha-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'captcha-overlay';
            overlay.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                padding: 10px 15px; border-radius: 8px; font-size: 14px; color: #fff;
                box-shadow: 0 0 10px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.backgroundColor = isError ? '#d32f2f' : '#4CAF50';
        overlay.textContent = message;

        // Reset the timeout if it was already set
        if (overlay.timeoutId) clearTimeout(overlay.timeoutId);
        overlay.timeoutId = setTimeout(() => {
            if (overlay && overlay.parentNode) overlay.remove();
        }, 10000);
    }

    async function initWorker() {
        if (!tesseractWorker) {
            tesseractWorker = await Tesseract.createWorker();
            await tesseractWorker.loadLanguage('eng');
            await tesseractWorker.initialize('eng');
            await tesseractWorker.setParameters({ tessedit_char_whitelist: '0123456789' });
        }
        return tesseractWorker;
    }

    async function terminateWorker() {
        if (tesseractWorker) {
            await tesseractWorker.terminate();
            tesseractWorker = null;
        }
    }

    function fetchAndRecognizeCaptcha(retries = 0) {
        if (retries >= maxRetries) {
            showOverlay(`Failed to solve the CAPTCHA after ${maxRetries} attempts. Please refresh.`, true);
            terminateWorker();
            return;
        }

        const input = document.querySelector('input[name="captcha"]');
        if (!input) return; // Exit if no CAPTCHA input on the page

        showOverlay(`Solving CAPTCHA... (${retries + 1}/${maxRetries})`);

        const img = new Image();
        img.src = `${imageURL}?rand=${Math.random()}`; // prevent caching

        img.onload = async () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // --- IMAGE PREPROCESSING ---
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Cache length and unroll slight operations for speed
            for (let i = 0, len = data.length; i < len; i += 4) {
                // Text is pure white and anti-aliased edges have some red.
                // Background is pure blue and lines are cyan, so their red channel is ~0.
                if (data[i] > 100) {
                    data[i] = data[i + 1] = data[i + 2] = 0; // Black text
                } else {
                    data[i] = data[i + 1] = data[i + 2] = 255; // White background
                }
            }

            ctx.putImageData(imageData, 0, 0);
            // ---------------------------

            try {
                const worker = await initWorker();
                const { data: { text } } = await worker.recognize(canvas.toDataURL());
                const digits = text.trim().replace(/\D/g, '');

                if (!/^\d{4}$/.test(digits)) {
                    setTimeout(() => fetchAndRecognizeCaptcha(retries + 1), 500);
                    return;
                }

                input.value = digits;
                showOverlay(`CAPTCHA Solved: ${digits}`);
                terminateWorker(); // Free memory on success
            } catch (error) {
                if (retries + 1 < maxRetries) {
                    setTimeout(() => fetchAndRecognizeCaptcha(retries + 1), 500);
                } else {
                    showOverlay('OCR processing failed. Please refresh the tab.', true);
                    terminateWorker();
                }
            }
        };

        img.onerror = () => {
            if (retries + 1 < maxRetries) {
                setTimeout(() => fetchAndRecognizeCaptcha(retries + 1), 500);
            } else {
                showOverlay('Failed to load CAPTCHA image. Please refresh.', true);
                terminateWorker();
            }
        };
    }

    window.addEventListener('load', () => fetchAndRecognizeCaptcha());
})();