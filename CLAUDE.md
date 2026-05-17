# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **ZPL → PDF converter** web application called "etiquetas-shopee". It allows users to upload `.rar` files containing Shopee shipping label files (`.zpl`), preview them as PDFs, and download the results.

The project has **not been built yet** — `claude.md` contains the full build specification. Implement it following the structure and conventions described below.

## Target Architecture

```
zpl-converter/
├── public/
│   └── index.html        ← entire frontend (single-file, no build step)
├── worker/
│   ├── index.js          ← Cloudflare Worker (CORS proxy to Labelary API)
│   └── wrangler.toml     ← Wrangler configuration
└── README.md
```

There is no build system, bundler, or package manager involved — the frontend is a single HTML file served statically.

## Key Components

### Frontend (`public/index.html`)
- Pure HTML/CSS/JS, no framework
- Extracts `.zpl` files from `.rar` archives **entirely in the browser** using `libarchive.js` (CDN)
- Renders PDF previews using `pdf.js` (CDN)
- Communicates with the Worker via `POST /convert` sending `{ zpl, dpmm, width, height }` as JSON, receiving a PDF blob

**CDN dependencies:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/libarchive.js/1.3.0/libarchive.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
```

**Global config variable** (must be updated after Worker deploy):
```javascript
const WORKER_URL = 'https://zpl-proxy.<YOUR_USERNAME>.workers.dev';
```

### Worker (`worker/index.js`)
- Cloudflare Worker acting as a CORS proxy
- Accepts `POST /convert` with JSON body `{ zpl, dpmm, width, height }`
- Forwards ZPL to the Labelary API (`http://api.labelary.com/v1/printers/{dpmm}/labels/{width}x{height}/`) requesting `Accept: application/pdf`
- Returns the PDF blob with CORS headers (`Access-Control-Allow-Origin: *`)
- Handles `OPTIONS` preflight requests

**Important:** Labelary API uses HTTP (not HTTPS). The Worker can call HTTP externally; the frontend must be on HTTPS (Cloudflare Pages handles this).

## Design System

- Dark theme: background `#0a0a0f`, accent green `#00e5a0`
- Fonts (Google Fonts): `Syne` for headings, `DM Mono` for code/labels
- Mobile-first responsive layout

## Labelary API Limits

| Limit | Value |
|---|---|
| Requests/second | 3 |
| Requests/day | 5,000 |
| Labels per request | 50 |
| Max body size | 1 MB |
| Max label dimension | 15 inches |

**Default label settings:** density `8dpmm`, width `4in`, height `6in`

## Deployment Workflow

1. **Deploy Worker first:**
   ```bash
   npm install -g wrangler
   wrangler login
   cd worker && wrangler deploy
   # Note the returned Worker URL
   ```

2. **Update `WORKER_URL`** in `public/index.html` with the real Worker URL.

3. **Push to GitHub**, then connect the repo to Cloudflare Pages:
   - Framework preset: None
   - Build command: *(empty)*
   - Build output directory: `public`

## Conversion Settings Exposed to User

- **Density (dpmm):** `6dpmm`, `8dpmm` (default), `12dpmm`, `24dpmm`
- **Width:** inches (default: `4`)
- **Height:** inches (default: `6`)
