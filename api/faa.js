// Revenant Collective — FAA Registry Proxy
// Deploy to Vercel (free). Fetches FAA registry HTML server-side,
// parses the data, and returns clean JSON with CORS headers open.

export default async function handler(req, res) {
  // Allow requests from any origin (your Squarespace site)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // cache 1hr

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { n } = req.query;
  if (!n) return res.status(400).json({ error: 'Missing n parameter' });

  // Strip leading N, uppercase, alphanumeric only
  const tailNum = n.toUpperCase().replace(/^N/, '').replace(/[^A-Z0-9]/g, '');
  if (!tailNum || tailNum.length < 2 || tailNum.length > 6) {
    return res.status(400).json({ error: 'Invalid N-number format' });
  }

  try {
    const faaUrl = `https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?NNumberTxt=${tailNum}`;
    const response = await fetch(faaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RevenantCollective/1.0)',
        'Accept': 'text/html'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'FAA registry unavailable', status: response.status });
    }

    const html = await response.text();

    // Check if not found
    if (html.includes('is not assigned') || html.includes('No aircraft found') || !html.includes('Aircraft Description')) {
      return res.status(404).json({ error: 'not_found', tailNumber: 'N' + tailNum });
    }

    // Parse the FAA HTML tables into clean key/value pairs
    const data = parseFaaHtml(html, tailNum);
    return res.status(200).json(data);

  } catch (err) {
    console.error('FAA proxy error:', err);
    return res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}

function parseFaaHtml(html, tailNum) {
  // Simple regex-based parser — no DOM available in Node edge runtime
  // FAA tables are consistently structured: <td>LABEL</td><td>VALUE</td>

  const result = { tailNumber: 'N' + tailNum, raw: {} };

  // Extract all td pairs
  const tdPattern = /<td[^>]*>\s*(.*?)\s*<\/td>\s*<td[^>]*>\s*(.*?)\s*<\/td>/gis;
  let match;
  while ((match = tdPattern.exec(html)) !== null) {
    const label = match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').trim();
    const value = match[2].replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
    if (label && value && value.toLowerCase() !== 'none' && label.length < 60) {
      result.raw[label] = value;
    }
  }

  const r = result.raw;

  // Map to clean fields
  result.manufacturer     = titleCase(r['Manufacturer Name']       || '');
  result.model            =           r['Model']                    || '';
  result.serialNumber     =           r['Serial Number']            || '';
  result.status           =           r['Status']                   || '';
  result.yearManufactured =           r['MFR Year']                 || '';
  result.typeAircraft     = titleCase(r['Type Aircraft']            || '');
  result.typeEngine       = titleCase(r['Type Engine']              || '');
  result.certIssueDate    =           r['Certificate Issue Date']   || '';
  result.expDate          =           r['Expiration Date']          || '';
  result.modeSHex         =          (r['Mode S Code (Base 16 / Hex)'] || r['Mode S Code (base 16 / Hex)'] || '').toUpperCase();
  result.typeRegistration = titleCase(r['Type Registration']        || '');
  result.ownerName        = titleCase(r['Name']                     || '');
  result.ownerCity        = titleCase(r['City']                     || '');
  result.ownerState       = titleCase(r['State']                    || '');
  result.ownerCountry     = titleCase(r['Country']                  || 'United States');
  result.engineManufacturer = titleCase(r['Engine Manufacturer']    || '');
  result.engineModel      =           r['Engine Model']             || '';

  return result;
}

function titleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
