console.log("Hello AutoPatch!");
const password = process.env.PASSWORD;
if (!password) {
    throw new Error("No password provided. Set the PASSWORD environment variable.");
}
console.log("Testing secure code!");
