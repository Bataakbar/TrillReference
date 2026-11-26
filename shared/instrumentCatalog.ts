export type SearchCategoryFilter = 'all' | 'stocks' | 'crypto' | 'forex' | 'indices';

export type StockTypeFilter =
  | 'all'
  | 'Common stock'
  | 'Preferred stock'
  | 'Depository Receipt'
  | 'Warrant'
  | 'Pre-IPO';

export const STOCK_TYPE_OPTIONS: readonly { id: StockTypeFilter; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'Common stock', label: 'Common stock' },
  { id: 'Preferred stock', label: 'Preferred stock' },
  { id: 'Depository Receipt', label: 'Depository Receipt' },
  { id: 'Warrant', label: 'Warrant' },
  { id: 'Pre-IPO', label: 'Pre-IPO' },
];

export const STOCK_SECTOR_OPTIONS: readonly string[] = [
  'All sectors',
  'Commercial Services',
  'Communications',
  'Consumer Durables',
  'Consumer Non-Durables',
  'Consumer Services',
  'Distribution Services',
  'Electronic Technology',
  'Energy Minerals',
  'Finance',
  'Health Services',
  'Health Technology',
  'Industrial Services',
  'Non-Energy Minerals',
  'Process Industries',
  'Producer Manufacturing',
  'Retail Trade',
  'Technology Services',
  'Transportation',
  'Utilities',
];

export type SourceRegion =
  | 'NORTH AMERICA'
  | 'EUROPE'
  | 'ASIA / PACIFIC';

export interface CountrySource {
  id: string;
  name: string;
  flag: string;
  exchanges: string;
  region: SourceRegion;
}

export const COUNTRY_SOURCES: readonly CountrySource[] = [
  { id: 'US', name: 'USA', flag: '🇺🇸', exchanges: 'NASDAQ, NYSE, Arca, OTC', region: 'NORTH AMERICA' },
  { id: 'CA', name: 'Canada', flag: '🇨🇦', exchanges: 'TSX, TSXV, CSE', region: 'NORTH AMERICA' },
  { id: 'GB', name: 'United Kingdom', flag: '🇬🇧', exchanges: 'LSE', region: 'EUROPE' },
  { id: 'DE', name: 'Germany', flag: '🇩🇪', exchanges: 'XETR, FWB', region: 'EUROPE' },
  { id: 'ID', name: 'Indonesia', flag: '🇮🇩', exchanges: 'IDX', region: 'ASIA / PACIFIC' },
  { id: 'SG', name: 'Singapore', flag: '🇸🇬', exchanges: 'SGX', region: 'ASIA / PACIFIC' },
  { id: 'JP', name: 'Japan', flag: '🇯🇵', exchanges: 'TSE', region: 'ASIA / PACIFIC' },
  { id: 'HK', name: 'Hong Kong', flag: '🇭🇰', exchanges: 'HKEX', region: 'ASIA / PACIFIC' },
  { id: 'AU', name: 'Australia', flag: '🇦🇺', exchanges: 'ASX', region: 'ASIA / PACIFIC' },
  { id: 'IN', name: 'India', flag: '🇮🇳', exchanges: 'NSE, BSE', region: 'ASIA / PACIFIC' },
  { id: 'KR', name: 'South Korea', flag: '🇰🇷', exchanges: 'KRX', region: 'ASIA / PACIFIC' },
];

export interface CatalogInstrument {
  symbol: string;
  shortname: string;
  exchange: string;
  type: 'STOCK' | 'CRYPTO' | 'FOREX' | 'INDEX';
  country?: string;
  stockType?: Exclude<StockTypeFilter, 'all'>;
  sector?: string;
}

type StockSeed = readonly [symbol: string, shortname: string, sector: string, stockType?: Exclude<StockTypeFilter, 'all'>];

function expandStocks(
  country: string,
  exchange: string,
  rows: readonly StockSeed[]
): CatalogInstrument[] {
  return rows.map(([symbol, shortname, sector, stockType]) => ({
    symbol,
    shortname,
    exchange,
    type: 'STOCK',
    country,
    stockType: stockType ?? 'Common stock',
    sector,
  }));
}

// Comprehensive Indonesian IDX (.JK) universe across all sectors (130+ tickers)
const IDX_STOCKS: CatalogInstrument[] = expandStocks('ID', 'IDX', [
  ['BBCA.JK', 'PT Bank Central Asia Tbk', 'Finance'],
  ['BBRI.JK', 'PT Bank Rakyat Indonesia (Persero) Tbk', 'Finance'],
  ['BMRI.JK', 'PT Bank Mandiri (Persero) Tbk', 'Finance'],
  ['BBNI.JK', 'PT Bank Negara Indonesia (Persero) Tbk', 'Finance'],
  ['BRIS.JK', 'PT Bank Syariah Indonesia Tbk', 'Finance'],
  ['BBTN.JK', 'PT Bank Tabungan Negara (Persero) Tbk', 'Finance'],
  ['BNGA.JK', 'PT Bank CIMB Niaga Tbk', 'Finance'],
  ['NISP.JK', 'PT Bank OCBC NISP Tbk', 'Finance'],
  ['BDMN.JK', 'PT Bank Danamon Indonesia Tbk', 'Finance'],
  ['ARTO.JK', 'PT Bank Jago Tbk', 'Finance'],
  ['BBYB.JK', 'PT Bank Neo Commerce Tbk', 'Finance'],
  ['BTPS.JK', 'PT Bank BTPN Syariah Tbk', 'Finance'],
  ['PNBN.JK', 'PT Bank Pan Indonesia Tbk', 'Finance'],
  ['MEGA.JK', 'PT Bank Mega Tbk', 'Finance'],
  ['BJBR.JK', 'PT Bank Pembangunan Daerah Jawa Barat Tbk', 'Finance'],
  ['BJTM.JK', 'PT Bank Pembangunan Daerah Jawa Timur Tbk', 'Finance'],
  ['AGRO.JK', 'PT Bank Raya Indonesia Tbk', 'Finance'],
  ['BANK.JK', 'PT Bank Aladin Syariah Tbk', 'Finance'],
  ['BFIN.JK', 'PT BFI Finance Indonesia Tbk', 'Finance'],
  ['ADMF.JK', 'PT Adira Dinamika Multi Finance Tbk', 'Finance'],
  ['SRTG.JK', 'PT Saratoga Investama Sedaya Tbk', 'Finance'],
  ['BSDE.JK', 'PT Bumi Serpong Damai Tbk', 'Finance'],
  ['PWON.JK', 'PT Pakuwon Jati Tbk', 'Finance'],
  ['CTRA.JK', 'PT Ciputra Development Tbk', 'Finance'],
  ['SMRA.JK', 'PT Summarecon Agung Tbk', 'Finance'],
  ['ASRI.JK', 'PT Alam Sutera Realty Tbk', 'Finance'],
  ['BKSL.JK', 'PT Sentul City Tbk', 'Finance'],
  ['DMAS.JK', 'PT Puradelta Lestari Tbk', 'Finance'],
  ['PANI.JK', 'PT Pantai Indah Kapuk Dua Tbk', 'Finance'],
  ['CBDK.JK', 'PT Bangun Kosambi Sukses Tbk', 'Finance'],
  ['TRIN.JK', 'PT Perintis Triniti Properti Tbk', 'Finance'],
  ['KIJA.JK', 'PT Kawasan Industri Jababeka Tbk', 'Finance'],
  ['ADRO.JK', 'PT Alamtri Resources Indonesia Tbk', 'Energy Minerals'],
  ['AADI.JK', 'PT Adaro Andalan Indonesia Tbk', 'Energy Minerals'],
  ['PTBA.JK', 'PT Bukit Asam Tbk', 'Energy Minerals'],
  ['ITMG.JK', 'PT Indo Tambangraya Megah Tbk', 'Energy Minerals'],
  ['BUMI.JK', 'PT Bumi Resources Tbk', 'Energy Minerals'],
  ['BYAN.JK', 'PT Bayan Resources Tbk', 'Energy Minerals'],
  ['MEDC.JK', 'PT Medco Energi Internasional Tbk', 'Energy Minerals'],
  ['PGAS.JK', 'PT Perusahaan Gas Negara Tbk', 'Energy Minerals'],
  ['AKRA.JK', 'PT AKR Corporindo Tbk', 'Distribution Services'],
  ['HRUM.JK', 'PT Harum Energy Tbk', 'Energy Minerals'],
  ['INDY.JK', 'PT Indika Energy Tbk', 'Energy Minerals'],
  ['DEWA.JK', 'PT Darma Henwa Tbk', 'Energy Minerals'],
  ['PTRO.JK', 'PT Petrosea Tbk', 'Energy Minerals'],
  ['ENRG.JK', 'PT Energi Mega Persada Tbk', 'Energy Minerals'],
  ['RAJA.JK', 'PT Rukun Raharja Tbk', 'Energy Minerals'],
  ['DOID.JK', 'PT Delta Dunia Makmur Tbk', 'Energy Minerals'],
  ['CUAN.JK', 'PT Petrindo Jaya Kreasi Tbk', 'Energy Minerals'],
  ['TOBA.JK', 'PT TBS Energi Utama Tbk', 'Energy Minerals'],
  ['ELSA.JK', 'PT Elnusa Tbk', 'Energy Minerals'],
  ['GEMS.JK', 'PT Golden Energy Mines Tbk', 'Energy Minerals'],
  ['ANTM.JK', 'PT Aneka Tambang Tbk', 'Non-Energy Minerals'],
  ['INCO.JK', 'PT Vale Indonesia Tbk', 'Non-Energy Minerals'],
  ['MDKA.JK', 'PT Merdeka Copper Gold Tbk', 'Non-Energy Minerals'],
  ['MBMA.JK', 'PT Merdeka Battery Materials Tbk', 'Non-Energy Minerals'],
  ['AMMN.JK', 'PT Amman Mineral Internasional Tbk', 'Non-Energy Minerals'],
  ['NCKL.JK', 'PT Trimegah Bangun Persada Tbk', 'Non-Energy Minerals'],
  ['TINS.JK', 'PT Timah Tbk', 'Non-Energy Minerals'],
  ['BRMS.JK', 'PT Bumi Resources Minerals Tbk', 'Non-Energy Minerals'],
  ['PSAB.JK', 'PT J Resources Asia Pasifik Tbk', 'Non-Energy Minerals'],
  ['NICL.JK', 'PT PAM Mineral Tbk', 'Non-Energy Minerals'],
  ['TLKM.JK', 'PT Telkom Indonesia (Persero) Tbk', 'Communications'],
  ['ISAT.JK', 'PT Indosat Tbk', 'Communications'],
  ['EXCL.JK', 'PT XL Axiata Tbk', 'Communications'],
  ['TBIG.JK', 'PT Tower Bersama Infrastructure Tbk', 'Communications'],
  ['TOWR.JK', 'PT Sarana Menara Nusantara Tbk', 'Communications'],
  ['MTEL.JK', 'PT Dayamitra Telekomunikasi Tbk', 'Communications'],
  ['SCMA.JK', 'PT Surya Citra Media Tbk', 'Communications'],
  ['MNCN.JK', 'PT Media Nusantara Citra Tbk', 'Communications'],
  ['EMTK.JK', 'PT Elang Mahkota Teknologi Tbk', 'Communications'],
  ['UNVR.JK', 'PT Unilever Indonesia Tbk', 'Consumer Non-Durables'],
  ['ICBP.JK', 'PT Indofood CBP Sukses Makmur Tbk', 'Consumer Non-Durables'],
  ['INDF.JK', 'PT Indofood Sukses Makmur Tbk', 'Consumer Non-Durables'],
  ['MYOR.JK', 'PT Mayora Indah Tbk', 'Consumer Non-Durables'],
  ['KLBF.JK', 'PT Kalbe Farma Tbk', 'Health Technology'],
  ['SIDO.JK', 'PT Industri Jamu dan Farmasi Sido Muncul Tbk', 'Consumer Non-Durables'],
  ['CPIN.JK', 'PT Charoen Pokphand Indonesia Tbk', 'Consumer Non-Durables'],
  ['JPFA.JK', 'PT Japfa Comfeed Indonesia Tbk', 'Consumer Non-Durables'],
  ['GGRM.JK', 'PT Gudang Garam Tbk', 'Consumer Non-Durables'],
  ['HMSP.JK', 'PT H.M. Sampoerna Tbk', 'Consumer Non-Durables'],
  ['CMRY.JK', 'PT Cisarua Mountain Dairy Tbk', 'Consumer Non-Durables'],
  ['ULTJ.JK', 'PT Ultra Jaya Milk Industry Tbk', 'Consumer Non-Durables'],
  ['ROTI.JK', 'PT Nippon Indosari Corpindo Tbk', 'Consumer Non-Durables'],
  ['MLBI.JK', 'PT Multi Bintang Indonesia Tbk', 'Consumer Non-Durables'],
  ['ASII.JK', 'PT Astra International Tbk', 'Consumer Durables'],
  ['AUTO.JK', 'PT Astra Otoparts Tbk', 'Producer Manufacturing'],
  ['SMSM.JK', 'PT Selamat Sempurna Tbk', 'Producer Manufacturing'],
  ['DRMA.JK', 'PT Dharma Polimetal Tbk', 'Producer Manufacturing'],
  ['MAPI.JK', 'PT Mitra Adiperkasa Tbk', 'Retail Trade'],
  ['MAPA.JK', 'PT Map Aktif Adiperkasa Tbk', 'Retail Trade'],
  ['ACES.JK', 'PT Aspirasi Hidup Indonesia Tbk', 'Retail Trade'],
  ['AMRT.JK', 'PT Sumber Alfaria Trijaya Tbk', 'Retail Trade'],
  ['MIDI.JK', 'PT Midi Utama Indonesia Tbk', 'Retail Trade'],
  ['ERAA.JK', 'PT Erajaya Swasembada Tbk', 'Retail Trade'],
  ['RALS.JK', 'PT Ramayana Lestari Sentosa Tbk', 'Retail Trade'],
  ['LPPF.JK', 'PT Matahari Department Store Tbk', 'Retail Trade'],
  ['GOTO.JK', 'PT GoTo Gojek Tokopedia Tbk', 'Technology Services'],
  ['BUKA.JK', 'PT Bukalapak.com Tbk', 'Technology Services'],
  ['BELI.JK', 'PT Global Digital Niaga Tbk', 'Technology Services'],
  ['DCII.JK', 'PT DCI Indonesia Tbk', 'Technology Services'],
  ['MTDL.JK', 'PT Metrodata Electronics Tbk', 'Electronic Technology'],
  ['WIFI.JK', 'PT Solusi Sinergi Digital Tbk', 'Technology Services'],
  ['COIN.JK', 'PT Indokripto Koin Semesta Tbk', 'Technology Services'],
  ['TPIA.JK', 'PT Chandra Asri Pacific Tbk', 'Process Industries'],
  ['BRPT.JK', 'PT Barito Pacific Tbk', 'Process Industries'],
  ['INKP.JK', 'PT Indah Kiat Pulp & Paper Tbk', 'Process Industries'],
  ['TKIM.JK', 'PT Pabrik Kertas Tjiwi Kimia Tbk', 'Process Industries'],
  ['SMGR.JK', 'PT Semen Indonesia (Persero) Tbk', 'Process Industries'],
  ['INTP.JK', 'PT Indocement Tunggal Prakarsa Tbk', 'Process Industries'],
  ['ESSA.JK', 'PT ESSA Industries Indonesia Tbk', 'Process Industries'],
  ['AVIA.JK', 'PT Avia Avian Tbk', 'Process Industries'],
  ['UNTR.JK', 'PT United Tractors Tbk', 'Industrial Services'],
  ['WIKA.JK', 'PT Wijaya Karya (Persero) Tbk', 'Industrial Services'],
  ['PTPP.JK', 'PT PP (Persero) Tbk', 'Industrial Services'],
  ['ADHI.JK', 'PT Adhi Karya (Persero) Tbk', 'Industrial Services'],
  ['SSIA.JK', 'PT Surya Semesta Internusa Tbk', 'Industrial Services'],
  ['MIKA.JK', 'PT Mitra Keluarga Karyasehat Tbk', 'Health Services'],
  ['HEAL.JK', 'PT Medikaloka Hermina Tbk', 'Health Services'],
  ['SILO.JK', 'PT Siloam International Hospitals Tbk', 'Health Services'],
  ['PRDA.JK', 'PT Prodia Widyahusada Tbk', 'Health Services'],
  ['KAEF.JK', 'PT Kimia Farma Tbk', 'Health Technology'],
  ['JSMR.JK', 'PT Jasa Marga (Persero) Tbk', 'Transportation'],
  ['BIRD.JK', 'PT Blue Bird Tbk', 'Transportation'],
  ['ASSA.JK', 'PT Adi Sarana Armada Tbk', 'Transportation'],
  ['SMDR.JK', 'PT Samudera Indonesia Tbk', 'Transportation'],
  ['TMAS.JK', 'PT Temas Tbk', 'Transportation'],
  ['GIAA.JK', 'PT Garuda Indonesia (Persero) Tbk', 'Transportation'],
  ['BREN.JK', 'PT Barito Renewables Energy Tbk', 'Utilities'],
  ['PGEO.JK', 'PT Pertamina Geothermal Energy Tbk', 'Utilities'],
  ['POWR.JK', 'PT Cikarang Listrindo Tbk', 'Utilities'],
  ['KEEN.JK', 'PT Kencana Energi Lestari Tbk', 'Utilities'],
  ['ARKO.JK', 'PT Arkora Hydro Tbk', 'Utilities'],
  ['SMIL.JK', 'PT Sarana Mitra Luas Tbk', 'Commercial Services'],
]);

// USA Stocks across NASDAQ / NYSE (100+ tickers)
const US_STOCKS: CatalogInstrument[] = expandStocks('US', 'NASDAQ / NYSE', [
  ['AAPL', 'Apple Inc.', 'Electronic Technology'],
  ['MSFT', 'Microsoft Corporation', 'Technology Services'],
  ['NVDA', 'NVIDIA Corporation', 'Electronic Technology'],
  ['GOOGL', 'Alphabet Inc. (Class A)', 'Technology Services'],
  ['AMZN', 'Amazon.com, Inc.', 'Retail Trade'],
  ['META', 'Meta Platforms, Inc.', 'Technology Services'],
  ['TSLA', 'Tesla, Inc.', 'Consumer Durables'],
  ['BRK-B', 'Berkshire Hathaway Inc.', 'Finance'],
  ['AVGO', 'Broadcom Inc.', 'Electronic Technology'],
  ['LLY', 'Eli Lilly and Company', 'Health Technology'],
  ['JPM', 'JPMorgan Chase & Co.', 'Finance'],
  ['V', 'Visa Inc.', 'Finance'],
  ['MA', 'Mastercard Incorporated', 'Finance'],
  ['UNH', 'UnitedHealth Group Incorporated', 'Health Services'],
  ['XOM', 'Exxon Mobil Corporation', 'Energy Minerals'],
  ['JNJ', 'Johnson & Johnson', 'Health Technology'],
  ['PG', 'The Procter & Gamble Company', 'Consumer Non-Durables'],
  ['HD', 'The Home Depot, Inc.', 'Retail Trade'],
  ['COST', 'Costco Wholesale Corporation', 'Retail Trade'],
  ['NFLX', 'Netflix, Inc.', 'Consumer Services'],
  ['AMD', 'Advanced Micro Devices, Inc.', 'Electronic Technology'],
  ['INTC', 'Intel Corporation', 'Electronic Technology'],
  ['QCOM', 'QUALCOMM Incorporated', 'Electronic Technology'],
  ['TXN', 'Texas Instruments Incorporated', 'Electronic Technology'],
  ['AMAT', 'Applied Materials, Inc.', 'Electronic Technology'],
  ['MU', 'Micron Technology, Inc.', 'Electronic Technology'],
  ['LRCX', 'Lam Research Corporation', 'Electronic Technology'],
  ['ARM', 'Arm Holdings plc', 'Electronic Technology', 'Depository Receipt'],
  ['SMCI', 'Super Micro Computer, Inc.', 'Electronic Technology'],
  ['MRVL', 'Marvell Technology, Inc.', 'Electronic Technology'],
  ['CRM', 'Salesforce, Inc.', 'Technology Services'],
  ['ORCL', 'Oracle Corporation', 'Technology Services'],
  ['ADBE', 'Adobe Inc.', 'Technology Services'],
  ['CSCO', 'Cisco Systems, Inc.', 'Electronic Technology'],
  ['IBM', 'International Business Machines', 'Technology Services'],
  ['NOW', 'ServiceNorway / ServiceNow, Inc.', 'Technology Services'],
  ['INTU', 'Intuit Inc.', 'Technology Services'],
  ['PLTR', 'Palantir Technologies Inc.', 'Technology Services'],
  ['SNOW', 'Snowflake Inc.', 'Technology Services'],
  ['PANW', 'Palo Alto Networks, Inc.', 'Technology Services'],
  ['CRWD', 'CrowdStrike Holdings, Inc.', 'Technology Services'],
  ['DDOG', 'Datadog, Inc.', 'Technology Services'],
  ['NET', 'Cloudflare, Inc.', 'Technology Services'],
  ['ZS', 'Zscaler, Inc.', 'Technology Services'],
  ['MDB', 'MongoDB, Inc.', 'Technology Services'],
  ['UBER', 'Uber Technologies, Inc.', 'Transportation'],
  ['ABNB', 'Airbnb, Inc.', 'Consumer Services'],
  ['COIN', 'Coinbase Global, Inc.', 'Finance'],
  ['PYPL', 'PayPal Holdings, Inc.', 'Commercial Services'],
  ['SOFI', 'SoFi Technologies, Inc.', 'Finance'],
  ['HOOD', 'Robinhood Markets, Inc.', 'Finance'],
  ['BAC', 'Bank of America Corporation', 'Finance'],
  ['WFC', 'Wells Fargo & Company', 'Finance'],
  ['GS', 'The Goldman Sachs Group, Inc.', 'Finance'],
  ['MS', 'Morgan Stanley', 'Finance'],
  ['C', 'Citigroup Inc.', 'Finance'],
  ['BLK', 'BlackRock, Inc.', 'Finance'],
  ['SCHW', 'The Charles Schwab Corporation', 'Finance'],
  ['AXP', 'American Express Company', 'Finance'],
  ['PEP', 'PepsiCo, Inc.', 'Consumer Non-Durables'],
  ['KO', 'The Coca-Cola Company', 'Consumer Non-Durables'],
  ['WMT', 'Walmart Inc.', 'Retail Trade'],
  ['TGT', 'Target Corporation', 'Retail Trade'],
  ['LOW', 'Lowe\'s Companies, Inc.', 'Retail Trade'],
  ['MCD', 'McDonald\'s Corporation', 'Consumer Services'],
  ['SBUX', 'Starbucks Corporation', 'Consumer Services'],
  ['DIS', 'The Walt Disney Company', 'Consumer Services'],
  ['NKE', 'NIKE, Inc.', 'Consumer Non-Durables'],
  ['BA', 'The Boeing Company', 'Electronic Technology'],
  ['CAT', 'Caterpillar Inc.', 'Producer Manufacturing'],
  ['GE', 'GE Aerospace', 'Electronic Technology'],
  ['DE', 'Deere & Company', 'Producer Manufacturing'],
  ['HON', 'Honeywell International Inc.', 'Producer Manufacturing'],
  ['CVX', 'Chevron Corporation', 'Energy Minerals'],
  ['COP', 'ConocoPhillips', 'Energy Minerals'],
  ['SLB', 'SLB (Schlumberger)', 'Industrial Services'],
  ['OXY', 'Occidental Petroleum Corporation', 'Energy Minerals'],
  ['PFE', 'Pfizer Inc.', 'Health Technology'],
  ['MRK', 'Merck & Co., Inc.', 'Health Technology'],
  ['ABBV', 'AbbVie Inc.', 'Health Technology'],
  ['TMO', 'Thermo Fisher Scientific Inc.', 'Health Technology'],
  ['ISRG', 'Intuitive Surgical, Inc.', 'Health Technology'],
  ['UPS', 'United Parcel Service, Inc.', 'Transportation'],
  ['FDX', 'FedEx Corporation', 'Transportation'],
  ['DAL', 'Delta Air Lines, Inc.', 'Transportation'],
  ['NEE', 'NextEra Energy, Inc.', 'Utilities'],
  ['DUK', 'Duke Energy Corporation', 'Utilities'],
  ['SO', 'The Southern Company', 'Utilities'],
  ['RIVN', 'Rivian Automotive, Inc.', 'Consumer Durables'],
  ['LCID', 'Lucid Group, Inc.', 'Consumer Durables'],
  ['TSM', 'Taiwan Semiconductor Manufacturing', 'Electronic Technology', 'Depository Receipt'],
  ['ASML', 'ASML Holding N.V.', 'Electronic Technology', 'Depository Receipt'],
  ['BABA', 'Alibaba Group Holding Limited', 'Retail Trade', 'Depository Receipt'],
  ['NIO', 'NIO Inc.', 'Consumer Durables', 'Depository Receipt'],
  ['NVO', 'Novo Nordisk A/S', 'Health Technology', 'Depository Receipt'],
  ['TMUS', 'T-Mobile US, Inc.', 'Communications'],
  ['VZ', 'Verizon Communications Inc.', 'Communications'],
  ['T', 'AT&T Inc.', 'Communications'],
]);

const GLOBAL_STOCKS: CatalogInstrument[] = [
  ...expandStocks('SG', 'SGX', [
    ['D05.SI', 'DBS Group Holdings Ltd', 'Finance'],
    ['O39.SI', 'Oversea-Chinese Banking Corp', 'Finance'],
    ['U11.SI', 'United Overseas Bank Ltd', 'Finance'],
    ['Z74.SI', 'Singapore Telecommunications Ltd', 'Communications'],
    ['C6L.SI', 'Singapore Airlines Ltd', 'Transportation'],
    ['S68.SI', 'Singapore Exchange Ltd', 'Finance'],
    ['BN4.SI', 'Keppel Ltd', 'Industrial Services'],
  ]),
  ...expandStocks('JP', 'TSE', [
    ['7203.T', 'Toyota Motor Corporation', 'Consumer Durables'],
    ['6758.T', 'Sony Group Corporation', 'Consumer Durables'],
    ['9984.T', 'SoftBank Group Corp.', 'Communications'],
    ['8306.T', 'Mitsubishi UFJ Financial Group', 'Finance'],
    ['6861.T', 'Keyence Corporation', 'Electronic Technology'],
    ['8035.T', 'Tokyo Electron Limited', 'Electronic Technology'],
    ['9432.T', 'Nippon Telegraph and Telephone', 'Communications'],
  ]),
  ...expandStocks('HK', 'HKEX', [
    ['0700.HK', 'Tencent Holdings Limited', 'Technology Services'],
    ['9988.HK', 'Alibaba Group Holding Limited', 'Retail Trade'],
    ['3690.HK', 'Meituan', 'Consumer Services'],
    ['1299.HK', 'AIA Group Limited', 'Finance'],
    ['0005.HK', 'HSBC Holdings plc', 'Finance'],
    ['1810.HK', 'Xiaomi Corporation', 'Electronic Technology'],
    ['2318.HK', 'Ping An Insurance Group', 'Finance'],
  ]),
  ...expandStocks('GB', 'LSE', [
    ['SHEL.L', 'Shell plc', 'Energy Minerals'],
    ['AZN.L', 'AstraZeneca PLC', 'Health Technology'],
    ['HSBA.L', 'HSBC Holdings plc', 'Finance'],
    ['ULVR.L', 'Unilever PLC', 'Consumer Non-Durables'],
    ['RIO.L', 'Rio Tinto Group', 'Non-Energy Minerals'],
    ['BP.L', 'BP p.l.c.', 'Energy Minerals'],
  ]),
  ...expandStocks('DE', 'XETR', [
    ['SAP.DE', 'SAP SE', 'Technology Services'],
    ['SIE.DE', 'Siemens AG', 'Producer Manufacturing'],
    ['ALV.DE', 'Allianz SE', 'Finance'],
    ['MBG.DE', 'Mercedes-Benz Group AG', 'Consumer Durables'],
    ['BMW.DE', 'Bayerische Motoren Werke AG', 'Consumer Durables'],
    ['DTE.DE', 'Deutsche Telekom AG', 'Communications'],
  ]),
  ...expandStocks('AU', 'ASX', [
    ['BHP.AX', 'BHP Group Limited', 'Non-Energy Minerals'],
    ['CBA.AX', 'Commonwealth Bank of Australia', 'Finance'],
    ['CSL.AX', 'CSL Limited', 'Health Technology'],
    ['WBC.AX', 'Westpac Banking Corporation', 'Finance'],
    ['FMG.AX', 'Fortescue Ltd', 'Non-Energy Minerals'],
  ]),
  ...expandStocks('IN', 'NSE', [
    ['RELIANCE.NS', 'Reliance Industries Limited', 'Energy Minerals'],
    ['TCS.NS', 'Tata Consultancy Services', 'Technology Services'],
    ['HDFCBANK.NS', 'HDFC Bank Limited', 'Finance'],
    ['INFY.NS', 'Infosys Limited', 'Technology Services'],
    ['ICICIBANK.NS', 'ICICI Bank Limited', 'Finance'],
  ]),
  ...expandStocks('CA', 'TSX', [
    ['RY.TO', 'Royal Bank of Canada', 'Finance'],
    ['TD.TO', 'The Toronto-Dominion Bank', 'Finance'],
    ['SHOP.TO', 'Shopify Inc.', 'Technology Services'],
    ['ENB.TO', 'Enbridge Inc.', 'Industrial Services'],
    ['CNQ.TO', 'Canadian Natural Resources', 'Energy Minerals'],
  ]),
  ...expandStocks('KR', 'KRX', [
    ['005930.KS', 'Samsung Electronics Co., Ltd.', 'Electronic Technology'],
    ['000660.KS', 'SK hynix Inc.', 'Electronic Technology'],
    ['035420.KS', 'NAVER Corporation', 'Technology Services'],
  ]),
];

const CRYPTO_LIST: CatalogInstrument[] = (
  [
    ['BTC-USD', 'Bitcoin USD', 'CCC'],
    ['ETH-USD', 'Ethereum USD', 'CCC'],
    ['SOL-USD', 'Solana USD', 'CCC'],
    ['BNB-USD', 'BNB USD', 'CCC'],
    ['XRP-USD', 'XRP USD', 'CCC'],
    ['ADA-USD', 'Cardano USD', 'CCC'],
    ['DOGE-USD', 'Dogecoin USD', 'CCC'],
    ['AVAX-USD', 'Avalanche USD', 'CCC'],
    ['DOT-USD', 'Polkadot USD', 'CCC'],
    ['LINK-USD', 'Chainlink USD', 'CCC'],
    ['TRX-USD', 'TRON USD', 'CCC'],
    ['TON11419-USD', 'Toncoin USD', 'CCC'],
    ['SHIB-USD', 'Shiba Inu USD', 'CCC'],
    ['LTC-USD', 'Litecoin USD', 'CCC'],
    ['BCH-USD', 'Bitcoin Cash USD', 'CCC'],
    ['UNI7083-USD', 'Uniswap USD', 'CCC'],
    ['ATOM-USD', 'Cosmos USD', 'CCC'],
    ['NEAR-USD', 'NEAR Protocol USD', 'CCC'],
    ['APT21794-USD', 'Aptos USD', 'CCC'],
    ['ARB11841-USD', 'Arbitrum USD', 'CCC'],
    ['OP-USD', 'Optimism USD', 'CCC'],
    ['SUI20947-USD', 'Sui USD', 'CCC'],
    ['PEPE24478-USD', 'Pepe USD', 'CCC'],
    ['XLM-USD', 'Stellar USD', 'CCC'],
    ['ETC-USD', 'Ethereum Classic USD', 'CCC'],
    ['FIL-USD', 'Filecoin USD', 'CCC'],
    ['HBAR-USD', 'Hedera USD', 'CCC'],
    ['ICP-USD', 'Internet Computer USD', 'CCC'],
    ['AAVE-USD', 'Aave USD', 'CCC'],
    ['MKR-USD', 'Maker USD', 'CCC'],
    ['INJ-USD', 'Injective USD', 'CCC'],
    ['BTC-IDR', 'Bitcoin IDR', 'CCC'],
    ['ETH-IDR', 'Ethereum IDR', 'CCC'],
  ] as const
).map(([symbol, shortname, exchange]) => ({
  symbol,
  shortname,
  exchange,
  type: 'CRYPTO',
}));

const FOREX_LIST: CatalogInstrument[] = (
  [
    ['USDIDR=X', 'USD / IDR (Indonesian Rupiah)', 'FX'],
    ['EURUSD=X', 'EUR / USD', 'FX'],
    ['GBPUSD=X', 'GBP / USD', 'FX'],
    ['USDJPY=X', 'USD / JPY', 'FX'],
    ['AUDUSD=X', 'AUD / USD', 'FX'],
    ['USDCAD=X', 'USD / CAD', 'FX'],
    ['USDCHF=X', 'USD / CHF', 'FX'],
    ['NZDUSD=X', 'NZD / USD', 'FX'],
    ['EURJPY=X', 'EUR / JPY', 'FX'],
    ['GBPJPY=X', 'GBP / JPY', 'FX'],
    ['EURGBP=X', 'EUR / GBP', 'FX'],
    ['AUDJPY=X', 'AUD / JPY', 'FX'],
    ['EURCHF=X', 'EUR / CHF', 'FX'],
    ['USDSGD=X', 'USD / SGD', 'FX'],
    ['SGDIDR=X', 'SGD / IDR', 'FX'],
    ['EURIDR=X', 'EUR / IDR', 'FX'],
    ['JPYIDR=X', 'JPY / IDR', 'FX'],
    ['AUDIDR=X', 'AUD / IDR', 'FX'],
    ['GBPIDR=X', 'GBP / IDR', 'FX'],
    ['USDCNY=X', 'USD / CNY', 'FX'],
    ['USDHKD=X', 'USD / HKD', 'FX'],
    ['USDKRW=X', 'USD / KRW', 'FX'],
    ['USDINR=X', 'USD / INR', 'FX'],
    ['USDTHB=X', 'USD / THB', 'FX'],
    ['USDMYR=X', 'USD / MYR', 'FX'],
  ] as const
).map(([symbol, shortname, exchange]) => ({
  symbol,
  shortname,
  exchange,
  type: 'FOREX',
}));

const INDICES_LIST: CatalogInstrument[] = (
  [
    ['^JKSE', 'IDX Composite Index (IHSG)', 'IDX', 'ID'],
    ['^LQ45', 'IDX LQ45 Index', 'IDX', 'ID'],
    ['^GSPC', 'S&P 500 Index', 'SP', 'US'],
    ['^IXIC', 'NASDAQ Composite Index', 'NASDAQ', 'US'],
    ['^NDX', 'NASDAQ 100 Index', 'NASDAQ', 'US'],
    ['^DJI', 'Dow Jones Industrial Average', 'DJ', 'US'],
    ['^RUT', 'Russell 2000 Index', 'RUSSELL', 'US'],
    ['^VIX', 'CBOE Volatility Index (VIX)', 'CBOE', 'US'],
    ['^FTSE', 'FTSE 100 Index', 'FTSE', 'GB'],
    ['^GDAXI', 'DAX Performance Index', 'XETR', 'DE'],
    ['^FCHI', 'CAC 40 Index', 'EURONEXT', 'FR'],
    ['^N225', 'Nikkei 225 Index', 'TSE', 'JP'],
    ['^HSI', 'Hang Seng Index', 'HKEX', 'HK'],
    ['^STI', 'Straits Times Index', 'SGX', 'SG'],
    ['^AXJO', 'S&P/ASX 200 Index', 'ASX', 'AU'],
    ['^KS11', 'KOSPI Composite Index', 'KRX', 'KR'],
    ['^TWII', 'Taiwan Weighted Index', 'TWSE', 'TW'],
    ['^BSESN', 'S&P BSE SENSEX Index', 'BSE', 'IN'],
    ['^NSEI', 'NIFTY 50 Index', 'NSE', 'IN'],
    ['000001.SS', 'SSE Composite Index', 'SSE', 'CN'],
    ['^GSPTSE', 'S&P/TSX Composite Index', 'TSX', 'CA'],
  ] as const
).map(([symbol, shortname, exchange, country]) => ({
  symbol,
  shortname,
  exchange,
  type: 'INDEX',
  country,
}));

export const INSTRUMENT_CATALOG: readonly CatalogInstrument[] = [
  ...IDX_STOCKS,
  ...US_STOCKS,
  ...GLOBAL_STOCKS,
  ...CRYPTO_LIST,
  ...FOREX_LIST,
  ...INDICES_LIST,
];

export interface InstrumentQueryOptions {
  category?: SearchCategoryFilter;
  country?: string | null; // e.g. 'ID', 'US', or null/'all'
  stockType?: StockTypeFilter;
  sector?: string | null; // 'All sectors' or null
  q?: string;
  offset?: number;
  limit?: number;
}

export interface InstrumentQueryPage {
  items: CatalogInstrument[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function queryInstrumentCatalog(options: InstrumentQueryOptions): InstrumentQueryPage {
  const category = options.category ?? 'all';
  const country = options.country && options.country !== 'all' ? options.country.toUpperCase() : null;
  const stockType = options.stockType && options.stockType !== 'all' ? options.stockType : null;
  const sector = options.sector && options.sector !== 'All sectors' ? options.sector : null;
  const q = (options.q ?? '').trim().toLowerCase();
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 50)));

  let filtered = INSTRUMENT_CATALOG.filter((item) => {
    if (category === 'stocks' && item.type !== 'STOCK') return false;
    if (category === 'crypto' && item.type !== 'CRYPTO') return false;
    if (category === 'forex' && item.type !== 'FOREX') return false;
    if (category === 'indices' && item.type !== 'INDEX') return false;

    if (category === 'stocks') {
      if (country && item.country !== country) return false;
      if (stockType && item.stockType !== stockType) return false;
      if (sector && item.sector !== sector) return false;
    }

    if (q) {
      const symLower = item.symbol.toLowerCase();
      const nameLower = item.shortname.toLowerCase();
      const exchLower = item.exchange.toLowerCase();
      if (!symLower.includes(q) && !nameLower.includes(q) && !exchLower.includes(q)) {
        return false;
      }
    }
    return true;
  });

  if (q) {
    filtered = [...filtered].sort((a, b) => {
      const as = a.symbol.toLowerCase();
      const bs = b.symbol.toLowerCase();
      const aExact = as === q || as.replace(/\.jk$|-usd$|=x$/i, '') === q ? 0 : 1;
      const bExact = bs === q || bs.replace(/\.jk$|-usd$|=x$/i, '') === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = as.startsWith(q) ? 0 : 1;
      const bStarts = bs.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return 0;
    });
  }

  const items = filtered.slice(offset, offset + limit);
  return {
    items,
    total: filtered.length,
    offset,
    limit,
    hasMore: offset + items.length < filtered.length,
  };
}

export function getCountryFlagEmoji(countryCode?: string): string {
  if (!countryCode) return '';
  return COUNTRY_SOURCES.find((c) => c.id === countryCode)?.flag ?? '';
}

export function inferDefaultStockCountry(activeChartSymbol: string): string | null {
  const upper = activeChartSymbol.toUpperCase();
  if (upper.endsWith('.JK') || upper === '^JKSE' || upper === '^LQ45') return 'ID';
  if (upper.endsWith('.SI')) return 'SG';
  if (upper.endsWith('.T')) return 'JP';
  if (upper.endsWith('.HK')) return 'HK';
  if (upper.endsWith('.L')) return 'GB';
  if (upper.endsWith('.DE')) return 'DE';
  if (upper.endsWith('.AX')) return 'AU';
  if (upper.endsWith('.NS')) return 'IN';
  if (upper.endsWith('.TO')) return 'CA';
  if (upper.endsWith('.KS')) return 'KR';
  return null;
}
