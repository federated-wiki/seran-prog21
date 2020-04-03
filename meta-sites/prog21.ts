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

handler.page(wiki.welcomePage("[[DenoWiki]]", "[[Pages]]"))

function fileContents() {
  return files.map(async (f) => {
    return {
      name: f.name, contents: await readFileStr("../seran-prog21/posts/" + f.name)
    }
  })
}


function parsePost(contents) {
  let tokens = scan(contents)
  let root = tokens.shift()
  let tree = parse(root,tokens)
  return tree
}

interface Post {
  filename: string;
  id: number;
  slug: string;
  title: string;
  page: wiki.Page;
}

let posts: { [slug: string]: Post } = {}

function extractPost(filename, tree): Post {
  let title = ""
  findall(/<title>/, tree, (t) => title = flatten(t))
  let slug = wiki.asSlug(title)
  let id = filename.split(".")[0]
  let items = []
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
  return {
    filename,
    id,
    slug,
    title,
    page: wiki.page(title, items)
  }
}

// handler.route("/.*\.json", (req) => {
//   if (posts[match]) {
//     // parse here to get page
//     wiki.serveJson(req, page)
//   }
// })

function synopsis(page) {
  let text = page.story[0].text
  let max = 265
  if (text.length > max) {
    text = text.substring(0, max) + "..."
  }
  return text
}

export async function init() {
  files = await readdir("../seran-prog21/posts")
  let all_entries = fileContents()
  for (let entry of all_entries) {
    let name = (await entry).name
    let contents = (await entry).contents
    let tree = parsePost(contents)
    let post = extractPost(name, tree)
    posts[post.slug] = post
    handler.page(post.page)
  }

  handler.page(
    wiki.page("Pages",
              Object.keys(posts)
                .sort((a, b) => posts[a].id - posts[b].id)
                .map((p) => wiki.paragraph(`${posts[p].id}: [[${posts[p].title}]] - ${synopsis(posts[p].page)}`))
    )
  )
}