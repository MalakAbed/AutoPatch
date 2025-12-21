const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

const envFilePath = '.env';
if (!fs.existsSync(envFilePath)) {
    console.error(`Error: ${envFilePath} file is missing.`);
    throw new Error(`Missing .env file`);
}

const password = process.env.PASSWORD;
if (!password) {
    console.error("Error: Password is required.");
    throw new Error(`Password is required`);
} else if (typeof password !== 'string' || password.length < 12 || !/(?=.*[0-9])(?=.*[!@#$%^&*()_+={}:;"'<>?,./~`-])(?=.*[a-zA-Z])(?=.*[A-Z])/.test(password)) {
    console.error("Error: Password must be a string with at least 12 characters, including numbers, special characters, and at least one uppercase letter.");
    throw new Error(`Invalid password format`);
} else {
    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
    bcrypt.hash(password, saltRounds, function(err, hashedPassword) {
        if (err) {
            console.error("Error hashing password");
            return;
        }
        // Use hashedPassword for further processing instead of the plain password.
        const storedHashedPassword = hashedPassword; // Store hashed password securely
        // Reset attempts after a delay
        function resetAttempts() {
            setTimeout(() => {
                attempts = 0;
            }, delay * maxAttempts);
        }
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
    bcrypt.compare(inputPassword, storedHashedPassword, function(err, isMatch) {
        if (err) {
            console.error('Error comparing passwords.');
            return;
        }
        if (isMatch) {
            attempts = 0; // reset attempts on success
            // Proceed with the application logic
        } else {
            attempts++;
            console.error('Incorrect password.');
            setTimeout(() => {}, delay);
        }
    });
}

// Improved rate limiting to prevent immediate retries
function checkPasswordWithDelay(inputPassword) {
    if (attempts >= maxAttempts) {
        console.error('Too many attempts. Please try again later.');
        return;
    }
    setTimeout(() => {
        bcrypt.compare(inputPassword, storedHashedPassword, function(err, isMatch) {
            if (err) {
                console.error('Error comparing passwords.');
                return;
            }
            if (isMatch) {
                attempts = 0; // reset attempts on success
                // Proceed with the application logic
            } else {
                attempts++;
                console.error('Incorrect password.');
            }
        });
    }, delay);
}

// Delay added to prevent immediate retries
function delayedCheckPassword(inputPassword) {
    setTimeout(() => checkPassword(inputPassword), delay);
}

// Use constant-time comparison to prevent timing attacks
function secureCompare(inputPassword, storedPassword) {
    return bcrypt.compare(inputPassword, storedPassword, (err, result) => {
        if (err) {
            console.error('Error during secure comparison.');
            return false;
        }
        return result;
    });
}

// Ensure constant-time comparison
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// Use constant-time comparison for password verification
function comparePasswords(inputPassword) {
    return secureCompare(inputPassword, storedHashedPassword);
}
