# README-tech — Technical Architecture & Operations

Technical reference for the current **MicroStock Predictor** codebase and its deployment on this host. For the product/user-facing overview, see [README.md](README.md).

Last updated: **2026-11-17**

---

## 1. Current state

- Full application source is in this repository (React 19 + TypeScript 6 + Vite 8).
- The production SPA is served from **`/var/www/html/advisor`** under the **`/advisor/`** base path.
- A password-protected admin panel is available at **`/advisor/#admin`**, backed by a localhost-only Node API.
- The Light/Dark/System theme switch lives in the dashboard header and is available to **all users** (no admin credentials).
- The admin API is supervised by **systemd** (`msp-admin.service`), not PM2.
- The trending-ticker cache is regenerated every **2 hours** by cron and on demand from the admin panel.
- Long-running admin actions (build, deploy, cache refresh) are allowed up to **15 minutes** across Apache, Node, and child processes.

---

## 2. Repository layout

| Path | Purpose |
|---|---|
| `src/App.tsx` | Root app; route/hash handling for `#admin` |
| `src/components/AdminPage.tsx` | Password-protected admin UI (status, cache, deploy, build) |
| `src/components/Header.tsx` | User-facing header with Light/Dark/System theme switch for everyone |
| `src/components/*.tsx` | Dashboard UI: table, charts, news feed, order simulator, watchlist, etc. |
| `src/hooks/useMarketData.ts` | Market/news data loading and refresh loop |
| `src/hooks/useTheme.ts` | Shared light/dark/system theme controller (`msp_theme`) |
| `src/services/marketDataService.ts` | Finnhub calls, cache loading, custom watchlist persistence |
| `src/utils/predictorEngine.ts` | Sentiment/scoring and EOD target heuristics |
| `scripts/admin-server.cjs` | Admin HTTP API (auth, status, build, deploy, cache, asset cleanup) |
| `scripts/generate_trending_cache.cjs` | Finnhub news scanner that writes `trending-cache.json` |
| `scripts/msp-admin.service` | Example systemd unit for the admin API |
| `public/trending-cache.json` | Source-of-truth cache copied into `dist/` at build time |
| `index.html` | Vite entry HTML; includes pre-paint theme script and admin base config |
| `vite.config.ts` | `/advisor/` base path and dev proxy to the admin API |
| `package.json` | Scripts: `dev`, `build`, `cache:refresh`, `admin`, `lint`, `preview` |
| `dist/` | Generated production bundle (**gitignored**; created by `npm run build`) |
| `README.md` / `README-tech.md` | User docs / this technical reference |

Secrets live only in `.env`, which is gitignored.

---

## 3. Deployment topology

### 3.1 Static frontend

- **Document root:** `/var/www/html/advisor`
- **Public URL:** `https://misc.kesavan.info/advisor/`
- **Assets:** hashed bundles under `/advisor/assets/`
- Apache headers in `/etc/httpd/conf.d/msp-admin.conf`:
  - `index.html` and `trending-cache.json`: `Cache-Control: no-store`
  - `/assets/*`: long-lived immutable caching (`max-age=31536000`)

### 3.2 Admin API proxy

`/etc/httpd/conf.d/msp-admin.conf`:

```apache
<Location "/advisor/api/admin">
    ProxyPass "http://127.0.0.1:8081" timeout=900
    ProxyPassReverse "http://127.0.0.1:8081"
</Location>
```

The API itself binds to `127.0.0.1:8081` only; Apache is the public entry point. `timeout=900` prevents the default Apache 60s proxy timeout from cutting off long admin actions.

### 3.3 Admin API service

- **Unit:** `/etc/systemd/system/msp-admin.service` (copied from `scripts/msp-admin.service`)
- **User:** `opc`
- **Working directory:** `/home/opc/micro-stock-advisor`
- **Exec:** `/usr/bin/node /home/opc/micro-stock-advisor/scripts/admin-server.cjs`
- **Restart:** `on-failure`, `RestartSec=3`
- **State on this host:** `enabled` and `active`

The unit deliberately does **not** use `EnvironmentFile=`. SELinux denies `init_t` reads of `user_home_t` files such as `.env`; `admin-server.cjs` loads `.env` itself as the service user instead.

### 3.4 Cache refresh cron

```cron
0 */2 * * * /usr/bin/node /home/opc/micro-stock-advisor/scripts/generate_trending_cache.cjs >> /home/opc/micro-stock-advisor/trending_cron.log 2>&1
```

The generator writes both `public/trending-cache.json` and the deployed copy in `/var/www/html/advisor/`.

### 3.5 HTTPS / TLS

Apache now terminates TLS directly on this host using `mod_ssl` and a Let’s Encrypt certificate for `misc.kesavan.info`:

- Cert/key: `/etc/letsencrypt/live/misc.kesavan.info/{fullchain.pem,privkey.pem}`
- Apache config: `/etc/httpd/conf.d/ssl.conf` (`<VirtualHost _default_:443>`, `ServerName misc.kesavan.info:443`)
- Both `http://` and `https://` serve `/advisor/`; there is no forced redirect.
- Renewal: root cron `0 3,15 * * * /usr/local/bin/certbot renew --quiet`. The `renew_hook = systemctl reload httpd` is stored in `/etc/letsencrypt/renewal/misc.kesavan.info.conf`.
- Certbot was installed via pip at `/usr/local/bin/certbot` because EPEL is not configured on this host; `cryptography` is pinned to `<50` for OCI SDK compatibility.
- Verified: `https://misc.kesavan.info/advisor/` → `200`, `/advisor/api/admin/status` → `401`, valid Let’s Encrypt cert through 2027-02-15.

---

## 4. Frontend stack

- React 19, TypeScript 6, Vite 8
- Tailwind CSS via CDN with class-based dark mode
- Recharts for charts, `lucide-react` icons, `canvas-confetti` for the order-simulator celebration
- Google Fonts: Inter, JetBrains Mono, Outfit
- Hashed, content-addressed production bundles

---

## 5. Data and state

### 5.1 Market data

The browser calls Finnhub directly using `VITE_FINNHUB_API_KEY` (or a user-entered key stored in `localStorage` under `finnhub_api_key`):

- `/stock/profile2?symbol=<TICKER>` — company/industry metadata
- `/news?category=general` — headlines for sentiment/catalyst scoring
- `/quote?symbol=<TICKER>` — price, open/high/low, percent change

### 5.2 Trending cache

`trending-cache.json` shape:

```json
{
  "updatedAt": "2026-11-17T11:35:50.601Z",
  "timestamp": 1794915350601,
  "ttlHours": 2,
  "trendingTickers": ["NXST", "MDIA", "FOX"],
  "suggestions": ["GD", "TDG", "SBGI"]
}
```

It is fetched client-side with a cache-busting query and falls back to a locally cached copy.

### 5.3 localStorage keys

| Key | Purpose |
|---|---|
| `finnhub_api_key` | Optional user-supplied Finnhub token |
| `micro_advisor_trending_cache` | Last fetched cache payload |
| `micro_advisor_custom_watchlist` | User-managed ticker list |
| `micro_advisor_watchlist` | Legacy key removed on reset |
| `msp_theme` | `light` / `dark` / `system` theme choice |
| `msp_admin_token`, `msp_admin_token_exp` | Admin bearer session (8h TTL) |

---

## 6. Admin panel usage

### 6.1 Access

1. Open `https://<host>/advisor/#admin` (or the ⚙ **Admin** link in the footer).
2. Enter the `ADMIN_PASSWORD` value from `/home/opc/micro-stock-advisor/.env`.
3. The token is kept in `localStorage` until logout or expiry (8 hours).

### 6.2 Capabilities

- **Refresh cache now** — reruns the Finnhub news scanner and updates deployed `trending-cache.json`.
- **Delete cache files** — removes `public/`, `dist/`, and deployed cache files.
- **Hard refresh / deploy dist** — recopies the current `dist/` bundle to Apache without rebuilding.
- **Build & deploy new version** — runs `npm run build`, deploys, and prunes stale hashed assets.
- **Remove stale assets** — deletes bundles no longer referenced by `index.html`.
- **Status & build log** — shows cache age, active bundle, deployed assets, build result/log.

> [!NOTE]
> Theme switching is a user-facing feature in the dashboard header (Light / Dark / System). It uses the same `msp_theme` key but requires no admin credentials.

### 6.3 API endpoints

All require `Authorization: Bearer <token>` except `/login`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/advisor/api/admin/login` | Exchange password for an 8h bearer token |
| `POST` | `/advisor/api/admin/logout` | Invalidate current token |
| `GET` | `/advisor/api/admin/status` | Cache, assets, active bundle, build state |
| `POST` | `/advisor/api/admin/refresh-cache` | Regenerate trending cache |
| `DELETE` | `/advisor/api/admin/cache` | Delete cache files |
| `DELETE` | `/advisor/api/admin/stale-assets` | Prune unreferenced assets |
| `POST` | `/advisor/api/admin/deploy` | Deploy current `dist/` |
| `POST` | `/advisor/api/admin/build` | Build then deploy |
| `GET` | `/advisor/api/admin/build-log` | Last build log |

Login attempts are rate-limited (8 per 5 minutes per client IP).

### 6.4 Timeout policy

A single 15-minute limit is applied at all layers:

- Apache `ProxyPass ... timeout=900`
- Node `server.requestTimeout` and `server.headersTimeout` (defaults are 5 min / 1 min)
- Child-process timeouts in `scripts/admin-server.cjs` (previously 2 min cache, 5 min build, 2 min default)

---

## 7. Build and deploy workflow

```bash
cd /home/opc/micro-stock-advisor
npm run build          # prebuild refreshes the cache, then tsc -b && vite build
sudo -n mkdir -p /var/www/html/advisor
sudo -n cp -r dist/. /var/www/html/advisor/
sudo -n chown -R opc:apache /var/www/html/advisor
```

The admin **Build & deploy** button performs the same steps through `deployDist()` in `scripts/admin-server.cjs`, including ownership fixup and stale-asset pruning. `dist/` is gitignored; only source changes are committed.

---

## 8. Operations runbook

```bash
# Service
sudo systemctl status msp-admin
sudo systemctl restart msp-admin
systemctl is-enabled msp-admin

# Logs
sudo journalctl -u msp-admin -n 50 --no-pager

# Apache config
sudo httpd -t
sudo systemctl reload httpd

# Health check (401 means the API is up and auth is enforced)
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1/advisor/api/admin/status
curl -sS -o /dev/null -w '%{http_code}\n' https://misc.kesavan.info/advisor/api/admin/status

# TLS / certificates
sudo /usr/local/bin/certbot certificates
sudo /usr/local/bin/certbot renew --dry-run
sudo crontab -l

# Cache cron
crontab -l
tail -f trending_cron.log
```

Deploy actions require passwordless sudo (`sudo -n`) for the service user, or set `ADMIN_USE_SUDO=0` and make the web root directly writable.

---

## 9. Security notes

- `.env` contains `VITE_FINNHUB_API_KEY` and `ADMIN_PASSWORD`; it is gitignored and must never be committed.
- The Finnhub token is used in-browser and is therefore publicly recoverable from client configuration; treat the free-tier key as non-secret.
- The admin API is bound to loopback and reached only through Apache; sessions use random bearer tokens with an 8h TTL and login rate limiting.
- Deploy/build commands use `sudo -n`; only grant the required NOPASSWD commands.
- SELinux note: do not add an `EnvironmentFile=` pointing into `/home/...` to the systemd unit; the server loads `.env` itself.

---

## 10. Recent changes (2026-11-16 → 2026-11-17)

| Commit | Change |
|---|---|
| `c288ab4` | Added password-protected admin panel (cache, deploy/build, status) |
| `2f3de86` | Fixed systemd startup by loading `.env` inside the server (SELinux-safe) |
| `18d8e85` | Raised admin operation timeout to 15 minutes across Apache, Node, and child processes |
| `c99f234` | Rewrote technical docs and recorded admin usage/operations |
| `500abfb` | Moved the theme switch from the admin panel into the dashboard header for all users |
| _this update_ | Enabled HTTPS on the origin with `mod_ssl` + Let’s Encrypt, auto-renewal, and docs |

PM2 previously supervised the admin API and produced repeated “port in use” restarts; that process was removed and its state saved empty.

---

## 11. Known gaps / follow-ups

- Move Finnhub calls behind a server-side proxy so the API key is not browser-exposed.
- Add automated tests, linting, and CI.
- Rotate `ADMIN_PASSWORD` periodically and after any suspected exposure.
- Consider a dedicated deploy user with narrowly scoped sudo rules instead of broad NOPASSWD access.
