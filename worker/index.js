export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/convert') {
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    try {
      const { zpl, dpmm = '8dpmm', width = 4, height = 6 } = await request.json();

      if (!zpl) {
        return new Response('ZPL não fornecido', { status: 400, headers: corsHeaders });
      }

      const labelaryUrl =
        `http://api.labelary.com/v1/printers/${dpmm}/labels/${width}x${height}/`;

      const labelaryRes = await fetch(labelaryUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/pdf',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: zpl,
      });

      if (!labelaryRes.ok) {
        const errText = await labelaryRes.text();
        return new Response(`Erro da Labelary API: ${errText}`, {
          status: labelaryRes.status,
          headers: corsHeaders,
        });
      }

      const pdfBuffer = await labelaryRes.arrayBuffer();
      return new Response(pdfBuffer, {
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
  },
};
