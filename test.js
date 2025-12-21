console.log("Hello AutoPatch! v2");
const password = process.env.PASSWORD;
if (!password) {
    console.error("Password not set.");
    return;
}

if (password.length < 8) {
    console.error("Password must be at least 8 characters long.");
    return;
}

const hasUpperCase = /[A-Z]/.test(password);
const hasLowerCase = /[a-z]/.test(password);
const hasNumbers = /[0-9]/.test(password);
const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChars) {
    console.error("Password must include a mix of characters.");
    return;
}

const bcrypt = require('bcrypt');
const saltRounds = 10;
bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error hashing password.");
        return;
    }
    // Use the hashed password for further processing
});
// Clear the password variable immediately after use
let password = null; // Clear password for security reasons