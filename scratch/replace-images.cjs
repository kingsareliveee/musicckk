const fs = require('fs');

function replaceImages(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');
  file = file.replace(/image:\s*\"https:\/\/i\.scdn\.co\/image\/[a-zA-Z0-9]+\"/g, (match, offset, string) => {
    // extract name
    let line = string.substring(Math.max(0, offset - 100), offset);
    let nameMatch = line.match(/name:\s*\"([^\"]+)\"/);
    if(nameMatch) {
      return 'image: "https://ui-avatars.com/api/?name=' + encodeURIComponent(nameMatch[1]) + '&size=256&background=random&color=fff"';
    }
    return match;
  });
  fs.writeFileSync(filePath, file);
}

replaceImages('src/pages/OnboardingTastePicker.tsx');
replaceImages('server/services/youtubeService.js');
console.log('Images replaced.');
