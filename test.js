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
} else if (typeof password !== 'string' || password.length < 8) {
    console.error("Error: Password must be a string with at least 8 characters.");
    process.exit(1);
} else {
    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
    bcrypt.hash(password, saltRounds, function(err, hashedPassword) {
        if (err) {
            console.error("Error hashing password"); // Removed sensitive error information
            process.exit(1);
        }
        // Use hashedPassword for further processing instead of the plain password.
    });
}
