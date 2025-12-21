const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

const envFilePath = '.env';
if (!fs.existsSync(envFilePath)) {
    console.error(`Error: ${envFilePath} file is missing.`);
    process.exit(1);
}

const password = process.env.PASSWORD;
if (!password) {
    console.error("Error: Password is required.");
    process.exit(1);
} else if (typeof password !== 'string' || password.length < 12 || !/(?=.*[0-9])(?=.*[!@#$%^&*()_+={}:;"'<>?,./~`-])(?=.*[a-zA-Z])(?=.*[A-Z])/.test(password)) {
    console.error("Error: Password must be a string with at least 12 characters, including numbers, special characters, and at least one uppercase letter.");
    process.exit(1);
} else {
    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
    bcrypt.hash(password, saltRounds, function(err, hashedPassword) {
        if (err) {
            console.error("Error hashing password");
            process.exit(1);
        }
        // Use hashedPassword for further processing instead of the plain password.
    });
}

// Rate limiting to prevent brute force attacks
let attempts = 0;
const maxAttempts = 5;
const delay = 1000; // 1 second delay

function checkPassword(inputPassword) {
    if (attempts >= maxAttempts) {
        console.error('Too many attempts. Please try again later.');
        return;
    }
    if (inputPassword === password) {
        attempts = 0; // reset attempts on success
        // Proceed with the application logic
    } else {
        attempts++;
        console.error('Incorrect password.');
        setTimeout(() => {}, delay);
    }
}

// Improved rate limiting to prevent immediate retries
function checkPasswordWithDelay(inputPassword) {
    if (attempts >= maxAttempts) {
        console.error('Too many attempts. Please try again later.');
        return;
    }
    if (inputPassword === password) {
        attempts = 0; // reset attempts on success
        // Proceed with the application logic
    } else {
        attempts++;
        console.error('Incorrect password.');
        setTimeout(() => checkPasswordWithDelay(inputPassword), delay);
    }
}
