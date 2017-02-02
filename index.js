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
const n = 8; // search radius
const threshold = 0.01; // convergence threshold
const numKeywords = 10;
var map = {}; // { word: [adjacent words] } 

// remove numbers from text
for(var i = 0; i < text.length; i++)
  if(!isNaN(text[i]))
    text.splice(i--, 1);

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

var keywords = [];
for(var key in map)
  if(stopWords.indexOf(key) == -1)
    keywords.push({ value: key, score: map[key].score });
keywords.sort(function(a, b) {
  return b.score-a.score;
});
keywords = keywords.slice(0, Math.floor(numKeywords*2)).map(function(word){ return word.value }); // select top numKeywords keywords
// postprocessing to combine parts of multi-word keyphrases
var currentStreak = [];
var streaks = [];
var multiWordKeyphrases = [];
for(var i = 0; i < text.length; i++) {
  if(keywords.indexOf(text[i]) != -1) {
    currentStreak.push(text[i]);
  } else {
    if(currentStreak.length > 1) {
      var phrase = wordListToString(currentStreak);
      if(streaks.indexOf(phrase) >= 0 && multiWordKeyphrases.indexOf(phrase) == -1)
        multiWordKeyphrases.push(phrase)
      else
        streaks.push(phrase);
    }
    currentStreak = [];
  }
}

// if it is part of a multi-word keyphrase, remove its individual occurence in the list
for(var i = 0; i < keywords.length; i++)
  for(var j = 0; j < multiWordKeyphrases.length; j++)
    if(multiWordKeyphrases[j].indexOf(keywords[i]) != -1)
      // if the word is part of a larger phrase, remove the word
      keywords.splice(i--, 1);
keywords.splice(numKeywords - multiWordKeyphrases.length, keywords.length);
// add keyphrases to keyword list
for(var i = 0; i < multiWordKeyphrases.length; i++)
  keywords.unshift(multiWordKeyphrases[i])

console.log(JSON.stringify(keywords, null, 2));
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
function wordListToString(list) {
  var result = list[0];
  for(var i = 1; i < list.length; i++)
    result += ' '+list[i];
  return result;
}