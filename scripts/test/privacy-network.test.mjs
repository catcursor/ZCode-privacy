import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { after, test } from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const execute = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const runtime = await mkdtemp(join(tmpdir(), "zcode-vendor-network-"));
after(() => rm(runtime, { recursive: true, force: true }));
await writeFile(join(runtime, "package.json"), '{"type":"module"}');
for (const name of ["privacyNetwork.js", "privacyFetch.ts", "node/privacyNetwork.ts", "node/privacyNetworkBootstrap.ts"]) {
  const content = await readFile(new URL(`../../packages/shared/src/${name}`, import.meta.url), "utf8");
  const destination = join(runtime, name.replace(/\.ts$/u, ".js"));
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, name.endsWith(".ts") ? stripTypeScriptTypes(content) : content);
}

test("Node HTTP, fetch, DNS, redirects and WebSocket only reach loopback for vendor names", async () => {
  const script = `
    import assert from 'node:assert/strict';
    import http from 'node:http';
    import dns from 'node:dns/promises';
    import callbackDns from 'node:dns';
    import { promisify } from 'node:util';
    import { once } from 'node:events';
    import ${JSON.stringify(pathToFileURL(join(runtime, "node/privacyNetworkBootstrap.js")).href)};
    const seen = [];
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const part of req) chunks.push(part);
      seen.push({ path:req.url, method:req.method, host:req.headers.host, body:Buffer.concat(chunks).toString() });
      if (req.url === '/redirect') {
        res.writeHead(307,{ location:'http://future.cdn.z.ai:'+server.address().port+'/redirected' });
        res.end();
      } else { res.end('local'); }
    });
    server.on('upgrade',(req,socket)=>{ seen.push({path:req.url,host:req.headers.host}); socket.destroy(); });
    server.on('connect',(req,socket)=>{ seen.push({path:req.url,host:req.headers.host}); socket.end('HTTP/1.1 200 Connection Established\\r\\n\\r\\n'); });
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    const port = server.address().port;
    try {
      assert.equal((await dns.lookup('API.Z.AI.')).address,'127.0.0.1');
      assert.deepEqual(await promisify(callbackDns.lookup)('api.z.ai'),{address:'127.0.0.1',family:4});
      assert.deepEqual(await promisify(callbackDns.lookup)('localhost'),await dns.lookup('localhost'));
      let proxyConnections = 0;
      const proxyAgent = new http.Agent();
      proxyAgent.createConnection = () => { proxyConnections++; throw new Error('must bypass configured proxy'); };
      await new Promise((resolve,reject)=>http.get('http://zcode.z.ai:'+port+'/http',{agent:proxyAgent},res=>{res.resume();res.on('end',resolve)}).on('error',reject));
      assert.equal(proxyConnections,0);
      const response = await fetch('http://api.z.ai:'+port+'/redirect',{method:'POST',body:'synthetic-audit-body'});
      assert.equal(await response.text(),'local');
      assert.equal(response.redirected,true);
      const ws = new WebSocket('ws://zcode.z.ai:'+port+'/ws');
      await new Promise(resolve=>ws.addEventListener('error',resolve,{once:true}));
      await new Promise((resolve,reject)=>http.request({hostname:'127.0.0.1',port,method:'CONNECT',path:'api.z.ai:443'})
        .on('connect',(_response,socket)=>{socket.destroy();resolve()}).on('error',reject).end());
      assert.deepEqual(seen.map(x=>x.path),['/http','/redirect','/redirected','/ws','127.0.0.1:443']);
      assert.ok(seen.every(x=>x.host==='127.0.0.1:'+port));
      assert.deepEqual(seen.filter(x=>x.method==='POST').map(x=>x.body),['synthetic-audit-body','synthetic-audit-body']);
    } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
  `;
  await execute(process.execPath, ["--input-type=module", "-e", script], { cwd: root, timeout: 20_000 });
});

test("all shipped default provider API hosts avoid vendor domains", async () => {
  const { isZhipuHostname } = await import("../../packages/shared/src/privacyNetwork.js");
  const config = JSON.parse(await readFile(new URL("../../config/provider/zcode-builtin.json", import.meta.url), "utf8"));
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      if (["baseUrl", "apiKeyManagementUrl"].includes(key) && typeof entry === "string") {
        assert.equal(isZhipuHostname(new URL(entry).hostname), false, entry);
      } else walk(entry);
    }
  };
  walk(config);
});

test("shipped source, configuration and skill URL literals cannot reintroduce a vendor destination", async () => {
  const { isZhipuHostname } = await import("../../packages/shared/src/privacyNetwork.js");
  const { stdout } = await execute("git", ["grep", "-Ilz", "-E", "(https?|wss?|smb)://", "--",
    "packages", "apps/zcode-cli/packages", "config", "scripts", ".env.production", ".env.development", ".env.example"], { cwd: root });
  for (const path of stdout.split("\0").filter(Boolean)) {
    if (path.split("/").some((part) => ["test", "tests", "__tests__", "e2e", "fixtures", "docs"].includes(part)) ||
      /(?:\.test\.|wdio\.|LICENSE|NOTICE|CHANGELOG)/u.test(path)) continue;
    const source = await readFile(join(root, path), "utf8");
    for (const match of source.matchAll(/(?:https?|wss?|smb):\/\/([a-z0-9.-]+)/giu)) {
      assert.equal(isZhipuHostname(match[1]), false, `${path}: ${match[0]}`);
    }
  }
});
