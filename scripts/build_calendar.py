#!/usr/bin/env python3
"""Build the bilingual sales calendar and RFC 5545 feed from the map's three feeds.

Only published sale dates are scheduled. Permit validity windows are NOT sale
dates. Unknown hours become all-day entries, never guessed opening hours.
No third-party dependencies are needed in the Pages build.
"""
from __future__ import annotations
import argparse
import hashlib
import html
import json
import math
import re
import sys
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sales_quality as quality
CT = ZoneInfo('America/Chicago')
ORIGIN = 'https://www.chicasmap.com'
SOURCES = ('san-antonio.json', 'san-antonio-email.json', 'san-antonio-user.json')


def parsed_date(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def sale_id(s):
    for key in ('external_id', 'id', 'sale_id'):
        if s.get(key):
            return str(s[key])
    try:
        lat, lon = float(s.get('lat')), float(s.get('lon', s.get('lng')))
        if not (math.isfinite(lat) and math.isfinite(lon)):
            raise ValueError()
        return f'{lat:.5f},{lon:.5f}|' + str(s.get('title') or s.get('address') or '')
    except (ValueError, TypeError):
        return 'address|' + str(s.get('address') or '') + '|' + str(s.get('title') or '')


def hours_range(value):
    """Only an explicit pair with AM/PM is safe to interpret as opening hours."""
    value = re.sub(r'\s+', '', str(value or '').lower()).replace('.', '')
    m = re.fullmatch(r'(\d{1,2})(?::(\d{2}))?(am|pm)(?:-|–|—|to)(\d{1,2})(?::(\d{2}))?(am|pm)', value)
    if not m:
        return None
    def clock(h, minute, period):
        h, minute = int(h), int(minute or 0)
        if not 1 <= h <= 12 or not 0 <= minute < 60:
            raise ValueError()
        return time(h % 12 + (12 if period == 'pm' else 0), minute)
    try:
        return clock(*m.group(1, 2, 3)), clock(*m.group(4, 5, 6))
    except ValueError:
        return None


def collect(root, today):
    sales, undated, seen = [], [], set()
    dataset, _report = quality.clean(root, today)
    for raw in dataset['public'] + dataset['unconfirmed']:
        identity = sale_id(raw)
        if identity in seen:
            continue
        seen.add(identity)
        start = parsed_date(raw.get('date_start') or raw.get('date_from') or raw.get('start_date'))
        end = parsed_date(raw.get('date_end') or raw.get('date_to') or raw.get('end_date')) or start
        uncertain_permit = raw not in dataset['public']
        row = {
            'id': identity,
            'title': html.unescape(str(raw.get('title') or raw.get('name') or 'Sale')),
            'kind': str(raw.get('type') or raw.get('kind') or 'garage'),
            'address': str(raw.get('address') or raw.get('addr') or ''),
            'neighborhood': str(raw.get('neighborhood') or raw.get('area') or ''),
            'hours': str(raw.get('hours') or ''),
            'details': html.unescape(str(raw.get('details') or '')),
            'dateNote': str(raw.get('date_note') or ''),
            'source': str(raw.get('source') or ''),
            'url': ORIGIN + '/map/?sale=' + quote(identity, safe=''),
        }
        try:
            lat, lon = float(raw.get('lat')), float(raw.get('lon', raw.get('lng')))
            if math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180:
                row.update(lat=lat, lon=lon)
        except (ValueError, TypeError):
            pass
        if end and end < today:
            continue
        if not start or not end or end < start or uncertain_permit:
            undated.append(row)
            continue
        row.update(start=start.isoformat(), end=end.isoformat())
        sales.append(row)
    days = []
    for sale in sales:
        day, last = max(today, parsed_date(sale['start'])), parsed_date(sale['end'])
        while day <= last:
            days.append(dict(sale, day=day.isoformat()))
            day += timedelta(days=1)
    days.sort(key=lambda s: (s['day'], s['title'].casefold(), s['id']))
    return sales, days, undated


def ical_escape(value):
    return str(value).replace('\\', '\\\\').replace('\r\n', '\n').replace('\r', '\n').replace('\n', '\\n').replace(';', '\\;').replace(',', '\\,')


def fold(line):
    """75 octets max, including continuation space; never split UTF-8."""
    result, current, size = [], '', 0
    for char in line:
        n = len(char.encode('utf-8'))
        if size + n > 75:
            result.append(current)
            current, size = ' ', 1
        current += char
        size += n
    result.append(current)
    return '\r\n'.join(result)


def build_ics(days, stamp):
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chicas Map//Unified Sales Calendar//EN',
             'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', "X-WR-CALNAME:Chica's Map – San Antonio Sales",
             'X-WR-TIMEZONE:America/Chicago', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H']
    for sale in days:
        day = parsed_date(sale['day'])
        uid = hashlib.sha256((sale['id'] + '|' + sale['day']).encode()).hexdigest()[:40] + '@chicasmap.com'
        lines += ['BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + stamp]
        hours = hours_range(sale['hours'])
        if hours:
            begin = datetime.combine(day, hours[0], CT)
            finish = datetime.combine(day, hours[1], CT)
            if finish <= begin:
                finish += timedelta(days=1)
            lines += ['DTSTART:' + begin.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ'),
                      'DTEND:' + finish.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')]
        else:
            lines += ['DTSTART;VALUE=DATE:' + day.strftime('%Y%m%d'), 'DTEND;VALUE=DATE:' + (day + timedelta(days=1)).strftime('%Y%m%d')]
        description = '\n'.join(filter(None, [sale['hours'] or 'Hours not published; verify with seller.',
                       sale['dateNote'], sale['details'], 'Source: ' + sale['source'], 'View on Chica\'s Map: ' + sale['url']]))
        lines += ['SUMMARY:' + ical_escape(sale['title']), 'LOCATION:' + ical_escape(sale['address'] or sale['neighborhood'] or 'San Antonio area'),
                  'DESCRIPTION:' + ical_escape(description), 'URL:' + sale['url'], 'TRANSP:TRANSPARENT']
        if 'lat' in sale:
            lines.append(f"GEO:{sale['lat']};{sale['lon']}")
        lines.append('END:VEVENT')
    lines.append('END:VCALENDAR')
    return ('\r\n'.join(fold(line) for line in lines) + '\r\n').encode('utf-8')


LABELS = {
    'en': dict(title='San Antonio sales calendar', intro='Hi neighbor! Plan your next treasure hunt with every dated sale in Chica’s unified map feed.',
               home='Home', listing='Sale list', map='Open the map', language='Español', agenda='Upcoming sales by day',
               subscribe='Subscribe to every sale', apple='Apple / Outlook', copy='Copy feed link',
               note='Times are America/Chicago (CT). Missing or incomplete hours appear as all-day entries, not confirmed opening hours. Dates come from listings and may include estimates; verify with the seller. Subscriptions refresh on your calendar app’s schedule.',
               filter='Sale type', all='All types', previous='Previous month', next='Next month', today='This month',
               unknown='Date not confirmed', unknownNote='These map entries have no usable sale date. Permit validity windows are not sale dates, so these are not included in the subscription.',
               hours='Hours not published — verify with seller', view='View on map', empty='No upcoming dated sales yet.',
               count='sales', days='sale-days', generated='Updated'),
    'es': dict(title='Calendario de ventas de San Antonio', intro='¡Hola, vecino! Planea tu próxima búsqueda de tesoros con todas las ventas con fecha del mapa de Chica.',
               home='Inicio', listing='Lista de ventas', map='Abrir el mapa', language='English', agenda='Próximas ventas por día',
               subscribe='Suscríbete a todas las ventas', apple='Apple / Outlook', copy='Copiar enlace del calendario',
               note='El horario es de America/Chicago (CT). Las horas incompletas o no publicadas aparecen como eventos de día completo, no como horarios confirmados. Las fechas provienen de los anuncios y pueden ser estimadas; confirma con el vendedor. Tu aplicación decide cuándo actualizar la suscripción.',
               filter='Tipo de venta', all='Todos los tipos', previous='Mes anterior', next='Mes siguiente', today='Este mes',
               unknown='Fecha sin confirmar', unknownNote='Estas entradas del mapa no tienen una fecha de venta utilizable. La vigencia del permiso no es la fecha de la venta; no se incluyen en la suscripción.',
               hours='Horario no publicado — confirma con el vendedor', view='Ver en el mapa', empty='Aún no hay ventas próximas con fecha.',
               count='ventas', days='días de venta', generated='Actualizado'),
}
KIND_ES = {'garage': 'Garage', 'yard': 'Patio', 'estate': 'Liquidación', 'moving': 'Mudanza', 'community': 'Comunitaria', 'permit': 'Permiso'}


def render(template, lang, sales, days, undated, today):
    labels = LABELS[lang]
    esc = lambda s: html.escape(str(s), quote=True)
    def card(s):
        hours = s['hours'] or labels['hours']
        return ('<article class="sale" data-kind="' + esc(s['kind']) + '"><h3><a href="' + esc(s['url']) + '">' + esc(s['title']) + '</a></h3>'
                '<p>' + esc(hours) + ' · CT</p><p>' + esc(' · '.join(filter(None, [s['neighborhood'], s['address']]))) + '</p>'
                + ('<p class="muted">' + esc(s['dateNote']) + '</p>' if s['dateNote'] else '')
                + '<small>' + esc(KIND_ES.get(s['kind'], s['kind']) if lang == 'es' else s['kind'].title()) + ' · ' + esc(s['source']) + '</small>'
                '<p><a href="' + esc(s['url']) + '">' + labels['view'] + ' →</a></p></article>')
    grouped = defaultdict(list)
    for sale in days:
        grouped[sale['day']].append(sale)
    agenda = ''.join('<section class="day-group" id="day-' + day + '" data-date="' + day + '"><h2><time datetime="' + day + '">' + day + '</time></h2>' + ''.join(card(s) for s in entries) + '</section>' for day, entries in grouped.items())
    unknown = ('<section id="undated"><h2>' + labels['unknown'] + '</h2><p>' + labels['unknownNote'] + '</p>' + ''.join(card(s) for s in undated) + '</section>') if undated else ''
    options = '<option value="">' + labels['all'] + '</option>' + ''.join('<option value="' + esc(kind) + '">' + esc(KIND_ES.get(kind, kind) if lang == 'es' else kind.title()) + '</option>' for kind in sorted({s['kind'] for s in sales + undated}))
    values = dict(labels, lang=lang, prefix='/es' if lang == 'es' else '', other='/calendar/' if lang == 'es' else '/es/calendar/',
                  agenda_html=agenda or '<p>' + labels['empty'] + '</p>', undated_html=unknown, options=options,
                  count_text=f"{len(sales)} {labels['count']} · {len(days)} {labels['days']}", date=today.isoformat())
    return re.sub(r'\{\{(\w+)\}\}', lambda m: str(values[m[1]]), template)


def build(root, today=None):
    today = today or datetime.now(CT).date()
    quality.build(root, today)
    sales, days, undated = collect(root, today)
    stamp = datetime.combine(today, time.min, CT).astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    (root / 'calendar.ics').write_bytes(build_ics(days, stamp))
    payload = dict(generated=today.isoformat(), timezone='America/Chicago', saleCount=len(sales), eventCount=len(days), undatedCount=len(undated), days=days)
    (root / 'data' / 'calendar.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    template = (ROOT / 'templates' / 'calendar.html').read_text()
    for lang, sub in [('en', 'calendar'), ('es', 'es/calendar')]:
        folder = root / sub
        folder.mkdir(parents=True, exist_ok=True)
        (folder / 'index.html').write_text(render(template, lang, sales, days, undated, today))
    print(f'calendar: {len(sales)} upcoming sales, {len(days)} VEVENT sale-days, {len(undated)} unconfirmed-date entries; today={today} CT')
    return payload


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', default='_site', type=Path)
    parser.add_argument('--today', type=date.fromisoformat)
    args = parser.parse_args()
    build(args.root, args.today)
