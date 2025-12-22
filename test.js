const apikey = process.env.API_KEY;
if (!apikey) {
  console.error("API key is not set.");
} else {
  console.log("Testing secure code!");
}
