const password = process.env.PASSWORD;
if (!password) {
    console.error("Error: No password provided. Please set the PASSWORD environment variable.");
    process.exit(1);
} else {
    console.log("Testing secure code!");
}
