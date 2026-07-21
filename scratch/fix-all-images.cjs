const fs = require('fs');
const path = require('path');
const ytSearch = require('yt-search');

const SRC_DIR = path.join(__dirname, '..', 'src');

async function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find all `{ name: "...", ... image: "..." }` matches
  const regex = /name:\s*\"([^\"]+)\"([^>]*?)image:\s*\"([^\"]+)\"/g;
  let matches = [...content.matchAll(regex)];
  
  if (matches.length === 0) return;
  console.log(`Processing ${path.basename(filePath)} (${matches.length} artists found)`);
  
  const cache = new Map();
  
  for (const match of matches) {
    const fullMatch = match[0];
    const artistName = match[1];
    const middleContent = match[2];
    const oldImage = match[3];
    
    // Check if we already fetched it to save time
    let newImage = cache.get(artistName);
    
    if (!newImage) {
      try {
        const res = await ytSearch(artistName + " official channel");
        const channel = res.accounts?.[0];
        if (channel && channel.thumbnail) {
          newImage = channel.thumbnail;
          console.log(`[FOUND] ${artistName} -> ${newImage}`);
        } else {
          console.log(`[NOT FOUND] ${artistName}`);
        }
      } catch (err) {
        console.log(`[ERROR] ${artistName}: ${err.message}`);
      }
      
      if (!newImage) {
        newImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=random&color=fff`;
      }
      
      cache.set(artistName, newImage);
      // Rate limiting to prevent IP block
      await new Promise(r => setTimeout(r, 200));
    }
    
    if (newImage && newImage !== oldImage) {
      const replacement = `name: "${artistName}"${middleContent}image: "${newImage}"`;
      content = content.replace(fullMatch, replacement);
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Saved ${path.basename(filePath)}`);
}

async function run() {
  const files = [
    path.join(SRC_DIR, 'pages', 'OnboardingTastePicker.tsx'),
    path.join(SRC_DIR, 'pages', 'Library.tsx'),
    path.join(SRC_DIR, 'pages', 'SongDetail.tsx')
  ];
  
  for (const f of files) {
    if (fs.existsSync(f)) {
      await processFile(f);
    }
  }
}

run().catch(console.error);
