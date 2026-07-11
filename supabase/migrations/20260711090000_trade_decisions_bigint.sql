-- Review-Fund P2-18: trade_decisions speicherte Geldbeträge als integer statt bigint
-- (Verstoß gegen Domänenregel §4 „Geld immer als bigint in Cent"). place_order liefert
-- price_cents als bigint — ab ~21,4 Mio. Cent wäre die Spalte übergelaufen.
alter table trade_decisions
  alter column virtual_price_cents type bigint,
  alter column fee_cents type bigint;
