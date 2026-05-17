# etiquetas-shopee · ZPL → PDF Converter

Converte arquivos `.zpl` de etiquetas Shopee para PDF diretamente no navegador.

## Como funciona

1. O usuário faz upload de um `.rar` contendo arquivos `.zpl`
2. O browser extrai os arquivos com `libarchive.js` (sem servidor)
3. O ZPL é enviado ao Cloudflare Worker, que repassa à [Labelary API](http://labelary.com/)
4. O PDF retornado é exibido via `pdf.js` e pode ser baixado

## Estrutura

```
public/index.html   ← frontend completo (HTML/CSS/JS puro)
worker/index.js     ← Cloudflare Worker (proxy CORS para Labelary)
worker/wrangler.toml
```

## Deploy

### 1. Worker (Cloudflare)

```bash
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
# Anote a URL retornada: https://zpl-proxy.<usuario>.workers.dev
```

### 2. Atualizar URL no frontend

Em `public/index.html`, substitua `WORKER_URL` pela URL real do Worker.

### 3. Cloudflare Pages

Conecte este repositório no Cloudflare Pages com:
- **Framework preset**: None
- **Build command**: *(vazio)*
- **Build output directory**: `public`

## Rodar localmente

```bash
# Frontend — qualquer servidor estático:
npx serve public

# Worker — emulação local:
cd worker && wrangler dev
```
