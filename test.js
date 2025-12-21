console.log("Hello AutoPatch! v2");
const password = process.env.PASSWORD;
if (!password) {
    console.error("Password not set in environment variables.");
    process.exit(1);
}
console.log("Testing insecure code!", password);
