"""One conservative San Antonio sale-event policy for map, calendar and ICS.
Raw city/email/Facebook inputs are never rewritten. All dates are CT calendar dates.
"""
from __future__ import annotations
import copy, hashlib, html, json, math, re, unicodedata
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

CT = ZoneInfo('America/Chicago')
SOURCES = ('san-antonio.json', 'san-antonio-email.json', 'san-antonio-user.json')
CENTER = (29.4241, -98.4936)
RADIUS_M = 60 * 1609.344
VERSION = 46
ALIASES = dict(street='st', avenue='ave', drive='dr', road='rd', lane='ln', boulevard='blvd', court='ct', circle='cir', parkway='pkwy', place='pl', terrace='ter', trail='trl', view='vw', vista='vis', landing='lndg', bend='bnd', beach='bch', crossing='xing', grove='grv', branch='br', river='riv', fort='ft', north='n', south='s', east='e', west='w')
MONTHS = {name:i for i,names in enumerate(['jan january','feb february','mar march','apr april','may','jun june','jul july','aug august','sep sept september','oct october','nov november','dec december'],1) for name in names.split()}
MONTH_RE = '(?:'+'|'.join(sorted(MONTHS,key=len,reverse=True))+')'
WEEKDAYS = {'mon':0,'tue':1,'wed':2,'thu':3,'fri':4,'sat':5,'sun':6}

def today_ct(): return datetime.now(CT).date()
def parsed(value):
    if isinstance(value, datetime): return value.astimezone(CT).date() if value.tzinfo else value.date()
    if isinstance(value, date): return value
    for fmt in ('%Y-%m-%d','%m/%d/%Y'):
        try: return datetime.strptime(str(value)[:10],fmt).date()
        except (ValueError,TypeError): pass
    return None

def post_day(pin):
    for key in ('posted_at','post_date','published_at','posted','timestamp'):
        value=pin.get(key)
        if not value: continue
        try:
            if isinstance(value,(int,float)): return datetime.fromtimestamp(value,CT).date()
            dt=datetime.fromisoformat(str(value).replace('Z','+00:00'))
            return dt.astimezone(CT).date() if dt.tzinfo else dt.date()
        except (ValueError,TypeError,OverflowError):
            d=parsed(value)
            if d: return d
    return None

def parse_explicit_dates(text, reference=None, year=None):
    """Absolute ranges first; weekday/relative wording requires a real post date.
    Bare weekdays use the nearest weekday to the post (not a moving scrape date).
    """
    t=re.sub(r'\s+',' ',html.unescape(str(text or '')).lower()).replace('–','-').replace('—','-')
    year=year or (reference.year if reference else today_ct().year)
    found=[]
    def add(y,m,d):
        try: found.append(date(int(y),int(m),int(d)))
        except ValueError: pass
    for m in re.finditer(r'\b(20\d{2})-(\d{2})-(\d{2})\b',t): add(*m.groups())
    for m in re.finditer(r'\b(\d{1,2})/(\d{1,2})(?:/(20\d{2}|\d{2}))?(?:\s*(?:-|&|and|to)\s*(?:(\d{1,2})/)?(\d{1,2})(?:/(20\d{2}|\d{2}))?(?!\d|:\d|\s*(?:[ap]\.?m\.?|[ap])\b))?(?!\d)',t):
        mo,d,y,mo2,d2,y2=m.groups();y=int(y) if y else year;y=y+2000 if y<100 else y
        add(y,mo,d)
        if d2:
            ey=int(y2) if y2 else y;ey=ey+2000 if ey<100 else ey
            if not y2 and int(mo2 or mo)<int(mo): ey+=1
            add(ey,mo2 or mo,d2)
    pattern=r'\b('+MONTH_RE+r')\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)(?:\s*(?:-|&|and|to)\s*(?:('+MONTH_RE+r')\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?(?!\d|:\d|\s*(?:[ap]\.?m\.?|[ap])\b))?(?:,?\s+(20\d{2}))?'
    for m in re.finditer(pattern,t):
        mon,d,mon2,d2,y=m.groups();y=int(y or year);add(y,MONTHS[mon],d)
        if d2: add(y+(1 if mon2 and MONTHS[mon2]<MONTHS[mon] else 0),MONTHS[mon2 or mon],d2)
    if found: return min(found),max(found),'explicit'
    if not reference: return None,None,'no_explicit_date_or_post_date'
    for prefix,day in re.findall(r'\b(?:(next|last|this)\s+)?(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b',t):
        offset=(WEEKDAYS[day[:3]]-reference.weekday())%7
        if prefix=='next': offset=offset or 7
        elif prefix=='last': offset=offset-7 if offset else -7
        elif offset>3: offset-=7
        candidate=reference+timedelta(days=offset)
        if found and not prefix:
            # Keep a stated weekend together across the nearest-weekday boundary.
            candidate=found[0]+timedelta(days=(WEEKDAYS[day[:3]]-found[0].weekday())%7)
        found.append(candidate)
    if re.search(r'\btomorrow\b',t): found.append(reference+timedelta(days=1))
    elif re.search(r'\btoday\b',t): found.append(reference)
    if found: return min(found),max(found),'relative_to_post'
    return None,None,'no_sale_date'

def norm(value):
    value=unicodedata.normalize('NFKD',str(value or '')).encode('ascii','ignore').decode().lower()
    return ' '.join(ALIASES.get(w,w) for w in re.sub(r'[^a-z0-9]+',' ',value).split())
def address_key(address):
    a=str(address or '').lower()
    a=re.sub(r'\b(?:apt\.?|apartment|suite|ste\.?|unit)\s*#?\s*([a-z0-9-]+)',r' unit \1',a)
    a=re.sub(r'#\s*([a-z0-9-]+)',r' unit \1',a)
    parts=a.split(',');street=parts[0]
    street=re.sub(r'\s+(?:san antonio|schertz|spring branch|alamo heights|new braunfels|cibolo|boerne)\s+(?:tx|texas)\b.*$', '', street)
    street=re.sub(r'\s+(?:tx|texas)\b.*$', '', street)
    street=re.sub(r'\s+\d{5}(?:-\d{4})?\s*$', '', street)
    for part in parts[1:]:
        if re.match(r'\s*unit\s',part): street+=' '+part
    # ZIP is outside the street component; never remove a five-digit house number.
    return norm(street)
def house(address):
    m=re.match(r'\s*(\d+[a-z]?)\b',str(address or '').lower());return m[1] if m else ''
def unit(address):
    m=re.search(r'\bunit\s+(\w+)',address_key(address));return m[1] if m else ''
def identity(s):
    for k in ('external_id','id','sale_id'):
        if s.get(k):return str(s[k])
    c=coords(s)
    return (f"{c[0]:.5f},{c[1]:.5f}|" if c else "address|")+str(s.get("title") or s.get("address") or "")
def coords(s):
    try:
        lat,lon=float(s.get('lat',s.get('latitude'))),float(s.get('lon',s.get('lng',s.get('longitude'))))
        if math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180:return lat,lon
    except (ValueError,TypeError):pass
    return None

def distance(a,b):
    p,q=map(math.radians,[a[0],b[0]]);dy,dx=map(math.radians,[b[0]-a[0],b[1]-a[1]])
    h=math.sin(dy/2)**2+math.cos(p)*math.cos(q)*math.sin(dx/2)**2
    return 6371000*2*math.asin(min(1,math.sqrt(h)))
def geo_reason(s):
    address=str(s.get('address') or '')
    city=str(s.get('city') or '').strip().lower()
    urls=' '.join([str(s.get('url') or '')]+list(s.get('source_urls') or []))
    outside=r'austin|houston|dallas|lubbock|fort worth|el paso'
    if re.search(r'\b(?:'+outside+r')\b',city) or re.search(r'\b(?:'+outside+r')\s*,?\s*(?:tx|texas)\b',address,re.I) or re.search(r'/TX/(?:'+outside.replace(' ','-')+r')/',urls,re.I):return 'outside_metro_city'
    c=coords(s)
    if not c:return 'invalid_coordinates'
    if distance(CENTER,c)>RADIUS_M:return 'outside_60_mile_radius'
    return ''
def type_reason(s):
    t=' '.join(str(s.get(k) or '') for k in ('title','details','description')).lower()
    if str(s.get('status','')).lower() in ('expired','removed','rejected','cancelled','canceled','online_only') or s.get('plot') is False:return 'inactive_status'
    if s.get('in_person') is False or str(s.get('type','')).lower() in ('auction','online','online_only'):return 'auction_not_in_person_sale'
    if str(s.get('type','')).lower() in ('retail','thrift','shop','business') or re.search(r'\bby appointment\b|\bappointment only\b',t):return 'appointment_or_retail'
    if re.search(r'\bthrift (?:shop|store)\b|\bopen (?:daily|tues|tue|mon|sundays)\b|\bopening (?:hours|sale)\b|\bnow open\b|\bfrequent buyer\b',t):return 'recurring_retail'
    if re.search(r'\b(?:business closing|business liquidation|liquidation sale|liquidation of|liquidation center|ongoing)\b',t):return 'business_liquidation'
    if re.search(r'\bauction\b|\bctbids\b|\bbidding ends\b|\bsale ends.*pick up\b',t):return 'auction_not_in_person_sale'
    return ''
def community_key(s):
    title=norm(s.get('title',''))
    m=re.search(r'^(.*?)\b(?:community|neighborhood)(?: wide)? (?:garage |yard |rummage )?sale',title)
    if not m:return ''
    key=re.sub(r'\b(?:sat|saturday|sun|sunday|fri|friday|fall|spring|annual|huge|multi|family)\b','',m[1]).strip()
    return key if len(key)>4 else ''
def overlap(a,b):return a['date_start']<=b['date_end'] and b['date_start']<=a['date_end']
def duplicate(a,b):
    if not overlap(a,b):return False
    aa,ba=a.get('address',''),b.get('address','');ah,bh=house(aa),house(ba)
    if ah and bh and ah!=bh:return False # neighboring community homes are separate sales
    if unit(aa)!=unit(ba) and (unit(aa) or unit(ba)):return False
    if identity(a)==identity(b):return True
    aurls=set(a.get('source_urls') or [a.get('url')]);burls=set(b.get('source_urls') or [b.get('url')])
    if (aurls & burls)-{None,''}:return True
    if ah and bh and address_key(aa)==address_key(ba):return True
    ak,bk=community_key(a),community_key(b)
    if ak and ak==bk and not (ah and bh):return True
    ac,bc=coords(a),coords(b)
    accurate=lambda x: not re.search(r'cent(?:er|re)|centroid',str(x.get('geocode','')),re.I)
    if ac and bc and accurate(a) and accurate(b) and distance(ac,bc)<=50:
        # Never merge conflicting explicit addresses or units from neighboring homes.
        if ah and bh and address_key(aa)!=address_key(ba):return False
        at,bt=set(norm(a.get('title')).split()),set(norm(b.get('title')).split())
        return bool(at and bt and len(at&bt)/len(at|bt)>=0.6)
    return False

def source_urls(s):
    return sorted({str(u) for u in list(s.get('source_urls') or [])+[s.get('url'),s.get('original_url')] if u and str(u).startswith('http')})
def rank(s):
    return (s.get('_overlay',False), bool(house(s.get('address'))), 'census' in str(s.get('geocode','')),bool(s.get('hours')),len(str(s.get('details') or '')),bool(s.get('photos')),bool(s.get('external_id')))
def merge(group):
    ordered=sorted(group,key=rank,reverse=True);base=copy.deepcopy(ordered[0])
    for s in ordered[1:]:
        for k,v in s.items():
            if not base.get(k) and v is not None:base[k]=copy.deepcopy(v)
    # Overlay's explicit date/hours/location/ID win. Fill missing fields from richer sources.
    base['details']=max((str(s.get('details') or s.get('description') or '') for s in ordered),key=len)
    base['source_urls']=sorted({u for s in ordered for u in source_urls(s)})
    base['sources']=sorted({str(n) for s in ordered for n in (list(s.get('sources') or [])+[s.get('source')]) if n})
    base['aliases']=sorted({str(k) for s in ordered for k in ([identity(s)]+list(s.get('aliases') or []))})
    photos=[u for s in ordered if isinstance(s.get('photos'),list) for u in s['photos']]
    if photos:base['photos']=list(dict.fromkeys(photos))
    else:base['photos']=max((s.get('photos',0) for s in ordered if isinstance(s.get('photos',0),(int,float))),default=0)
    if not base.get('external_id'):base['external_id']='sale-'+hashlib.sha256((address_key(base.get('address'))+'|'+base['date_start']).encode()).hexdigest()[:20]
    return base

def clean(root,today=None):
    today=today or today_ct();today_s=today.isoformat();accepted=[];excluded=[];unconfirmed=[];raw_count=0;by_reason=Counter()
    for filename in SOURCES:
        data=json.loads((Path(root)/'data/cities'/filename).read_text())
        for raw in data.get('public',[])+data.get('permits',[]):
            raw_count+=1;s=copy.deepcopy(raw);s['_overlay']=filename=='san-antonio-user.json';s['_input_file']=filename
            s['address']=str(s.get('address') or s.get('street_address') or '')
            permit=s.get('type')=='permit' or s.get('permit_number') or 'permit' in (s.get('categories') or [])
            reason=''
            if permit:reason='unconfirmed_permit';unconfirmed.append(s)
            if not reason:reason=geo_reason(s)
            if not reason:reason=type_reason(s)
            if not reason:
                craigslist='craigslist' in str(s.get('source','')).lower()
                if craigslist:
                    reference=post_day(s)
                    start,end,certainty=parse_explicit_dates(' '.join(str(s.get(k) or '') for k in ('title','details','description','date_evidence')),reference,reference.year if reference else today.year)
                else:
                    start=parsed(s.get('date_start') or s.get('date_from') or s.get('start_date'));end=parsed(s.get('date_end') or s.get('date_to') or s.get('end_date')) or start;certainty='published'
                    if s.get('date_certainty') in ('unknown','estimated') or re.search(r'no date on listing|default from ingest|assumed', str(s.get('date_note') or ''), re.I):start=end=None
                if not start or not end:reason='unconfirmed_sale_date'
                elif end<start:reason='invalid_date_range'
                elif end<today:reason='past_sale'
                elif (end-start).days>31:reason='implausible_sale_window'
                elif start>today+timedelta(days=60):reason='too_far_ahead'
                else:
                    for k in ('date_start','date_from'):s[k]=start.isoformat()
                    for k in ('date_end','date_to','end_date'):s[k]=end.isoformat()
                    s.update(dates=start.isoformat()+((' – '+end.isoformat()) if end!=start else ''),date_certainty=certainty,date_bucket='live' if start<=today<=end else 'upcoming')
                    c=coords(s);s['lat'],s['lon']=c;s['source_urls']=source_urls(s);s['sources']=list(s.get('sources') or [])+[s.get('source') or 'Unknown']
            if reason:
                by_reason[reason]+=1;excluded.append(dict(reason=reason,input_file=filename,id=identity(s),title=s.get('title'),address=s.get('address'),url=s.get('url')))
            else:accepted.append(s)
    # Merge groups transitively using all members, not just a potentially coarse representative.
    groups=[]
    for s in accepted:
        hits=[i for i,g in enumerate(groups) if any(duplicate(s,x) for x in g)]
        if not hits:groups.append([s]);continue
        group=[s]
        for i in reversed(hits):group+=groups.pop(i)
        groups.append(group)
    public=[merge(g) for g in groups]
    merges=[dict(kept=identity(p),address=p.get('address'),merged_records=len(g),source_urls=p['source_urls'],titles=[x.get('title') for x in g]) for p,g in zip(public,groups) if len(g)>1]
    for p in public+unconfirmed:
        for key in list(p):
            if key.startswith('_'):del p[key]
    public.sort(key=lambda p:(p['date_start'],address_key(p['address']),p['external_id']))
    payload=dict(version=VERSION,city='san-antonio',generated=today_s,timezone='America/Chicago',status='live',policy='Explicit sale dates only; uncertain dates excluded. Sales starting more than 60 days out are held back. 60-mile SA metro. Raw overlays preserved.',total_locations=len(public),today_count=sum(p['date_start']<=today_s<=p['date_end'] for p in public),public=public,permits=[],unconfirmed=unconfirmed)
    report=dict(as_of=today_s,raw_records=raw_count,eligible_before_dedupe=len(accepted),canonical_sales=len(public),today_sales=payload['today_count'],duplicates_merged=len(accepted)-len(public),excluded_by_reason=dict(by_reason),excluded=excluded,merged=merges)
    validate(payload,today)
    return payload,report

def validate(payload,today=None):
    today=today or today_ct();public=payload.get('public',[]);errors=[];seen=set()
    for p in public:
        key=identity(p)
        if key in seen:errors.append('duplicate ID '+key)
        seen.add(key)
        start,end=parsed(p.get('date_start')),parsed(p.get('date_end'))
        if not start or not end or end<start or end<today:errors.append('past/invalid date '+key)
        if geo_reason(p):errors.append('invalid metro location '+key)
        if type_reason(p):errors.append('ineligible event type '+key)
    for i,p in enumerate(public):
        for q in public[i+1:]:
            if duplicate(p,q):errors.append('duplicate event '+identity(p)+' / '+identity(q))
    if payload.get('total_locations')!=len(public):errors.append('wrong total_locations')
    expected=sum(p.get('date_start','9999')<=today.isoformat()<=p.get('date_end','') for p in public)
    if payload.get('today_count')!=expected:errors.append('wrong today_count')
    if errors:raise ValueError('SALE QUALITY FAIL: '+'; '.join(errors))
    return True

def build(root,today=None):
    root=Path(root);payload,report=clean(root,today);(root/'data').mkdir(parents=True,exist_ok=True)
    (root/'data/sales-clean.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    (root/'data/sales-quality.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('SALE QUALITY PASS '+json.dumps({k:v for k,v in report.items() if k not in ('excluded','merged')},sort_keys=True))
    return payload,report
