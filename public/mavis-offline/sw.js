"use strict";

const CACHE_NAME = "mavis-offline-v1.1.0-20261109";
const OFFLINE_INDEX = "/mavis-offline/index.html";
const ASSETS = [
  OFFLINE_INDEX,
  "/mavis-offline/app.js",
  "/mavis-offline/search.mjs",
  "/mavis-offline/answer.mjs",
  "/mavis-offline/knowledge.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("mavis-offline-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const scopePath = new URL("./", self.location.href).pathname;

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(scopePath)
  ) return;

  if (request.mode === "navigate") {
    const networkResponse = fetch(request);
    event.waitUntil(
      networkResponse
        .then((response) => {
          if (!response.ok) return;
          return caches.open(CACHE_NAME)
            .then((cache) => cache.put(OFFLINE_INDEX, response.clone()));
        })
        .catch(() => undefined)
    );
    event.respondWith(
      networkResponse.catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_INDEX)) || Response.error();
      })
    );
    return;
  }

  const responsePromise = caches.open(CACHE_NAME)
    .then((cache) => cache.match(request))
    .then((cached) => cached || fetch(request));

  event.waitUntil(
    responsePromise
      .then((response) => {
        if (!response.ok) return;
        return caches.open(CACHE_NAME)
          .then((cache) => cache.put(request, response.clone()));
      })
      .catch(() => undefined)
  );
  event.respondWith(responsePromise);
});
