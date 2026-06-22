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

-- Start-Kurse, damit die App sofort Preise hat. Im Betrieb aktualisiert der
-- Cron `hourly-price-update` diese stündlich über den Simulator.
insert into price_snapshots (instrument_id, price_cents, as_of)
select id,
  case ticker
    when 'AAPL' then 21000 when 'MSFT' then 42000 when 'AMZN' then 19000
    when 'GOOGL' then 17000 when 'NVDA' then 12000 when 'TSLA' then 25000
    when 'SAP' then 22000 when 'SIE' then 19000 when 'VOW3' then 9500
    when 'ALV' then 30000 when 'ADS' then 22000 when 'MBG' then 6000
    when 'NESN' then 8500 when 'MC' then 65000 when 'IWDA' then 9500
    when 'CSPX' then 55000 when 'EIMI' then 3500 else 10000
  end,
  now()
from instruments;
