export const STOCK_ICON_MAP = {
  // Core
  ABB: "abb",
  RELIND: "reliance-industries",
  TCS: "tata-consultancy-services",
  INFTEC: "infosys",
  WIPRO: "wipro",
  HCLTEC: "hcl-technologies",
  TECMAH: "tech-mahindra",

  // Banking
  HDFBAN: "hdfc-bank",
  ICIBAN: "icici-bank",
  AXIBAN: "axis-bank",
  KOTMAH: "kotak-mahindra-bank",
  SBIN: "state-bank-of-india",
  INDIBA: "indusind-bank",
  YESBAN: "yes-bank",
  PUNBAN: "punjab-national-bank",
  FEDBAN: "federal-bank",
  RBLBAN: "rbl-bank",
  IDFBAN: "idfc-first-bank",

  // Finance
  BAJFI: "bajaj-finance",
  BAFINS: "bajaj-finserv",
  SBILIF: "sbi-life",
  HDFLIF: "hdfc-life",
  ICIPRU: "icici-prudential-life",
  LTFINA: "l-and-t-finance-holdings",
  LIC: "life-insurance-corporation-of-india",

  // Auto
  MARUTI: "maruti-suzuki",
  TATMOT: "tata-motors",
  MAHMAH: "mahindra-and-mahindra",
  EICMOT: "eicher-motors",
  HERHON: "hero-motocorp",
  TVSMOT: "tvs-motor",
  BAJAUTO: "bajaj-auto",

  // Pharma
  SUNPHA: "sun-pharmaceutical",
  DRREDD: "dr-reddys-laboratories",
  CIPLA: "cipla",
  LUPIN: "lupin",
  DIVLAB: "divis-laboratories",
  ALKLAB: "alkem-laboratories",
  TORPHA: "torrent-pharmaceuticals",

  // FMCG
  HINLEV: "hindustan-unilever",
  ITC: "itc",
  NESTLE: "nestle",
  BRITANNIA: "britannia",
  DABIND: "dabur",
  GODPRO: "godrej-consumer-products",

  // Energy
  ONGC: "oil-and-natural-gas",
  COALIN: "coal-india",
  NTPC: "ntpc",
  POWGRI: "power-grid-corporation",
  GAIL: "gail-india",
  BPCL: "bharat-petroleum",
  IOC: "indian-oil",

  // Infra / Capital Goods
  LARTOU: "larsen-toubro",
  SIEMEN: "siemens",
  ABBPOW: "abb",
  CUMIND: "cummins-india",

  // Metals
  TATSTE: "tata-steel",
  JSWSTE: "jsw-steel",
  HINDAL: "hindalco-industries",
  VEDLIM: "vedanta",
  SAIL: "steel-authority-of-india",

  // Cement
  ULTCEM: "ultratech-cement",
  SHRCEM: "shree-cement",
  AMBUJA: "ambuja-cements",

  // Telecom / Tech
  BHAAIR: "bharti-airtel",
  JIOFIN: "jio-financial-services",

  // Retail / Consumer
  TITIND: "titan-company",
  TRENT: "trent",
  DMART: "avenue-supermarts",
  ZOMLIM: "zomato",

  // Others
  PIDIND: "pidilite-industries",
  GRASIM: "grasim-industries",
  HAVIND: "havells-india",
  VOLTAS: "voltas",
  BEL: "bharat-electronics",
  HAL: "hindustan-aeronautics",
  IRCTC: "irctc",
  CONCOR: "container-corporation-of-india",
  BSE: "bse",
  CDSL: "cdsl",
  MCX: "multi-commodity-exchange"
};

export const getStockLogo = (symbol) => {
  const slug = STOCK_ICON_MAP[symbol];

  if (slug) {
    return `https://s3-symbol-logo.tradingview.com/${slug}.svg`;
  }

  // ✅ fallback to symbol (not slug)
  return `https://s3-symbol-logo.tradingview.com/${symbol?.toLowerCase()}.svg`;
};