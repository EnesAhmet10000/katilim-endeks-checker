import {build} from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const bundle=await build({entryPoints:['apps/extension/src/i18n.ts'],bundle:true,write:false,platform:'node',format:'cjs'});
const module={exports:{}};const storage={'katilim-language-v1':'ar'};let changed;
const chrome={storage:{local:{get(keys,cb){cb(storage);},set(values){Object.assign(storage,values);}},onChanged:{addListener(fn){changed=fn;}}}};
vm.runInNewContext(bundle.outputFiles[0].text,{module,exports:module.exports,chrome});
const {translate,initLanguage,setLanguage,getLanguage,onLanguageChange,normalizeLanguage}=module.exports;
await initLanguage();assert.equal(getLanguage(),'ar');
let notifications=0;const dispose=onLanguageChange(()=>notifications++);
setLanguage('en');assert.equal(storage['katilim-language-v1'],'en');assert.equal(notifications,1);
changed({'katilim-language-v1':{newValue:'tr'}},'local');assert.equal(getLanguage(),'tr');
dispose();setLanguage('ar');assert.equal(notifications,2);
assert.equal(normalizeLanguage('invalid'),'tr');
for(const phrase of ['Görünüm','Özelleştir','Listede yok','HAYIR','EVET','BIST: Katılım Tüm üyesi','BIST: Katılım Tüm listesinde yok','Güncel veri doğrulanamadı','KAP KAFİF beyanları','Şirket beyanı','Uygun olmayan borç oranı','Kaynak bağlantısı kurulamadı.','KAP: Katılım şemsiye fonu','Güncel TEFAS portföy dağılımı doğrulanamadı.']){
 assert.equal(translate(phrase,'tr'),phrase);
 for(const lang of ['en','ar'])assert.notEqual(translate(phrase,lang),phrase,lang+': '+phrase);
}
assert.equal(translate('↻ Yenile','en'),'↻ Refresh');assert.equal(translate('Kaynağa Git ↗','ar'),'فتح المصدر ↗');
assert.equal(translate('2025 / Yıllık','en'),'2025 / Annual');assert.equal(translate('2026 / 6 Aylık','ar'),'2026 / 6 أشهر');
assert.equal(translate('KAP KAFİF beyanları · 2025 / Yıllık','en'),'KAP KAFİF disclosures · 2025 / Annual');
for(const phrase of ['CIMSA','ÇİMSA ÇİMENTO SANAYİ VE TİCARET A.Ş.','%29,64','https://www.kap.org.tr/tr/sirket-bilgileri/ozet/963-cimsa-cimento-sanayi-ve-ticaret-a-s'])for(const lang of ['en','ar','tr'])assert.equal(translate(phrase,lang),phrase);
assert.match(translate('BIST ileri tarihli liste: 2026-10-14','en'),/upcoming.*2026-10-14/);
console.log('PASS: persisted language, cross-view changes, Turkish/English/Arabic labels, annual periods, unknown states, and unchanged identities/numbers/URLs.');
