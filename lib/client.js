window.__ModuleLoader__.load({
  id: 'dsh-star-favorites',
  factory() {
    const KEY = 'dsh.star.msg.v1';
    const SVGNS = 'http://www.w3.org/2000/svg';
    const state = {
      favorites: {},
      railStars: new Map(),
      lastError: null,
      lastToggle: null,
      markCount: 0,
      root: null,
      frame: null,
      rafPending: false,
      panelTimer: 0,
      selfMutateAt: 0,
      pauseUntil: 0,
      events: 0
    };

    function safe(fn) {
      try { return fn(); } catch (err) { state.lastError = String((err && err.message) || err); console.warn('[dsh-star]', err); }
    }

    function load() {
      safe(() => {
        const raw = localStorage.getItem(KEY);
        const obj = raw ? JSON.parse(raw) : null;
        if (obj && typeof obj === 'object') state.favorites = obj;
      });
    }

    function persist() { safe(() => localStorage.setItem(KEY, JSON.stringify(state.favorites))); }

    function itemOf(node) {
      return node && node.closest ? node.closest('[data-chat-flow-kind="user"][data-chat-turn]') : null;
    }
    function keyOf(item) {
      return item ? (item.getAttribute('data-chat-node-key') || item.getAttribute('data-chat-flow-key') || '') : '';
    }
    function turnOf(item) {
      const n = parseInt((item && item.getAttribute('data-chat-turn')) || '', 10);
      return Number.isFinite(n) ? n : null;
    }
    function isFav(key) { return !!key && Object.prototype.hasOwnProperty.call(state.favorites, key); }

    // ---- rounded 5-point star ----
    function starPath() {
      const cx = 12, cy = 12.4, R = 9.4, r = 3.9;
      const pts = [];
      for (let i = 0; i < 10; i += 1) {
        const rad = i % 2 === 0 ? R : r;
        const ang = (-90 + i * 36) * Math.PI / 180;
        pts.push([(cx + rad * Math.cos(ang)).toFixed(2), (cy + rad * Math.sin(ang)).toFixed(2)]);
      }
      return 'M' + pts.map((p) => p.join(' ')).join(' L') + ' Z';
    }
    const PATH_D = starPath();

    function starSvg(filled, px) {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('width', String(px));
      svg.setAttribute('height', String(px));
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.display = 'block';
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', PATH_D);
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('fill', filled ? 'currentColor' : 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', filled ? '2.6' : '1.7');
      svg.appendChild(path);
      return svg;
    }

    function onStarEvent(ev) {
      const target = ev.target;
      const btn = target && target.closest ? target.closest('.dsh-star-msg') : null;
      if (!btn) return;
      if (Date.now() - (state.lastEventTs || 0) < 300) return;
      state.lastEventTs = Date.now();
      state.events += 1;
      ev.preventDefault();
      ev.stopPropagation();
      toggle(itemOf(btn));
    }
    document.addEventListener('pointerdown', onStarEvent, true);
    document.addEventListener('click', onStarEvent, true);

    function toggle(item) {
      if (!item) { state.lastToggle = { ok: false, reason: 'no item' }; return; }
      const key = keyOf(item);
      const turn = turnOf(item);
      if (!key) { state.lastToggle = { ok: false, reason: 'no key', turn }; return; }
      if (isFav(key)) delete state.favorites[key];
      else state.favorites[key] = { turn, text: (item.textContent || '').trim().slice(0, 80), title: document.title || '', ts: Date.now() };
      persist();
      state.lastToggle = { ok: true, key, turn, count: Object.keys(state.favorites).length };
      renderMessage(item);
      renderRail();
    }

    function makeStarButton() {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = '_1KfHza_action dsh-star-msg';
      b.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;' +
        'margin-left:2px;border:0;background:transparent;cursor:pointer;line-height:1;color:inherit;pointer-events:auto';
      return b;
    }

    // ---- scoped roots ----
    function refreshRoots() {
      if (state.root && state.root.isConnected) return state.root;
      state.root = document.querySelector('[data-chat-flow]') || document.querySelector('.V4vHZW_scroll') || document.body;
      state.frame = null;
      return state.root;
    }
    function frameEl() {
      if (state.frame && state.frame.isConnected) return state.frame;
      state.frame = document.querySelector('.SNx2jG_frame');
      return state.frame;
    }

    function renderMessage(item) {
      const key = keyOf(item);
      if (!key) return;
      let btn = item.querySelector('.dsh-star-msg');
      if (!btn) {
        const copy = item.querySelector('button[aria-label="复制"]');
        if (!copy) return;
        btn = makeStarButton();
        state.selfMutateAt = Date.now();
        copy.insertAdjacentElement('afterend', btn);
      }
      const on = isFav(key);
      if (btn.dataset.dshStarOn === String(on)) return;
      btn.dataset.dshStarOn = String(on);
      btn.replaceChildren(starSvg(on, 16));
      btn.style.color = on ? '#f5a623' : 'inherit';
      btn.style.opacity = on ? '1' : '.55';
      btn.title = on ? '取消收藏这条消息' : '收藏这条消息';
      btn.setAttribute('aria-label', btn.title);
    }

    function renderMessages() {
      const root = refreshRoots();
      if (!root.querySelector) return;
      root.querySelectorAll('[data-chat-flow-kind="user"][data-chat-turn]').forEach(renderMessage);
    }

    function markForTurn(frame, turn) {
      const label1 = '加载并跳转到第 ' + turn + ' 轮';
      const label2 = '跳转到第 ' + turn + ' 轮';
      const list = frame.querySelectorAll('button[aria-label]');
      for (const b of list) {
        const a = b.getAttribute('aria-label');
        if (a === label1 || a === label2) return b;
      }
      return null;
    }

    function ensureRailStar(entryKey, container) {
      let el = state.railStars.get(entryKey);
      if (el && el.parentElement !== container) { el.remove(); el = null; state.railStars.delete(entryKey); }
      if (!el) {
        el = document.createElement('span');
        el.className = 'dsh-star-rail';
        el.style.cssText = 'position:absolute;display:inline-flex;align-items:center;color:#f5a623;line-height:1;' +
          'pointer-events:auto;cursor:pointer;transform:translateY(-50%);z-index:2;' +
          'filter:drop-shadow(0 0 1px rgba(0,0,0,.4))';
        el.replaceChildren(starSvg(true, 10));
        el.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          jump(el.dataset.turn);
        }, true);
        state.selfMutateAt = Date.now();
        container.appendChild(el);
        state.railStars.set(entryKey, el);
      }
      return el;
    }

    function jump(turnStr) {
      const turn = parseInt(turnStr, 10);
      state.pauseUntil = Date.now() + 1200;
      const root = refreshRoots();
      const items = root.querySelectorAll('[data-chat-flow-kind="user"][data-chat-turn]');
      for (const el of items) {
        if (turnOf(el) === turn) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      }
      const frame = frameEl();
      const mark = frame ? markForTurn(frame, turn) : null;
      if (mark) mark.click();
    }

    function renderRail() {
      if (Date.now() < state.pauseUntil) return;
      safe(() => {
        const frame = frameEl();
        if (!frame) return;
        const c = frame.getBoundingClientRect();
        const scroller = document.querySelector('.SNx2jG_scroller');
        const srect = scroller ? scroller.getBoundingClientRect() : null;
        const alive = new Set();
        for (const [key, info] of Object.entries(state.favorites)) {
          const turn = info.turn;
          if (!Number.isFinite(turn)) continue;
          const el = ensureRailStar(key, frame);
          el.dataset.turn = String(turn);
          el.title = '收藏的第 ' + turn + ' 轮（点击跳转）';
          const mark = markForTurn(frame, turn);
          if (!mark) { el.style.display = 'none'; continue; }
          const mr = mark.getBoundingClientRect();
          const y = mr.top + mr.height / 2;
          if (!mr.height && !mr.width) { el.style.display = 'none'; continue; }
          if (srect && (y < srect.top - 4 || y > srect.bottom + 4)) { el.style.display = 'none'; continue; }
          const left = Math.round(mr.left - c.left - 16);
          const top = Math.round(mr.top - c.top + mr.height / 2);
          el.style.display = '';
          el.style.left = left + 'px';
          el.style.top = top + 'px';
          alive.add(key);
        }
        for (const [key, el] of [...state.railStars.entries()]) {
          if (!alive.has(key) && !isFav(key)) { el.remove(); state.railStars.delete(key); }
        }
      });
    }

    function scheduleRail() {
      if (state.rafPending) return;
      state.rafPending = true;
      requestAnimationFrame(() => { state.rafPending = false; safe(renderRail); });
    }

    function scheduleMessages() {
      clearTimeout(state.panelTimer);
      state.panelTimer = setTimeout(() => { safe(renderMessages); safe(renderRail); }, 180);
    }

    function init() {
      load();
      renderMessages();
      renderRail();
      refreshRoots();
      const root = state.root || document.body;
      new MutationObserver(() => {
        if (Date.now() - state.selfMutateAt < 120) return;
        scheduleMessages();
      }).observe(root, { childList: true, subtree: true });
      window.addEventListener('scroll', scheduleRail, { capture: true, passive: true });
      window.addEventListener('resize', scheduleRail, { passive: true });
      setInterval(() => { if (!document.hidden) scheduleRail(); }, 3000);
      window.__DSH_STAR__ = {
        version: '0.18.0',
        favorites: () => ({ ...state.favorites }),
        count: () => Object.keys(state.favorites).length,
        messageStars: () => document.querySelectorAll('.dsh-star-msg').length,
        railStars: () => state.railStars.size,
        marks: () => state.markCount,
        lastToggle: () => state.lastToggle,
        lastError: () => state.lastError,
        debug: () => ({
          count: Object.keys(state.favorites).length,
          favorites: { ...state.favorites },
          messageStars: document.querySelectorAll('.dsh-star-msg').length,
          railStars: state.railStars.size,
          events: state.events,
          lastToggle: state.lastToggle,
          lastError: state.lastError
        }),
        refresh: () => { renderMessages(); renderRail(); }
      };
      console.info('[dsh-star] ready v0.18');
    }

    return { apply() { safe(init); } };
  }
});
