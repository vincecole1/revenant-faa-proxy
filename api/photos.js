// Revenant Collective — Planespotters Photo Proxy
// Fetches aircraft photos server-side and returns with CORS headers open.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // cache 24hrs

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { reg } = req.query;
  if (!reg) return res.status(400).json({ error: 'Missing reg parameter' });

  const tailNum = reg.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!tailNum || tailNum.length < 2) {
    return res.status(400).json({ error: 'Invalid registration' });
  }

  try {
    const url = `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(tailNum)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RevenantCollective/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Planespotters unavailable', photos: [] });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', photos: [] });
  }
}
