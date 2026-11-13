"""Permanent source-to-output policy regressions. No network or third-party packages."""
import copy,importlib.util,json,subprocess,sys,tempfile,unittest
from datetime import date
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import sales_quality as q
TODAY=date(2026,11,7)

class QualityTests(unittest.TestCase):
    def pin(self,**kw):
        p=dict(address='123 Main Street, San Antonio, TX 78210',title='Neighborhood Garage Sale',date_start='2026-11-07',date_end='2026-11-08',source='GarageSaleFinder',lat=29.42,lon=-98.49,geocode='census',type='garage',status='verified',url='https://example.org/a')
        p.update(kw);return p
    def sources(self,root,main=(),overlay=(),email=()):
        (root/'data/cities').mkdir(parents=True,exist_ok=True)
        for name,rows in zip(q.SOURCES,[main,email,overlay]):(root/'data/cities'/name).write_text(json.dumps(dict(public=list(rows))))
    def clean(self,main=(),overlay=(),email=()):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.sources(root,main,overlay,email);return q.clean(root,TODAY)
    def test_numeric_month_and_year_ranges(self):
        for text,expected in [('11/4-11/5',('2026-11-04','2026-11-05')),('11/7-8',('2026-11-07','2026-11-08')),('November 6 & 7, 2026',('2026-11-06','2026-11-07')),('Nov 7 to Nov 8',('2026-11-07','2026-11-08')),('12/31/2026-1/1/2027',('2026-12-31','2027-01-01'))]:
            a,b,_=q.parse_explicit_dates(text,year=2026);self.assertEqual((a.isoformat(),b.isoformat()),expected)
    def test_sale_hours_are_not_range_end_days_and_html_dates_decode(self):
        for text,expected in [
            ('Friday 11/6 - 9:00 am - 4:00 pm Saturday 11/7 - 9:00 am - 4:00 pm',('2026-11-06','2026-11-07')),
            ('Saturday and Sunday Nov. 7 &amp; 8, 10am-3pm',('2026-11-07','2026-11-08')),
            ('Nov 7 - 10am',('2026-11-07','2026-11-07')),
            ('11/7 - 8PM',('2026-11-07','2026-11-07')),
        ]:
            a,b,_=q.parse_explicit_dates(text,year=2026);self.assertEqual((a.isoformat(),b.isoformat()),expected,text)
    def test_weekdays_anchor_to_post_not_scrape(self):
        ref=date(2026,11,5)
        a,b,_=q.parse_explicit_dates('Friday only',ref);self.assertEqual((a,b),(date(2026,11,6),date(2026,11,6)))
        a,b,_=q.parse_explicit_dates('Sat & Sun',ref);self.assertEqual((a,b),(date(2026,11,7),date(2026,11,8)))
        a,b,_=q.parse_explicit_dates('Sat & Sun',date(2026,11,4));self.assertEqual((a,b),(date(2026,11,7),date(2026,11,8)))
        self.assertIsNone(q.parse_explicit_dates('Friday only')[0])
        self.assertIsNone(q.parse_explicit_dates('Toys and tools for sale',ref)[0])
        self.assertEqual(q.post_day(dict(posted_at='2026-11-07T01:00:00Z')),date(2026,11,6))
    def test_address_case_suffix_zip_and_units(self):
        self.assertEqual(q.address_key('123 Main Street, Apt. 2, San Antonio, TX 78210'),q.address_key('123 MAIN ST #2, San Antonio TX 78201'))
        self.assertEqual(q.address_key('11915 Briarpath Street San Antonio TX 78249'),'11915 briarpath st')
        self.assertNotEqual(q.address_key('123 Main St #1'),q.address_key('123 Main St #2'))
    def test_overlay_wins_and_rich_fields_and_links_survive(self):
        main=self.pin(hours='8am-5pm',details='A much richer item description',photos=['https://example.org/photo.jpg'],external_id='main',date_end='2026-11-09')
        overlay=self.pin(address='123 MAIN ST, SAN ANTONIO, TX 78210',hours='9am-2pm',details='Verified',source='Facebook',external_id='fb-123',date_end='2026-11-07',url='https://facebook.com/posts/123')
        data,report=self.clean([main],[overlay]);p=data['public'][0];self.assertEqual(len(data['public']),1)
        self.assertEqual((p['external_id'],p['hours'],p['date_end']),('fb-123','9am-2pm','2026-11-07'))
        self.assertEqual(p['details'],main['details']);self.assertEqual(p['photos'],main['photos']);self.assertEqual(len(p['source_urls']),2);self.assertIn('main',p['aliases'])
    def test_different_dates_units_and_community_homes_are_not_collapsed(self):
        cases=[self.pin(date_start='2026-11-14',date_end='2026-11-14',url='https://example.org/b'),self.pin(address='123 Main St #2',url='https://example.org/c'),self.pin(address='125 Main St',url='https://example.org/a')]
        for other in cases:
            data,_=self.clean([self.pin(),other]);self.assertEqual(len(data['public']),2)
    def test_city_centroid_id_collisions_do_not_hide_real_homes(self):
        homes=[self.pin(address=f'{i} Piney Woods, Cibolo, TX',title='Community Garage Sale',lat=29.4241,lon=-98.4936,geocode='city-center',url='https://example.org/'+str(i)) for i in [309,312,317]]
        data,_=self.clean(homes);self.assertEqual(len(data['public']),3);self.assertEqual(len({p['external_id'] for p in data['public']}),3)
    def test_near_coordinates_only_for_compatible_locations(self):
        a=self.pin(address='Address withheld',external_id='a');b=self.pin(external_id='b',lat=29.4201,url='https://example.org/b')
        data,_=self.clean([a,b]);self.assertEqual(len(data['public']),1)
    def test_named_community_merge(self):
        a=self.pin(address='Kallison Bend near Culebra, San Antonio, TX',title='!!KALLISON RANCH COMMUNITY YARD SALE!!',url='https://example.org/k')
        b=self.pin(address='Kallison Ranch community, San Antonio, TX',title='KALLISON RANCH COMMUNITY YARD SALE SAT - NOV 7th!!',source='Facebook',external_id='fb-k',url='')
        data,_=self.clean([a],[b]);self.assertEqual(len(data['public']),1);self.assertEqual(data['public'][0]['external_id'],'fb-k')
    def test_geo_bounds_and_false_san_antonio_centroid(self):
        for p in [self.pin(lat=31),self.pin(address='123 Main St, Austin, TX'),self.pin(city='Austin, TX'),self.pin(address='123 Main St Austin TX 78757'),self.pin(url='https://www.estatesales.net/TX/Austin/78757/123')]:
            data,report=self.clean([p]);self.assertEqual(data['total_locations'],0)
    def test_retail_appointments_liquidations_auctions_and_status(self):
        for title in ['Thrift store now open','Deals by appointment','Liquidation Sale of business','Aladdin lamps auction','Antiques NOW OPEN SUNDAYS!']:
            data,_=self.clean([self.pin(title=title)]);self.assertEqual(data['total_locations'],0,title)
        data,_=self.clean([self.pin(title='Bowflex',details='Estate sale Friday to Sunday, furniture and tools')]);self.assertEqual(data['total_locations'],1)
        data,_=self.clean([self.pin(status='cancelled')]);self.assertEqual(data['total_locations'],0)
        for extra in [dict(type='auction'),dict(in_person=False),dict(type='Thrift')]:
            data,_=self.clean([self.pin(**extra)]);self.assertEqual(data['total_locations'],0)
    def test_no_synthetic_craigslist_dates_or_past_sale(self):
        for title in ['Moving sale 11/4-11/5','Garage sale Friday only','Garage sale']:
            data,report=self.clean([self.pin(title=title,source='Craigslist')]);self.assertEqual(data['total_locations'],0)
        data,_=self.clean([self.pin(title='Garage sale Saturday',source='Craigslist',posted_at='2026-11-06T12:00:00-06:00')]);self.assertEqual(data['public'][0]['date_end'],'2026-11-07')
    def test_validation_fails_loudly_for_past_duplicates_and_bad_geo(self):
        data,_=self.clean([self.pin()])
        for case in ['past','duplicate','geo']:
            poisoned=copy.deepcopy(data)
            if case=='past':poisoned['public'][0]['date_end']='2026-11-06'
            elif case=='duplicate':poisoned['public'].append(copy.deepcopy(poisoned['public'][0]));poisoned['total_locations']=2
            else:poisoned['public'][0]['lat']=31
            with self.assertRaisesRegex(ValueError,'SALE QUALITY FAIL'):q.validate(poisoned,TODAY)
    def test_build_preserves_overlay_and_detects_stale_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.sources(root,[],[self.pin(source='Facebook')]);raw=root/'data/cities/san-antonio-user.json';before=raw.read_bytes();q.build(root,TODAY);self.assertEqual(raw.read_bytes(),before)
            raw.write_text(json.dumps(dict(public=[])))
            check=subprocess.run([sys.executable,str(ROOT/'scripts/clean_sales.py'),str(root),'--check','--today','2026-11-07'],capture_output=True,text=True)
            self.assertNotEqual(check.returncode,0);self.assertIn('stale',check.stderr)
    def test_real_craigslist_import_has_no_three_day_fallback(self):
        sys.path.insert(0,str(ROOT/'webapp/scripts'));spec=importlib.util.spec_from_file_location('craigslist_quality_test',ROOT/'webapp/scripts/fetch_craigslist.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        module.today_ct=lambda:TODAY
        html='<span id="titletextonly">SALE_TITLE</span><div class="mapaddress">123 Main St</div><time datetime="2026-11-06T12:00:00-06:00"></time><section id="postingbody">Tools and toys</section>'
        module.fetch=lambda url:(200,html.replace('SALE_TITLE','Garage sale'))
        self.assertIsNone(module.enrich_detail('https://example.org',module.CITY_CFG['san-antonio']))
        module.fetch=lambda url:(200,html.replace('SALE_TITLE','Garage sale Saturday'))
        sale=module.enrich_detail('https://example.org',module.CITY_CFG['san-antonio']);self.assertEqual((sale['date_from'],sale['date_to']),('2026-11-07','2026-11-07'));self.assertTrue(sale['posted_at'])
    def test_actual_map_module_has_same_daily_and_total_counts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.sources(root,[self.pin(),self.pin(address='200 Main St',date_start='2026-11-14',date_end='2026-11-14')]);q.build(root,TODAY)
            subprocess.run(['node',str(ROOT/'tests/map_feed.cjs'),str(root/'data/sales-clean.json')],check=True)
    def test_all_views_and_both_pipelines_use_shared_policy(self):
        for path in ['webapp/js/chica-live-map.js','webapp/js/home-mini-map.js','webapp/js/home-fresh.js','webapp/list/index.html','scripts/build_seo_pages.mjs']:
            self.assertIn('sales-clean.json',(ROOT/path).read_text(),path)
        master=(ROOT/'scripts/master_populate.py').read_text();self.assertIn('sale output invariant check',master);self.assertIn('required=True',master)
        pages=(ROOT/'.github/workflows/pages.yml').read_text();self.assertLess(pages.index('python3 scripts/clean_sales.py _site'),pages.index('python3 scripts/build_calendar.py _site'))
        self.assertIn('scripts/clean_sales.py webapp --check',(ROOT/'.github/workflows/chica-daily.yml').read_text())
    def test_sales_more_than_60_days_out_are_held_back(self):
        soon=self.pin(title='Next month sale',date_start='2026-12-06',date_end='2026-12-06',url='https://example.org/soon')
        later=self.pin(title='SPRING Community Wide Rummage Sale',date_start='2027-05-01',date_end='2027-05-01',external_id='ae-100001993008949418',url='https://example.org/spring')
        data,report=self.clean([soon,later])
        titles={s['title'] for s in data['public']}
        self.assertIn('Next month sale',titles)
        self.assertNotIn('SPRING Community Wide Rummage Sale',titles)
        self.assertEqual(report['excluded_by_reason'].get('too_far_ahead'),1)

    def test_confidence_labels_explain_provenance_and_age(self):
        source=self.pin(source='Craigslist',url='https://craigslist.org/post/1')
        data,_=self.clean([source])
        self.assertEqual(data['public'][0]['confidence_label'],'source_confirmed')
        self.assertIn('does not mean',data['public'][0]['confidence_note'])
        community=self.pin(source='Facebook Marketplace',url='https://facebook.com/marketplace/item/1')
        data,_=self.clean([], [community])
        self.assertEqual(data['public'][0]['confidence_label'],'community_submitted')
        self.assertIn('not been independently confirmed',data['public'][0]['confidence_note'])
        missing=self.pin(source='Unknown',url=None)
        data,_=self.clean([missing])
        self.assertEqual(data['public'][0]['confidence_label'],'unconfirmed')
        old=self.pin(source='Craigslist',url='https://craigslist.org/post/old',posted_at='2026-10-20T09:00:00-05:00')
        data,_=self.clean([old])
        self.assertEqual(data['public'][0]['confidence_label'],'potentially_outdated')
        self.assertIn('18 days old',data['public'][0]['confidence_note'])
        no_post_date=self.pin(source='Craigslist',url='https://craigslist.org/post/no-date')
        data,_=self.clean([no_post_date])
        self.assertEqual(data['public'][0]['confidence_label'],'source_confirmed')

    def test_map_surfaces_confidence_and_original_listing_link(self):
        live=(ROOT/'webapp/js/chica-live-map.js').read_text()
        details=(ROOT/'webapp/js/pin-details.js').read_text()
        self.assertIn('confidence_label: s.confidence_label',live)
        self.assertIn('confidence_note: s.confidence_note',live)
        self.assertIn('View original listing',details)
        self.assertIn('Listing confidence',details)
        self.assertNotIn('Verified source',details)

if __name__=='__main__':unittest.main()
