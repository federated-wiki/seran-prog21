const { stat } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import * as wiki from "seran/wiki.ts";

const decoder = new TextDecoder('utf-8')
const tags = RegExp('(<[^>]*>)([^<]*)','g')

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
      node["end"] = t
      return node
    } else if (t.startsWith('<')) {
      node.text.push(parse(t,tokens))
    } else {
      node.text.push(t)
    }
  }
  return node
}

function findall(pat, tree, more) {
  if (pat.exec(tree.tag)) {
    more(tree)
  } else {
    (tree.text||[]).find(each => findall(pat, each, more))
  }
}

function flatten(node) {
  if (typeof node === 'string') return node
  return (node.text||[]).map(n => flatten(n)).join('')
}

export let handler = new wiki.Handler();
let files = []

async function readdir(path) {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readdir(path);
}

handler.page(wiki.welcomePage("[[DenoWiki]]", "[[Analysis]]"))

handler.items("Analysis", () => [
    `Files: ${files.length}`,
    '[[File Size]]',
    '[[IDs]]',
    '[[Titles]]',
    '[[First Title]]',
    '[[C1]]',
    'Find and render the plain text portions',
    'Find and render code snippets',
    'Methodically ask, what are we missing?'
  ].map((i) => wiki.paragraph(i)));

handler.items("File Size", () => files.map((f) => wiki.paragraph(`${f.name} - ${f.len}`)));

function fileContents() {
  return files.map(async (f) => {
    return {
      name: f.name, contents: await readFileStr("../seran-prog21/posts/" + f.name)
    }
  })
}

handler.items("IDs", () => {
  return Promise.all(fileContents().map(async (e) => {
    let c = (await e).contents
    let matches = (await c).matchAll(/id="(.*?)"/g)
    return wiki.paragraph(Array.from(matches).map((m) => m[1]).join(", "))
  }))
});

handler.items("Titles", () => {
  return Promise.all(fileContents().map(async (e) => {
    let c = (await e).contents
    let match = (await c).match(/h1>(.*?)</)
    return wiki.paragraph(match[1])
  }))
});

handler.items("First Title", async () => {
  let entry = await fileContents()[0]
  // let html = decoder.decode(contents)
  let items = [entry.name]
  let tokens = scan(entry.contents)
  let root = tokens.shift()
  let tree = parse(root,tokens)
  findall(/<title>/, tree, (title) => items.push(flatten(title)))
  return items.map((i) => wiki.paragraph(i))
});

handler.items("C1", async () => {
  let entry = await fileContents()[1]
  // let html = decoder.decode(contents)
  let items = []
  let tokens = scan(entry.contents)
  let root = tokens.shift()
  let tree = parse(root,tokens)
  let title = ""
  findall(/<title>/, tree, (t) => title = flatten(t))
  items.push(wiki.paragraph(entry.name + " [[" + title + "]]"))
  findall(/<div id="c1">/, tree, c1 => {
    findall(/<pre>|<p>/, c1, (node) => {
      if (node.tag == "<p>") {
        items.push(wiki.paragraph(flatten(node)))
      }
      if (node.tag == "<pre>") {
        items.push(wiki.item("code", {text:flatten(node)}))
      }
    })
  })
  return items
});

export async function init() {
  files = await readdir("../seran-prog21/posts")
}