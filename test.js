const password = process.env.PASSWORD;
const apikey = process.env.APIKEY;

if (!password || !apikey) {
  console.error('Missing environment variables for password or API key.');
  process.exit(1);
}

console.log("Testing secure code!");