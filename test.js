const apikey = process.env.API_KEY;
if (!apikey) {
  console.error("API key is not set.");
} else {
  console.log("Testing secure code!");
  // Avoid logging sensitive information like API keys
  // console.log(apikey); // This line is commented out to prevent exposure
}
