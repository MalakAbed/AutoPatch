const password = process.env.PASSWORD;
if (!password) {
    console.error("Error: No password provided.");
    process.exit(1);
} else {
    // Removed sensitive log message for security reasons.
    // Secure code is being tested.
}
