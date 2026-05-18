const LABELARY_BASE = 'http://api.labelary.com/v1/printers';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/convert') {
      return new Response('Not found', { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const { zpl, dpmm = '8dpmm', width = 4, height = 6 } = body;
    if (!zpl) return new Response('Missing zpl field', { status: 400 });

    const labelaryUrl = `${LABELARY_BASE}/${dpmm}/labels/${width}x${height}/`;

    let labelaryRes;
    try {
      labelaryRes = await fetch(labelaryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/pdf',
        },
        body: zpl,
      });
    } catch (err) {
      return new Response(`Labelary request failed: ${err.message}`, { status: 502 });
    }

    if (!labelaryRes.ok) {
      const text = await labelaryRes.text();
      return new Response(`Labelary error ${labelaryRes.status}: ${text}`, {
        status: 502,
      });
    }

    const pdf = await labelaryRes.arrayBuffer();
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
