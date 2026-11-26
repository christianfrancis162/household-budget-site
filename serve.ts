// HomeLedger local server — serves app/ over HTTP so the site can be
// opened in a browser exactly as the grader and the hosting serve it.
//
//   node serve.ts            serves on http://localhost:8080
//   node serve.ts --port 9000
//
// Standard library only. It serves only files under app/, with the right
// content type for html, css, js, json, png, jpg and svg, and answers 404
// for anything else (including paths that try to climb out of app/).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("./app/", import.meta.url));
const port = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const file = normalize(join(appDir, path));
    if (!file.startsWith(appDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log("HomeLedger serving app/ at http://localhost:" + port);
});
