// ==UserScript==
// @name         RDS CAPTCHA Solver
// @namespace    Violentmonkey Scripts
// @homepage     https://github.com/fahim-ahmed05/rds-captcha-solver
// @version      1.9
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
        const oldOverlay = document.getElementById('captcha-overlay');
        if (oldOverlay && oldOverlay.parentNode) oldOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'captcha-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '20px';
        overlay.style.right = '20px';
        overlay.style.zIndex = '9999';
        overlay.style.padding = '10px 15px';
        overlay.style.borderRadius = '8px';
        overlay.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        overlay.style.fontSize = '14px';
        overlay.style.color = '#fff';
        overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        overlay.style.backgroundColor = isError ? '#d32f2f' : '#4CAF50';
        overlay.textContent = message;

        document.body.appendChild(overlay);

        setTimeout(() => {
            if (overlay && overlay.parentNode) overlay.remove();
        }, 30000);
    }

    function fetchAndRecognizeCaptcha(retries = 0) {
        if (retries >= maxRetries) {
            showOverlay(`Failed to solve the CAPTCHA. Please refresh the tab.`, true);
            return;
        }

        showOverlay(`Solving CAPTCHA... (${retries + 1}/${maxRetries})`);

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageURL + '?rand=' + Math.random(); // prevent caching

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

                showOverlay(`CAPTCHA Solved.`);
            }).catch(() => {
                if (retries + 1 < maxRetries) {
                    setTimeout(() => fetchAndRecognizeCaptcha(retries + 1), 500);
                } else {
                    showOverlay('OCR processing failed. Please refresh the tab.', true);
                }
            });
        };

        img.onerror = () => {
            if (retries + 1 < maxRetries) {
                setTimeout(() => fetchAndRecognizeCaptcha(retries + 1), 500);
            } else {
                showOverlay('Failed to load CAPTCHA image. Please refresh the tab.', true);
            }
        };
    }

    window.addEventListener('load', () => fetchAndRecognizeCaptcha());
})();
