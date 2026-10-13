import {getLanguage,LANGUAGES,localize,onLanguageChange,setLanguage} from './i18n.js';
export const VIEW_KEY = 'katilim-view-v1';
export const VIEW_SECTIONS = {
 identity:'Şirket / fon adı', reason:'Sonuç açıklaması', timestamp:'Kontrol zamanı', indices:'BIST endeksleri', criteria:'KAFİF beyanları', fundProfile:'Fon profili', allocation:'Portföy dağılımı', sources:'Kaynaklar', warnings:'Veri kapsamı', disclaimer:'Alt bilgi'
} as const;
export type ViewSection = keyof typeof VIEW_SECTIONS;
export interface ViewPreferences { mode:'simple'|'full'|'custom'; sections:Record<ViewSection,boolean> }
export function normalizeView(value?: any): ViewPreferences {
 const sections={} as Record<ViewSection,boolean>;
 for(const key of Object.keys(VIEW_SECTIONS) as ViewSection[]) sections[key]=typeof value?.sections?.[key]==='boolean'?value.sections[key]:true;
 return {mode:['simple','full','custom'].includes(value?.mode)?value.mode:'full',sections};
}
export function applyView(root: ParentNode, prefs: ViewPreferences) {
 root.querySelectorAll<HTMLElement>('[data-view-section]').forEach(element=>{
  const section=element.dataset.viewSection as ViewSection;
  element.hidden=prefs.mode==='simple'||prefs.mode==='custom'&&!prefs.sections[section];
 });
}
export async function readView(): Promise<ViewPreferences> {
 if(typeof chrome==='undefined'||!chrome.storage?.local) return normalizeView();
 return new Promise(resolve=>chrome.storage.local.get([VIEW_KEY],result=>resolve(normalizeView(result?.[VIEW_KEY]))));
}
export function saveView(prefs: ViewPreferences) {
 if(typeof chrome!=='undefined'&&chrome.storage?.local) chrome.storage.local.set({[VIEW_KEY]:prefs});
}
export function bindViewControls(root: HTMLElement, initial: ViewPreferences, changed:(prefs:ViewPreferences)=>void) {
 let prefs=normalizeView(initial);
 root.innerHTML=`<label>Görünüm <select aria-label="Görünüm"><option value="simple">Basit</option><option value="full">Tam</option><option value="custom">Özel</option></select></label><button type="button" class="customize-view" aria-expanded="false">Özelleştir</button><fieldset hidden><legend>Gösterilecek bölümler</legend>${Object.entries(VIEW_SECTIONS).map(([key,label])=>`<label><input type="checkbox" data-section="${key}">${label}</label>`).join('')}</fieldset>`;
 root.insertAdjacentHTML('afterbegin',`<label class="language-control">Dil <select data-language aria-label="Dil">${Object.entries(LANGUAGES).map(([key,label])=>`<option value="${key}" data-no-translate>${label}</option>`).join('')}</select></label> `);
 const select=root.querySelector<HTMLSelectElement>('select:not([data-language])')!;
 const language=root.querySelector<HTMLSelectElement>('[data-language]')!;
 language.value=getLanguage();language.addEventListener('change',()=>setLanguage(language.value));
 const disposeLanguage=onLanguageChange(()=>localize(root));
 const button=root.querySelector<HTMLButtonElement>('button')!;
 const panel=root.querySelector('fieldset')!;
 const sync=()=>{select.value=prefs.mode;button.hidden=prefs.mode!=='custom';if(prefs.mode!=='custom'){panel.hidden=true;button.setAttribute('aria-expanded','false');}root.querySelectorAll<HTMLInputElement>('input').forEach(input=>input.checked=prefs.sections[input.dataset.section as ViewSection]);localize(root);};
 const commit=()=>{sync();saveView(prefs);changed(prefs);};
 select.addEventListener('change',()=>{prefs={...prefs,mode:select.value as ViewPreferences['mode']};commit();});
 button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));});
 root.querySelectorAll<HTMLInputElement>('input').forEach(input=>input.addEventListener('change',()=>{prefs={...prefs,sections:{...prefs.sections,[input.dataset.section!]:input.checked}};commit();}));
 sync();
 const listener= (changes:Record<string,chrome.storage.StorageChange>,area:string)=>{if(area==='local'&&changes[VIEW_KEY]){prefs=normalizeView(changes[VIEW_KEY].newValue);sync();changed(prefs);}};
 if(typeof chrome!=='undefined') chrome.storage?.onChanged?.addListener(listener);
 return ()=>{disposeLanguage();if(typeof chrome!=='undefined') chrome.storage?.onChanged?.removeListener(listener);};
}
