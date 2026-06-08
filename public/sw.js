self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Quiniela Mundial 2026", {
      body: data.body ?? "Hay un nuevo resultado cargado.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: data.tag ?? "quiniela-result",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/ranking"));
});
