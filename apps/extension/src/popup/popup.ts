import { sourceLinks } from '@katilim/compliance-engine';
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
      <div class="result-item" data-symbol="${escapeHtml(item.symbol)}">
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
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 16px; font-weight: 800; color: #0f172a;">${escapeHtml(inst.symbol)}</span>
          <div style="font-size: 11px; color: #475569;">${escapeHtml(inst.name)}</div>
        </div>
        <span class="type-pill ${isStock ? 'type-stock' : 'type-fund'}">
          ${isStock ? 'Hisse' : 'Fon'}
        </span>
      </div>

      <div class="status-box ${ev.statusBadgeVariant}">
        <span style="font-size: 20px;">${icon}</span>
        <div>
          <div style="font-weight: 800; font-size: 12px; margin-bottom: 2px;">${escapeHtml(ev.statusLabel)}</div>
          <div style="font-size: 11px; line-height: 1.35;">${escapeHtml(ev.summaryReason)}</div>
        </div>
      </div>

      ${isStock && ev.indices.length > 0 ? `
        <div>
          <div class="section-title">BIST Katılım Endeksleri</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            ${ev.indices.map(i => `
              <div style="padding: 4px 6px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 10px; font-weight: 600; display: flex; justify-content: space-between;">
                <span>${escapeHtml(i.indexName)}</span>
                <span>${i.isMember ? '✅' : '—'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${ev.criteria.length > 0 ? `
        <div>
          <div class="section-title">${isStock ? 'KAP Finansal Kriterler' : 'Fon Kriterleri'}</div>
          ${ev.criteria.map(c => `
            <div class="row-item">
              <span>${c.name}</span>
              <span style="font-weight: 600; color: ${c.isPassed ? '#166534' : '#be123c'};">
                ${c.actualFormatted ? c.actualFormatted : ''} (${c.isPassed ? '✅' : '❌'})
              </span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="font-size:11px;margin:8px 0;color:#475569;">${ev.asOf ? `Kontrol: ${escapeHtml(new Date(ev.asOf).toLocaleString('tr-TR'))} ${ev.isCached ? '(önbellek)' : ''}` : 'Güncel kaynak doğrulanmadı.'}<br>Güncel finansal oranlar doğrulanmadı.</div>
      <button id="refreshDetail" class="tag-btn">↻ Yenile</button>
      ${isStock ? `<a href="${escapeHtml(sourceLinks(inst).kap)}" target="_blank" rel="noopener noreferrer">KAP ↗</a> · <a href="${escapeHtml(sourceLinks(inst).helalFinans)}" target="_blank" rel="noopener noreferrer">Helal Finans ↗</a>` : ''}
      <div style="font-size: 9px; color: #94a3b8; text-align: center; margin-top: 6px;">
        ${escapeHtml(ev.disclaimer)}
      </div>
    `;
    detailCard.querySelector('#refreshDetail')?.addEventListener('click', () => performDirectCheck(inst.symbol,true));
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
