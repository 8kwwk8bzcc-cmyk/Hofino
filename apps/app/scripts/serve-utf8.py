#!/usr/bin/env python3
"""Statischer Datei-Server für Heimnetz-/Cockpit-Test.

Wie ``python3 -m http.server``, deklariert aber explizit ``charset=utf-8`` für
text-, JS-, CSS- und JSON-Antworten. Ohne diese Deklaration interpretieren
manche Browser (vor allem iOS Safari) die UTF-8-kodierten Umlaute im
JS-Bundle falsch ("ä" wird zerstört). Am Desktop fällt das meist nicht auf,
weil dort die Dokument-Kodierung als Fallback greift.

    python3 serve-utf8.py <port> <directory>
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
DIRECTORY = sys.argv[2] if len(sys.argv) > 2 else "."

# Text-artige Typen, die zwingend als UTF-8 ausgeliefert werden müssen.
_NEEDS_UTF8 = ("text/javascript", "application/javascript", "text/css", "application/json")


class Utf8Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def guess_type(self, path):
        ctype = super().guess_type(path)
        base = ctype.split(";")[0].strip()
        if "charset=" not in ctype and (base.startswith("text/") or base in _NEEDS_UTF8):
            return base + "; charset=utf-8"
        return ctype


if __name__ == "__main__":
    with ThreadingHTTPServer(("0.0.0.0", PORT), Utf8Handler) as httpd:
        httpd.serve_forever()
