import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { createAuthProxy } from "./auth-proxy.js";

async function listen(server, port = 0) {
  await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
  return server.address().port;
}
function cleanup(t, server) {
  t.after(() => new Promise(resolve => {
    server.closeAllConnections();
    server.close(resolve);
  }));
}
async function gateway(t, target, options = {}) {
  const app = express();
  app.use("/api/auth", createAuthProxy({ target, retryDelay: 30, ...options }));
  const server = http.createServer(app);
  const port = await listen(server);
  cleanup(t, server);
  return `http://127.0.0.1:${port}/api/auth`;
}
async function unusedPort() {
  const server = http.createServer();
  const port = await listen(server);
  await new Promise(resolve => server.close(resolve));
  return port;
}

test("Google callback preserves query, redirect and refresh cookie", async t => {
  const upstream = http.createServer((req, res) => {
    assert.equal(req.url, "/google/callback?code=test-code&scope=email");
    assert.equal(req.headers.cookie, "previous=value");
    res.writeHead(302, { Location: "http://localhost:5173/auth/success", "Set-Cookie": "refreshToken=test; HttpOnly; Path=/" });
    res.end();
  });
  const port = await listen(upstream);
  cleanup(t, upstream);
  const base = await gateway(t, `http://127.0.0.1:${port}`);
  const result = await fetch(`${base}/google/callback?code=test-code&scope=email`, { redirect: "manual", headers: { Cookie: "previous=value" } });
  assert.equal(result.status, 302);
  assert.match(result.headers.get("set-cookie"), /refreshToken=test/);
  assert.equal(result.headers.get("location"), "http://localhost:5173/auth/success");
});

test("callback recovers if auth starts after connection refusal", async t => {
  const port = await unusedPort();
  let callbacks = 0;
  const upstream = http.createServer((req, res) => {
    callbacks++;
    assert.equal(req.url, "/google/callback?code=test-code");
    res.writeHead(302, { Location: "http://localhost:5173/auth/success" });
    res.end();
  });
  const base = await gateway(t, `http://127.0.0.1:${port}`);
  const pending = fetch(`${base}/google/callback?code=test-code`, { redirect: "manual" });
  await new Promise(resolve => setTimeout(resolve, 50));
  await listen(upstream, port);
  cleanup(t, upstream);
  const result = await pending;
  assert.equal(result.headers.get("location"), "http://localhost:5173/auth/success");
  assert.equal(callbacks, 1);
});

test("unavailable auth returns login page instead of raw proxy error", async t => {
  const base = await gateway(t, `http://127.0.0.1:${await unusedPort()}`);
  const result = await fetch(`${base}/google/callback?code=test-code`, { redirect: "manual" });
  assert.equal(result.status, 302);
  const redirect = new URL(result.headers.get("location"));
  assert.equal(redirect.pathname, "/tai-khoan/dang-nhap");
  assert.ok(redirect.searchParams.get("error"));
  assert.ok(!redirect.href.includes("test-code"));
  const api = await fetch(`${base}/profile`);
  assert.equal(api.status, 502);
  assert.equal((await api.json()).success, false);
});

test("timeout never replays a potentially consumed Google code", async t => {
  let callbacks = 0;
  const upstream = http.createServer(() => { callbacks++; });
  const port = await listen(upstream);
  cleanup(t, upstream);
  const base = await gateway(t, `http://127.0.0.1:${port}`, { proxyTimeout: 50 });
  const result = await fetch(`${base}/google/callback?code=test-code`, { redirect: "manual" });
  assert.equal(result.status, 302);
  assert.equal(callbacks, 1);
});
