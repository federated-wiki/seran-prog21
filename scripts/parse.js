// test simple parser for the html subset in use
// usage: deno --allow-read scripts/parse.js posts/1.html posts/229.html

import { readFileStr } from 'https://deno.land/std/fs/mod.ts';

const decoder = new TextDecoder('utf-8')
const tags = RegExp('(<[^>]*>)([^<]*)','g')

for (let file of Deno.args) {
  let html = decoder.decode(await Deno.readFile(file))
  let tokens = scan(html)
  let root = tokens.shift()
  let tree = parse(root,tokens)
  console.log(file, JSON.stringify(tree,null,2))
}

function scan(html) {
  let m, tokens = []
  while ((m = tags.exec(html)) !== null) {
    tokens.push(m[1])
    if (m[2].length) tokens.push(m[2])
  }
  return tokens
}

function parse(tag, tokens) {
  let node = ({tag, text:[]})
  while (tokens.length) {
    let t = tokens.shift()
    if (t.startsWith('</')) {
      node.end = t
      return node
    } else if (t.startsWith('<')) {
      node.text.push(parse(t,tokens))
    } else {
      node.text.push(t)
    } 
  }
  return node
}