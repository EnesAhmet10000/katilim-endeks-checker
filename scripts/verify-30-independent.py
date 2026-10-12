"""Independent comparison using Python CSV/HTML parsing, not production TS parsers."""
import csv, json, re, sys, unicodedata
from pathlib import Path
from html.parser import HTMLParser
from decimal import Decimal, InvalidOperation

folder=Path(sys.argv[1]); run=json.loads((folder/'run.json').read_text(encoding='utf-8'))
class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.rows=[]; self.cells=None; self.cell=None; self.skip=0; self.text=[]; self.anchors=[]; self.anchor=None; self.heading=None; self.section=False; self.indices=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ('script','style'): self.skip+=1
        if self.skip:return
        if tag=='tr':self.cells=[]
        if tag=='td':self.cell=[]
        if tag=='h3':self.heading=[];self.section=False
        if tag=='a':self.anchor=[a.get('href',''),[]]
    def handle_data(self,data):
        if self.skip:return
        self.text.append(data)
        if self.cell is not None:self.cell.append(data)
        if self.anchor is not None:self.anchor[1].append(data)
        if self.heading is not None:self.heading.append(data)
    def handle_endtag(self,tag):
        if tag in ('script','style') and self.skip:self.skip-=1;return
        if self.skip:return
        if tag=='td' and self.cell is not None:
            if self.cells is not None:self.cells.append(' '.join(''.join(self.cell).split()))
            self.cell=None
        if tag=='tr' and self.cells is not None:self.rows.append(self.cells);self.cells=None
        if tag=='h3' and self.heading is not None:self.section=' '.join(''.join(self.heading).split())=='Şirketin Dahil Olduğu Endeksler';self.heading=None
        if tag=='a' and self.anchor is not None:
            href,parts=self.anchor; name=' '.join(''.join(parts).split());self.anchors.append((href,name))
            if self.section and href.startswith('/tr/Endeksler?'):self.indices.append(name)
            self.anchor=None
def norm(value):return ''.join(c for c in unicodedata.normalize('NFKD',value.replace('ı','i')).upper() if c.isalnum())
def body(record):return (folder/record['filename']).read_text(encoding='utf-8-sig')
def response_for(part):return next((r for r in run['captured'] if part in r['url'] and r['status']==200),None)
bist_record=response_for('hisse_endeks_katilim_ds.csv');kap_record=response_for('KPY97SummaryGrid');directory_record=response_for('bist-sirketler')
bist=list(csv.reader(body(bist_record).splitlines(),delimiter=';'))[2:] if bist_record else []
kap=Document();kap.feed(body(kap_record) if kap_record else '')
directory=Document();directory.feed(body(directory_record) if directory_record else '')
markets=Document();markets.feed(body(response_for('/Pazarlar')))
market=''
allowed={'YILDIZ PAZAR','ANA PAZAR','ALT PAZAR','YAKIN İZLEME PAZARI','PİYASA ÖNCESİ İŞLEM PLATFORMU','GİRİŞİM SERMAYESİ PAZARI'}
equity_symbols=set()
for row in markets.rows:
    if len(row)==1 and 'Şirket / Fon Bulundu' in row[0]:market=re.sub(r'\s*\d+ Şirket / Fon Bulundu.*$','',row[0])
    elif len(row)==1:market=row[0]
    elif market in allowed and len(row)>=3:equity_symbols.update(row[1].split(','))
print('Independently eligible equities:',len(equity_symbols))
verified=[]
for item in run['results']:
    identity=item['identity'];symbol=identity['symbol'];ev=item['response'].get('evaluation',{});errors=[];notes=[]
    path=identity['kapUrl'].removeprefix('https://www.kap.org.tr')
    anchor_names=[text for href,text in directory.anchors if href==path]
    identity_ok=any(symbol in value.split() for value in anchor_names) and any(norm(value)==norm(identity['name']) for value in anchor_names)
    if not identity_ok:errors.append('Identity differs from independent directory parsing')
    equity_ok=symbol in {v.strip() for v in equity_symbols}
    if not equity_ok:errors.append('Not independently confirmed in an equity market')
    if ev.get('instrument',{}).get('symbol')!=symbol or ev.get('instrument',{}).get('kapUrl')!=identity['kapUrl']:errors.append('Worker resolved wrong identity/link')
    index_matches=0
    for index in ev.get('indices',[]):
        expected=any(r[0]==symbol+'.E' and r[2]==index['indexCode'] for r in bist)
        if expected!=index['isMember']:errors.append('BIST mismatch: '+index['indexCode'])
        else:index_matches+=1
    if not ev.get('indices'):notes.append('BIST unavailable; membership not verified')
    raw=[r for r in kap.rows if len(r)==12 and r[0]==symbol]
    kafif_matches=0
    if len(raw)==1 and norm(raw[0][1])==norm(identity['name']):
        if ev.get('financialPeriod')!=raw[0][3]:errors.append('KAFIF financial period mismatch')
        criteria=ev.get('criteria',[])
        if len(criteria)!=7:errors.append('KAFIF row exists but worker did not expose seven fields')
        else:
            for n,criterion in enumerate(criteria):
                value=raw[0][5+n];actual=criterion.get('actualValue')
                if n<4:expected=value if value in ('EVET','HAYIR') else None;equal=actual==expected
                else:
                    try:expected=Decimal(value.replace(',','.'));equal=actual is not None and abs(Decimal(str(actual))-expected)<Decimal('0.00000001')
                    except InvalidOperation:equal=actual is None
                if not equal:errors.append('KAFIF mismatch field '+str(n+1))
                else:kafif_matches+=1
    else:
        notes.append('KAFIF matching row absent; no financial verdict verified')
        if ev.get('criteria'):errors.append('Worker exposed financial fields without matching raw KAFIF row')
    page_ok=False;page_differences=[]
    if item['page'].get('status')==200:
        page=Document();page.feed((folder/item['page']['filename']).read_text(encoding='utf-8'))
        text=' '.join(page.text);page_ok=bool(re.search(r'(?<![A-Z0-9])'+re.escape(symbol)+r'(?![A-Z0-9])',text)) and norm(identity['name']) in norm(text)
        if not page_ok:errors.append('Individual KAP page identity not verified')
        aliases={'XSRDK':['BIST SÜRDÜRÜLEBİLİRLİK KATILIM'],'XK030EA':['BIST KATILIM 30 EŞİT AĞIRLIKLI']}
        for index in ev.get('indices',[]):
            names=[norm(index['indexName'])]+[norm(v) for v in aliases.get(index['indexCode'],[])]
            if page.indices and index['isMember']!=any(v in [norm(label) for label in page.indices] for v in names):page_differences.append(index['indexCode'])
        if page_differences:notes.append('KAP page / dated BIST list differ: '+', '.join(page_differences))
    else:notes.append('Individual KAP page could not be read')
    verified.append({'symbol':symbol,'name':identity['name'],'kapUrl':identity['kapUrl'],'equityVerified':equity_ok,'identityVerified':identity_ok and page_ok,'indexMatches':index_matches,'kafifMatches':kafif_matches,'member':next((i['isMember'] for i in ev.get('indices',[]) if i['indexCode']=='XKTUM'),None),'financialPeriod':ev.get('financialPeriod'),'financialValues':[c.get('actualValue') for c in ev.get('criteria',[])],'bistIndices':ev.get('indices',[]),'kapPageIndices':page.indices if page_ok else [],'pageDifferences':page_differences,'errors':errors,'notes':notes})
summary={'date':run['date'],'sampleCount':len(verified),'universeCount':run['universeCount'],'identitiesVerified':sum(r['identityVerified'] for r in verified),'members':sum(r['member'] is True for r in verified),'nonMembers':sum(r['member'] is False for r in verified),'indexChecks':sum(r['indexMatches'] for r in verified),'kafifAvailable':sum(r['kafifMatches']==7 for r in verified),'kafifFieldsChecked':sum(r['kafifMatches'] for r in verified),'extractionErrors':sum(len(r['errors']) for r in verified),'pageDifferenceCompanies':sum(bool(r['pageDifferences']) for r in verified)}
report={'summary':summary,'method':'Actual bundled Chrome worker executed with live HTTPS fetch and simulated Chrome messaging/storage; independently compared against captured official CSV/HTML using Python. Not an installed-browser test or a comprehensive religious assessment.','rows':verified,'responses':run['captured']}
report['summary']['equitiesVerified']=sum(r['equityVerified'] for r in verified)
report['workerSha256']=run['workerSha256']
output=Path('docs')/('AUDIT-30-'+run['date']+'.json');output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
sample=json.loads((folder/'sample.json').read_text(encoding='utf-8'))
report['sampleSelection']=sample
output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
lines=[f"# فحص 30 سهمًا عشوائيًا — {run['date']}",
 'تم تشغيل ملف background.js المبني للإضافة بطلبات HTTPS حقيقية، مع محاكاة رسائل Chrome والتخزين. ثم أعيدت قراءة الاستجابات الرسمية بمحلل Python مستقل عن محلل الإضافة. هذا فحص للمحرك الحي؛ لا يشمل تجربة النقر داخل Chrome ولا مراجعة شرعية شاملة.',
 f"اختيرت الشركات عشوائيًا قبل قراءة نتائجها من {run['universeCount']} شركة في أسواق الأسهم الرسمية. استُبعدت السندات والصناديق والمنتجات المهيكلة، واستُخدم رمز السهم كما يظهر في صفحة الأسواق. تم الاحتفاظ بالشركات نفسها عند إعادة الاختبار.",
 f"- هويات الأسهم وأهليتها وروابطها: {summary['identitiesVerified']}/30 و{summary['equitiesVerified']}/30.",
 f"- عضوية المؤشرات السبعة: {summary['indexChecks']}/210 متطابقة مع ملف BIST المؤرخ 2026-10-13.",
 f"- بيانات KAFİF: {summary['kafifAvailable']}/30 شركة، و{summary['kafifFieldsChecked']} حقلًا متطابقًا مع جدول المصدر.",
 f"- أخطاء استخراج في العينة النهائية: {summary['extractionErrors']}.",
 'هذه الأرقام تثبت صحة نقل البيانات المتاحة من المصادر، ولا تضمن خلو المصدر نفسه من الأخطاء أو التحديث الفوري بعد كل إفصاح.',
 '## النتائج',
 '«عضو» تعني عضوية XKTUM الرسمية فقط، و«غير عضو» لا تعني تلقائيًا حرامًا. نسب الجدول تصريحات الشركات وليست أحكامًا شرعية. عدم وجود سجل KAFİF يعني نقص البيانات، وليس صفرًا.',
 '| السهم / رابط KAP | XKTUM | الفترة المالية | دخل غير مناسب % | أصول غير مناسبة % | ديون غير مناسبة % | مطابقة الحقول |',
 '|---|---|---|---|---|---|---|']
for row in verified:
    values=row['financialValues'];ratios=values[4:] if values else ['—']*3
    lines.append(f"| [{row['symbol']}]({row['kapUrl']}) | {'عضو' if row['member'] else 'غير عضو' if row['member'] is False else 'غير معروف'} | {row['financialPeriod'] or 'غير متاحة'} | {' | '.join(str(v) if v is not None else 'غير متاح' for v in ratios)} | {row['kafifMatches']}/7 |")
lines+=['## الملاحظات والإصلاح',
 '1. كانت الفترات بصيغة «2025 / Yıllık» تُرفض رغم أنها فترات سنوية صحيحة. أصلح الإصدار 1.4.3 القراءة مع الإبقاء على رفض الفترات المستقبلية. أُعيد فحص السجلين الحقيقيين FENER وORMA من الجولة الاستكشافية: ظهر كل سجل بسبعة حقول صحيحة. أضيف اختبار يمنع تكرار الخطأ.',
 '2. لا تتوافر سجلات KAFİF مطابقة لـ ISMEN وVAKFN وLIDFA وAKBNK في الجدول الذي قُرئ. لم تُختلق لها نسب أو نتيجة مالية.',
 '3. صفحات الشركات CIMSA وOBAMS وEKGYO في KAP لا تعرض XK030EA، بينما ملف BIST اليومي يدرجها. الإضافة تعتمد ملف BIST المؤرخ للعضوية. سبب هذا الاختلاف لم يُثبت؛ لا يجوز وصفه بخطأ حسابي للإضافة أو تأكيد أن إحدى الصفحتين خاطئة.',
 '4. تظهر تسمية مؤشر الاستدامة في KAP بترتيب مختلف للكلمات؛ عولجت كتسمية بديلة في المقارنة حتى لا تُحسب اختلافًا زائفًا.',
 '5. دليل الشركات يشمل رموز مُصدرين إضافية وسندات. الجولة الاستكشافية لم تكن عينة صافية من الأسهم. العينة النهائية تحققت من صفحة الأسواق؛ استُخدم ISMEN للشركة نفسها بدل الرمز IYM. هذا لا يعني أن كل رمز في دليل الإضافة يمثل سهمًا متداولًا.',
 '## المصادر والأدلة',
 '- [أسواق KAP: أهلية الأسهم](https://www.kap.org.tr/tr/Pazarlar)',
 '- [دليل الشركات الرسمي](https://www.kap.org.tr/tr/bist-sirketler)',
 '- [ملف BIST الرسمي للعضوية](https://borsaistanbul.com/datum/hisse_endeks_katilim_ds.csv)',
 '- [تصريحات KAP KAFİF](https://www.kap.org.tr/tr/kfifAllInfoListByItem/KPY97SummaryGrid)',
 'ملف JSON المصاحب يتضمن قيم الحقول السبعة، نتائج المؤشرات، روابط المصادر وتوقيت جلبها وبصمات SHA-256. النسخ الخام محفوظة محليًا في '+str(folder)+'.',
 'لإعادة الفحص: npm run build ثم node scripts/audit-30-live.mjs ثم python scripts/verify-30-independent.py '+str(folder)+'. عند وجود sample.json تُحفظ الشركات المختارة لإعادة المقارنة، وحذفه يبدأ سحبًا عشوائيًا جديدًا.']
markdown=[]
for line in lines:
    if markdown and not (line.startswith('|') and markdown[-1].startswith('|')):markdown.append('')
    markdown.append(line)
output.with_suffix('.md').write_text('\n'.join(markdown),encoding='utf-8')
with output.with_suffix('.csv').open('w',encoding='utf-8-sig',newline='') as file:
    writer=csv.writer(file);writer.writerow(['symbol','name','kapUrl','XKTUM','financialPeriod','incomePercent','assetsPercent','debtPercent','indexMatches','kafifMatches','pageDifferences'])
    for row in verified:writer.writerow([row['symbol'],row['name'],row['kapUrl'],row['member'],row['financialPeriod'],*(row['financialValues'][4:] if row['financialValues'] else ['']*3),row['indexMatches'],row['kafifMatches'],','.join(row['pageDifferences'])])
print(json.dumps(summary,ensure_ascii=False,indent=2))
for row in verified:
    if row['errors'] or row['pageDifferences']:print(row['symbol'],row['errors'],row['notes'])
if summary['extractionErrors']:sys.exit(1)
