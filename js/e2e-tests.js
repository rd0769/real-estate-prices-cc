const parse = require('./bootstrap');
const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const LZ4 = require('lz4');


function parseOracle(file) {
  const bytes = fs.readFileSync(file);
  const lines = bytes.toString('utf8').split('\n');
  const rv = [];
  for(var i = 0; i < lines.length; i++) {
    if(lines[i])
      rv.push(JSON.parse(lines[i]));
  }

  return rv;
}

function canonicalize(obj) {
  return Object.entries(obj).sort();
}

function compare(expected, actual) {
  const rv = {
    'both': [],
    'missing': [],
    'extra': []
  };

  const both = {}
  for(var i = 0; i < expected.length; i++) {
    const needle = JSON.stringify(canonicalize(expected[i]));

    for (var j = 0; j < actual.length; j++) {
      const candidate = JSON.stringify(canonicalize(expected[j]));

      if(needle == candidate) {
        both[needle] = true;
        break;
      }
    }
  }

  for(var i = 0; i < expected.length; i++) {
    const candidate = expected[i];
    const needle = JSON.stringify(canonicalize(candidate));
    if(both[needle]) {
      //rv['both'].push(candidate);
    } else {
      rv['missing'].push(candidate);
    }
  }

  for(var i = 0; i < actual.length; i++) {
    const candidate = actual[i];
    const needle = JSON.stringify(canonicalize(candidate));
    if(!both[needle]) {
      rv['extra'].push(candidate);
    }
  }

  return rv;
}

function runTests(dir) {
  const results = {};

  fs.readdirSync(dir).forEach(oracle => {
    if(!oracle.endsWith('.jsonl'))
      return;

    const expected = parseOracle(dir + '/' + oracle);

    const file = oracle.replace(/\.jsonl$/, '');

    console.log(file);
    var bytes = fs.readFileSync(dir + '/' + file);
    if(file.endsWith('.lz4')) {
      bytes = LZ4.decode(bytes);
    }

    const dom = new JSDOM(bytes);

    parse.rewrite(dom.window.document.body);

    const actual = parse.extract(dom.window.document.body);
    results[file] = compare(expected, actual);
  })

  console.log(JSON.stringify(results, null, 2));
}

runTests(path.dirname(__filename) + '/../tests');
