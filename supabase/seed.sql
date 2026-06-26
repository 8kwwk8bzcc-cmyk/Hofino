-- Hofino Seed – repräsentative Instrumente zum Testen von Schema & Simulator (M2/M3).
-- Vollständiges Universum (~200 Unternehmen + 10 ETFs inkl. ISIN/WKN) kommt mit M4.

-- provider_symbol = Quellen-Symbol der externen Marktdaten-Quelle. Für Xetra/EUR-Notierung
-- im Format "TICKER:XETR" (Twelve Data). DE-Werte + ETFs sind real Xetra-notiert; für die
-- US-Werte ist hier das reine Ticker hinterlegt (für MARKET_DATA_SOURCE=simulated egal; für
-- twelvedata sollten sie auf eine EUR-/Xetra-Notierung gemappt werden – siehe supabase/README.md).
insert into instruments (type, name, ticker, sector, country, provider_symbol) values
  ('stock', 'Apple',                 'AAPL', 'Technology',             'US',     'AAPL'),
  ('stock', 'Microsoft',             'MSFT', 'Technology',             'US',     'MSFT'),
  ('stock', 'Amazon',                'AMZN', 'Consumer Discretionary', 'US',     'AMZN'),
  ('stock', 'Alphabet',              'GOOGL','Communication Services', 'US',     'GOOGL'),
  ('stock', 'Nvidia',                'NVDA', 'Technology',             'US',     'NVDA'),
  ('stock', 'Tesla',                 'TSLA', 'Consumer Discretionary', 'US',     'TSLA'),
  ('stock', 'SAP',                   'SAP',  'Technology',             'DE',     'SAP:XETR'),
  ('stock', 'Siemens',               'SIE',  'Industrials',            'DE',     'SIE:XETR'),
  ('stock', 'Volkswagen',            'VOW3', 'Consumer Discretionary', 'DE',     'VOW3:XETR'),
  ('stock', 'Allianz',               'ALV',  'Financials',             'DE',     'ALV:XETR'),
  ('stock', 'Adidas',                'ADS',  'Consumer Discretionary', 'DE',     'ADS:XETR'),
  ('stock', 'Mercedes-Benz Group',   'MBG',  'Consumer Discretionary', 'DE',     'MBG:XETR'),
  ('stock', 'Nestlé',                'NESN', 'Consumer Staples',       'CH',     'NESN'),
  ('stock', 'LVMH',                  'MC',   'Consumer Discretionary', 'FR',     'MC'),
  ('stock', 'Meta Platforms',        'META', 'Communication Services', 'US',     'META'),
  ('stock', 'Netflix',               'NFLX', 'Communication Services', 'US',     'NFLX'),
  ('stock', 'Walt Disney',           'DIS',  'Communication Services', 'US',     'DIS'),
  ('stock', 'Coca-Cola',             'KO',   'Consumer Staples',       'US',     'KO'),
  ('stock', 'PepsiCo',               'PEP',  'Consumer Staples',       'US',     'PEP'),
  ('stock', 'McDonald''s',           'MCD',  'Consumer Discretionary', 'US',     'MCD'),
  ('stock', 'Starbucks',             'SBUX', 'Consumer Discretionary', 'US',     'SBUX'),
  ('stock', 'Nike',                  'NKE',  'Consumer Discretionary', 'US',     'NKE'),
  ('stock', 'Visa',                  'V',    'Financials',             'US',     'V'),
  ('stock', 'Mastercard',            'MA',   'Financials',             'US',     'MA'),
  ('stock', 'PayPal',                'PYPL', 'Financials',             'US',     'PYPL'),
  ('stock', 'Intel',                 'INTC', 'Technology',             'US',     'INTC'),
  ('stock', 'AMD',                   'AMD',  'Technology',             'US',     'AMD'),
  ('stock', 'Oracle',                'ORCL', 'Technology',             'US',     'ORCL'),
  ('stock', 'Uber',                  'UBER', 'Technology',             'US',     'UBER'),
  ('stock', 'Airbnb',                'ABNB', 'Technology',             'US',     'ABNB'),
  ('stock', 'BMW',                   'BMW',  'Consumer Discretionary', 'DE',     'BMW:XETR'),
  ('stock', 'Porsche AG',            'P911', 'Consumer Discretionary', 'DE',     'P911:XETR'),
  ('stock', 'Deutsche Telekom',      'DTE',  'Communication Services', 'DE',     'DTE:XETR'),
  ('stock', 'BASF',                  'BAS',  'Materials',              'DE',     'BAS:XETR'),
  ('stock', 'Bayer',                 'BAYN', 'Health Care',            'DE',     'BAYN:XETR'),
  ('stock', 'Puma',                  'PUM',  'Consumer Discretionary', 'DE',     'PUM:XETR'),
  ('stock', 'Zalando',               'ZAL',  'Consumer Discretionary', 'DE',     'ZAL:XETR'),
  ('stock', 'Ferrari',               'RACE', 'Consumer Discretionary', 'IT',     'RACE'),
  ('stock', 'Airbus',                'AIR',  'Industrials',            'FR',     'AIR:XETR'),
  ('stock', 'ASML',                  'ASML', 'Technology',             'NL',     'ASML:XETR'),
  ('stock', 'JPMorgan Chase',        'JPM',  'Financials',             'US',     'JPM'),
  ('stock', 'Walmart',               'WMT',  'Consumer Staples',       'US',     'WMT'),
  ('stock', 'Home Depot',            'HD',   'Consumer Discretionary', 'US',     'HD'),
  ('stock', 'Costco',                'COST', 'Consumer Staples',       'US',     'COST'),
  ('stock', 'Procter & Gamble',      'PG',   'Consumer Staples',       'US',     'PG'),
  ('stock', 'Johnson & Johnson',     'JNJ',  'Health Care',            'US',     'JNJ'),
  ('stock', 'Pfizer',                'PFE',  'Health Care',            'US',     'PFE'),
  ('stock', 'Eli Lilly',             'LLY',  'Health Care',            'US',     'LLY'),
  ('stock', 'Exxon Mobil',           'XOM',  'Energy',                 'US',     'XOM'),
  ('stock', 'Chevron',               'CVX',  'Energy',                 'US',     'CVX'),
  ('stock', 'Boeing',                'BA',   'Industrials',            'US',     'BA'),
  ('stock', 'Caterpillar',           'CAT',  'Industrials',            'US',     'CAT'),
  ('stock', 'Salesforce',            'CRM',  'Technology',             'US',     'CRM'),
  ('stock', 'Adobe',                 'ADBE', 'Technology',             'US',     'ADBE'),
  ('stock', 'Broadcom',              'AVGO', 'Technology',             'US',     'AVGO'),
  ('stock', 'Cisco',                 'CSCO', 'Technology',             'US',     'CSCO'),
  ('stock', 'Qualcomm',              'QCOM', 'Technology',             'US',     'QCOM'),
  ('stock', 'Spotify',               'SPOT', 'Communication Services', 'US',     'SPOT'),
  ('stock', 'Shopify',               'SHOP', 'Technology',             'CA',     'SHOP'),
  ('stock', 'Alibaba',               'BABA', 'Consumer Discretionary', 'CN',     'BABA'),
  ('stock', 'Deutsche Bank',         'DBK',  'Financials',             'DE',     'DBK:XETR'),
  ('stock', 'DHL Group',             'DHL',  'Industrials',            'DE',     'DHL:XETR'),
  ('stock', 'Infineon',              'IFX',  'Technology',             'DE',     'IFX:XETR'),
  ('stock', 'Beiersdorf',            'BEI',  'Consumer Staples',       'DE',     'BEI:XETR'),
  ('stock', 'Henkel',                'HEN3', 'Consumer Staples',       'DE',     'HEN3:XETR'),
  ('stock', 'RWE',                   'RWE',  'Utilities',              'DE',     'RWE:XETR'),
  ('stock', 'E.ON',                  'EOAN', 'Utilities',              'DE',     'EOAN:XETR'),
  ('stock', 'Novartis',              'NOVN', 'Health Care',            'CH',     'NOVN'),
  ('stock', 'Roche',                 'ROG',  'Health Care',            'CH',     'ROG'),
  ('stock', 'TotalEnergies',         'TTE',  'Energy',                 'FR',     'TTE'),
  ('stock', 'Inditex',               'ITX',  'Consumer Discretionary', 'ES',     'ITX'),
  ('stock', 'Shell',                 'SHEL', 'Energy',                 'GB',     'SHEL'),
  ('stock', 'Unilever',              'ULVR', 'Consumer Staples',       'GB',     'ULVR'),
  ('stock', 'AstraZeneca',           'AZN',  'Health Care',            'GB',     'AZN'),
  ('stock', 'L''Oréal',              'OR',   'Consumer Staples',       'FR',     'OR'),
  ('stock', 'Novo Nordisk',          'NOVO-B','Health Care',           'DK',     'NOVO-B'),
  ('etf',   'iShares Core MSCI World',          'IWDA', 'Welt',             'Global', 'IWDA:XETR'),
  ('etf',   'iShares Core S&P 500',             'CSPX', 'USA',              'US',     'CSPX:XETR'),
  ('etf',   'iShares Core MSCI EM IMI',         'EIMI', 'Schwellenländer',  'Global', 'EIMI:XETR');

-- Start-Kurse, damit die App sofort Preise hat. Im Betrieb aktualisiert der
-- Cron `update-prices` diese stündlich über die aktive MarketDataSource.
insert into price_snapshots (instrument_id, price_cents, as_of, source)
select id,
  case ticker
    when 'AAPL' then 21000 when 'MSFT' then 42000 when 'AMZN' then 19000
    when 'GOOGL' then 17000 when 'NVDA' then 12000 when 'TSLA' then 25000
    when 'SAP' then 22000 when 'SIE' then 19000 when 'VOW3' then 9500
    when 'ALV' then 30000 when 'ADS' then 22000 when 'MBG' then 6000
    when 'NESN' then 8500 when 'MC' then 65000 when 'IWDA' then 9500
    when 'CSPX' then 55000 when 'EIMI' then 3500
    when 'META' then 55000 when 'NFLX' then 70000 when 'DIS' then 9000 when 'KO' then 6000
    when 'PEP' then 15000 when 'MCD' then 27000 when 'SBUX' then 8500 when 'NKE' then 7000
    when 'V' then 27000 when 'MA' then 45000 when 'PYPL' then 6500 when 'INTC' then 2200
    when 'AMD' then 14000 when 'ORCL' then 16000 when 'UBER' then 7000 when 'ABNB' then 12000
    when 'BMW' then 8500 when 'P911' then 4500 when 'DTE' then 2800 when 'BAS' then 4500
    when 'BAYN' then 2700 when 'PUM' then 3500 when 'ZAL' then 3000 when 'RACE' then 38000
    when 'AIR' then 16000 when 'ASML' then 75000
    when 'JPM' then 22000 when 'WMT' then 9000 when 'HD' then 38000 when 'COST' then 90000
    when 'PG' then 16000 when 'JNJ' then 15000 when 'PFE' then 2800 when 'LLY' then 90000
    when 'XOM' then 11000 when 'CVX' then 15000 when 'BA' then 18000 when 'CAT' then 35000
    when 'CRM' then 28000 when 'ADBE' then 50000 when 'AVGO' then 16000 when 'CSCO' then 5500
    when 'QCOM' then 17000 when 'SPOT' then 45000 when 'SHOP' then 9000 when 'BABA' then 9000
    when 'DBK' then 1600 when 'DHL' then 4000 when 'IFX' then 3300 when 'BEI' then 13000
    when 'HEN3' then 7500 when 'RWE' then 3300 when 'EOAN' then 1200 when 'NOVN' then 9500
    when 'ROG' then 25000 when 'TTE' then 6000 when 'ITX' then 4500 when 'SHEL' then 3000
    when 'ULVR' then 4800 when 'AZN' then 12000 when 'OR' then 38000 when 'NOVO-B' then 9000
    else 10000
  end,
  now(), 'simulated'
from instruments;

-- Aktueller Kurs (prices) aus denselben Startkursen – die App liest aus prices.
insert into prices (instrument_id, price_cents, as_of, source)
select instrument_id, price_cents, as_of, source from price_snapshots
on conflict (instrument_id) do update
  set price_cents = excluded.price_cents, as_of = excluded.as_of, source = excluded.source;
