const { stat } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import * as wiki from "seran/wiki.ts";

export let metaPages = {};

function route(url, fn) {
  metaPages[url] = fn;
}

async function readdir(path) {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readdir(path);
}

route("/welcome-visitors.json", async (req, _system) => {
  wiki.serveJson(req, wiki.welcomePage("[[DenoWiki]]", "[[Analysis]]"));
});

route("/analysis.json", async (req, _system) => {
  let items = [
    `Files: ${files.length}`,
    '[[File Size]]',
    '[[IDs]]',
    '[[Titles]]',
    'Create title only meta-pages for each post',
    'Look at structure of c1',
    'Find and render the plain text portions',
    'Find and render code snippets',
    'Methodically ask, what are we missing?'
  ]
  wiki.serveJson(req, wiki.page("Analysis", items.map((i) => wiki.paragraph(i))));
});

route("/file-size.json", async (req, _system) => {
  let items = []
  for (let file of files) {
    items.push(wiki.paragraph(`${file.name} - ${file.len}`))
  }
  wiki.serveJson(req, wiki.page("File Size", items));
});

route("/ids.json", async (req, _system) => {
  let items = []
  for (let file of files) {
    let contents = await readFileStr("../seran-prog21/posts/" + file.name)
    let matches = contents.matchAll(/id="(.*?)"/g)
    let ids = []
    for (let match of matches) {
      ids.push(match[1])
    }
    items.push(wiki.paragraph(ids.join(", ")))
  }
  wiki.serveJson(req, wiki.page("IDs", items));
});

route("/titles.json", async (req, _system) => {
  let items = []
  for (let file of files) {
    let contents = await readFileStr("../seran-prog21/posts/" + file.name)
    let match = contents.match(/h1>(.*?)</)
    items.push(wiki.paragraph(match[1]))
  }
  wiki.serveJson(req, wiki.page("IDs", items));
});

let files = []
export async function init() {
  files = await readdir("../seran-prog21/posts")
  let items = []
  for (let file of files) {
    let contents = await readFileStr("../seran-prog21/posts/" + file.name)
    let match = contents.match(/h1>(.*?)</)
    items.push(wiki.paragraph(match[1]))
  }
}