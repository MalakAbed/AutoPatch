const password = process.env.PASSWORD || "defaultPassword";
if (password !== "defaultPassword") {
    console.log("Testing secure code!");
} else {
    console.warn("Warning: Using default password!");
}
