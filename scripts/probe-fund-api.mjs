import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync('.research/kap-kafif.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const headings=[...source.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m=>text(m[1]));
const rows=[...source.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>text(m[1]))).filter(c=>/^[A-Z0-9]{3,6}$/.test(c[0])&&c.length>5);
const samples=rows.filter(r=>['PETKM','ASELS','BIMAS','SASA','THYAO'].includes(r[0]));
writeFileSync('.research/kafif-summary.json',JSON.stringify({headings,rows:rows.length,samples},null,2));
console.log('KAFIF',JSON.stringify({headings,rows:rows.length,samples},null,2));
const allocation={fonTipi:'YAT',fonKodu:'KUA',aramaMetni:null,fonTurKod:null,fonGrubu:null,sfonTurKod:null,basTarih:'20261001',bitTarih:'20261012',basSira:1,bitSira:500,fonTurAciklama:null,dil:'TR',kurucuKod:null,sFonTurKod:'',fonKod:'KUA',fonGrup:'',fonUnvanTip:''};
const results=[];
for(const [endpoint,payload] of [['fonBilgiGetir',{fonKodu:'KUA'}],['fonProfilBilgiGetir',{fonKodu:'KUA',dil:'TR'}],['dagilimSiraliGetirT',allocation]]){
 try {
  const url='https://www.tefas.gov.tr/api/funds/'+endpoint;
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
  const body=await res.text();writeFileSync('.research/tefas-'+endpoint+'.json',body);
  let parsed;try{parsed=JSON.parse(body);}catch{}
  const item={endpoint,status:res.status,contentType:res.headers.get('content-type'),length:body.length,errorCode:parsed?.errorCode,errorMessage:parsed?.errorMessage,count:parsed?.resultList?.length,sample:parsed?.resultList?.[0],nonJsonPreview:parsed?undefined:body.slice(0,200)};
  results.push(item);console.log('TEFAS',JSON.stringify(item,null,2));
 }catch(e){results.push({endpoint,error:e.message});console.log(endpoint,e.message);}
}
writeFileSync('.research/fund-api-probe.json',JSON.stringify(results,null,2));
