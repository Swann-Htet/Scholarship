// Local / single-server entry point. On Vercel the app is served through api/index.js instead.
import 'dotenv/config';
import dns from 'node:dns';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import app from './app.js';

// Some home/school networks cannot resolve the SRV records used by mongodb+srv:// (error: querySrv ECONNREFUSED).
// For local runs use public DNS. Set DNS_SERVERS= (empty) in .env to turn this off.
const servers = (process.env.DNS_SERVERS ?? '8.8.8.8,1.1.1.1').split(',').map(x => x.trim()).filter(Boolean);
if (servers.length) dns.setServers(servers);

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  // production build served by the same Node process (e.g. on Render / a VPS)
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
