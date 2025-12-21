const dotenv = require('dotenv');
dotenv.config();

const password = process.env.PASSWORD;
if (!password) {
    console.error("Error: Password is required.");
    process.exit(1);
} else {
    // Removed sensitive log message for security reasons.
    // Secure code is being tested.
    // Consider using a secure vault or configuration management for sensitive data.
    // Ensure that the password is handled securely and not logged or exposed in any way.
    // Use a library for secure password management if applicable.
    // Implement additional security measures such as encryption or hashing for sensitive data.
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, function(err, hashedPassword) {
        if (err) {
            console.error("Error hashing password:", err);
            process.exit(1);
        }
        // Use hashedPassword for further processing instead of the plain password.
    });
}
