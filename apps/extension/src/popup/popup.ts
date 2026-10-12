import { sourceLinks, instrumentQuery } from '@katilim/compliance-engine';
import { applyView, bindViewControls, normalizeView, readView } from '../view-preferences.js';
const escapeHtml = (text: string) => (text || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));
import { ComplianceCheckResponse, ComplianceEvaluation, InstrumentSummary, InstrumentType } from '@katilim/shared-types';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const clearSearchBtn = document.getElementById('clearSearchBtn') as HTMLButtonElement;
  const quickTags = document.getElementById('quickTags') as HTMLElement;
  const welcomeBox = document.getElementById('welcomeBox') as HTMLElement;
  const resultsList = document.getElementById('resultsList') as HTMLElement;
  const loadingState = document.getElementById('loadingState') as HTMLElement;
  const detailCard = document.getElementById('detailCard') as HTMLElement;
  let view=normalizeView();
  void readView().then(saved=>{view=saved;applyView(detailCard,view);bindViewControls(document.getElementById('viewControls')!,view,prefs=>{view=prefs;applyView(detailCard,view);});});

  let debounceTimer: any = null;

  // Search input handler with debounce
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (q.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
      resetToWelcome();
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(q);
    }, 200);
  });

  // Clear search button
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    resetToWelcome();
  });

  // Quick tag buttons
  quickTags.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      if (q) {
        searchInput.value = q;
        clearSearchBtn.classList.remove('hidden');
        performDirectCheck(q);
      }
    });
  });

  function resetToWelcome() {
    welcomeBox.classList.remove('hidden');
    resultsList.classList.add('hidden');
    loadingState.classList.add('hidden');
    detailCard.classList.add('hidden');
    resultsList.innerHTML = '';
    detailCard.innerHTML = '';
  }

  function showLoading() {
    welcomeBox.classList.add('hidden');
    resultsList.classList.add('hidden');
    detailCard.classList.add('hidden');
    loadingState.classList.remove('hidden');
  }

  function performSearch(query: string) {
    chrome.runtime.sendMessage({ type: 'POPUP_SEARCH', query }, (response) => {
      if (response && response.results && response.results.length > 0) {
        renderResultsList(response.results);
      } else {
        // Direct evaluate if single word ticker
        performDirectCheck(query);
      }
    });
  }

  function renderResultsList(items: InstrumentSummary[]) {
    welcomeBox.classList.add('hidden');
    loadingState.classList.add('hidden');
    detailCard.classList.add('hidden');
    resultsList.classList.remove('hidden');

    resultsList.innerHTML = items.map(item => `
      <div class="result-item" data-symbol="${escapeHtml(instrumentQuery(item))}">
        <div class="result-info">
          <span class="result-symbol">${escapeHtml(item.symbol)}</span>
          <span class="result-name">${escapeHtml(item.name)}</span>
        </div>
        <span class="type-pill ${item.type === InstrumentType.STOCK ? 'type-stock' : 'type-fund'}">
          ${item.type === InstrumentType.STOCK ? 'Hisse' : 'Fon'}
        </span>
      </div>
    `).join('');

    resultsList.querySelectorAll('.result-item').forEach(el => {
      el.addEventListener('click', () => {
        const symbol = el.getAttribute('data-symbol');
        if (symbol) {
          performDirectCheck(symbol);
        }
      });
    });
  }

  function performDirectCheck(query: string, forceRefresh=false) {
    showLoading();
    chrome.runtime.sendMessage({ type: 'POPUP_DIRECT_CHECK', query, forceRefresh }, (response: ComplianceCheckResponse) => {
      loadingState.classList.add('hidden');
      if (response && response.success && response.evaluation) {
        renderDetailCard(response.evaluation);
      } else if(response?.resolution?.isAmbiguous && response.resolution.candidates) {
        renderResultsList(response.resolution.candidates.map(c=>({...c,id:instrumentQuery(c)})));
      } else {
        renderError(response?.error || `"${query}" için katılım uygunluğu tespit edilemedi.`);
      }
    });
  }

  function renderDetailCard(ev: ComplianceEvaluation) {
    welcomeBox.classList.add('hidden');
    resultsList.classList.add('hidden');
    loadingState.classList.add('hidden');
    detailCard.classList.remove('hidden');

    const inst = ev.instrument;
    const isStock = inst.type === InstrumentType.STOCK;

    const icon = ev.statusBadgeVariant === 'success' ? '✅' : ev.statusBadgeVariant === 'danger' ? '❌' : '⚠️';

    detailCard.innerHTML = `
      <div data-view-section="identity" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 16px; font-weight: 800; color: #0f172a;">${escapeHtml(inst.symbol)}</span>
          <div style="font-size: 11px; color: #475569;">${escapeHtml(inst.name)}</div>
        </div>
        <span class="type-pill ${isStock ? 'type-stock' : 'type-fund'}">
          ${isStock ? 'Hisse' : inst.type===InstrumentType.PENSION_FUND?'Emeklilik':inst.type===InstrumentType.ETF?'BYF':'Fon'}
        </span>
      </div>

      <div class="status-box ${ev.statusBadgeVariant}">
        <span style="font-size: 20px;">${icon}</span>
        <div>
          <div style="font-weight: 800; font-size: 12px; margin-bottom: 2px;">${escapeHtml(ev.statusLabel)}</div>
          <div data-view-section="reason" style="font-size: 11px; line-height: 1.35;">${escapeHtml(ev.summaryReason)}</div>
        </div>
      </div>

      ${isStock && ev.indices.length > 0 ? `
        <div data-view-section="indices">
          <div class="section-title">BIST Katılım Endeksleri</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            ${ev.indices.map(i => `
              <div style="padding: 4px 6px; background: ${i.isMember ? '#f0fdf4' : '#fff1f2'}; color: ${i.isMember ? '#166534' : '#9f1239'}; border: 1px solid ${i.isMember ? '#86efac' : '#fecdd3'}; border-radius: 4px; font-size: 10px; font-weight: 600; display: flex; justify-content: space-between;">
                <span>${escapeHtml(i.indexName)}</span>
                <span>${i.isMember ? '✓' : 'Listede yok'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${ev.criteria.length > 0 ? `
        <div data-view-section="criteria">
          <div class="section-title">${isStock ? 'KAP KAFİF beyanları' : 'Fon Kriterleri'} · ${escapeHtml(ev.financialPeriod||'')}</div>
          ${ev.criteria.map(c => `
            <div class="row-item">
              <span>${escapeHtml(c.name)}</span>
              <span style="font-weight: 600; color: ${c.isPassed===null ? '#475569' : c.isPassed ? '#166534' : '#be123c'};">
                ${escapeHtml(c.actualFormatted||'Doğrulanamadı')}
              </span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${ev.fundProfile?`<div data-view-section="fundProfile" style="font-size:11px;margin:8px 0;">Şemsiye türü: ${escapeHtml(ev.fundProfile.umbrellaType||'Doğrulanamadı')}</div>`:''}
      ${ev.fundData?`<div data-view-section="fundProfile"><div class="section-title">TEFAS fon profili</div><p>${escapeHtml(ev.fundData.tradingStatus||'Doğrulanamadı')}</p><p>ISIN: ${escapeHtml(ev.fundData.isin||'Doğrulanamadı')}</p></div>${ev.fundData.allocation.length?`<div data-view-section="allocation"><div class="section-title">Varlık dağılımı · ${escapeHtml(ev.fundData.allocationDate||'')}</div>${ev.fundData.allocation.map(a=>`<div class="row-item"><span>${escapeHtml(a.name)}</span><b>%${a.percent.toLocaleString('tr-TR',{maximumFractionDigits:2})}</b></div>`).join('')}</div>`:''}`:''}
      <div data-view-section="timestamp" style="font-size:11px;margin:8px 0;color:#475569;">${ev.asOf ? `Kontrol: ${escapeHtml(new Date(ev.asOf).toLocaleString('tr-TR'))} ${ev.isCached ? '(önbellek)' : ''}` : 'Güncel kaynak doğrulanmadı.'}</div>
      <div data-view-section="sources"><div class="section-title">Okunan kaynaklar</div>${ev.sources.map(s=>`<p><a href="${escapeHtml(s.url||sourceLinks(inst).kap)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)} ↗</a><br><small>${escapeHtml(s.financialPeriod||s.publishedAt||'')}</small></p>`).join('')}</div>
      <div data-view-section="warnings">${ev.dataWarnings?.map(w=>`<p style="font-size:11px;">${escapeHtml(w)}</p>`).join('')||''}</div>
      <button id="refreshDetail" class="tag-btn">↻ Yenile</button>
      <a href="${escapeHtml(sourceLinks(inst).kap)}" target="_blank" rel="noopener noreferrer">KAP ↗</a> ${isStock ? `· <a href="${escapeHtml(sourceLinks(inst).helalFinans)}" target="_blank" rel="noopener noreferrer">Helal Finans ↗</a>` : inst.type===InstrumentType.MUTUAL_FUND?`· <a href="${escapeHtml(sourceLinks(inst).tefas)}" target="_blank" rel="noopener noreferrer">TEFAS’ta Kontrol Et ↗</a>`:''}
      ${isStock?`· <a href="${escapeHtml(sourceLinks(inst).fintables)}" target="_blank" rel="noopener noreferrer">Fintables ↗</a>`:''}
      <div data-view-section="disclaimer" style="font-size: 9px; color: #94a3b8; text-align: center; margin-top: 6px;">
        API anahtarı gerekmez · Hesap veya izleme yok<br>${escapeHtml(ev.disclaimer)}
      </div>
    `;
    applyView(detailCard,view);
    detailCard.querySelector('#refreshDetail')?.addEventListener('click', () => performDirectCheck(instrumentQuery(inst),true));
  }

  function renderError(msg: string) {
    welcomeBox.classList.add('hidden');
    resultsList.classList.add('hidden');
    loadingState.classList.add('hidden');
    detailCard.classList.remove('hidden');

    detailCard.innerHTML = `
      <div class="status-box danger">
        <span style="font-size: 20px;">⚠️</span>
        <div>
          <div style="font-weight: 700; font-size: 12px;">Uygunluk Bulunamadı</div>
          <div style="font-size: 11px;">${escapeHtml(msg)}</div>
        </div>
      </div>
    `;
  }
});
