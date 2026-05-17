# ZPL → PDF Converter · Instruções para o Claude Code

## Visão Geral do Projeto

Construir e fazer deploy de um conversor de arquivos ZPL para PDF usando:

- **Frontend**: HTML + CSS + JavaScript puro (sem framework)
- **Proxy CORS**: Cloudflare Worker
- **Hospedagem**: Cloudflare Pages (conectado ao GitHub)
- **API de conversão**: Labelary API (gratuita, sem chave)

-----

## Estrutura de Arquivos a Criar

```
zpl-converter/
├── CLAUDE.md                  ← este arquivo
├── public/
│   ├── index.html             ← aplicação frontend completa
│   └── favicon.ico            ← (opcional)
├── worker/
│   ├── index.js               ← Cloudflare Worker (proxy CORS)
│   └── wrangler.toml          ← configuração do Worker
├── .github/
│   └── workflows/
│       └── deploy.yml         ← (opcional) CI/CD via GitHub Actions
└── README.md
```

-----

## Passo 1 — Criar o Frontend (`public/index.html`)

### Funcionalidades obrigatórias:

1. **Upload de arquivo `.rar`** contendo um ou mais arquivos `.zpl`
1. **Extração do RAR no browser** usando a lib `libarchive.js` (via CDN)
1. **Listagem dos arquivos `.zpl`** encontrados dentro do RAR
1. **Configurações de conversão** expostas ao usuário:
- Densidade de impressão: `6dpmm`, `8dpmm` (padrão), `12dpmm`, `24dpmm`
- Largura da etiqueta em polegadas (padrão: `4`)
- Altura da etiqueta em polegadas (padrão: `6`)
1. **Botão “Pré-visualizar”** — envia o ZPL ao Worker e exibe o PDF retornado usando `PDF.js` (via CDN)
1. **Botão “Converter e Baixar”** — gera o PDF e abre/baixa automaticamente
1. **Indicador de progresso** durante a chamada à API
1. **Tratamento de erros** com mensagens claras ao usuário

### CDNs a usar:

```html
<!-- Extração de RAR/ZIP no browser -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/libarchive.js/1.3.0/libarchive.js"></script>

<!-- Renderização de PDF para preview -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';</script>
```

### Chamada ao Worker (substituir URL após deploy):

```javascript
// Variável global — atualizar com a URL do Worker após deploy
const WORKER_URL = 'https://zpl-proxy.SEU_USUARIO.workers.dev';

async function convertZpl(zplContent, dpmm, width, height) {
  const response = await fetch(`${WORKER_URL}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ zpl: zplContent, dpmm, width, height })
  });
  if (!response.ok) throw new Error(`Erro ${response.status}: ${await response.text()}`);
  return await response.blob(); // blob PDF
}
```

### Design:

- Tema escuro, moderno e profissional
- Paleta: fundo `#0a0a0f`, acento verde `#00e5a0`
- Fontes Google: `Syne` (títulos) + `DM Mono` (código/labels)
- Layout responsivo (mobile-first)
- Animações suaves de entrada e feedback visual nos estados de loading

-----

## Passo 2 — Criar o Worker (`worker/index.js`)

O Worker recebe o ZPL do frontend, repassa para a Labelary API e retorna o PDF, adicionando os headers CORS necessários.

```javascript
export default {
  async fetch(request, env) {
    // Headers CORS para permitir requisições do frontend
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Responder preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Aceitar apenas POST em /convert
    if (request.method !== 'POST') {
      return new Response('Método não permitido', { status: 405, headers: corsHeaders });
    }

    try {
      const { zpl, dpmm = '8dpmm', width = 4, height = 6 } = await request.json();

      if (!zpl) {
        return new Response('ZPL não fornecido', { status: 400, headers: corsHeaders });
      }

      // Chamar a Labelary API
      const labelaryUrl = `http://api.labelary.com/v1/printers/${dpmm}/labels/${width}x${height}/`;
      const labelaryResponse = await fetch(labelaryUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/pdf',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: zpl,
      });

      if (!labelaryResponse.ok) {
        const errorText = await labelaryResponse.text();
        return new Response(`Erro da Labelary API: ${errorText}`, {
          status: labelaryResponse.status,
          headers: corsHeaders,
        });
      }

      // Retornar o PDF com headers CORS
      const pdfBlob = await labelaryResponse.arrayBuffer();
      return new Response(pdfBlob, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="etiqueta.pdf"',
        },
      });

    } catch (err) {
      return new Response(`Erro interno: ${err.message}`, {
        status: 500,
        headers: corsHeaders,
      });
    }
  }
};
```

-----

## Passo 3 — Criar `worker/wrangler.toml`

```toml
name = "zpl-proxy"
main = "index.js"
compatibility_date = "2024-01-01"

[build]
command = ""
```

-----

## Passo 4 — Criar `README.md`

Documentar:

- O que é o projeto
- Como rodar localmente
- Como fazer o deploy (passos abaixo)

-----

## Passo 5 — Sequência de Deploy (executar em ordem)

### 5.1 Instalar o Wrangler CLI

```bash
npm install -g wrangler
```

### 5.2 Login na Cloudflare

```bash
wrangler login
# Isso abrirá o browser — autorize com sua conta Cloudflare
```

### 5.3 Deploy do Worker

```bash
cd worker
wrangler deploy
# Anote a URL retornada, ex: https://zpl-proxy.SEU_USUARIO.workers.dev
```

### 5.4 Atualizar a URL do Worker no frontend

No arquivo `public/index.html`, substituir:

```javascript
const WORKER_URL = 'https://zpl-proxy.SEU_USUARIO.workers.dev';
```

Pela URL real retornada no passo anterior.

### 5.5 Commit e push para o GitHub

```bash
cd ..
git init
git add .
git commit -m "feat: ZPL to PDF converter"
git remote add origin https://github.com/SEU_USUARIO/zpl-converter.git
git push -u origin main
```

### 5.6 Configurar Cloudflare Pages

1. Acessar: https://dash.cloudflare.com → **Pages** → **Create a project**
1. Conectar ao repositório GitHub `zpl-converter`
1. Configurações de build:
- **Framework preset**: None
- **Build command**: *(deixar vazio)*
- **Build output directory**: `public`
1. Clicar em **Save and Deploy**

-----

## Limites da Labelary API (plano gratuito)

|Limite                     |Valor       |
|---------------------------|------------|
|Requisições/segundo        |3           |
|Requisições/dia            |5.000       |
|Etiquetas por requisição   |50          |
|Tamanho máximo do body     |1 MB        |
|Dimensão máxima da etiqueta|15 polegadas|

-----

## Observações Importantes

- A Labelary API usa **HTTP** (não HTTPS). O Worker da Cloudflare consegue chamar HTTP externo sem problemas.
- O frontend deve rodar em **HTTPS** (Cloudflare Pages garante isso automaticamente).
- O arquivo RAR é extraído **100% no browser** — nenhum arquivo é enviado a servidores além do conteúdo ZPL puro.
- Para múltiplos arquivos ZPL dentro do RAR, processar um de cada vez e concatenar ou gerar PDFs separados.

-----

## Critérios de Sucesso

- [ ] Upload de `.rar` funciona e lista os `.zpl` encontrados
- [ ] Pré-visualização do PDF renderiza corretamente no browser
- [ ] Botão “Converter” gera e abre o PDF automaticamente
- [ ] Worker responde sem erros de CORS
- [ ] Deploy no Cloudflare Pages funciona a partir do repositório GitHub
- [ ] Funciona em mobile (layout responsivo)