const { stat } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import * as wiki from "seran/wiki.ts";

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
    'Create title only meta-pages for each post',
    'Look at structure of c1',
    'Find and render the plain text portions',
    'Find and render code snippets',
    'Methodically ask, what are we missing?'
  ].map((i) => wiki.paragraph(i)));

handler.items("File Size", () => files.map((f) => wiki.paragraph(`${f.name} - ${f.len}`)));

function fileContents() {
  return files.map(async (f) => await readFileStr("../seran-prog21/posts/" + f.name))
}

handler.items("IDs", () => {
  return Promise.all(fileContents().map(async (c) => {
    let matches = (await c).matchAll(/id="(.*?)"/g)
    return wiki.paragraph(Array.from(matches).map((m) => m[1]).join(", "))
  }))
});

handler.items("Titles", () => {
  return Promise.all(fileContents().map(async (c) => {
    let match = (await c).match(/h1>(.*?)</)
    return wiki.paragraph(match[1])
  }))
});

export async function init() {
  files = await readdir("../seran-prog21/posts")
}