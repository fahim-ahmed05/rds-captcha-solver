// ==UserScript==
// @name         RDS CAPTCHA Solver
// @namespace    Violentmonkey Scripts
// @homepage     https://github.com/fahim-ahmed05/rds-captcha-solver
// @version      1.4
// @description  Auto-recognize and fill CAPTCHA on NSU Portal login page.
// @author       Fahim Ahmed
// @match        https://rds3.northsouth.edu/common/login/preLogin
// @downloadURL  https://github.com/fahim-ahmed05/rds-captcha-solver/raw/main/rdscaptchasolver.user.js
// @updateURL    https://github.com/fahim-ahmed05/rds-captcha-solver/raw/main/rdscaptchasolver.user.js
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js
// ==/UserScript==

(function () {
    'use strict';

    const imageURL = 'https://rds3.northsouth.edu/captcha';
    const maxRetries = 5;

    function showOverlay(message, isError = false) {
        let overlay = document.getElementById('captcha-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'captcha-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '20px';
            overlay.style.right = '20px';
            overlay.style.zIndex = '9999';
            overlay.style.padding = '10px 15px';
            overlay.style.borderRadius = '8px';
            overlay.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
            overlay.style.fontSize = '14px';
            overlay.style.fontFamily = 'Arial, sans-serif';
            document.body.appendChild(overlay);
        }
        overlay.style.backgroundColor = isError ? '#d32f2f' : '#4CAF50';
        overlay.textContent = message;
    }

    function fetchAndRecognizeCaptcha(retries = 0) {
        if (retries >= maxRetries) {
            showOverlay(`Failed after ${maxRetries} attempt(s). Please refresh the tab.`, true);
            return;
        }

        showOverlay(`Solving CAPTCHA... Attempt ${retries + 1} of ${maxRetries}`);

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageURL + '?rand=' + Math.random(); // Cache-busting

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const dataURL = canvas.toDataURL();

            Tesseract.recognize(dataURL, 'eng').then(({ data: { text } }) => {
                const digits = text.trim().replace(/\D/g, '');

                if (!/^\d{4}$/.test(digits)) {
                    setTimeout(() => fetchAndRecognizeCaptcha(retries + 1), 500);
                    return;
                }

                const input = document.querySelector('input[name="captcha"]');
                if (input) input.value = digits;
                showOverlay(`CAPTCHA Solved: ${digits}`);
            }).catch(() => {
                showOverlay('OCR processing failed. Please refresh.', true);
            });
        };

        img.onerror = () => {
            showOverlay('Failed to load CAPTCHA image.', true);
        };
    }

    window.addEventListener('load', () => fetchAndRecognizeCaptcha());
})();
