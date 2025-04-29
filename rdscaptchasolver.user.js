// ==UserScript==
// @name         RDS CAPTCHA Solver
// @namespace    Violentmonkey Scripts
// @homepage     https://github.com/fahim-ahmed05/rds-captcha-solver
// @version      1.2
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

    function fetchAndRecognizeCaptcha(retries = 0) {
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

            Tesseract.recognize(dataURL, 'eng', {
                logger: m => console.log(m)
            }).then(({ data: { text } }) => {
                const digits = text.replace(/\D/g, ''); // Extract only digits
                console.log("Recognized CAPTCHA:", digits);

                if (digits.length !== 4 && retries < maxRetries) {
                    console.warn(`CAPTCHA length (${digits.length}) invalid, retrying...`);
                    setTimeout(() => fetchAndRecognizeCaptcha(retries + 1), 500); // retry after short delay
                    return;
                }

                const input = document.querySelector('input[name="captcha"]');
                if (input) input.value = digits;
            }).catch(err => {
                console.error('OCR Error:', err);
            });
        };

        img.onerror = () => {
            console.error("Failed to load CAPTCHA image.");
        };
    }

    window.addEventListener('load', () => fetchAndRecognizeCaptcha());
})();
