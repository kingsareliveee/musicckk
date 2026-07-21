const http = require('https');

const artists = [
  { name: "Arijit Singh", url: "https://ui-avatars.com/api/?name=Arijit%20Singh&size=256&background=random&color=fff" },
  { name: "Karan Aujla", url: "https://ui-avatars.com/api/?name=Karan%20Aujla&size=256&background=random&color=fff" },
  { name: "AP Dhillon", url: "https://ui-avatars.com/api/?name=AP%20Dhillon&size=256&background=random&color=fff" },
  { name: "Shubh", url: "https://ui-avatars.com/api/?name=Shubh&size=256&background=random&color=fff" },
  { name: "Sidhu Moosewala", url: "https://ui-avatars.com/api/?name=Sidhu%20Moosewala&size=256&background=random&color=fff" },
  { name: "Diljit Dosanjh", url: "https://ui-avatars.com/api/?name=Diljit%20Dosanjh&size=256&background=random&color=fff" },
  { name: "Prem Dhillon", url: "https://ui-avatars.com/api/?name=Prem%20Dhillon&size=256&background=random&color=fff" },
  { name: "Gurinder Gill", url: "https://ui-avatars.com/api/?name=Gurinder%20Gill&size=256&background=random&color=fff" },
  { name: "Navaan Sandhu", url: "https://ui-avatars.com/api/?name=Navaan%20Sandhu&size=256&background=random&color=fff" },
  { name: "Badshah", url: "https://ui-avatars.com/api/?name=Badshah&size=256&background=random&color=fff" },
  { name: "Divine", url: "https://ui-avatars.com/api/?name=Divine&size=256&background=random&color=fff" }
];

function checkUrl(artist) {
  return new Promise((resolve) => {
    http.get(artist.url, (res) => {
      resolve({ name: artist.name, url: artist.url, statusCode: res.statusCode });
    }).on('error', (e) => {
      resolve({ name: artist.name, url: artist.url, error: e.message, statusCode: null });
    });
  });
}

async function run() {
  console.log("Checking URLs...");
  for (const artist of artists) {
    const result = await checkUrl(artist);
    console.log(`${result.name}: Status Code = ${result.statusCode} (URL: ${result.url})`);
  }
}

run();
