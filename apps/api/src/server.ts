import { buildApp } from './app.js';

const app = buildApp();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
