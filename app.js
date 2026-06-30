/* tool-mindmap — 브라우저 100% 마인드맵/플로우차트 에디터
   순수 바닐라 JS · SVG 렌더링 · localStorage 저장 · 서버 전송 없음 */
(function () {
  'use strict';

  // ============================================================= Constants
  const POINT = '#3D6B5E';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const FONT = '500 14px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  const LINE_H = 19;
  const PAD_X = 18, PAD_Y = 11;
  const MIN_W = 56, MIN_H = 38;
  const H_GAP = 64, V_GAP = 18;          // tidy-layout spacing
  const ZMIN = 0.2, ZMAX = 3;
  const HIST_MAX = 80;

  // fill / stroke / text per palette slot
  const PALETTE = [
    { f: '#FFFFFF', s: '#C9C3B6', t: '#2C322F' },
    { f: '#E5EDE9', s: '#3D6B5E', t: '#234038' },
    { f: '#FCE9D6', s: '#D89A5B', t: '#7A4E1E' },
    { f: '#FBE3E3', s: '#D98080', t: '#82393A' },
    { f: '#E7E9F5', s: '#8089C8', t: '#3A3F70' },
    { f: '#FFF3C9', s: '#D9BE55', t: '#7A6618' },
    { f: '#DDEEF0', s: '#6FAFB6', t: '#235055' },
    { f: '#E6E4DE', s: '#A8A294', t: '#4D4A40' },
  ];
  const SHAPES = ['round', 'rect', 'ellipse', 'diamond'];

  // ============================================================= Tiny utils
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => 'n' + Math.random().toString(36).slice(2, 9) + (uid._c = (uid._c || 0) + 1).toString(36);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function el(name, attrs) { const e = document.createElementNS(SVGNS, name); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function escXml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // text measurement
  const _mc = document.createElement('canvas').getContext('2d');
  function measure(text) {
    _mc.font = FONT;
    const lines = String(text === '' ? ' ' : text).split('\n');
    let w = 0;
    for (const ln of lines) w = Math.max(w, _mc.measureText(ln || ' ').width);
    return { w, lines, h: lines.length * LINE_H };
  }

  // ============================================================= i18n
  const I18N = {
    ko: {
      'map.untitled': '제목 없는 맵', 'node.new': '새 노드', 'node.root': '중심 주제',
      't.maps': '맵 목록 (저장된 맵 불러오기/삭제)', 't.rename': '맵 이름 변경 (클릭)',
      't.addChild': '자식 노드 추가 (Tab)', 't.addSibling': '형제 노드 추가 (Enter)', 't.delete': '선택 노드 삭제 (Delete)',
      't.style': '모양 · 색상', 't.shape': '노드 모양', 't.color': '노드 색상',
      't.undo': '실행취소 (Ctrl+Z)', 't.redo': '다시실행 (Ctrl+Shift+Z)', 't.tidy': '자동 정렬 (트리 레이아웃)',
      't.lang': '언어 / Language', 't.fit': '전체 보기 (화면 맞춤)', 't.export': '내보내기', 't.help': '도움말 / 단축키',
      't.zoomOut': '축소', 't.zoomReset': '100%', 't.zoomIn': '확대', 't.connectMode': '연결 모드', 't.addNode': '노드 추가',
      'lbl.node': '노드', 'lbl.sibling': '형제', 'lbl.export': '내보내기',
      'shape.round': '둥근 사각형', 'shape.rect': '사각형', 'shape.ellipse': '원형', 'shape.diamond': '다이아몬드',
      'eg.sub': '기획·아이디어를 빠르게 정리하는 마인드맵 에디터',
      'eg.tip1': '<b>더블클릭</b> — 빈 공간에 노드 생성 / 노드 텍스트 편집',
      'eg.tip2': '<b>Tab</b> — 자식 노드 · <b>Enter</b> — 형제 노드 추가',
      'eg.tip3': '<b>드래그</b> — 노드 이동 · 노드 우측 <span class="dot">＋</span> 핸들에서 끌어 연결',
      'eg.tip4': '<b>휠/핀치</b> — 확대·축소 · 빈 공간 드래그 — 화면 이동',
      'eg.start': '중심 노드로 시작하기', 'eg.foot': '작업은 이 브라우저에 자동 저장됩니다 · 서버 전송 없음',
      'hub': '🔧 다른 도구 모음 →',
      'drawer.title': '내 맵', 'drawer.new': '＋ 새 맵 만들기', 'drawer.import': 'JSON 가져오기', 'drawer.backup': 'JSON 백업', 'drawer.empty': '저장된 맵이 없습니다.',
      'exp.png': '🖼️ PNG 이미지로 저장', 'exp.md': '📝 Markdown (들여쓰기 목록)', 'exp.mermaid': '🧜 Mermaid 문법으로 복사', 'exp.svg': '✒️ SVG 벡터로 저장',
      'sp.shape': '모양', 'sp.color': '색상',
      'ctx.edit': '✏️ 텍스트 편집', 'ctx.child': '➕ 자식 노드', 'ctx.sibling': '↔️ 형제 노드', 'ctx.collapse': '🔽 펼치기/접기', 'ctx.duplicate': '⧉ 복제', 'ctx.delete': '🗑️ 삭제',
      'help.title': '도움말 · 사용법 · FAQ',
      'help.intro': 'tool-mindmap은 설치·로그인 없이 브라우저에서 바로 쓰는 무료 마인드맵·플로우차트 에디터입니다. 기획 회의, 브레인스토밍, 글 구조 잡기, 순서도 그리기에 사용하세요. 만든 내용은 이 브라우저에만 저장되고 어떤 서버로도 전송되지 않습니다.',
      'help.basic': '기본 조작', 'help.b1': '더블클릭(빈 공간)', 'help.b1d': '노드 생성', 'help.b2': '더블클릭(노드)', 'help.b2d': '텍스트 편집', 'help.b3': '드래그(노드)', 'help.b3d': '이동', 'help.b4': '＋ 핸들 드래그', 'help.b4d': '연결선 만들기', 'help.b5': '드래그(빈 공간)', 'help.b5d': '화면 이동(패닝)', 'help.b6': '휠 / 핀치', 'help.b6d': '확대·축소', 'help.b7': '우클릭', 'help.b7d': '노드 메뉴',
      'help.keys': '키보드 단축키', 'help.k1': '자식 노드 추가', 'help.k2': '형제 노드 추가', 'help.k3': '편집', 'help.k4': '삭제', 'help.k5': '실행취소', 'help.k6': '다시실행', 'help.k7': '복제', 'help.k8t': '방향키', 'help.k8': '인접 노드 선택', 'help.k9': '펼치기/접기', 'help.k10': '편집·선택 취소',
      'faq.title': '자주 묻는 질문 (FAQ)',
      'faq.q1': '내가 만든 맵은 어디에 저장되나요?', 'faq.a1': '모든 데이터는 사용 중인 브라우저(localStorage)에만 저장되며 어떤 서버로도 전송되지 않습니다. 새로고침하거나 브라우저를 닫아도 작업이 유지됩니다.',
      'faq.q2': '무료인가요? 로그인이 필요한가요?', 'faq.a2': '완전 무료이며 로그인·설치가 필요 없습니다. 페이지를 열면 바로 사용할 수 있습니다.',
      'faq.q3': '만든 마인드맵을 내보낼 수 있나요?', 'faq.a3': 'PNG 이미지, Markdown(들여쓰기 목록), Mermaid 문법, SVG 벡터로 내보낼 수 있습니다. JSON 백업/가져오기도 지원합니다.',
      'faq.q4': '모바일에서도 쓸 수 있나요?', 'faq.a4': '네. 터치로 노드 이동, 핀치 줌, 화면 이동이 가능하고, 연결 전용 모드로 노드를 이어 그릴 수 있습니다.',
      'faq.q5': '다른 기기와 동기화되나요?', 'faq.a5': '로컬 저장 방식이라 자동 동기화는 없습니다. 대신 JSON 백업으로 내보낸 뒤 다른 기기에서 가져오기로 옮길 수 있습니다.',
      'foot.privacy': '모든 데이터는 이 브라우저(localStorage)에만 저장됩니다.', 'foot.license': '오픈소스 · MIT 라이선스',
      'toast.tidy': '자동 정렬 완료', 'toast.connected': '연결되었습니다', 'toast.alreadyLinked': '이미 연결된 노드입니다', 'toast.newMap': '새 맵을 만들었습니다',
      'toast.importOk': '가져오기 완료', 'toast.importBad': '올바른 맵 JSON이 아닙니다', 'toast.jsonBackup': 'JSON 백업 저장됨',
      'toast.pngSaved': 'PNG 이미지 저장됨', 'toast.pngFail': 'PNG 내보내기 실패', 'toast.svgSaved': 'SVG 저장됨', 'toast.mdSaved': 'Markdown 저장됨', 'toast.mermaidCopied': 'Mermaid 문법을 클립보드에 복사했습니다',
      'toast.linkStart': '연결 시작 노드를 탭하세요', 'toast.linkTarget': '연결할 대상 노드를 탭하세요',
      'prompt.mapName': '맵 이름', 'mdHeading.links': '추가 연결',
      'wel.title': 'tool-mindmap에 오신 걸 환영합니다 👋',
      'wel.intro': '설치·로그인 없이 브라우저에서 바로 쓰는 마인드맵·플로우차트 에디터예요. 기획·아이디어를 빠르게 정리해 보세요. 만든 내용은 이 브라우저에만 저장되고 서버로 전송되지 않습니다.',
      'wel.f1': '<b>노드 추가</b> — 빈 공간 더블클릭, 또는 <b>Tab</b>(자식)·<b>Enter</b>(형제)',
      'wel.f2': '<b>연결</b> — 노드 우측 <span class="dotw">＋</span> 핸들을 드래그해서 이어요',
      'wel.f3': '<b>꾸미기</b> — 상단 툴바에서 모양·색상 선택',
      'wel.f4': '<b>이동·확대</b> — 휠/핀치로 줌, 빈 공간 드래그로 화면 이동',
      'wel.f5': '<b>자동 저장</b> — 새로고침해도 유지 · 여러 맵 관리',
      'wel.f6': '<b>내보내기</b> — PNG · Markdown · Mermaid · SVG',
      'wel.hint': '자세한 단축키는 우측 상단 <b>?</b> 도움말에서 볼 수 있어요.',
      'wel.hide': '오늘 다시 보지 않기', 'wel.close': '닫기',
    },
    en: {
      'map.untitled': 'Untitled map', 'node.new': 'New node', 'node.root': 'Central topic',
      't.maps': 'My maps (open / delete saved maps)', 't.rename': 'Rename map (click)',
      't.addChild': 'Add child node (Tab)', 't.addSibling': 'Add sibling node (Enter)', 't.delete': 'Delete selected (Delete)',
      't.style': 'Shape · color', 't.shape': 'Node shape', 't.color': 'Node color',
      't.undo': 'Undo (Ctrl+Z)', 't.redo': 'Redo (Ctrl+Shift+Z)', 't.tidy': 'Auto-arrange (tree layout)',
      't.lang': '언어 / Language', 't.fit': 'Fit to screen', 't.export': 'Export', 't.help': 'Help / shortcuts',
      't.zoomOut': 'Zoom out', 't.zoomReset': '100%', 't.zoomIn': 'Zoom in', 't.connectMode': 'Connect mode', 't.addNode': 'Add node',
      'lbl.node': 'Node', 'lbl.sibling': 'Sibling', 'lbl.export': 'Export',
      'shape.round': 'Rounded rectangle', 'shape.rect': 'Rectangle', 'shape.ellipse': 'Ellipse', 'shape.diamond': 'Diamond',
      'eg.sub': 'A mindmap editor for quickly organizing plans and ideas',
      'eg.tip1': '<b>Double-click</b> — create a node on empty space / edit node text',
      'eg.tip2': '<b>Tab</b> — child node · <b>Enter</b> — sibling node',
      'eg.tip3': '<b>Drag</b> — move a node · drag the <span class="dot">＋</span> handle to connect',
      'eg.tip4': '<b>Wheel/pinch</b> — zoom · drag empty space — pan the canvas',
      'eg.start': 'Start with a central node', 'eg.foot': 'Your work is auto-saved in this browser · nothing sent to a server',
      'hub': '🔧 More tools →',
      'drawer.title': 'My maps', 'drawer.new': '＋ New map', 'drawer.import': 'Import JSON', 'drawer.backup': 'Backup JSON', 'drawer.empty': 'No saved maps yet.',
      'exp.png': '🖼️ Save as PNG image', 'exp.md': '📝 Markdown (indented list)', 'exp.mermaid': '🧜 Copy as Mermaid syntax', 'exp.svg': '✒️ Save as SVG vector',
      'sp.shape': 'Shape', 'sp.color': 'Color',
      'ctx.edit': '✏️ Edit text', 'ctx.child': '➕ Child node', 'ctx.sibling': '↔️ Sibling node', 'ctx.collapse': '🔽 Expand/collapse', 'ctx.duplicate': '⧉ Duplicate', 'ctx.delete': '🗑️ Delete',
      'help.title': 'Help · How to use · FAQ',
      'help.intro': 'tool-mindmap is a free mindmap & flowchart editor that runs entirely in your browser — no install, no login. Use it for planning meetings, brainstorming, outlining writing, or drawing flowcharts. Everything you make is stored only in this browser and never sent to any server.',
      'help.basic': 'Basics', 'help.b1': 'Double-click (empty)', 'help.b1d': 'Create node', 'help.b2': 'Double-click (node)', 'help.b2d': 'Edit text', 'help.b3': 'Drag (node)', 'help.b3d': 'Move', 'help.b4': 'Drag ＋ handle', 'help.b4d': 'Create connection', 'help.b5': 'Drag (empty)', 'help.b5d': 'Pan the canvas', 'help.b6': 'Wheel / pinch', 'help.b6d': 'Zoom', 'help.b7': 'Right-click', 'help.b7d': 'Node menu',
      'help.keys': 'Keyboard shortcuts', 'help.k1': 'Add child node', 'help.k2': 'Add sibling node', 'help.k3': 'Edit', 'help.k4': 'Delete', 'help.k5': 'Undo', 'help.k6': 'Redo', 'help.k7': 'Duplicate', 'help.k8t': 'Arrow keys', 'help.k8': 'Select adjacent node', 'help.k9': 'Expand/collapse', 'help.k10': 'Cancel edit/selection',
      'faq.title': 'Frequently asked questions (FAQ)',
      'faq.q1': 'Where are my maps stored?', 'faq.a1': 'All data is stored only in your browser (localStorage) and is never sent to any server. Your work persists across reloads and browser restarts.',
      'faq.q2': 'Is it free? Do I need to log in?', 'faq.a2': 'It is completely free with no login or install required. Just open the page and start.',
      'faq.q3': 'Can I export my mindmap?', 'faq.a3': 'You can export as a PNG image, Markdown (indented list), Mermaid syntax, or SVG vector. JSON backup/import is also supported.',
      'faq.q4': 'Does it work on mobile?', 'faq.a4': 'Yes. You can move nodes by touch, pinch to zoom, pan the canvas, and use a dedicated connect mode to link nodes.',
      'faq.q5': 'Does it sync across devices?', 'faq.a5': 'Since data is stored locally, there is no automatic sync. You can export a JSON backup and import it on another device.',
      'foot.privacy': 'All data is stored only in this browser (localStorage).', 'foot.license': 'Open source · MIT license',
      'toast.tidy': 'Auto-arranged', 'toast.connected': 'Connected', 'toast.alreadyLinked': 'Already connected', 'toast.newMap': 'New map created',
      'toast.importOk': 'Imported', 'toast.importBad': 'Not a valid map JSON', 'toast.jsonBackup': 'JSON backup saved',
      'toast.pngSaved': 'PNG image saved', 'toast.pngFail': 'PNG export failed', 'toast.svgSaved': 'SVG saved', 'toast.mdSaved': 'Markdown saved', 'toast.mermaidCopied': 'Mermaid syntax copied to clipboard',
      'toast.linkStart': 'Tap the node to start the connection', 'toast.linkTarget': 'Tap the target node',
      'prompt.mapName': 'Map name', 'mdHeading.links': 'Extra connections',
      'wel.title': 'Welcome to tool-mindmap 👋',
      'wel.intro': 'A mindmap & flowchart editor that runs right in your browser — no install, no login. Quickly organize your plans and ideas. Everything you make is stored only in this browser and never sent to a server.',
      'wel.f1': '<b>Add nodes</b> — double-click empty space, or <b>Tab</b> (child) · <b>Enter</b> (sibling)',
      'wel.f2': '<b>Connect</b> — drag the <span class="dotw">＋</span> handle on the right of a node',
      'wel.f3': '<b>Style</b> — pick shape & color from the top toolbar',
      'wel.f4': '<b>Pan & zoom</b> — wheel/pinch to zoom, drag empty space to pan',
      'wel.f5': '<b>Auto-save</b> — persists across reloads · manage multiple maps',
      'wel.f6': '<b>Export</b> — PNG · Markdown · Mermaid · SVG',
      'wel.hint': 'See all shortcuts in the <b>?</b> help at the top-right.',
      'wel.hide': "Don't show again today", 'wel.close': 'Close',
    },
  };
  let LANG = 'ko';
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    const s = localStorage.getItem('tmm.lang');
    const nav = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
    const l = q || s || nav;
    return l === 'en' ? 'en' : 'ko';
  }
  function t(k) { const d = I18N[LANG] || I18N.ko; return d[k] !== undefined ? d[k] : (I18N.ko[k] !== undefined ? I18N.ko[k] : k); }
  function nodesLabel(n) { return LANG === 'ko' ? `${n}개 노드` : `${n} node${n === 1 ? '' : 's'}`; }
  function confirmDelMap(name) { return LANG === 'ko' ? `"${name}" 맵을 삭제할까요? 되돌릴 수 없습니다.` : `Delete map "${name}"? This cannot be undone.`; }
  function applyI18n() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-i18n]').forEach(e => { const v = t(e.getAttribute('data-i18n')); if (v != null) e.textContent = v; });
    document.querySelectorAll('[data-i18n-html]').forEach(e => { const v = t(e.getAttribute('data-i18n-html')); if (v != null) e.innerHTML = v; });
    document.querySelectorAll('[data-i18n-title]').forEach(e => { const v = t(e.getAttribute('data-i18n-title')); if (v != null) { e.title = v; if (e.hasAttribute('aria-label')) e.setAttribute('aria-label', v); } });
    const ll = document.getElementById('langLabel'); if (ll) ll.textContent = LANG === 'ko' ? 'EN' : '한';
  }
  function setLang(l) {
    LANG = l === 'en' ? 'en' : 'ko';
    localStorage.setItem('tmm.lang', LANG);
    applyI18n();
    if (document.getElementById('mapsDrawer').classList.contains('show')) renderMapsList();
  }

  // ============================================================= Store
  const Store = {
    IDX: 'tmm.index', PRE: 'tmm.map.', LAST: 'tmm.last',
    index() { try { return JSON.parse(localStorage.getItem(this.IDX)) || []; } catch { return []; } },
    setIndex(a) { localStorage.setItem(this.IDX, JSON.stringify(a)); },
    load(id) { try { return JSON.parse(localStorage.getItem(this.PRE + id)); } catch { return null; } },
    save(map) {
      map.updated = isoNow();
      localStorage.setItem(this.PRE + map.id, JSON.stringify(map));
      const idx = this.index().filter(m => m.id !== map.id);
      idx.unshift({ id: map.id, name: map.name, updated: map.updated, nodes: Object.keys(map.nodes).length });
      this.setIndex(idx);
      localStorage.setItem(this.LAST, map.id);
    },
    remove(id) {
      localStorage.removeItem(this.PRE + id);
      this.setIndex(this.index().filter(m => m.id !== id));
    },
    last() { return localStorage.getItem(this.LAST); },
  };
  // monotonic-ish timestamp without Date.now spam issues
  function isoNow() { return new Date().toISOString(); }

  // ============================================================= App state
  const App = {
    map: null,
    sel: new Set(),       // selected node ids
    active: null,         // last-focused node id (for Tab/Enter & arrows)
    history: [], future: [],
    view: { x: 0, y: 0, k: 1 },
    linkMode: false,      // mobile connect mode
  };

  // dom refs
  const stage = $('#stage'), canvas = $('#canvas'), world = $('#world');
  const edgeLayer = $('#edgeLayer'), nodeLayer = $('#nodeLayer'), linkPreview = $('#linkPreview');
  const editor = $('#editor'), emptyGuide = $('#emptyGuide'), marqueeEl = $('#marquee');

  // ============================================================= Map factory
  function newMap(name) {
    const id = 'm' + Math.random().toString(36).slice(2, 10);
    // start empty → empty-state guide is shown; central node is created on first action
    return {
      v: 1, id, name: name || t('map.untitled'), created: isoNow(), updated: isoNow(),
      rootId: null, nodes: {}, edges: [],
    };
  }
  // create the first central node (from guide / + button on an empty map)
  function createRoot(text) {
    pushHistory();
    const r = canvas.getBoundingClientRect();
    const c = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
    const n = mkNode(text || t('node.root'), Math.round(c.x), Math.round(c.y), { shape: 'round', color: 1, parentId: null });
    App.map.nodes[n.id] = n; App.map.rootId = n.id;
    render(); select(n.id, false); scheduleSave();
    return n.id;
  }
  // "+" / FAB behaviour that works whether or not the map already has nodes
  function smartAdd() {
    if (Object.keys(App.map.nodes).length === 0) { const id = createRoot(); startEdit(id, true); return; }
    addChild(App.active || App.map.rootId || roots()[0]?.id, true);
  }
  function mkNode(text, x, y, opt = {}) {
    const m = measure(text);
    const n = {
      id: uid(), parentId: opt.parentId ?? null, text,
      x, y, shape: opt.shape || 'round', color: opt.color ?? 0,
      collapsed: false, w: 0, h: 0,
    };
    sizeNode(n, m);
    return n;
  }
  function sizeNode(n, m) {
    m = m || measure(n.text);
    let w = m.w + PAD_X * 2, h = m.h + PAD_Y * 2;
    if (n.shape === 'ellipse') { w *= 1.22; h *= 1.45; }
    else if (n.shape === 'diamond') { w *= 1.5; h *= 1.7; }
    n.w = Math.max(MIN_W, Math.round(w));
    n.h = Math.max(MIN_H, Math.round(h));
  }

  // ============================================================= History
  function snapshot() { return JSON.stringify({ nodes: App.map.nodes, edges: App.map.edges, rootId: App.map.rootId }); }
  function pushHistory() {
    App.history.push(snapshot());
    if (App.history.length > HIST_MAX) App.history.shift();
    App.future.length = 0;
    updateUndoButtons();
  }
  function restore(str) {
    const s = JSON.parse(str);
    App.map.nodes = s.nodes; App.map.edges = s.edges; App.map.rootId = s.rootId;
    // prune selection
    App.sel = new Set([...App.sel].filter(id => App.map.nodes[id]));
    App.active = App.map.nodes[App.active] ? App.active : null;
  }
  function undo() {
    if (!App.history.length) return;
    App.future.push(snapshot());
    restore(App.history.pop());
    render(); scheduleSave(); updateUndoButtons();
  }
  function redo() {
    if (!App.future.length) return;
    App.history.push(snapshot());
    restore(App.future.pop());
    render(); scheduleSave(); updateUndoButtons();
  }
  function updateUndoButtons() {
    $('#btnUndo').style.opacity = App.history.length ? 1 : .4;
    $('#btnRedo').style.opacity = App.future.length ? 1 : .4;
  }

  // ============================================================= Save
  const scheduleSave = debounce(() => { if (App.map) { App.map.view = { ...App.view }; Store.save(App.map); } }, 400);

  // ============================================================= Hierarchy helpers
  function roots() { return Object.values(App.map.nodes).filter(n => n.parentId == null); }
  function childrenOf(id) { return Object.values(App.map.nodes).filter(n => n.parentId === id); }
  function descendants(id, acc = []) { for (const c of childrenOf(id)) { acc.push(c.id); descendants(c.id, acc); } return acc; }
  function visibleSet() {
    const vis = new Set();
    const walk = (n) => { vis.add(n.id); if (!n.collapsed) childrenOf(n.id).forEach(walk); };
    roots().forEach(walk);
    return vis;
  }

  // ============================================================= Geometry
  // point on node bounding box toward (tx,ty)
  function borderPoint(n, tx, ty) {
    const dx = tx - n.x, dy = ty - n.y;
    if (dx === 0 && dy === 0) return { x: n.x, y: n.y };
    const hw = n.w / 2, hh = n.h / 2;
    const sx = dx === 0 ? Infinity : hw / Math.abs(dx);
    const sy = dy === 0 ? Infinity : hh / Math.abs(dy);
    const s = Math.min(sx, sy);
    return { x: n.x + dx * s, y: n.y + dy * s };
  }
  function nodeAt(wx, wy) {
    const vis = visibleSet();
    const list = Object.values(App.map.nodes).filter(n => vis.has(n.id));
    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i];
      if (Math.abs(wx - n.x) <= n.w / 2 && Math.abs(wy - n.y) <= n.h / 2) return n;
    }
    return null;
  }

  // ============================================================= Coordinate transforms
  function screenToWorld(sx, sy) {
    const r = canvas.getBoundingClientRect();
    return { x: (sx - r.left - App.view.x) / App.view.k, y: (sy - r.top - App.view.y) / App.view.k };
  }
  const gridPattern = $('#grid');
  function applyView() {
    world.setAttribute('transform', `translate(${App.view.x} ${App.view.y}) scale(${App.view.k})`);
    // grid is a viewport-fixed rect; move/scale only its pattern so it tracks the content
    if (gridPattern) gridPattern.setAttribute('patternTransform', `translate(${App.view.x} ${App.view.y}) scale(${App.view.k})`);
    $('#zoomReset').textContent = Math.round(App.view.k * 100) + '%';
  }
  function zoomAt(sx, sy, factor) {
    const r = canvas.getBoundingClientRect();
    const px = sx - r.left, py = sy - r.top;
    const k2 = clamp(App.view.k * factor, ZMIN, ZMAX);
    const f = k2 / App.view.k;
    App.view.x = px - (px - App.view.x) * f;
    App.view.y = py - (py - App.view.y) * f;
    App.view.k = k2;
    applyView(); scheduleSave();
  }
  function fitView(pad = 80) {
    const vis = visibleSet();
    const ns = Object.values(App.map.nodes).filter(n => vis.has(n.id));
    if (!ns.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of ns) { x0 = Math.min(x0, n.x - n.w / 2); y0 = Math.min(y0, n.y - n.h / 2); x1 = Math.max(x1, n.x + n.w / 2); y1 = Math.max(y1, n.y + n.h / 2); }
    const r = canvas.getBoundingClientRect();
    const k = clamp(Math.min((r.width - pad * 2) / (x1 - x0 || 1), (r.height - pad * 2) / (y1 - y0 || 1)), ZMIN, 1.4);
    App.view.k = k;
    App.view.x = (r.width - (x1 + x0) * k) / 2;
    App.view.y = (r.height - (y1 + y0) * k) / 2;
    applyView(); scheduleSave();
  }

  // ============================================================= Tidy layout
  function tidy() {
    pushHistory();
    let topY = 0;
    for (const root of roots()) {
      const h = placeSubtree(root.id, 0, topY);
      topY += h + V_GAP * 2.4;
    }
    render(); fitView(); scheduleSave(); toast(t('toast.tidy'));
  }
  function placeSubtree(id, leftX, topY) {
    const n = App.map.nodes[id];
    n.x = leftX + n.w / 2;
    const kids = n.collapsed ? [] : childrenOf(id);
    if (!kids.length) { n.y = topY + n.h / 2; return n.h; }
    const childLeft = leftX + n.w + H_GAP;
    let y = topY, total = 0;
    kids.forEach((c, i) => { const h = placeSubtree(c.id, childLeft, y); y += h + V_GAP; total += h + (i ? 0 : 0); });
    const blockH = y - V_GAP - topY;
    n.y = topY + blockH / 2;
    return Math.max(blockH, n.h);
  }

  // ============================================================= Rendering
  function render() {
    emptyGuide.classList.toggle('hidden', Object.keys(App.map.nodes).length > 0);

    const vis = visibleSet();
    edgeLayer.textContent = '';
    nodeLayer.textContent = '';

    // tree edges
    for (const n of Object.values(App.map.nodes)) {
      if (n.parentId == null) continue;
      const p = App.map.nodes[n.parentId];
      if (!p || !vis.has(n.id) || !vis.has(p.id)) continue;
      edgeLayer.appendChild(edgePath(p, n, 'tree', false));
    }
    // cross edges
    for (const e of App.map.edges) {
      const a = App.map.nodes[e.from], b = App.map.nodes[e.to];
      if (!a || !b || !vis.has(a.id) || !vis.has(b.id)) continue;
      edgeLayer.appendChild(edgePath(a, b, 'cross', true));
    }
    // nodes
    for (const n of Object.values(App.map.nodes)) {
      if (!vis.has(n.id)) continue;
      nodeLayer.appendChild(renderNode(n));
    }
    updateToolbarState();
  }

  function edgePath(a, b, cls, arrow) {
    const p1 = borderPoint(a, b.x, b.y);
    const p2 = borderPoint(b, a.x, a.y);
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    let d;
    if (Math.abs(dx) >= Math.abs(dy)) { const cx = dx * 0.45; d = `M${p1.x} ${p1.y} C${p1.x + cx} ${p1.y} ${p2.x - cx} ${p2.y} ${p2.x} ${p2.y}`; }
    else { const cy = dy * 0.45; d = `M${p1.x} ${p1.y} C${p1.x} ${p1.y + cy} ${p2.x} ${p2.y - cy} ${p2.x} ${p2.y}`; }
    const path = el('path', { d, class: 'edge ' + cls });
    if (arrow) path.setAttribute('marker-end', 'url(#arrow)');
    return path;
  }

  function shapeEl(n, pal) {
    const hw = n.w / 2, hh = n.h / 2;
    let s;
    if (n.shape === 'rect') s = el('rect', { x: -hw, y: -hh, width: n.w, height: n.h });
    else if (n.shape === 'ellipse') s = el('ellipse', { cx: 0, cy: 0, rx: hw, ry: hh });
    else if (n.shape === 'diamond') s = el('path', { d: `M0 ${-hh}L${hw} 0L0 ${hh}L${-hw} 0Z` });
    else s = el('rect', { x: -hw, y: -hh, width: n.w, height: n.h, rx: 10, ry: 10 });
    s.setAttribute('class', 'nbox');
    s.setAttribute('fill', pal.f);
    s.setAttribute('stroke', pal.s);
    return s;
  }

  function renderNode(n) {
    const pal = PALETTE[n.color] || PALETTE[0];
    const g = el('g', { class: 'node' + (App.sel.has(n.id) ? ' selected' : '') + (n.parentId == null ? ' root' : ''), transform: `translate(${n.x} ${n.y})`, 'data-id': n.id });
    g.appendChild(shapeEl(n, pal));

    // text
    const m = measure(n.text);
    const t = el('text', { class: 'ntext', 'text-anchor': 'middle', fill: pal.t });
    const y0 = -(m.lines.length - 1) * LINE_H / 2;
    m.lines.forEach((ln, i) => {
      const ts = el('tspan', { x: 0, y: y0 + i * LINE_H }); ts.textContent = ln || ' '; t.appendChild(ts);
    });
    g.appendChild(t);

    // collapse toggle (if has children)
    const kids = childrenOf(n.id);
    if (kids.length) {
      const cx = n.w / 2 + 2, cy = 0;
      const cg = el('g', { class: 'collapse-grp', 'data-collapse': n.id });
      cg.appendChild(el('circle', { class: 'collapse', cx, cy, r: 9 }));
      const tx = el('text', { class: 'collapse-txt', x: cx, y: cy + 0.5 }); tx.textContent = n.collapsed ? kids.length : '–';
      cg.appendChild(tx);
      g.appendChild(cg);
    }

    // connect handle (right-middle)
    const hx = n.w / 2 + (kids.length ? 24 : 2), hy = 0;
    const handle = el('circle', { class: 'handle', cx: hx, cy: hy, r: 8, 'data-handle': n.id });
    g.appendChild(handle);
    const plus = el('path', { class: 'handle-plus', d: `M${hx - 4} ${hy}H${hx + 4}M${hx} ${hy - 4}V${hy + 4}` });
    g.appendChild(plus);

    return g;
  }

  // partial position update (used during drag for perf)
  function moveNodeEl(id) {
    const n = App.map.nodes[id];
    const g = nodeLayer.querySelector(`[data-id="${id}"]`);
    if (g) g.setAttribute('transform', `translate(${n.x} ${n.y})`);
  }
  function redrawEdgesFor(ids) {
    // simplest: full edge redraw
    const vis = visibleSet();
    edgeLayer.textContent = '';
    for (const n of Object.values(App.map.nodes)) {
      if (n.parentId == null) continue; const p = App.map.nodes[n.parentId];
      if (!p || !vis.has(n.id) || !vis.has(p.id)) continue;
      edgeLayer.appendChild(edgePath(p, n, 'tree', false));
    }
    for (const e of App.map.edges) {
      const a = App.map.nodes[e.from], b = App.map.nodes[e.to];
      if (!a || !b || !vis.has(a.id) || !vis.has(b.id)) continue;
      edgeLayer.appendChild(edgePath(a, b, 'cross', true));
    }
  }

  // ============================================================= Selection
  function select(id, additive) {
    if (!additive) App.sel.clear();
    if (id) { App.sel.add(id); App.active = id; }
    syncSelectionDom();
    updateToolbarState();
  }
  function clearSel() { App.sel.clear(); App.active = null; syncSelectionDom(); updateToolbarState(); }
  function syncSelectionDom() {
    $$('.node', nodeLayer).forEach(g => g.classList.toggle('selected', App.sel.has(g.dataset.id)));
  }

  // ============================================================= Node operations
  function addChild(parentId, openEdit = true) {
    const p = App.map.nodes[parentId]; if (!p) return;
    pushHistory();
    if (p.collapsed) p.collapsed = false;
    const sibs = childrenOf(parentId);
    const ny = sibs.length ? Math.max(...sibs.map(s => s.y + s.h / 2)) + V_GAP + 20 : p.y;
    const n = mkNode(t('node.new'), p.x + p.w / 2 + H_GAP + 50, ny, { parentId, color: p.color });
    App.map.nodes[n.id] = n;
    render(); select(n.id, false); scheduleSave();
    if (openEdit) startEdit(n.id, true);
    return n.id;
  }
  function addSibling(id, openEdit = true) {
    const n = App.map.nodes[id]; if (!n) return;
    if (n.parentId == null) { // sibling of a root → new root
      pushHistory();
      const nn = mkNode(t('node.new'), n.x, n.y + n.h + V_GAP + 14, { parentId: null, color: n.color });
      App.map.nodes[nn.id] = nn; render(); select(nn.id, false); scheduleSave();
      if (openEdit) startEdit(nn.id, true); return nn.id;
    }
    return addChild(n.parentId, openEdit);
  }
  function deleteNodes(ids) {
    const all = new Set();
    ids.forEach(id => { all.add(id); descendants(id).forEach(d => all.add(d)); });
    if (!all.size) return;
    pushHistory();
    all.forEach(id => delete App.map.nodes[id]);
    App.map.edges = App.map.edges.filter(e => !all.has(e.from) && !all.has(e.to));
    App.sel = new Set([...App.sel].filter(id => App.map.nodes[id]));
    App.active = App.map.nodes[App.active] ? App.active : null;
    // keep at least nothing required; rootId may be gone
    if (!App.map.nodes[App.map.rootId]) { const r = roots()[0]; App.map.rootId = r ? r.id : null; }
    render(); scheduleSave();
  }
  function duplicateNode(id) {
    const n = App.map.nodes[id]; if (!n) return;
    pushHistory();
    const copy = JSON.parse(JSON.stringify(n));
    copy.id = uid(); copy.x += 28; copy.y += 28; copy.parentId = n.parentId;
    App.map.nodes[copy.id] = copy;
    render(); select(copy.id, false); scheduleSave();
  }
  function setShape(shape) {
    if (!App.sel.size) return; pushHistory();
    App.sel.forEach(id => { const n = App.map.nodes[id]; n.shape = shape; sizeNode(n); });
    render(); scheduleSave();
  }
  function setColor(idx) {
    if (!App.sel.size) return; pushHistory();
    App.sel.forEach(id => App.map.nodes[id].color = idx);
    render(); scheduleSave();
  }
  function toggleCollapse(id) {
    const n = App.map.nodes[id]; if (!n || !childrenOf(id).length) return;
    pushHistory(); n.collapsed = !n.collapsed; render(); scheduleSave();
  }
  function connect(from, to) {
    if (from === to) return false;
    const a = App.map.nodes[from], b = App.map.nodes[to]; if (!a || !b) return false;
    // avoid duplicates & direct parent/child duplication
    if (b.parentId === from || a.parentId === to) { toast(t('toast.alreadyLinked')); return false; }
    if (App.map.edges.some(e => (e.from === from && e.to === to) || (e.from === to && e.to === from))) { toast(t('toast.alreadyLinked')); return false; }
    pushHistory();
    App.map.edges.push({ id: uid(), from, to });
    render(); scheduleSave(); return true;
  }

  // ============================================================= Inline editor
  let editState = null;
  function startEdit(id, selectAll) {
    const n = App.map.nodes[id]; if (!n) return;
    editState = { id, isNew: n.text === t('node.new') || n.text === t('node.root') };
    const r = canvas.getBoundingClientRect();
    const sx = n.x * App.view.k + App.view.x + r.left;
    const sy = n.y * App.view.k + App.view.y + r.top;
    const w = Math.max(n.w, 80) * App.view.k, h = Math.max(n.h, 36) * App.view.k;
    editor.style.display = 'block';
    editor.style.left = (sx - w / 2) + 'px';
    editor.style.top = (sy - h / 2) + 'px';
    editor.style.width = w + 'px';
    editor.style.minHeight = h + 'px';
    editor.style.fontSize = (14 * App.view.k) + 'px';
    editor.value = n.text;
    editor.focus();
    if (selectAll) editor.select(); else editor.setSelectionRange(editor.value.length, editor.value.length);
    autoGrow();
  }
  function autoGrow() { editor.style.height = 'auto'; editor.style.height = editor.scrollHeight + 'px'; }
  function commitEdit(cancel) {
    if (!editState) return;
    const n = App.map.nodes[editState.id];
    if (n && !cancel) {
      const v = editor.value.replace(/\s+$/, '');
      if (v !== n.text) { pushHistory(); n.text = v || ' '; sizeNode(n); }
    }
    editor.style.display = 'none'; editor.blur();
    const id = editState.id; editState = null;
    render(); select(id, false); scheduleSave();
  }
  editor.addEventListener('input', autoGrow);
  editor.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(false); }
    else if (e.key === 'Escape') { e.preventDefault(); commitEdit(true); }
    else if (e.key === 'Tab') { e.preventDefault(); const id = editState.id; commitEdit(false); addChild(id, true); }
  });
  editor.addEventListener('blur', () => { if (editState) commitEdit(false); });

  // ============================================================= Pointer interaction
  const ptrs = new Map();
  let drag = null;        // active gesture
  let pinch = null;

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  function onPointerDown(e) {
    if (editState) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture?.(e.pointerId);

    if (ptrs.size === 2) { startPinch(); drag = null; return; }
    if (ptrs.size > 2) return;

    const w = screenToWorld(e.clientX, e.clientY);
    const handleEl = e.target.closest('[data-handle]');
    const collapseEl = e.target.closest('[data-collapse]');
    const nodeEl = e.target.closest('.node');

    if (collapseEl) { toggleCollapse(collapseEl.dataset.collapse); return; }

    // mobile connect mode: tap nodes to connect
    if (App.linkMode && nodeEl) {
      const id = nodeEl.dataset.id;
      if (!App._linkFrom) { App._linkFrom = id; select(id, false); toast(t('toast.linkTarget')); }
      else { connect(App._linkFrom, id); App._linkFrom = null; setLinkMode(false); }
      return;
    }

    if (handleEl) {
      drag = { type: 'link', from: handleEl.dataset.handle, sx: e.clientX, sy: e.clientY, moved: false };
      canvas.classList.add('linking');
      return;
    }

    if (nodeEl) {
      const id = nodeEl.dataset.id;
      if (!App.sel.has(id)) select(id, e.shiftKey || e.ctrlKey || e.metaKey);
      else { App.active = id; if (e.shiftKey || e.ctrlKey || e.metaKey) { App.sel.delete(id); syncSelectionDom(); return; } }
      const ids = App.sel.size ? [...App.sel] : [id];
      drag = { type: 'node', ids, start: ids.map(i => ({ id: i, x: App.map.nodes[i].x, y: App.map.nodes[i].y })), sx: e.clientX, sy: e.clientY, moved: false, pushed: false };
      return;
    }

    // empty space
    if (e.shiftKey) {
      drag = { type: 'marquee', ox: w.x, oy: w.y, moved: false };
      marqueeEl.style.display = '';
    } else {
      drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: App.view.x, vy: App.view.y, moved: false };
      canvas.classList.add('panning');
      if (!(e.shiftKey || e.ctrlKey)) { /* selection cleared on up if no move */ }
    }
  }

  function onPointerMove(e) {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) { updatePinch(); return; }
    if (!drag) return;
    const w = screenToWorld(e.clientX, e.clientY);

    if (drag.type === 'pan') {
      drag.moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 3;
      App.view.x = drag.vx + (e.clientX - drag.sx);
      App.view.y = drag.vy + (e.clientY - drag.sy);
      applyView();
    } else if (drag.type === 'node') {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 3) return;
      if (!drag.pushed) { pushHistory(); drag.pushed = true; }
      drag.moved = true;
      const dx = (e.clientX - drag.sx) / App.view.k, dy = (e.clientY - drag.sy) / App.view.k;
      drag.start.forEach(s => { const n = App.map.nodes[s.id]; n.x = Math.round(s.x + dx); n.y = Math.round(s.y + dy); moveNodeEl(s.id); });
      redrawEdgesFor(drag.ids);
    } else if (drag.type === 'link') {
      drag.moved = true;
      const a = App.map.nodes[drag.from];
      const bp = borderPoint(a, w.x, w.y);
      const tgt = nodeAt(w.x, w.y);
      linkPreview.textContent = '';
      linkPreview.appendChild(el('path', { class: 'link-line', d: `M${bp.x} ${bp.y}L${w.x} ${w.y}` }));
      if (tgt && tgt.id !== drag.from) linkPreview.appendChild(el('rect', { class: 'link-target', x: tgt.x - tgt.w / 2 - 3, y: tgt.y - tgt.h / 2 - 3, width: tgt.w + 6, height: tgt.h + 6, rx: 12 }));
    } else if (drag.type === 'marquee') {
      drag.moved = true;
      const x = Math.min(drag.ox, w.x), y = Math.min(drag.oy, w.y), ww = Math.abs(w.x - drag.ox), hh = Math.abs(w.y - drag.oy);
      marqueeEl.setAttribute('x', x); marqueeEl.setAttribute('y', y); marqueeEl.setAttribute('width', ww); marqueeEl.setAttribute('height', hh);
      App.sel.clear();
      for (const n of Object.values(App.map.nodes)) if (n.x >= x && n.x <= x + ww && n.y >= y && n.y <= y + hh) App.sel.add(n.id);
      syncSelectionDom();
    }
  }

  function onPointerUp(e) {
    ptrs.delete(e.pointerId);
    if (pinch && ptrs.size < 2) { pinch = null; }
    if (!drag) { if (ptrs.size === 0) {} return; }

    if (drag.type === 'pan') {
      canvas.classList.remove('panning');
      if (!drag.moved) clearSel();
      scheduleSave();
    } else if (drag.type === 'node') {
      if (drag.moved) scheduleSave();
    } else if (drag.type === 'link') {
      canvas.classList.remove('linking');
      linkPreview.textContent = '';
      const w = screenToWorld(e.clientX, e.clientY);
      const tgt = nodeAt(w.x, w.y);
      if (tgt && tgt.id !== drag.from) connect(drag.from, tgt.id);
      else if (drag.moved) {
        // drop on empty → create child at drop point
        const p = App.map.nodes[drag.from];
        pushHistory();
        const n = mkNode(t('node.new'), Math.round(w.x), Math.round(w.y), { parentId: drag.from, color: p.color });
        App.map.nodes[n.id] = n; render(); select(n.id, false); scheduleSave(); startEdit(n.id, true);
      }
    } else if (drag.type === 'marquee') {
      marqueeEl.style.display = 'none';
      App.active = [...App.sel].pop() || null;
      updateToolbarState();
    }
    drag = null;
  }

  // pinch zoom
  function startPinch() {
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    canvas.classList.remove('panning'); drag = null;
  }
  function updatePinch() {
    if (ptrs.size < 2) return;
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    if (pinch.d) zoomAt(cx, cy, d / pinch.d);
    // pan with the moving midpoint
    App.view.x += cx - pinch.cx; App.view.y += cy - pinch.cy; applyView();
    pinch.d = d; pinch.cx = cx; pinch.cy = cy;
  }

  // wheel zoom / scroll-pan
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0 && !e.shiftKey) {
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 0.89);
    }
  }, { passive: false });

  // double-click: edit node OR create node on empty
  canvas.addEventListener('dblclick', (e) => {
    const nodeEl = e.target.closest('.node');
    if (nodeEl) { startEdit(nodeEl.dataset.id, true); return; }
    const w = screenToWorld(e.clientX, e.clientY);
    pushHistory();
    const n = mkNode(t('node.new'), Math.round(w.x), Math.round(w.y), { parentId: null });
    App.map.nodes[n.id] = n; render(); select(n.id, false); scheduleSave(); startEdit(n.id, true);
  });

  // context menu
  const ctxMenu = $('#ctxMenu');
  canvas.addEventListener('contextmenu', (e) => {
    const nodeEl = e.target.closest('.node');
    if (!nodeEl) { hidePopovers(); return; }
    e.preventDefault();
    if (!App.sel.has(nodeEl.dataset.id)) select(nodeEl.dataset.id, false);
    showPopover(ctxMenu, e.clientX, e.clientY);
  });
  ctxMenu.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const id = App.active || [...App.sel][0]; hidePopovers();
    if (!id) return;
    switch (b.dataset.act) {
      case 'edit': startEdit(id, true); break;
      case 'child': addChild(id, true); break;
      case 'sibling': addSibling(id, true); break;
      case 'collapse': toggleCollapse(id); break;
      case 'duplicate': duplicateNode(id); break;
      case 'delete': deleteNodes([...App.sel]); break;
    }
  });

  // ============================================================= Keyboard
  window.addEventListener('keydown', (e) => {
    if (editState) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); if (App.active) duplicateNode(App.active); return; }
    if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomCenter(1.15); return; }
    if (mod && e.key === '-') { e.preventDefault(); zoomCenter(0.87); return; }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); App.sel = new Set(Object.keys(App.map.nodes)); App.active = [...App.sel].pop(); syncSelectionDom(); updateToolbarState(); return; }

    switch (e.key) {
      case 'Tab': e.preventDefault(); if (App.active) addChild(App.active, true); break;
      case 'Enter': e.preventDefault(); if (App.active) addSibling(App.active, true); break;
      case 'F2': e.preventDefault(); if (App.active) startEdit(App.active, true); break;
      case 'Delete': case 'Backspace': e.preventDefault(); if (App.sel.size) deleteNodes([...App.sel]); break;
      case 'Escape': clearSel(); hidePopovers(); break;
      case ' ': if (App.active) { e.preventDefault(); toggleCollapse(App.active); } break;
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': e.preventDefault(); navigate(e.key); break;
    }
  });

  function navigate(dir) {
    if (!App.active) { const r = roots()[0]; if (r) select(r.id, false); return; }
    const a = App.map.nodes[App.active]; if (!a) return;
    const vis = visibleSet();
    let best = null, bestScore = Infinity;
    for (const n of Object.values(App.map.nodes)) {
      if (n.id === a.id || !vis.has(n.id)) continue;
      const dx = n.x - a.x, dy = n.y - a.y;
      let ok = false, primary = 0, secondary = 0;
      if (dir === 'ArrowRight') { ok = dx > 8; primary = dx; secondary = Math.abs(dy); }
      else if (dir === 'ArrowLeft') { ok = dx < -8; primary = -dx; secondary = Math.abs(dy); }
      else if (dir === 'ArrowDown') { ok = dy > 8; primary = dy; secondary = Math.abs(dx); }
      else { ok = dy < -8; primary = -dy; secondary = Math.abs(dx); }
      if (!ok) continue;
      const score = primary + secondary * 2;
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (best) { select(best.id, false); ensureVisible(best); }
  }
  function ensureVisible(n) {
    const r = canvas.getBoundingClientRect();
    const sx = n.x * App.view.k + App.view.x, sy = n.y * App.view.k + App.view.y;
    const m = 60;
    if (sx < m || sx > r.width - m || sy < m || sy > r.height - m) {
      App.view.x = r.width / 2 - n.x * App.view.k; App.view.y = r.height / 2 - n.y * App.view.k; applyView();
    }
  }
  function zoomCenter(f) { const r = canvas.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }

  // ============================================================= Toolbar wiring
  function updateToolbarState() {
    const n = App.active && App.map.nodes[App.active];
    $$('.shape-btn').forEach(b => b.classList.toggle('active', !!n && b.dataset.shape === n.shape));
    $$('.color-dot').forEach(b => b.classList.toggle('active', !!n && +b.dataset.idx === n.color));
  }

  // shape picker
  $('#shapePicker').addEventListener('click', e => { const b = e.target.closest('.shape-btn'); if (b) setShape(b.dataset.shape); });

  // color picker build
  const colorPicker = $('#colorPicker');
  PALETTE.forEach((p, i) => {
    const d = document.createElement('button');
    d.className = 'color-dot'; d.dataset.idx = i; d.style.background = p.f; d.title = p.f;
    if (p.f === '#FFFFFF') d.style.boxShadow = '0 0 0 1px var(--line)';
    d.addEventListener('click', () => setColor(i));
    colorPicker.appendChild(d);
  });

  // relocate shape/color pickers into a popover on small screens
  const shapePicker = $('#shapePicker'), colorPickerEl = $('#colorPicker');
  const shapeHome = { p: shapePicker.parentNode, n: shapePicker.nextSibling };
  const colorHome = { p: colorPickerEl.parentNode, n: colorPickerEl.nextSibling };
  const mqSmall = matchMedia('(max-width:760px)');
  function relocatePickers() {
    if (mqSmall.matches) { $('#spShapes').appendChild(shapePicker); $('#spColors').appendChild(colorPickerEl); }
    else { shapeHome.p.insertBefore(shapePicker, shapeHome.n); colorHome.p.insertBefore(colorPickerEl, colorHome.n); }
  }
  (mqSmall.addEventListener ? mqSmall.addEventListener('change', relocatePickers) : mqSmall.addListener(relocatePickers));
  relocatePickers();
  $('#btnStyle').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); showPopover($('#stylePopover'), r.left, r.bottom + 6, true); });

  $('#btnAddChild').addEventListener('click', smartAdd);
  $('#btnAddSibling').addEventListener('click', () => { if (App.active) addSibling(App.active, true); });
  $('#btnDelete').addEventListener('click', () => { if (App.sel.size) deleteNodes([...App.sel]); });
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);
  $('#btnTidy').addEventListener('click', tidy);
  $('#btnFit').addEventListener('click', () => fitView());
  $('#btnLang').addEventListener('click', () => setLang(LANG === 'ko' ? 'en' : 'ko'));
  $('#btnHelp').addEventListener('click', () => $('#helpModal').classList.add('show'));
  $('#closeHelp').addEventListener('click', () => $('#helpModal').classList.remove('show'));
  $('#helpModal').addEventListener('click', e => { if (e.target === $('#helpModal')) $('#helpModal').classList.remove('show'); });

  // welcome / onboarding popup — tool-prefixed keys ('tmm.' = tool-mindmap) so they
  // never collide with other tools on the shared hanariago.github.io origin.
  // Behaviour (per 툴 개발 가이드 '첫 방문 가이드 팝업'):
  //  · "오늘 다시 보지 않기" 체크 후 닫으면 → 그날 하루 안 뜸 (localStorage 날짜)
  //  · 체크 없이 닫기/✕ → 같은 세션 동안 안 뜸 (sessionStorage), 새 방문 때 다시
  const GUIDE_DATE_KEY = 'tmm.guideHideDate', GUIDE_SEEN_KEY = 'tmm.guideSeen';
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function showWelcome() { $('#welcomeHideToday').checked = false; $('#welcomeModal').classList.add('show'); }
  function closeWelcome() {
    try { if ($('#welcomeHideToday').checked) localStorage.setItem(GUIDE_DATE_KEY, todayStr()); } catch (e) {}
    try { sessionStorage.setItem(GUIDE_SEEN_KEY, '1'); } catch (e) {}
    $('#welcomeModal').classList.remove('show');
  }
  function maybeShowWelcome() {
    let hide = null, seen = null;
    try { hide = localStorage.getItem(GUIDE_DATE_KEY); } catch (e) {}
    try { seen = sessionStorage.getItem(GUIDE_SEEN_KEY); } catch (e) {}
    if (hide !== todayStr() && !seen) showWelcome();
  }
  $('#welcomeClose').addEventListener('click', closeWelcome);
  $('#welcomeX').addEventListener('click', closeWelcome);
  $('#welcomeModal').addEventListener('click', e => { if (e.target === $('#welcomeModal')) closeWelcome(); });
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#welcomeModal').classList.contains('show')) { closeWelcome(); }
    else if ($('#helpModal').classList.contains('show')) { $('#helpModal').classList.remove('show'); }
  });

  // zoom controls
  $('#zoomIn').addEventListener('click', () => zoomCenter(1.2));
  $('#zoomOut').addEventListener('click', () => zoomCenter(0.83));
  $('#zoomReset').addEventListener('click', () => { App.view.k = 1; applyView(); scheduleSave(); });

  // mobile FAB
  $('#fabAdd').addEventListener('click', smartAdd);
  $('#fabConnect').addEventListener('click', () => setLinkMode(!App.linkMode));
  function setLinkMode(on) {
    App.linkMode = on; App._linkFrom = null;
    $('#fabConnect').classList.toggle('active', on);
    canvas.classList.toggle('linking', on);
    if (on) toast(t('toast.linkStart'));
  }

  // empty guide start
  $('#egStart').addEventListener('click', () => {
    const id = App.map.rootId && App.map.nodes[App.map.rootId] ? App.map.rootId : createRoot();
    startEdit(id, true);
  });

  // ============================================================= Maps drawer
  const drawer = $('#mapsDrawer'), overlay = $('#overlay');
  function openDrawer() { renderMapsList(); drawer.classList.add('show'); overlay.classList.add('show'); }
  function closeDrawer() { drawer.classList.remove('show'); overlay.classList.remove('show'); }
  $('#btnMaps').addEventListener('click', openDrawer);
  $('#closeMaps').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  $('#btnNewMap').addEventListener('click', () => {
    const m = newMap(); Store.save(m); loadMap(m.id); closeDrawer(); toast(t('toast.newMap'));
  });
  function renderMapsList() {
    const ul = $('#mapsList'); ul.textContent = '';
    const idx = Store.index();
    if (!idx.length) { ul.innerHTML = `<li style="padding:16px;color:var(--ink-soft);font-size:13px">${t('drawer.empty')}</li>`; return; }
    idx.forEach(m => {
      const li = document.createElement('li');
      li.className = 'map-item' + (m.id === App.map.id ? ' current' : '');
      li.innerHTML = `<div class="mi-main"><div class="mi-name"></div><div class="mi-meta">${nodesLabel(m.nodes || 0)} · ${fmtDate(m.updated)}</div></div><button class="mi-del" title="${t('ctx.delete').replace(/^\S+\s/, '')}">🗑</button>`;
      li.querySelector('.mi-name').textContent = m.name;
      li.querySelector('.mi-main').addEventListener('click', () => { if (m.id !== App.map.id) loadMap(m.id); closeDrawer(); });
      li.querySelector('.mi-del').addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (!confirm(confirmDelMap(m.name))) return;
        Store.remove(m.id);
        if (m.id === App.map.id) { const next = Store.index()[0]; next ? loadMap(next.id) : bootNew(); }
        renderMapsList();
      });
      ul.appendChild(li);
    });
  }
  function fmtDate(iso) { try { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch { return ''; } }

  // rename map
  $('#mapName').addEventListener('click', () => {
    const name = prompt(t('prompt.mapName'), App.map.name);
    if (name != null && name.trim()) { App.map.name = name.trim(); $('#mapName').textContent = App.map.name; Store.save(App.map); }
  });

  // JSON import/export
  $('#btnExportJson').addEventListener('click', () => {
    download(JSON.stringify(App.map, null, 2), (App.map.name || 'mindmap') + '.json', 'application/json'); toast(t('toast.jsonBackup'));
  });
  $('#btnImportJson').addEventListener('click', () => $('#fileImport').click());
  $('#fileImport').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const m = JSON.parse(r.result);
        if (!m.nodes || !m.id) throw 0;
        m.id = 'm' + Math.random().toString(36).slice(2, 10); // fresh id to avoid clobber
        Store.save(m); loadMap(m.id); closeDrawer(); toast(t('toast.importOk'));
      } catch { toast(t('toast.importBad')); }
    };
    r.readAsText(f); e.target.value = '';
  });

  // ============================================================= Export
  const exportMenu = $('#exportMenu');
  $('#btnExport').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    showPopover(exportMenu, r.left, r.bottom + 6, true);
  });
  exportMenu.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; hidePopovers();
    const t = b.dataset.exp;
    if (t === 'png') exportPNG();
    else if (t === 'svg') exportSVG();
    else if (t === 'md') exportMarkdown();
    else if (t === 'mermaid') exportMermaid();
  });

  function contentBBox(pad = 40) {
    const vis = visibleSet();
    const ns = Object.values(App.map.nodes).filter(n => vis.has(n.id));
    if (!ns.length) return { x: 0, y: 0, w: 100, h: 100 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of ns) { x0 = Math.min(x0, n.x - n.w / 2); y0 = Math.min(y0, n.y - n.h / 2); x1 = Math.max(x1, n.x + n.w / 2); y1 = Math.max(y1, n.y + n.h / 2); }
    return { x: x0 - pad, y: y0 - pad, w: (x1 - x0) + pad * 2, h: (y1 - y0) + pad * 2 };
  }
  function buildSVG(opts = {}) {
    const bb = contentBBox();
    const vis = visibleSet();
    let edges = '', nodes = '';
    const path = (a, b, cls, arrow) => {
      const p1 = borderPoint(a, b.x, b.y), p2 = borderPoint(b, a.x, a.y);
      const dx = p2.x - p1.x, dy = p2.y - p1.y; let d;
      if (Math.abs(dx) >= Math.abs(dy)) { const cx = dx * .45; d = `M${p1.x} ${p1.y} C${p1.x + cx} ${p1.y} ${p2.x - cx} ${p2.y} ${p2.x} ${p2.y}`; }
      else { const cy = dy * .45; d = `M${p1.x} ${p1.y} C${p1.x} ${p1.y + cy} ${p2.x} ${p2.y - cy} ${p2.x} ${p2.y}`; }
      return `<path d="${d}" fill="none" stroke="${cls === 'cross' ? '#9AA8A2' : '#C3CCC7'}" stroke-width="2"${arrow ? ' marker-end="url(#ar)"' : ''}/>`;
    };
    for (const n of Object.values(App.map.nodes)) {
      if (n.parentId == null) continue; const p = App.map.nodes[n.parentId];
      if (!p || !vis.has(n.id) || !vis.has(p.id)) continue; edges += path(p, n, 'tree', false);
    }
    for (const e of App.map.edges) { const a = App.map.nodes[e.from], b = App.map.nodes[e.to]; if (!a || !b || !vis.has(a.id) || !vis.has(b.id)) continue; edges += path(a, b, 'cross', true); }
    for (const n of Object.values(App.map.nodes)) {
      if (!vis.has(n.id)) continue;
      const pal = PALETTE[n.color] || PALETTE[0]; const hw = n.w / 2, hh = n.h / 2; let shape;
      if (n.shape === 'rect') shape = `<rect x="${n.x - hw}" y="${n.y - hh}" width="${n.w}" height="${n.h}" fill="${pal.f}" stroke="${pal.s}" stroke-width="1.6"/>`;
      else if (n.shape === 'ellipse') shape = `<ellipse cx="${n.x}" cy="${n.y}" rx="${hw}" ry="${hh}" fill="${pal.f}" stroke="${pal.s}" stroke-width="1.6"/>`;
      else if (n.shape === 'diamond') shape = `<path d="M${n.x} ${n.y - hh}L${n.x + hw} ${n.y}L${n.x} ${n.y + hh}L${n.x - hw} ${n.y}Z" fill="${pal.f}" stroke="${pal.s}" stroke-width="1.6"/>`;
      else shape = `<rect x="${n.x - hw}" y="${n.y - hh}" width="${n.w}" height="${n.h}" rx="10" fill="${pal.f}" stroke="${pal.s}" stroke-width="1.6"/>`;
      const m = measure(n.text); const y0 = n.y - (m.lines.length - 1) * LINE_H / 2;
      let tspans = m.lines.map((ln, i) => `<tspan x="${n.x}" y="${y0 + i * LINE_H}">${escXml(ln || ' ')}</tspan>`).join('');
      nodes += shape + `<text text-anchor="middle" dominant-baseline="middle" font-family='Apple SD Gothic Neo, Noto Sans KR, sans-serif' font-size="14" font-weight="500" fill="${pal.t}">${tspans}</text>`;
    }
    const bgRect = opts.transparent ? '' : `<rect x="${bb.x}" y="${bb.y}" width="${bb.w}" height="${bb.h}" fill="#FCFBF7"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(bb.w)}" height="${Math.round(bb.h)}" viewBox="${bb.x} ${bb.y} ${bb.w} ${bb.h}">`
      + `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#8A9590"/></marker></defs>`
      + bgRect + edges + nodes + `</svg>`;
  }
  function exportSVG() { download(buildSVG(), (App.map.name || 'mindmap') + '.svg', 'image/svg+xml'); toast(t('toast.svgSaved')); }
  function exportPNG() {
    const svg = buildSVG();
    const bb = contentBBox(); const scale = 2;
    const img = new Image();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bb.w * scale)); c.height = Math.max(1, Math.round(bb.h * scale));
      const ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0, bb.w, bb.h);
      c.toBlob(b => { downloadBlob(b, (App.map.name || 'mindmap') + '.png'); toast(t('toast.pngSaved')); }, 'image/png');
    };
    img.onerror = () => toast(t('toast.pngFail'));
    img.src = url;
  }
  function exportMarkdownStr() {
    let out = `# ${App.map.name}\n\n`;
    const walk = (id, depth) => {
      const n = App.map.nodes[id]; if (!n) return;
      const txt = n.text.replace(/\n+/g, ' ').trim();
      out += '  '.repeat(depth) + '- ' + (txt || ' ') + '\n';
      childrenOf(id).forEach(c => walk(c.id, depth + 1));
    };
    roots().forEach(r => walk(r.id, 0));
    if (App.map.edges.length) { out += '\n## ' + t('mdHeading.links') + '\n\n'; App.map.edges.forEach(e => { const a = App.map.nodes[e.from], b = App.map.nodes[e.to]; if (a && b) out += `- ${a.text.replace(/\n/g, ' ')} → ${b.text.replace(/\n/g, ' ')}\n`; }); }
    return out;
  }
  function exportMarkdown() { download(exportMarkdownStr(), (App.map.name || 'mindmap') + '.md', 'text/markdown'); toast(t('toast.mdSaved')); }
  function exportMermaid() { copyText(exportMermaidStr()); toast(t('toast.mermaidCopied')); }
  function exportMermaidStr() {
    const idmap = {}; let i = 0;
    for (const id in App.map.nodes) idmap[id] = 'N' + (i++);
    const lbl = (n) => '"' + n.text.replace(/\n/g, ' ').replace(/"/g, '&quot;') + '"';
    const wrap = (n) => { const id = idmap[n.id]; const t = lbl(n); if (n.shape === 'diamond') return `${id}{${t}}`; if (n.shape === 'ellipse') return `${id}([${t}])`; if (n.shape === 'round') return `${id}(${t})`; return `${id}[${t}]`; };
    let out = 'graph LR\n';
    const declared = new Set();
    const declare = (n) => { if (!declared.has(n.id)) { out += '  ' + wrap(n) + '\n'; declared.add(n.id); } };
    Object.values(App.map.nodes).forEach(declare);
    for (const n of Object.values(App.map.nodes)) if (n.parentId && App.map.nodes[n.parentId]) out += `  ${idmap[n.parentId]} --> ${idmap[n.id]}\n`;
    for (const e of App.map.edges) if (App.map.nodes[e.from] && App.map.nodes[e.to]) out += `  ${idmap[e.from]} -.-> ${idmap[e.to]}\n`;
    return out;
  }

  // ============================================================= Popover helpers
  function showPopover(elm, x, y, alignLeft) {
    hidePopovers();
    elm.style.left = '0px'; elm.style.top = '0px'; elm.classList.add('show');
    const w = elm.offsetWidth, h = elm.offsetHeight, vw = innerWidth, vh = innerHeight;
    let px = alignLeft ? x : Math.min(x, vw - w - 8);
    px = Math.min(px, vw - w - 8); let py = Math.min(y, vh - h - 8);
    elm.style.left = Math.max(8, px) + 'px'; elm.style.top = Math.max(8, py) + 'px';
  }
  function hidePopovers() { $$('.popover').forEach(p => p.classList.remove('show')); }
  window.addEventListener('pointerdown', (e) => { if (!e.target.closest('.popover') && !e.target.closest('#btnExport') && !e.target.closest('#btnStyle')) hidePopovers(); }, true);

  // ============================================================= Misc helpers
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1900); }
  function download(text, name, type) { downloadBlob(new Blob([text], { type }), name); }
  function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  function copyText(t) { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => fallbackCopy(t)); else fallbackCopy(t); }
  function fallbackCopy(t) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }

  // ============================================================= Boot
  function loadMap(id) {
    const m = Store.load(id); if (!m) return bootNew();
    App.map = m; App.history = []; App.future = []; App.sel.clear(); App.active = null;
    App.view = m.view || { x: 0, y: 0, k: 1 };
    $('#mapName').textContent = m.name;
    render();
    if (!m.view) fitView(); else applyView();
    updateUndoButtons();
  }
  function bootNew() {
    const m = newMap(); Store.save(m); loadMap(m.id);
  }
  function init() {
    LANG = detectLang();
    applyI18n();
    const lastId = Store.last();
    if (lastId && Store.load(lastId)) loadMap(lastId);
    else { const idx = Store.index(); idx.length ? loadMap(idx[0].id) : bootNew(); }
    applyView();
    maybeShowWelcome();
  }

  window.addEventListener('resize', () => { applyView(); relocatePickers(); });
  init();

  // expose a little for debugging / programmatic use
  window.__mm = App;
  window.__mm.api = { addChild, addSibling, deleteNodes, connect, tidy, render, fitView, createRoot, buildSVG, exportMarkdownStr, exportMermaidStr };
})();
