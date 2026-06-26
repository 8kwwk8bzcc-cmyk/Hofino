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
    when 'CSPX' then 55000 when 'EIMI' then 3500 else 10000
  end,
  now(), 'simulated'
from instruments;

-- Aktueller Kurs (prices) aus denselben Startkursen – die App liest aus prices.
insert into prices (instrument_id, price_cents, as_of, source)
select instrument_id, price_cents, as_of, source from price_snapshots
on conflict (instrument_id) do update
  set price_cents = excluded.price_cents, as_of = excluded.as_of, source = excluded.source;
