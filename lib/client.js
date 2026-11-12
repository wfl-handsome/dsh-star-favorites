window.__ModuleLoader__.load({
  id: 'dsh-star-favorites',
  factory() {
    const KEY = 'dsh.star.msg.v1';
    const state = { favorites: {}, railStars: new Map(), scheduled: false, lastError: null, lastToggle: null, markCount: 0 };
    const SVGNS = 'http://www.w3.org/2000/svg';

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

    // ---- rounded 5-point star, drawn to match the 16px copy icon ----
    function starPath(size) {
      const cx = 12, cy = 12.4, R = 9.4, r = 3.9;
      const pts = [];
      for (let i = 0; i < 10; i += 1) {
        const rad = i % 2 === 0 ? R : r;
        const ang = (-90 + i * 36) * Math.PI / 180;
        pts.push([(cx + rad * Math.cos(ang)).toFixed(2), (cy + rad * Math.sin(ang)).toFixed(2)]);
      }
      return 'M' + pts.map((p) => p.join(' ')).join(' L') + ' Z';
    }

    function starSvg(filled, px) {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('width', String(px));
      svg.setAttribute('height', String(px));
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.display = 'block';
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', starPath(px));
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-linecap', 'round');
      if (filled) {
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '2.6');
      } else {
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '1.7');
      }
      svg.appendChild(path);
      return svg;
    }

    function onStarEvent(ev) {
      const target = ev.target;
      const btn = target && target.closest ? target.closest('.dsh-star-msg') : null;
      if (!btn) return;
      if (Date.now() - (state.lastEventTs || 0) < 300) return;
      state.lastEventTs = Date.now();
      state.events = (state.events || 0) + 1;
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
      console.info('[dsh-star] toggle', state.lastToggle);
      render();
    }

    function makeStarButton() {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = '_1KfHza_action dsh-star-msg';
      b.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;' +
        'margin-left:2px;border:0;background:transparent;cursor:pointer;line-height:1;color:inherit;opacity:.55;pointer-events:auto';
      b.addEventListener('pointerdown', onStarEvent, true);
      return b;
    }

    function renderMessages() {
      document.querySelectorAll('[data-chat-flow-kind="user"][data-chat-turn]').forEach((item) => {
        const key = keyOf(item);
        if (!key) return;
        let btn = item.querySelector('.dsh-star-msg');
        if (!btn) {
          const copy = [...item.querySelectorAll('button[aria-label="复制"]')]
            .find((b) => {
              const clock = b.closest('[data-clock]');
              return clock && clock.getAttribute('data-clock') === 'start';
            });
          if (!copy) return;
          btn = makeStarButton();
          copy.insertAdjacentElement('afterend', btn);
        }
        btn.dataset.dshStarKey = key;
        const on = isFav(key);
        btn.replaceChildren(starSvg(on, 16));
        btn.style.color = on ? '#f5a623' : 'inherit';
        btn.style.opacity = on ? '1' : '.55';
        btn.title = on ? '取消收藏这条消息' : '收藏这条消息';
        btn.setAttribute('aria-label', btn.title);
      });
    }

    function markMap() {
      const map = new Map();
      document.querySelectorAll('button[aria-label]').forEach((b) => {
        const m = /第\s*(\d+)\s*轮/.exec(b.getAttribute('aria-label') || '');
        if (m) map.set(parseInt(m[1], 10), b);
      });
      return map;
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
        container.appendChild(el);
        state.railStars.set(entryKey, el);
      }
      return el;
    }

    function jump(turnStr) {
      const turn = parseInt(turnStr, 10);
      const item = [...document.querySelectorAll('[data-chat-flow-kind="user"][data-chat-turn]')]
        .find((el) => turnOf(el) === turn);
      if (item) { item.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const mark = markMap().get(turn);
      if (mark) mark.click();
    }

    function measuredMarks() {
      const list = [];
      document.querySelectorAll('button[aria-label]').forEach((b) => {
        const m = /第\s*(\d+)\s*轮/.exec(b.getAttribute('aria-label') || '');
        if (!m) return;
        const r = b.getBoundingClientRect();
        if (!r.height && !r.width) return;
        list.push({ turn: parseInt(m[1], 10), y: r.top + r.height / 2, x: r.left, el: b });
      });
      list.sort((a, b) => a.turn - b.turn);
      return list;
    }

    function renderRail() {
      safe(() => {
        const marks = measuredMarks();
        state.markCount = marks.length;
        if (!marks.length) return;
        const container = document.querySelector('.SNx2jG_frame')
          || document.querySelector('.SNx2jG_marks')
          || marks[0].el.parentElement;
        if (!container) return;
        const c = container.getBoundingClientRect();
        const scroller = document.querySelector('.SNx2jG_scroller');
        const srect = scroller ? scroller.getBoundingClientRect() : null;
        const alive = new Set();
        for (const [key, info] of Object.entries(state.favorites)) {
          const turn = info.turn;
          if (!Number.isFinite(turn)) continue;
          const el = ensureRailStar(key, container);
          el.dataset.turn = String(turn);
          el.title = '收藏的第 ' + turn + ' 轮（点击跳转）';
          const exact = marks.find((m) => m.turn === turn);
          if (!exact) { el.style.display = 'none'; continue; }
          const visible = !srect || (exact.y >= srect.top - 4 && exact.y <= srect.bottom + 4);
          if (!visible) { el.style.display = 'none'; continue; }
          const mr = exact.el.getBoundingClientRect();
          const left = Math.round(mr.left - c.left - 16);
          const top = Math.round(mr.top - c.top + mr.height / 2);
          if (el.dataset.size !== '10') {
            el.replaceChildren(starSvg(true, 10));
            el.dataset.size = '10';
          }
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

    function render() { safe(renderMessages); safe(renderRail); }

    function schedule() {
      if (state.scheduled) return;
      state.scheduled = true;
      requestAnimationFrame(() => { state.scheduled = false; render(); });
    }

    function init() {
      load();
      render();
      new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('scroll', () => safe(renderRail), { capture: true, passive: true });
      window.addEventListener('resize', () => safe(renderRail));
      setInterval(schedule, 1500);
      window.__DSH_STAR__ = {
        version: '0.17.0',
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
          marks: state.markCount,
          events: state.events || 0,
          markRects: measuredMarks().slice(-3).map((m) => ({
            turn: m.turn,
            left: Math.round(m.x),
            width: Math.round(m.el.getBoundingClientRect().width)
          })),
          railRects: [...document.querySelectorAll('.dsh-star-rail')].map((e) => ({
            turn: e.dataset.turn,
            left: e.style.left,
            top: e.style.top,
            pe: getComputedStyle(e).pointerEvents
          })),
          lastToggle: state.lastToggle,
          lastError: state.lastError
        }),
        refresh: render
      };
      console.info('[dsh-star] ready v0.17');
    }

    return { apply() { safe(init); } };
  }
});
