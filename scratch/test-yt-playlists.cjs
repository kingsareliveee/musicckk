const ytSearch = require('yt-search');

async function test(query) {
  console.log(`\n--- Searching for: "${query}" ---`);
  try {
    const result = await ytSearch(query);
    console.log("Videos count:", result.videos ? result.videos.length : 0);
    console.log("Playlists count:", result.playlists ? result.playlists.length : 0);
    if (result.playlists && result.playlists.length > 0) {
      console.log("First Playlist:", JSON.stringify(result.playlists[0], null, 2));
    } else {
      console.log("No playlists found in result. Keys in result:", Object.keys(result));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function run() {
  await test("Dhurandhar");
  await test("Moosetape");
  await test("Punjabi Hits");
}

run();
