const addRecently = (list, song) => {
  const key = s => s && (s.videoId || s.id);
  const songKey = key(song);
  if (key(list[0]) === songKey) return list;
  const filtered = list.filter(s => key(s) !== songKey);
  const newList = [song, ...filtered].slice(0,50);
  return newList;
};
let list = [];
const song = { videoId: 'A', title: 'Song A' };
for (let i = 0; i < 5; i++) {
  list = addRecently(list, song);
  console.log(`after ${i+1}:`, list.map(s => s.videoId));
}

// Test sequence A,B,A
list = [];
list = addRecently(list, {videoId:'A'});
list = addRecently(list, {videoId:'B'});
list = addRecently(list, {videoId:'A'});
console.log('A,B,A result:', list.map(s=>s.videoId));
