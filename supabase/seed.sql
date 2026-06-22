-- Hofino Seed – repräsentative Instrumente zum Testen von Schema & Simulator (M2/M3).
-- Vollständiges Universum (~200 Unternehmen + 10 ETFs inkl. ISIN/WKN) kommt mit M4.

insert into instruments (type, name, ticker, sector, country) values
  ('stock', 'Apple',                 'AAPL', 'Technology',             'US'),
  ('stock', 'Microsoft',             'MSFT', 'Technology',             'US'),
  ('stock', 'Amazon',                'AMZN', 'Consumer Discretionary', 'US'),
  ('stock', 'Alphabet',              'GOOGL','Communication Services', 'US'),
  ('stock', 'Nvidia',                'NVDA', 'Technology',             'US'),
  ('stock', 'Tesla',                 'TSLA', 'Consumer Discretionary', 'US'),
  ('stock', 'SAP',                   'SAP',  'Technology',             'DE'),
  ('stock', 'Siemens',               'SIE',  'Industrials',            'DE'),
  ('stock', 'Volkswagen',            'VOW3', 'Consumer Discretionary', 'DE'),
  ('stock', 'Allianz',               'ALV',  'Financials',             'DE'),
  ('stock', 'Adidas',                'ADS',  'Consumer Discretionary', 'DE'),
  ('stock', 'Mercedes-Benz Group',   'MBG',  'Consumer Discretionary', 'DE'),
  ('stock', 'Nestlé',                'NESN', 'Consumer Staples',       'CH'),
  ('stock', 'LVMH',                  'MC',   'Consumer Discretionary', 'FR'),
  ('etf',   'iShares Core MSCI World',          'IWDA', 'Welt',             'Global'),
  ('etf',   'iShares Core S&P 500',             'CSPX', 'USA',              'US'),
  ('etf',   'iShares Core MSCI EM IMI',         'EIMI', 'Schwellenländer',  'Global');
