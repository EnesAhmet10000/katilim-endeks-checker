import { sourceLinks, instrumentQuery } from '@katilim/compliance-engine';
import { ComplianceEvaluation, DisambiguationCandidate, InstrumentType } from '@katilim/shared-types';
import { applyView, bindViewControls, normalizeView, readView, ViewPreferences } from '../view-preferences.js';
import { resultAppearance } from '../result-appearance.js';

class KatilimOverlayManager {
  private container: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private view: ViewPreferences = normalizeView();
  private disposeView?: () => void;

  constructor() {
    void readView().then(view=>{this.view=view;this.mountView();});
    this.initMessageListener();
    console.log('🌙 Katılım Finans content script initialized.');
  }

  private initMessageListener() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'SHOW_LOADING') {
        this.renderLoading(message.query);
        sendResponse({ received: true });
      } else if (message.type === 'SHOW_RESULT') {
        this.renderResult(message.query, message.evaluation);
        sendResponse({ received: true });
      } else if (message.type === 'SHOW_CANDIDATES') {
        this.renderCandidates(message.query, message.candidates);
        sendResponse({ received: true });
      } else if (message.type === 'SHOW_ERROR') {
        this.renderError(message.query, message.error);
        sendResponse({ received: true });
      }
      return true;
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.remove();
      }
    });
  }

  private ensureShadowHost(): ShadowRoot {
    if (!this.container || !this.container.parentNode) {
      const existing = document.getElementById('katilim-extension-root');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      this.container = document.createElement('div');
      this.container.id = 'katilim-extension-root';
      this.container.style.setProperty('position', 'fixed', 'important');
      this.container.style.setProperty('z-index', '2147483647', 'important');
      this.container.style.setProperty('top', '24px', 'important');
      this.container.style.setProperty('right', '24px', 'important');
      this.container.style.setProperty('display', 'block', 'important');
      this.container.style.setProperty('visibility', 'visible', 'important');
      this.container.style.setProperty('pointer-events', 'auto', 'important');
      this.container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

      const parent = document.body || document.documentElement;
      parent.appendChild(this.container);
      this.shadow = this.container.attachShadow({ mode: 'open' });
    }
    return this.shadow!;
  }

  private getStyles(): string {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      [hidden] { display: none !important; }
      .view-controls { padding:10px 18px; background:#f8fafc; color:#334155; font-size:12px; border-bottom:1px solid #e2e8f0; }
      .view-controls select, .view-controls button { padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; background:white; color:#334155; font:inherit; }
      .view-controls button { margin-left:8px; cursor:pointer; }
      .view-controls fieldset { border:0; margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .view-controls legend { margin-bottom:8px; }
      .view-controls fieldset label { display:flex; align-items:center; gap:6px; }

      .overlay-card {
        width: 430px;
        max-width: calc(100vw - 32px);
        max-height: calc(100vh - 48px);
        background: #ffffff;
        color: #0f172a;
        border-radius: 16px;
        box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-12px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .card-header {
        padding: 14px 18px;
        background: #0f172a;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .header-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #38bdf8;
      }

      .header-brand svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      .close-btn {
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: #e2e8f0;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.15s ease;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        color: #ffffff;
      }

      .card-body {
        padding: 18px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: 65vh;
      }

      .card-body::-webkit-scrollbar {
        width: 6px;
      }
      .card-body::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }

      .instrument-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .symbol-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .symbol-badge {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: 0.5px;
      }

      .type-pill {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .type-stock { background: #e0f2fe; color: #0369a1; }
      .type-fund { background: #fef3c7; color: #b45309; }

      .company-name {
        font-size: 13px;
        color: #475569;
        line-height: 1.4;
      }

      /* Status Banners */
      .status-banner {
        padding: 14px;
        border-radius: 12px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        border: 1px solid transparent;
      }

      .status-banner.success {
        background: #ecfdf5;
        border-color: #a7f3d0;
        color: #065f46;
      }

      .status-banner.danger {
        background: #fff1f2;
        border-color: #fecdd3;
        color: #9f1239;
      }

      .status-banner.warning {
        background: #fffbeb;
        border-color: #fde68a;
        color: #92400e;
      }

      .status-banner.neutral {
        background: #f8fafc;
        border-color: #e2e8f0;
        color: #334155;
      }

      .status-icon {
        font-size: 22px;
        line-height: 1;
      }

      .status-title {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.2px;
        margin-bottom: 3px;
      }

      .status-reason {
        font-size: 12px;
        line-height: 1.45;
        opacity: 0.92;
      }

      /* Indices Row */
      .section-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
      }

      .section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #64748b;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .indices-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }

      .index-chip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        color: #334155;
      }

      .index-chip.included {
        border-color: #86efac;
        background: #f0fdf4;
        color: #166534;
      }
      .index-chip.excluded {
        border-color: #fecdd3;
        background: #fff1f2;
        color: #9f1239;
      }

      /* Criteria Table */
      .criteria-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .criterion-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 12px;
      }

      .criterion-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .crit-name {
        font-weight: 600;
        color: #1e293b;
      }

      .crit-ratio {
        font-size: 11px;
        color: #64748b;
      }

      .crit-status {
        font-weight: 700;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .crit-status.pass { background: #dcfce7; color: #15803d; }
      .crit-status.fail { background: #ffe4e6; color: #be123c; }

      /* Sources list */
      .sources-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .source-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 10px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 11px;
      }

      .source-name {
        font-weight: 600;
        color: #0f172a;
      }

      .source-link {
        color: #0284c7;
        text-decoration: none;
        font-weight: 600;
      }

      .source-link:hover {
        text-decoration: underline;
      }

      /* Footer */
      .card-footer {
        padding: 12px 18px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .action-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn {
        flex: 1;
        padding: 7px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #334155;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.15s ease;
        text-align: center;
        white-space: nowrap;
      }

      .btn:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
      }

      .btn-primary {
        background: #0284c7;
        border-color: #0284c7;
        color: #ffffff;
      }

      .btn-primary:hover {
        background: #0369a1;
      }

      .btn-helal {
        border-color: #10b981;
        color: #047857;
        background: #f0fdf4;
        font-weight: 700;
      }

      .btn-helal:hover {
        background: #dcfce7;
        border-color: #059669;
      }

      .btn-fintables {
        border-color: #3b82f6;
        color: #1d4ed8;
        background: #eff6ff;
        font-weight: 700;
      }

      .btn-fintables:hover {
        background: #dbeafe;
        border-color: #2563eb;
      }

      .disclaimer {
        font-size: 11px;
        color: #475569;
        line-height: 1.35;
        text-align: center;
      }

      /* Loading Animation */
      .loading-box {
        padding: 28px 18px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-align: center;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e2e8f0;
        border-top-color: #0284c7;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Candidates List */
      .candidate-item {
        padding: 10px 12px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.15s ease;
      }

      .candidate-item:hover {
        background: #f0f9ff;
        border-color: #bae6fd;
      }
    `;
  }

  public renderLoading(query: string) {
    const shadow = this.ensureShadowHost();
    shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="overlay-card">
        <div class="card-header">
          <div class="header-brand">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Katılım Kontrol
          </div>
          <button class="close-btn" id="closeCard">✕</button>
        </div>
        <div class="card-body">
          <div class="loading-box">
            <div class="spinner"></div>
            <div>
              <div style="font-weight: 700; font-size: 14px; color: #1e293b;">${this.escapeHtml(query)} analiz ediliyor...</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Borsa İstanbul, KAP ve TEFAS resmi kaynakları kontrol ediliyor</div>
            </div>
          </div>
        </div>
      </div>
    `;

    shadow.getElementById('closeCard')?.addEventListener('click', () => this.remove());
  }

  public renderResult(query: string, evaluation: ComplianceEvaluation) {
    this.disposeView?.();
    const shadow = this.ensureShadowHost();
    const inst = evaluation.instrument;
    const isStock = inst.type === InstrumentType.STOCK;

    const appearance = resultAppearance(evaluation);
    const statusIcon = appearance.icon;

    let indicesHtml = '';
    if (isStock && evaluation.indices && evaluation.indices.length > 0) {
      indicesHtml = `
        <div class="section-box" data-view-section="indices">
          <div class="section-title">
            <span>BIST Katılım Endeksleri</span>
            <span style="font-weight: 500; text-transform: none;">${this.escapeHtml(evaluation.indices[0].period || 'Kaynak tarihi bilinmiyor')}</span>
          </div>
          <div class="indices-grid">
            ${evaluation.indices.map(i => `
              <div class="index-chip ${i.isMember ? 'included' : 'excluded'}">
                <span>${this.escapeHtml(i.indexName)}</span>
                <span>${i.isMember ? '✓' : 'Listede yok'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    let criteriaHtml = '';
    if (evaluation.criteria && evaluation.criteria.length > 0) {
      criteriaHtml = `
        <div class="section-box" data-view-section="criteria">
          <div class="section-title">${isStock ? 'KAP KAFİF beyanları' : 'Fon Katılım Kriterleri'} · ${this.escapeHtml(evaluation.financialPeriod || '')}</div>
          <div class="criteria-list">
            ${evaluation.criteria.map(c => `
              <div class="criterion-row">
                <div class="criterion-info">
                  <span class="crit-name">${this.escapeHtml(c.name)}</span>
                  <span class="crit-ratio">
                    ${c.actualFormatted ? `Beyan: <b>${this.escapeHtml(c.actualFormatted)}</b>` : ''}
                    ${c.thresholdFormatted ? `| Limit: ${this.escapeHtml(c.thresholdFormatted)}` : ''}
                  </span>
                </div>
                <span class="crit-status ${c.isPassed===null ? '' : c.isPassed ? 'pass' : 'fail'}">
                  ${this.escapeHtml(c.statusText)}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    let sourcesHtml = '';
    if (evaluation.sources && evaluation.sources.length > 0) {
      sourcesHtml = `
        <div class="section-box" data-view-section="sources">
          <div class="section-title">Okunan Kaynaklar</div>
          <div class="sources-list">
            ${evaluation.sources.map(s => `
              <div class="source-card">
                <div>
                  <div class="source-name">${this.escapeHtml(s.sourceName)}</div>
                  <div style="font-size: 10px; color: #64748b;">${this.escapeHtml(s.badgeText)}</div>
                  <div style="font-size:11px;color:#475569;">${this.escapeHtml(s.financialPeriod || s.publishedAt || '')}</div>
                </div>
                ${s.url ? `<a href="${this.escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="source-link">Kaynağa Git ↗</a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="overlay-card">
        <div class="card-header">
          <div class="header-brand">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Katılım Kontrol
          </div>
          <button class="close-btn" id="closeCard">✕</button>
        </div>

          <div class="view-controls" id="viewControls"></div>
        <div class="card-body">
          <div class="instrument-meta" data-view-section="identity">
            <div class="symbol-row">
              <span class="symbol-badge">${this.escapeHtml(inst.symbol)}</span>
              <span class="type-pill ${isStock ? 'type-stock' : 'type-fund'}">
                ${isStock ? 'HİSSE SENEDİ' : inst.type===InstrumentType.PENSION_FUND?'EMEKLİLİK FONU':inst.type===InstrumentType.ETF?'BORSA YATIRIM FONU':'YATIRIM FONU'}
              </span>
            </div>
            <div class="company-name">${this.escapeHtml(inst.name)}</div>
          </div>

          <div class="status-banner ${appearance.variant}">
            <span class="status-icon">${statusIcon}</span>
            <div>
              <div class="status-title">${this.escapeHtml(evaluation.statusLabel)}</div>
              <div class="status-reason" data-view-section="reason">${this.escapeHtml(evaluation.summaryReason)}</div>
            </div>
          </div>

          ${evaluation.asOf ? `<p data-view-section="timestamp" style="font-size:12px;color:#64748b;">Kontrol: ${this.escapeHtml(new Date(evaluation.asOf).toLocaleString('tr-TR'))} ${evaluation.isCached ? '(önbellek)' : ''}</p>` : ''}
          ${indicesHtml}
          ${criteriaHtml}
          ${evaluation.fundProfile ? `<div class="section-box" data-view-section="fundProfile"><div class="section-title">KAP Fon Kaydı</div><p>${this.escapeHtml(evaluation.fundProfile.umbrellaName || 'Şemsiye fon adı belirtilmemiş')}</p><p>Tür: ${this.escapeHtml(evaluation.fundProfile.umbrellaType || 'Bu sayfada doğrulanamadı')}</p></div>` : ''}
          ${evaluation.fundData ? `<div class="section-box" data-view-section="fundProfile"><div class="section-title">TEFAS fon profili</div><p>${this.escapeHtml(evaluation.fundData.tradingStatus || 'İşlem durumu doğrulanamadı')}</p><p>ISIN: ${this.escapeHtml(evaluation.fundData.isin || 'Doğrulanamadı')}</p></div>${evaluation.fundData.allocation.length?`<div class="section-box" data-view-section="allocation"><div class="section-title">Varlık türü dağılımı · ${this.escapeHtml(evaluation.fundData.allocationDate || '')}</div>${evaluation.fundData.allocation.map(a=>`<div class="criterion-row"><span>${this.escapeHtml(a.name)}</span><b>%${a.percent.toLocaleString('tr-TR',{maximumFractionDigits:2})}</b></div>`).join('')}</div>`:''}` : ''}
          ${isStock&&!evaluation.criteria.length ? '<div class="section-box" data-view-section="warnings">Bu şirket için KAFİF oranları doğrulanmadı. Eski veya örnek değerler kullanılmaz.</div>' : !isStock&&!evaluation.fundData?.allocation.length?'<div class="section-box" data-view-section="warnings">Güncel portföy dağılımı doğrulanmadı. İcazet belgesi ayrıca incelenmelidir.</div>':''}
          ${sourcesHtml}
          ${evaluation.dataWarnings?.length?`<div class="section-box" data-view-section="warnings"><div class="section-title">Veri kapsamı</div>${evaluation.dataWarnings.map(w=>`<p style="font-size:12px;margin-bottom:6px;">${this.escapeHtml(w)}</p>`).join('')}</div>`:''}
        </div>

        <div class="card-footer">
          <div class="action-row">
            <button class="btn" id="refreshBtn">↻ Yenile</button>
            <button class="btn btn-primary" id="kapBtn">
              KAP ↗
            </button>
            ${isStock ? `
              <button class="btn btn-helal" id="helalFinansBtn">Helal Finans ↗</button>
              <button class="btn btn-fintables" id="fintablesBtn">Fintables ↗</button>
            ` : inst.type===InstrumentType.MUTUAL_FUND?'<button class="btn" id="tefasBtn">TEFAS’ta Kontrol Et ↗</button>':''}
          </div>
          <div class="disclaimer" data-view-section="disclaimer">API anahtarı gerekmez · Hesap veya izleme yok<br>${this.escapeHtml(evaluation.disclaimer)}</div>
        </div>
      </div>
    `;

    this.mountView();
    shadow.getElementById('closeCard')?.addEventListener('click', () => this.remove());

    shadow.getElementById('refreshBtn')?.addEventListener('click', () => {
      this.renderLoading(query);
      chrome.runtime.sendMessage({
        type: 'PERFORM_CHECK',
        query: instrumentQuery(inst),
        forceRefresh: true
      });
    });

    shadow.getElementById('kapBtn')?.addEventListener('click', () => {
      const primaryUrl = sourceLinks(inst).kap;
      window.open(primaryUrl, '_blank', 'noopener,noreferrer');
    });

    shadow.getElementById('tefasBtn')?.addEventListener('click', () => window.open(sourceLinks(inst).tefas,'_blank','noopener,noreferrer'));

    if (isStock) {
      shadow.getElementById('helalFinansBtn')?.addEventListener('click', () => {
        window.open(sourceLinks(inst).helalFinans, '_blank','noopener,noreferrer');
      });

      shadow.getElementById('fintablesBtn')?.addEventListener('click', () => {
        window.open(sourceLinks(inst).fintables, '_blank','noopener,noreferrer');
      });
    }
  }

  public renderCandidates(query: string, candidates: DisambiguationCandidate[]) {
    const shadow = this.ensureShadowHost();
    shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="overlay-card">
        <div class="card-header">
          <div class="header-brand">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Katılım Kontrol
          </div>
          <button class="close-btn" id="closeCard">✕</button>
        </div>
        <div class="card-body">
          <div style="font-weight: 700; font-size: 14px; color: #0f172a;">Hangisini kastediyorsunuz?</div>
          <div style="font-size: 12px; color: #64748b;">"${this.escapeHtml(query)}" sorgusu için birden fazla olası varlık bulundu:</div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            ${candidates.map(c => `
              <div class="candidate-item" data-symbol="${this.escapeHtml(instrumentQuery(c))}">
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: #0284c7;">${this.escapeHtml(c.symbol)}</div>
                  <div style="font-size: 11px; color: #475569;">${this.escapeHtml(c.name)}</div>
                </div>
                <span class="type-pill ${c.type === InstrumentType.STOCK ? 'type-stock' : 'type-fund'}">
                  ${c.type === InstrumentType.STOCK ? 'Hisse' : 'Fon'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    shadow.getElementById('closeCard')?.addEventListener('click', () => this.remove());

    shadow.querySelectorAll('.candidate-item').forEach(el => {
      el.addEventListener('click', () => {
        const sym = el.getAttribute('data-symbol');
        if (sym) {
          this.renderLoading(sym);
          chrome.runtime.sendMessage({
            type: 'PERFORM_CHECK',
            query: sym,
            forceRefresh: false
          });
        }
      });
    });
  }

  public renderError(query: string, error: string) {
    const shadow = this.ensureShadowHost();
    shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="overlay-card">
        <div class="card-header">
          <div class="header-brand">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Katılım Kontrol
          </div>
          <button class="close-btn" id="closeCard">✕</button>
        </div>
        <div class="card-body">
          <div class="status-banner danger">
            <span class="status-icon">⚠️</span>
            <div>
              <div class="status-title">Sonuç Bulunamadı</div>
              <div class="status-reason">${this.escapeHtml(error)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    shadow.getElementById('closeCard')?.addEventListener('click', () => this.remove());
  }

  private mountView() {
    this.disposeView?.();
    const controls=this.shadow?.getElementById('viewControls');
    if(!controls||!this.shadow) return;
    applyView(this.shadow,this.view);
    this.disposeView=bindViewControls(controls,this.view,view=>{this.view=view;if(this.shadow) applyView(this.shadow,view);});
  }

  public remove() {
    this.disposeView?.();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.shadow = null;
    }
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

if (!(window as any).__katilimOverlayManager) {
  (window as any).__katilimOverlayManager = new KatilimOverlayManager();
}
