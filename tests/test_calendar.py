"""Run: python3 -m unittest discover -s tests -v
Optional independent RFC validation: pip install icalendar
"""
import importlib.util
import json
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

spec = importlib.util.spec_from_file_location('calendar_build', Path(__file__).resolve().parents[1] / 'scripts/build_calendar.py')
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class CalendarTests(unittest.TestCase):
    def sale(self, **kw):
        return dict(external_id='sale-1', title='Neighbor sale, treasures; 🐾', address='1 Main St',
                    date_start='2026-11-07', date_end='2026-11-08', type='garage', hours='8 AM – 2 PM',
                    lat=29.4, lon=-98.5, **kw)

    def test_collection_all_sources_dedup_expired_and_permits(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'data/cities').mkdir(parents=True)
            for i, name in enumerate(b.SOURCES):
                sale = self.sale()
                if i == 1:
                    sale['external_id'] = 'email-only'
                (root / 'data/cities' / name).write_text(json.dumps(dict(public=[sale], permits=[dict(external_id='permit',type='estate',permit_number='123',categories=['permit'],date_from='2026-11-01',date_to='2026-11-15')])) )
            sales, days, undated = b.collect(root, date(2026,11,7))
            self.assertEqual((len(sales), len(days), len(undated)), (2,4,1))
            self.assertEqual(b.collect(root, date(2026,11,16)), ([],[],[]))

    def test_hours_are_not_invented(self):
        for value in ['from 8 AM', 'Starting at 8AM', 'all day', '', '8-3', '13am-4pm']:
            self.assertIsNone(b.hours_range(value))
        for value in ['8 AM – 2 PM', '9am-4pm', '8am to 3pm', '9 a.m. – 6 p.m.']:
            self.assertIsNotNone(b.hours_range(value))

    def test_rfc_and_stable_uid_and_timezone(self):
        sale = self.sale()
        data = [dict(sale, id='sale-1',day='2026-11-07',url=b.ORIGIN+'/map/?sale=sale-1',dateNote='',details=('🐾,;\\\n'*100),source='Test')]
        raw = b.build_ics(data, '20261107T060000Z')
        self.assertNotIn(b'\n', raw.replace(b'\r\n', b''))
        self.assertTrue(all(len(line)<=75 for line in raw.split(b'\r\n')))
        self.assertIn(b'DTSTART:20261107T140000Z',raw)
        self.assertIn(b'DTEND:20261107T200000Z',raw)
        try:
            from icalendar import Calendar
        except ImportError:
            self.skipTest('Install icalendar for independent parsing')
        cal = Calendar.from_ical(raw)
        event = cal.walk('VEVENT')[0]
        self.assertEqual(str(event['SUMMARY']),sale['title'])
        self.assertEqual(str(event['DESCRIPTION']).count('🐾'),100)
        self.assertEqual(event.decoded('DTSTART'),datetime(2026,11,7,14,tzinfo=timezone.utc))
        changed = Calendar.from_ical(b.build_ics([dict(data[0],title='Changed')], '20261108T060000Z')).walk('VEVENT')[0]
        self.assertEqual(event['UID'],changed['UID'])
        unknown = Calendar.from_ical(b.build_ics([dict(data[0],hours='from 9 AM')], '20261107T060000Z')).walk('VEVENT')[0]
        self.assertEqual(unknown.decoded('DTSTART'),date(2026,11,7))
        self.assertEqual(unknown.decoded('DTEND'),date(2026,11,8))
        # DST: same opening hour in July has a different UTC offset.
        summer = Calendar.from_ical(b.build_ics([dict(data[0],day='2026-07-11')], '20260711T050000Z')).walk('VEVENT')[0]
        self.assertEqual(summer.decoded('DTSTART').hour,13)

    def test_html_escaping_and_bilingual_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root / 'data/cities').mkdir(parents=True)
            for filename in b.SOURCES:
                row=self.sale();row['title']='<script>alert(1)</script>'
                (root / 'data/cities' / filename).write_text(json.dumps(dict(public=[row])))
            payload=b.build(root,date(2026,11,7))
            self.assertEqual(payload['eventCount'],2)
            en=(root/'calendar/index.html').read_text()
            es=(root/'es/calendar/index.html').read_text()
            self.assertNotIn('<script>alert(1)</script>',en)
            self.assertIn('&lt;script&gt;',en)
            self.assertIn('Calendario de ventas de San Antonio',es)
            self.assertNotIn('{{',es)
            self.assertIn('/Chicas-Map/es/list/',es)
            self.assertNotIn('/Chicas-Map//',en)


if __name__ == '__main__':
    unittest.main()
