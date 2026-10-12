import { InstrumentSummary, InstrumentType } from '@katilim/shared-types';
import { RawStockFinancialMetrics, RawIndexMembershipRecord, RawFundData } from './engine.js';

export interface SeedInstrumentRecord {
  instrument: InstrumentSummary;
  aliases: string[];
  financials?: RawStockFinancialMetrics;
  indices?: RawIndexMembershipRecord[];
  fundData?: RawFundData;
}

// BIST Katılım Dışı (Non-Compliant / Helal Finans & Borsa İstanbul Tarafından Uygun Görülmeyenler)
export const KNOWN_NON_COMPLIANT_SYMBOLS = new Set([
  // 1. Konvansiyonel Bankalar
  'AKBNK', 'GARAN', 'ISCTR', 'YKBNK', 'VAKBN', 'HALKB', 'QNBFB', 'TSKB', 'KLNMA', 'SKBNK', 'ICBCT',
  // 2. Faktoring, Finansal Kiralama ve Aracı Kurumlar
  'ISFIN', 'GARFA', 'VAKFN', 'QNBFL', 'CRDFA', 'INFO', 'ISMEN', 'OSMEN', 'GLBMD', 'GEDIK', 'TERA', 'UNLU',
  // 3. Menkul Kıymet Yatırım Ortaklıkları (Faizli Portföy)
  'ISYAT', 'VKFYO', 'EUKYO', 'MTRYO', 'ETYAT', 'GRNYO', 'OYAYO',
  // 4. Alkollü İçecek & Kumar/Şans
  'AEFES', 'TBORG',
  // 5. Faizli Banka / Finans Sahibi Holdingler
  'KCHOL', 'SAHOL', 'AGHOL', 'DOHOL', 'GSDHO', 'GLYHO', 'KLRHO',
  // 6. Finansal Borç/Faiz Oranları Limitini Aşan Şirketler (KAP & Helal Finans Analizine Göre)
  'SASA', 'PATEK', 'REEDR', 'HEKTS', 'ARCLK', 'PGSUS', 'TCELL', 'INDES', 'ODAS', 'PETKM', 'CANTE', 'BIOEN'
]);

// BIST Katılım Endeksleri (XKTM) Resmi Bileşenleri Listesi (Borsa İstanbul & Helal Finans)
// Strictly cleaned: All non-compliant holdings and financial institutions removed.
export const BIST_KATILIM_TUM_SYMBOLS = new Set([
  'ACSEL', 'ADEL', 'ADESE', 'AFYON', 'AGESA', 'AGROT', 'AHGAZ', 'AHSGY', 'AKCNS',
  'AKENR', 'AKFGY', 'AKFYE', 'AKSA', 'AKSEN', 'AKSUE', 'ALARK', 'ALBRK', 'ALCAR', 'ALCTL',
  'ALFAS', 'ALGYO', 'ALKA', 'ALKIM', 'ALMAD', 'ALTNY', 'ALVES', 'ANGEN', 'ANHYT', 'ANSGR',
  'ARASE', 'ARDYZ', 'ARENA', 'ARSAN', 'ARTMS', 'ARZUM', 'ASELS', 'ASGYO', 'ASTOR', 'ASUZU',
  'ATAGY', 'ATAKP', 'ATATP', 'ATEKS', 'ATSYH', 'AVGYO', 'AVHOL', 'AVOD', 'AVPGY', 'AYCES',
  'AYDEM', 'AYEN', 'AYGAZ', 'AZTEK', 'BAGFS', 'BAHKM', 'BAKAB', 'BALAT', 'BANVT', 'BARMA',
  'BASCM', 'BASGZ', 'BAYRK', 'BEGYO', 'BERA', 'BETAE', 'BEYAZ', 'BFREN', 'BIENY', 'BIGCH',
  'BIMAS', 'BINHO', 'BIZIM', 'BMSCH', 'BMSTL', 'BNTAS', 'BOBET', 'BORLS', 'BORSK', 'BOSSA',
  'BRISA', 'BRKSN', 'BRMEN', 'BRSAN', 'BRYAT', 'BSOKE', 'BTCIM', 'BUCIM', 'BURCE', 'BURVA',
  'BVSAN', 'BYDNR', 'CATES', 'CCOLA', 'CELHA', 'CEMAS', 'CEMTS', 'CEMZY', 'CEOEM', 'CIMSA',
  'CLEBI', 'CMBTN', 'CMENT', 'CONSE', 'COSMO', 'CRFSA', 'CUSAN', 'CVKMD', 'CWENE', 'DAGI',
  'DAGHL', 'DAPGM', 'DARDL', 'DCTTR', 'DENGE', 'DERHL', 'DERIM', 'DESA', 'DESPC', 'DEVA',
  'DGATE', 'DGGYO', 'DIRIT', 'DITAS', 'DMSAS', 'DNISI', 'DOAS', 'DOBUR', 'DOCO', 'DOFER',
  'DOFRB', 'DOGUB', 'DOKTA', 'DURDO', 'DURKN', 'DYOBY', 'DZGYO', 'EBEBK', 'ECILC',
  'ECZYT', 'EDATA', 'EDIP', 'EFORC', 'EGEEN', 'EGGUB', 'EGPO', 'EGSER', 'EKGYO', 'EKIZ',
  'EKOS', 'EKSUN', 'ELITE', 'EMKEL', 'ENERY', 'ENJSA', 'ENKAI', 'ENTRA', 'EPLAS', 'ERBOS',
  'ERCB', 'EREGL', 'ERSU', 'ESCAR', 'ESCOM', 'ESEN', 'ETILR', 'EUHOL', 'EUPWR', 'EUREN',
  'EYGYO', 'FADE', 'FLAP', 'FMIZP', 'FONET', 'FORMT', 'FORTE', 'FRIGO', 'FROTO', 'FZLGY',
  'GEDZA', 'GENIL', 'GENTS', 'GEREL', 'GESAN', 'GIPTA', 'GLCVY', 'GLRYH', 'GMTAS',
  'GNDG', 'GOKNR', 'GOLTS', 'GOODY', 'GOZDE', 'GRSEL', 'GRTRK', 'GSDDE', 'GUBRF',
  'GUNDG', 'GWIND', 'GZNMI', 'HATEK', 'HATSN', 'HDFGS', 'HEDEF', 'HKTM', 'HLGYO', 'HOROZ',
  'HRKET', 'HTTBT', 'HUBVC', 'HURGZ', 'ICUGS', 'IDGYO', 'IEYHO', 'IHAAS', 'IHEVA', 'IHGZT',
  'IHLAS', 'IHLGM', 'IHYAY', 'IMASM', 'INGRM', 'INVES', 'IPEKE', 'ISDMR', 'ISGSY', 'ISGYO',
  'ISKPL', 'ISBIR', 'ITTFH', 'IZENR', 'IZFAS', 'IZINV', 'IZMDC', 'JANTS', 'KAPLM', 'KAREL',
  'KARSN', 'KARTN', 'KARYE', 'KATMR', 'KAYSE', 'KBORU', 'KCAER', 'KFEIN', 'KGYO', 'KIMMR',
  'KIRTK', 'KLGYO', 'KLKIM', 'KLMSN', 'KLYSN', 'KMEST', 'KMPUR', 'KNFRT', 'KOCMT',
  'KONFR', 'KONKA', 'KONTR', 'KONYA', 'KOPOL', 'KORDS', 'KOTON', 'KOZAA', 'KOZAL', 'KRDMA',
  'KRDMB', 'KRDMD', 'KRGYO', 'KRONT', 'KRPLS', 'KRSTL', 'KRTEK', 'KRVGD', 'KSTUR', 'KTLEV',
  'KTSKR', 'KUTPO', 'KUVVA', 'KUYAS', 'KZBGY', 'KZGYO', 'LIDER', 'LIDFA', 'LILAK', 'LINK',
  'LKMNH', 'LOGO', 'LUKSK', 'MAALT', 'MACKO', 'MAGEN', 'MAKIM', 'MAKTK', 'MANAS', 'MARBL',
  'MARKA', 'MARTI', 'MAVI', 'MEDTR', 'MEGAP', 'MEGMT', 'MEKAG', 'MEPET', 'MERCN', 'MERIT',
  'MERKO', 'METRO', 'METUR', 'MHRGY', 'MIATK', 'MIPAZ', 'MMCAS', 'MNDRS', 'MNDTR', 'MOBTL',
  'MOGAN', 'MPARK', 'MRGYO', 'MRSHL', 'MSGYO', 'MTRKS', 'MZHRO', 'NATEN', 'NETAS', 'NIBAS',
  'NTGAZ', 'NTHOL', 'NUGYO', 'NUHCM', 'OBASE', 'OBAMS', 'ODINE', 'OFSYM', 'ONCSM', 'ONRYT',
  'ORCAY', 'ORGE', 'ORMA', 'OSTIM', 'OTKAR', 'OTTO', 'OYAKC', 'OYLUM', 'OYYAT', 'OZGYO',
  'OZKGY', 'OZRDN', 'OZSUB', 'PAGYO', 'PAMEL', 'PAPIL', 'PARSN', 'PASEU', 'PCILT', 'PEKGY',
  'PENGD', 'PENTA', 'PETUN', 'PINSU', 'PKART', 'PKENT', 'PLTUR', 'PNLSN', 'PNSUT', 'POLHO',
  'POLTK', 'PRDGS', 'PRKAB', 'PRKME', 'PRZMA', 'PSDTC', 'PSGYO', 'QUAGR', 'RALYH', 'RAYSG',
  'RNPOL', 'RODRG', 'RTALB', 'RUBNS', 'RYGYO', 'RYSAS', 'SAFKR', 'SAMAT', 'SANEL', 'SANFM',
  'SANKO', 'SARKY', 'SAYAS', 'SDTTR', 'SEGYO', 'SEKFK', 'SEKUR', 'SELEC', 'SELGD', 'SELVA',
  'SEYKM', 'SILVR', 'SISE', 'SKTAS', 'SMART', 'SMRTG', 'SNGYO', 'SNICA', 'SNKRN', 'SOKE',
  'SOKM', 'SONME', 'SRVGY', 'SUMAS', 'SUNTK', 'SURGY', 'SUWEN', 'TABGD', 'TARKM', 'TATEN',
  'TATGD', 'TAVHL', 'TDGYO', 'TEKTU', 'TETMT', 'TEZOL', 'TGSAS', 'THYAO', 'TKFEN', 'TKNSA',
  'TLMAN', 'TMPOL', 'TMSN', 'TNZTP', 'TOASO', 'TRCAS', 'TRGYO', 'TRILC', 'TSGYO', 'TSPOR',
  'TTKOM', 'TTRAK', 'TUCLK', 'TUKAS', 'TUPRS', 'TUREX', 'TURGG', 'TURSG', 'UFUK', 'ULAS',
  'ULFAK', 'ULKER', 'ULUFA', 'ULUSE', 'ULUUN', 'USAK', 'VAKKO', 'VANGD', 'VBTYZ', 'VERTU',
  'VERUS', 'VESBE', 'VESTL', 'VKGYO', 'VKING', 'VRGYO', 'VZLGY', 'YAPRK', 'YATAS', 'YAYLA',
  'YBTAS', 'YEOTK', 'YESIL', 'YGGYO', 'YGYO', 'YIGIT', 'YKSLN', 'YONGA', 'YUNSA', 'YYAPI',
  'YYLGD', 'ZEDUR', 'ZELOT', 'ZRGYO'
]);

// BIST Katılım 100 Endeksi (XKT100)
export const BIST_KATILIM_100_SYMBOLS = new Set([
  'AGROT', 'AHGAZ', 'AKCNS', 'AKFGY', 'AKFYE', 'AKSA', 'AKSEN', 'ALARK', 'ALFAS', 'ARASE',
  'ARDYZ', 'ASELS', 'ASTOR', 'ASUZU', 'ATATP', 'AYDEM', 'BERA', 'BIENY', 'BIMAS', 'BINHO',
  'BOBET', 'BRSAN', 'BRYAT', 'BTCIM', 'BUCIM', 'CATES', 'CCOLA', 'CEMTS',
  'CIMSA', 'CLEBI', 'CVKMD', 'CWENE', 'DOAS', 'DOFRB', 'EBEBK', 'ECILC', 'ECZYT', 'EGEEN',
  'EKGYO', 'ENERY', 'ENJSA', 'ENKAI', 'ERBOS', 'EREGL', 'EUPWR', 'FROTO', 'GENIL', 'GESAN',
  'GOKNR', 'GUBRF', 'GWIND', 'HATSN', 'IMASM', 'INVES', 'IPEKE', 'ISDMR', 'ISGYO',
  'IZENR', 'KAYSE', 'KBORU', 'KCAER', 'KMPUR', 'KONTR', 'KONYA', 'KORDS', 'KOZAA',
  'KOZAL', 'KRDMD', 'KZBGY', 'MAGEN', 'MAVI', 'MHRGY', 'MIATK', 'MOGAN', 'OBAMS',
  'OTKAR', 'OYAKC', 'OZKGY', 'PASEU', 'PSGYO', 'QUAGR',
  'RUBNS', 'SARKY', 'SAYAS', 'SDTTR', 'SELEC', 'SISE', 'SMRTG', 'SOKM', 'SURGY', 'TABGD',
  'TARKM', 'TATEN', 'TAVHL', 'THYAO', 'TKFEN', 'TKNSA', 'TMSN', 'TOASO', 'TRGYO',
  'TRILC', 'TTKOM', 'TTRAK', 'TUKAS', 'TUPRS', 'TURSG', 'ULKER', 'VESBE', 'VESTL',
  'YEOTK', 'YYLGD'
]);

// BIST Katılım 50 Endeksi (XKT50)
export const BIST_KATILIM_50_SYMBOLS = new Set([
  'AKCNS', 'AKSA', 'AKSEN', 'ALARK', 'ALFAS', 'ASELS', 'ASTOR', 'ATATP', 'BERA', 'BIMAS',
  'BRSAN', 'BTCIM', 'CCOLA', 'CIMSA', 'CWENE', 'DOAS', 'EGEEN', 'EKGYO', 'ENJSA',
  'ENKAI', 'EREGL', 'EUPWR', 'FROTO', 'GENIL', 'GESAN', 'GUBRF', 'GWIND', 'ISDMR',
  'ISGYO', 'KCAER', 'KONTR', 'KONYA', 'KOZAA', 'KOZAL', 'KRDMD', 'MAVI', 'MIATK',
  'OTKAR', 'OYAKC', 'OZKGY', 'QUAGR', 'SARKY', 'SDTTR', 'SISE',
  'SMRTG', 'SOKM', 'TABGD', 'TAVHL', 'THYAO', 'TKFEN', 'TOASO', 'TRGYO', 'TTKOM',
  'TTRAK', 'TUPRS', 'ULKER', 'VESBE', 'VESTL', 'YEOTK'
]);

// BIST Katılım 30 Endeksi (XKT30)
export const BIST_KATILIM_30_SYMBOLS = new Set([
  'AKSA', 'AKSEN', 'ALARK', 'ASELS', 'ASTOR', 'BIMAS', 'BRSAN', 'CCOLA', 'CIMSA', 'DOAS',
  'EKGYO', 'ENJSA', 'ENKAI', 'EREGL', 'EUPWR', 'FROTO', 'GESAN', 'GUBRF', 'ISDMR',
  'KONTR', 'KOZAL', 'KRDMD', 'MAVI', 'MIATK', 'OYAKC', 'SISE', 'SOKM',
  'TAVHL', 'THYAO', 'TKFEN', 'TOASO', 'TTKOM', 'TTRAK', 'TUPRS', 'ULKER'
]);

export const COMPREHENSIVE_DATASET: SeedInstrumentRecord[] = [
  // 1. KLRHO (Kiler Holding A.Ş. - NON COMPLIANT / KATILIM DIŞI)
  {
    instrument: { id: 'klrho', symbol: 'KLRHO', isin: 'TREKLHO00012', name: 'Kiler Holding A.Ş.', shortName: 'Kiler Holding', type: InstrumentType.STOCK, sector: 'Mali Kuruluşlar / Holding' },
    aliases: ['kiler holding', 'kiler', 'klrho hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-08', disclosureId: 'KAP-KLRHO-2026', disclosureUrl: 'https://www.kap.org.tr/tr/sirket-bilgileri/genel/klrho', nonCompliantIncomeRatio: 7.80, interestBearingAssetsRatio: 36.50, interestBearingDebtRatio: 42.10, hasProhibitedActivity: true, prohibitedActivityDescription: 'Mali kuruluş ve finansal iştirak yapısı nedeniyle katılım endeksine uygun değildir', hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: false, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: false },
      { indexCode: 'XKT50', indexName: 'BIST Katılım 50', isIncluded: false },
      { indexCode: 'XKT30', indexName: 'BIST Katılım 30', isIncluded: false }
    ]
  },
  // 2. DOFRB (DOF Robotik Sanayi A.Ş. - COMPLIANT)
  {
    instrument: { id: 'dofrb', symbol: 'DOFRB', isin: 'TREDOFR00018', name: 'DOF Robotik Sanayi A.Ş.', shortName: 'DOF Robotik', type: InstrumentType.STOCK, sector: 'Teknoloji ve Robotik' },
    aliases: ['dof robotik', 'dof robotics', 'dofrb hissesi', 'dof robotik sanayi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-10', disclosureId: 'KAP-DOFRB-2026', disclosureUrl: 'https://www.kap.org.tr/tr/sirket-bilgileri/genel/dofrb', nonCompliantIncomeRatio: 0.05, interestBearingAssetsRatio: 7.80, interestBearingDebtRatio: 14.20, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: true, period: '2026/05 - 2026/10' }
    ]
  },
  // 3. PATEK (Pasifik Donanım ve Yazılım - NON COMPLIANT)
  {
    instrument: { id: 'patek', symbol: 'PATEK', isin: 'TREPATE00018', name: 'Pasifik Donanım ve Yazılım Bilgi Teknolojileri A.Ş.', shortName: 'Pasifik Teknoloji', type: InstrumentType.STOCK, sector: 'Yazılım ve Bilişim' },
    aliases: ['pasifik teknoloji', 'pasifik donanim', 'pasifik yazilim', 'patek hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-05', disclosureId: 'KAP-PATEK-2026', disclosureUrl: 'https://www.kap.org.tr/tr/sirket-bilgileri/genel/patek', nonCompliantIncomeRatio: 0.15, interestBearingAssetsRatio: 12.40, interestBearingDebtRatio: 37.80, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: false, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: false }
    ]
  },
  // 4. REEDR (Reeder Teknoloji - NON COMPLIANT)
  {
    instrument: { id: 'reedr', symbol: 'REEDR', isin: 'TREREED00010', name: 'Reeder Teknoloji Sanayi ve Ticaret A.Ş.', shortName: 'Reeder Teknoloji', type: InstrumentType.STOCK, sector: 'Elektronik ve Teknoloji' },
    aliases: ['reeder', 'reeder teknoloji', 'reedr hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-09', disclosureId: 'KAP-REEDR-2026', disclosureUrl: 'https://www.kap.org.tr/tr/sirket-bilgileri/genel/reedr', nonCompliantIncomeRatio: 0.45, interestBearingAssetsRatio: 14.80, interestBearingDebtRatio: 39.20, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: false, period: '2026/05 - 2026/10' }
    ]
  },
  // 5. ATATP (ATP Yazılım - COMPLIANT)
  {
    instrument: { id: 'atatp', symbol: 'ATATP', isin: 'TREATAP00010', name: 'ATP Yazılım ve Teknoloji A.Ş.', shortName: 'ATP Yazılım', type: InstrumentType.STOCK, sector: 'Yazılım ve Bilişim' },
    aliases: ['atp', 'atp yazilim', 'atp yazılım', 'atp teknoloji', 'atatp hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-08', disclosureId: 'KAP-1194250', disclosureUrl: 'https://www.kap.org.tr/tr/Bildirim/1194250', nonCompliantIncomeRatio: 0.02, interestBearingAssetsRatio: 6.40, interestBearingDebtRatio: 8.90, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT50', indexName: 'BIST Katılım 50', isIncluded: true, period: '2026/05 - 2026/10' }
    ]
  },
  // 6. ENJSA (Enerjisa Enerji - COMPLIANT)
  {
    instrument: { id: 'enjsa', symbol: 'ENJSA', isin: 'TREENJS00014', name: 'Enerjisa Enerji A.Ş.', shortName: 'Enerjisa', type: InstrumentType.STOCK, sector: 'Elektrik Dağıtım' },
    aliases: ['enerjisa', 'enjsa hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-03', disclosureId: 'KAP-1192300', disclosureUrl: 'https://www.kap.org.tr/tr/Bildirim/1192300', nonCompliantIncomeRatio: 0.80, interestBearingAssetsRatio: 11.40, interestBearingDebtRatio: 29.80, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT50', indexName: 'BIST Katılım 50', isIncluded: true, period: '2026/05 - 2026/10' }
    ]
  },
  // 7. TOASO (Tofaş - COMPLIANT)
  {
    instrument: { id: 'toaso', symbol: 'TOASO', isin: 'TRATOASO91H3', name: 'Tofaş Türk Otomobil Fabrikası A.Ş.', shortName: 'Tofaş', type: InstrumentType.STOCK, sector: 'Otomotiv' },
    aliases: ['tofas', 'tofaş', 'tofas turk otomobil', 'tofaş oto', 'toaso hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-04', disclosureId: 'KAP-1192842', disclosureUrl: 'https://www.kap.org.tr/tr/Bildirim/1192842', nonCompliantIncomeRatio: 0.85, interestBearingAssetsRatio: 14.30, interestBearingDebtRatio: 19.80, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT50', indexName: 'BIST Katılım 50', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT30', indexName: 'BIST Katılım 30', isIncluded: true, period: '2026/05 - 2026/10' }
    ]
  },
  // 8. THYAO (Türk Hava Yolları - COMPLIANT)
  {
    instrument: { id: 'thyao', symbol: 'THYAO', isin: 'TRATHYAO91M5', name: 'Türk Hava Yolları A.O.', shortName: 'Türk Hava Yolları', type: InstrumentType.STOCK, sector: 'Ulaştırma ve Havacılık' },
    aliases: ['thy', 'turk hava yollari', 'türk hava yolları', 'turkish airlines', 'thyao hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-08', disclosureId: 'KAP-1194200', disclosureUrl: 'https://www.kap.org.tr/tr/Bildirim/1194200', nonCompliantIncomeRatio: 1.45, interestBearingAssetsRatio: 18.90, interestBearingDebtRatio: 28.30, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT50', indexName: 'BIST Katılım 50', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT30', indexName: 'BIST Katılım 30', isIncluded: true, period: '2026/05 - 2026/10' }
    ]
  },
  // 9. BIMAS (BİM - COMPLIANT)
  {
    instrument: { id: 'bimas', symbol: 'BIMAS', isin: 'TREBIMM00018', name: 'BİM Birleşik Mağazalar A.Ş.', shortName: 'BİM', type: InstrumentType.STOCK, sector: 'Perakende Ticaret' },
    aliases: ['bim', 'bim magazalar', 'bim birlesik magazalar', 'bimas hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-12', disclosureId: 'KAP-1196105', disclosureUrl: 'https://www.kap.org.tr/tr/Bildirim/1196105', nonCompliantIncomeRatio: 0.40, interestBearingAssetsRatio: 12.10, interestBearingDebtRatio: 15.60, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT50', indexName: 'BIST Katılım 50', isIncluded: true, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT30', indexName: 'BIST Katılım 30', isIncluded: true, period: '2026/05 - 2026/10' }
    ]
  },
  // 10. SASA (Sasa Polyester - NON COMPLIANT)
  {
    instrument: { id: 'sasa', symbol: 'SASA', isin: 'TRASASAS91E0', name: 'Sasa Polyester Sanayi A.Ş.', shortName: 'Sasa Polyester', type: InstrumentType.STOCK, sector: 'Kimya ve Plastik' },
    aliases: ['sasa polyester', 'sasa hissesi'],
    financials: { financialPeriod: '2026/06', disclosureDate: '2026-08-11', disclosureId: 'KAP-1195612', disclosureUrl: 'https://www.kap.org.tr/tr/Bildirim/1195612', nonCompliantIncomeRatio: 0.35, interestBearingAssetsRatio: 8.40, interestBearingDebtRatio: 38.90, hasProhibitedActivity: false, hasPrivilegedShares: false, isConsolidated: true },
    indices: [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: false, period: '2026/05 - 2026/10' }
    ]
  },
  // 11. KUA (Kuveyt Türk Agresif Katılım Fonu)
  {
    instrument: { id: 'kua', symbol: 'KUA', name: 'Kuveyt Türk Portföy Agresif Katılım Fonu', shortName: 'Kuveyt Türk Agresif Katılım', type: InstrumentType.MUTUAL_FUND, founder: 'Kuveyt Türk Portföy Yönetimi A.Ş.', fundType: 'Katılım Hisse Senedi Fonu', umbrellaFund: 'Katılım Şemsiye Fonu' },
    aliases: ['kuveyt turk agresif', 'kuveyt türk portföy agresif katılım fonu', 'kua fonu', 'kua tefas'],
    fundData: { fundName: 'Kuveyt Türk Portföy Agresif Katılım Fonu', tefasCode: 'KUA', founder: 'Kuveyt Türk Portföy Yönetimi A.Ş.', umbrellaFundCategory: 'Katılım Şemsiye Fonu', fundType: 'Katılım Hisse Senedi Fonu (Hisse Yoğun)', hasShariaBoardApproval: true, tefasUrl: 'https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=KUA', prospectusUrl: 'https://www.kap.org.tr/tr/fon-bilgileri/ozet/kua' }
  }
];

