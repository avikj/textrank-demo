'use strict';
var natural = require('natural');
var fs = require('fs');

var textString = fs.readFileSync(`${__dirname}/test.txt`, 'utf8');
var stopWordsString = fs.readFileSync(`${__dirname}/stopwords.txt`, 'utf8');
var tokenizer = new natural.WordTokenizer();
var text = tokenizer.tokenize(textString)
                    .map(function(a){ return a.toLowerCase() });
var stopWords = tokenizer.tokenize(stopWordsString);
const d = .85; // damping factor
const n = 10; // search radius
const threshold = 0.01; // convergence threshold
const numKeywords = 15;
var map = {}; // { word: [adjacent words] } 

// populate the map
for(var i = 0; i < text.length; i++) {
  var currentWord = text[i];
  if(!map[currentWord]) 
    map[currentWord] = newWord();
  for(var j = 1; j <= n && i + j < text.length; j++) { // adjacent to the next n words
    var adjacentWord = text[i+j];
    if(!map[adjacentWord]) 
      map[adjacentWord] = newWord();
    if(map[currentWord].neighbors.indexOf(adjacentWord) == -1)
      map[currentWord].neighbors.push(adjacentWord);
    if(map[adjacentWord].neighbors.indexOf(currentWord) == -1)
      map[adjacentWord].neighbors.push(currentWord);
  }
}

var iters = 0;
var scoreChange = threshold + 1;
while(scoreChange >= threshold && iters < 200) {
  iters++;
  var newMap = {};
  for(var key in map) {
    newMap[key] = {
      neighbors: map[key].neighbors,
      score: 1-d
    } 
    for(var i = 0; i < map[key].neighbors.length; i++) {
      newMap[key].score += d * map[map[key].neighbors[i]].score / map[map[key].neighbors[i]].neighbors.length;
    }
  }
  scoreChange = scoreDifference(map, newMap);
  map = newMap;
}

var words = [];
for(var key in map)
  if(stopWords.indexOf(key) == -1)
    words.push({ value: key, score: map[key].score });
words.sort(function(a, b) {
  return b.score-a.score;
})
for(var i = 0; i < numKeywords; i++)
  console.log(words[i].value);
//console.log(JSON.stringify(map, null, 2));
// helper functions
function newWord() {
  return {
    neighbors: [],
    score: 1
  }
}
function scoreDifference(a, b) {
  var result = 0;
  for(var key in a) {
    result += Math.abs(a[key].score - b[key].score);
  }
  return result;
}