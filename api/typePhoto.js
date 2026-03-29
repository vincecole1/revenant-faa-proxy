// Revenant Collective — Aircraft Type Photo Proxy
// Searches Planespotters by ICAO type code to find a representative photo
// for a given aircraft model (used in compare tab)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=604800'); // cache 7 days

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { model } = req.query;
  if (!model) return res.status(400).json({ error: 'Missing model parameter' });

  // Map of model name → known well-photographed registration
  // Curated list of aircraft that have good photos on Planespotters
  const regMap = {
    // Executive Airliners
    'Boeing Business Jet (BBJ / 737-700)': 'VP-BLO',
    'Boeing Business Jet 2 (BBJ2 / 737-800)': 'VP-BLK',
    'Boeing Business Jet 3 (BBJ3 / 737-900ER)': 'VP-CAL',
    'Boeing Business Jet MAX 7': 'N737MX',
    'Boeing Business Jet MAX 8': 'N8BJ',
    'Boeing Business Jet MAX 9': 'N9BJ',
    'ACJ318': 'M-YULI',
    'ACJ319': 'OE-ILT',
    'ACJ319neo': 'CS-LTA',
    'ACJ320': 'VP-CAC',
    'ACJ320neo': 'OE-IPB',
    'ACJ321neo': 'CS-TFZ',
    'ACJ330': 'HZ-A1',
    'ACJ350': 'A7-HHH',
    'ACJ Two Twenty': 'CS-CHB',
    'Lineage 1000': 'PP-VTO',
    'Lineage 1000E': 'A6-RJX',
    // ULR
    'Global Express': 'C-GXPR',
    'Global Express XRS': 'C-GXRS',
    'Global 6000': 'C-FMIA',
    'Global 6500': 'C-GLBA',
    'Global 7500': 'C-GLCA',
    'Global 8000': 'C-GLCB',
    'Gulfstream V': 'N5VG',
    'Gulfstream G550': 'N550WB',
    'Gulfstream G600': 'N600GD',
    'Gulfstream G650': 'N650GA',
    'Gulfstream G650ER': 'N651GA',
    'Gulfstream G700': 'N700GD',
    'Gulfstream G800': 'N800GD',
    'Falcon 8X': 'F-HFKQ',
    'Falcon 10X': 'F-WTNX',
    // Heavy
    'Gulfstream IV (G400)': 'N400GV',
    'Gulfstream IV-SP': 'N450GS',
    'Gulfstream III': 'N3GG',
    'Gulfstream G300': 'N300GD',
    'Gulfstream G400 (new)': 'N400GD',
    'Gulfstream G450': 'N450GA',
    'Gulfstream G500 (new)': 'N500GA',
    'Falcon 900': 'N900FA',
    'Falcon 900B': 'F-GLNA',
    'Falcon 900C': 'F-GVMA',
    'Falcon 900EX': 'F-WWFX',
    'Falcon 900EX EASy': 'F-HFKJ',
    'Falcon 900LX': 'F-HCLR',
    'Falcon 7X': 'F-HFKX',
    'Falcon 6X': 'F-WWQJ',
    'Falcon 2000': 'F-HFCA',
    'Falcon 2000EX': 'F-HFDX',
    'Falcon 2000EX EASy': 'F-HFKK',
    'Falcon 2000DX': 'F-HFDZ',
    'Falcon 2000LX': 'F-HFKL',
    'Falcon 2000LXS': 'F-HFLS',
    'Falcon 2000S': 'F-HFKS',
    'Challenger 600': 'C-GCGR',
    'Challenger 601': 'C-GCOR',
    'Challenger 601-3A': 'N601CA',
    'Challenger 601-3R': 'N601CR',
    'Challenger 604': 'C-GCRA',
    'Challenger 605': 'C-GCRE',
    'Challenger 650': 'C-GCRH',
    'Challenger 700': 'C-GCRN',
    'Legacy 600': 'PT-SAL',
    'Legacy 650': 'PR-LGA',
    'Legacy 650E': 'PR-LGB',
    // Super Mid
    'Challenger 3500': 'C-GCRI',
    'Challenger 300': 'C-GCRA',
    'Challenger 350': 'C-GCRB',
    'Praetor 600': 'PR-PMA',
    'Praetor 500': 'PR-PMB',
    'Cessna Citation X': 'N750CX',
    'Cessna Citation X+': 'N526CA',
    'Cessna Citation Longitude': 'N700CL',
    'Cessna Citation Sovereign': 'N680CV',
    'Cessna Citation Sovereign+': 'N680CS',
    'Cessna Citation Ascend': 'N680CA',
    'Cessna Citation Latitude': 'N680CL',
    'Gulfstream G280': 'N280GA',
    'Gulfstream G200': 'N200GA',
    'Gulfstream G150': 'N150GA',
    'Legacy 500': 'PT-TMJ',
    'Legacy 450': 'PT-TOK',
    'Falcon 50': 'F-GFJK',
    'Falcon 50EX': 'F-HFEX',
    'Hawker 1000': 'N1000A',
    // Mid
    'Learjet 60': 'N600LJ',
    'Learjet 60XR': 'N600XR',
    'Learjet 55': 'N55LJ',
    'Learjet 55C': 'N55CL',
    'Learjet 56': 'N56LJ',
    'Learjet 45': 'N450LJ',
    'Learjet 45XR': 'N45XR',
    'Learjet 40': 'N400LJ',
    'Learjet 40XR': 'N40XR',
    'Learjet 75': 'N75LJ',
    'Learjet 75 Liberty': 'N75LB',
    'PC-24': 'HB-VWH',
    'Cessna Citation Excel': 'N560CE',
    'Cessna Citation XLS': 'N560XL',
    'Cessna Citation XLS+': 'N560XP',
    'Cessna Citation XLS Gen2': 'N560G2',
    'Cessna Citation Encore': 'N550CE',
    'Cessna Citation Encore+': 'N550CP',
    'Cessna Citation III': 'N650CC',
    'Cessna Citation VI': 'N600CV',
    'Cessna Citation VII': 'N700CV',
    'Falcon 20': 'F-BVPG',
    'Falcon 200': 'F-GCVB',
    'Hawker 700': 'G-FRAK',
    'Hawker 800': 'G-FRBK',
    'Hawker 800XP': 'N800XP',
    'Hawker 850XP': 'G-FRDK',
    'Hawker 900XP': 'G-FREK',
    'Gulfstream G100 (Astra SPX)': 'N100GA',
    'Astra SP': 'N8ASP',
    'Astra SPX': 'N9ASP',
    'Westwind 1124': 'N124WW',
    'Westwind 1124A': 'N125WW',
    // Super Light
    'Cessna Citation V': 'N550CV',
    'Cessna Citation Ultra': 'N550CU',
    'Cessna Citation Bravo': 'N550CB',
    'Cessna Citation CJ2': 'N252CJ',
    'Cessna Citation CJ2+': 'N525CP',
    'Cessna Citation CJ3': 'N253CJ',
    'Cessna Citation CJ3+': 'N525P3',
    'Cessna Citation CJ4': 'N254CJ',
    'Cessna Citation CJ4 Gen2': 'N525G4',
    'Phenom 300': 'PR-PHM',
    'Phenom 300E': 'PR-PH3',
    'HondaJet 2600': 'N2600J',
    // Light
    'Cessna Citation M2': 'N525M2',
    'Cessna Citation M2 Gen2': 'N525G2',
    'Cessna Citation CJ1': 'N251CJ',
    'Cessna Citation CJ1+': 'N525CP',
    'Cessna Citation II': 'N550C2',
    'Cessna Citation S/II': 'N550CS',
    'Cessna Citation I': 'N500CI',
    'Cessna Citation I/SP': 'N500SP',
    'Learjet 31': 'N310LJ',
    'Learjet 31A': 'N31AL',
    'Learjet 31ER': 'N31ER',
    'Learjet 35': 'N350LJ',
    'Learjet 35A': 'N35AL',
    'Learjet 36': 'N360LJ',
    'Learjet 36A': 'N36AL',
    'Learjet 25': 'N25LJ',
    'Learjet 28': 'N28LJ',
    'Learjet 29': 'N29LJ',
    'Learjet 24': 'N24LJ',
    'Beechjet 400': 'N400BJ',
    'Beechjet 400A': 'N400BA',
    'Phenom 100': 'PR-PHN',
    'Phenom 100E': 'PR-PH1',
    'Phenom 100EV': 'PR-PHE',
    'Falcon 10': 'F-BVPG',
    'Falcon 100': 'F-GCVF',
    'SJ30': 'N30SJ',
    'Eclipse 500': 'N500EA',
    'Eclipse 550': 'N550EA',
    // Very Light
    'HondaJet': 'N420HJ',
    'HondaJet Elite': 'N421HJ',
    'HondaJet Elite II': 'N422HJ',
    'Cirrus Vision SF50': 'N505SF',
    'Vision Jet G2': 'N505G2',
    'Cessna Citation Mustang': 'N510CM',
    'Phenom 100 (VLJ)': 'PR-PHV',
    // Executive Turboprop
    'Beechcraft King Air 350ER': 'N350ER',
    'Beechcraft King Air 350': 'N350KA',
    'Beechcraft King Air 350i': 'N350KI',
    'Beechcraft King Air 260': 'N260KA',
    'Beechcraft King Air 250': 'N250KA',
    'Beechcraft King Air B200': 'N200KB',
    'Beechcraft King Air 200': 'N200KA',
    'Beechcraft King Air C90GTx': 'N90GTX',
    'Beechcraft King Air C90GT': 'N90GT',
    'Beechcraft Super King Air 300': 'N300SK',
    'Piaggio P.180 Avanti': 'I-PAVI',
    'Piaggio P.180 Avanti II': 'I-PAVB',
    'Piaggio P.180 Avanti EVO': 'D-IERO',
    'Daher TBM 700': 'F-HTBA',
    'Daher TBM 850': 'F-HTBC',
    'Daher TBM 900': 'F-HTBD',
    'Daher TBM 910': 'F-HTBE',
    'Daher TBM 930': 'F-HTBG',
    'Daher TBM 940': 'F-HTBH',
    'Daher TBM 960': 'F-HTBJ',
    'Piper Meridian': 'N500PM',
    'Piper M600': 'N600PM',
    'Piper M700 Fury': 'N700PM',
    'Pilatus PC-12': 'HB-FVP',
    'Pilatus PC-12 NGX': 'HB-FVX',
    'Cessna Caravan 208B Grand Caravan': 'N208GC',
    'Cessna Grand Caravan EX': 'N208EX',
    // Twin Turboprop
    'Beechcraft 1900D': 'N1900D',
    'BAe Jetstream 31': 'G-JMAC',
    'BAe Jetstream 41': 'G-MAJA',
    // Piston
    'Piper Malibu': 'N350PA',
    'Piper Malibu Mirage': 'N350MB',
    'Piper M350': 'N350PM',
    'Cirrus SR22T': 'N22TT',
    'Cirrus SR22': 'N22SR',
    'Cirrus SR20': 'N20SR',
    'Beechcraft Baron 58': 'N58BA',
    'Beechcraft Baron G58': 'N58GB',
    'Diamond DA42 Twin Star': 'OE-DDA',
    'Diamond DA62': 'OE-DDC',
    'Diamond DA40 Diamond Star': 'OE-DDB',
    // Helicopters
    'Robinson R44 Raven II': 'N44RR',
    'Robinson R66 Turbine': 'N66RT',
    'Airbus H120 (EC120 Colibri)': 'F-HJAB',
    'Airbus H125 (AS350 B3e)': 'F-WTJF',
    'Airbus H130 (EC130 B4)': 'F-WTEF',
    'Bell 407GXi': 'C-GJFK',
    'Bell 505 Jet Ranger X': 'C-GFDK',
    'MD 500E': 'N500MD',
    'Airbus H135 (EC135 T3)': 'D-HMBY',
    'Airbus H145 (EC145 T2)': 'D-HXXX',
    'Airbus H145M / H145 D3': 'F-MJAP',
    'Bell 429 WLG': 'C-GJFN',
    'Leonardo AW109 GrandNew': 'I-RAIM',
    'Leonardo AW109 Trekker': 'I-RAIS',
    'Airbus H155 (EC155 B1)': 'F-HFAX',
    'Airbus H160': 'F-WJOP',
    'Leonardo AW139': 'I-RAIA',
    'Leonardo AW169': 'I-RAID',
    'Sikorsky S-76D': 'N760SD',
    'Sikorsky S-76C++': 'N761SC',
    'Bell 412EPI': 'C-GJFP',
    'Airbus H175': 'F-WWOJ',
    'Airbus H225 / H225M': 'F-WWOX',
    'Leonardo AW189': 'I-RAIE',
    'Sikorsky S-92A': 'C-GZCH',
    'Bell 525 Relentless': 'N525BR',
    'Leonardo AW101 VIP': 'ZR-NIA',
    'Leonardo AW609': 'N609TR',
  };

  const reg = regMap[model];
  if (!reg) return res.status(404).json({ error: 'No representative registration for this model', photo: null });

  try {
    const url = `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RevenantCollective/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return res.status(502).json({ error: 'Planespotters unavailable', photo: null });

    const data = await response.json();
    const photos = data.photos || [];

    if (!photos.length) return res.status(404).json({ error: 'No photos found', photo: null });

    const p = photos[0];
    return res.status(200).json({
      photo: {
        thumb: (p.thumbnail_large && p.thumbnail_large.src) || (p.thumbnail && p.thumbnail.src) || '',
        link:  p.link || '',
        credit: p.photographer || '',
        reg: reg,
      }
    });

  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', photo: null });
  }
}
