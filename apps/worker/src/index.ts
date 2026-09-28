const shutdownSignals = ['SIGINT', 'SIGTERM'] as const;

for (const signal of shutdownSignals) {
  process.on(signal, () => {
    console.info(`[worker] received ${signal}; shutting down`);
    process.exit(0);
  });
}

console.info('[worker] TRACK360 background worker is ready');
