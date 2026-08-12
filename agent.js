/* ── Agent-Native 层 · 召唤入口 + 编排对话框 + 思维画布执行页 ────────
 * 依赖：app.js 全局（$ / $$ / esc / later / every / parseHash / ROUTE_ALIASES / showToast）
 *       agent-data.js（AG_TEMPLATES / AG_RECENT / AG_SCENARIOS / agScenarioFor）
 * 路由：#/arena?tpl=complex|redteam|loop[&task=自由文本]
 * ─────────────────────────────────────────────────────────────── */
'use strict';

/* ══ 1. AI 召唤层（悬浮球 + 问候气泡 + 顶栏入口）═════════════════ */
const AG_ORB_ROUTES = ['dashboard', 'tasks', 'confirm', 'training', 'training-live', 'models', 'data', 'gateway'];

function agRoute() {
  const { route } = parseHash();
  return ROUTE_ALIASES[route] || route;
}

function agMountSummon() {
  const root = $('#agent-root');
  if (!root) return;
  root.innerHTML = '';
  const r = agRoute();
  document.body.classList.toggle('arena-mode', r === 'arena');
  /* V6 · 全局侧边导航恢复：执行页内自动收拢为细轨，离开后还原用户原状态 */
  const sb = $('#sidebar');
  if (sb && sessionStorage.getItem('cr-auth') === '1') {
    if (r === 'arena') {
      if (sb.dataset.arenaPrev === undefined) sb.dataset.arenaPrev = sb.classList.contains('collapsed') ? '1' : '0';
      sb.classList.add('collapsed');
    } else if (sb.dataset.arenaPrev !== undefined) {
      sb.classList.toggle('collapsed', sb.dataset.arenaPrev === '1');
      delete sb.dataset.arenaPrev;
    }
  }
  const authed = sessionStorage.getItem('cr-auth') === '1';
  if (!authed) return;
  if (!AG_ORB_ROUTES.includes(r)) return;

  /* 悬浮球 */
  const wrap = document.createElement('div');
  wrap.className = 'ag-orb-wrap';
  wrap.innerHTML = `
    <span class="ag-orb-label">AI 编排引擎 · 描述目标即发起演练</span>
    <button class="ag-orb" id="ag-orb" aria-label="打开 AI 编排引擎" title="AI 编排引擎"><span class="ag-orb-spark">✦</span></button>`;
  root.appendChild(wrap);
  $('#ag-orb').addEventListener('click', () => agOpenDialog());

  /* 态势感知顶栏注入入口 */
  if (r === 'dashboard') {
    const tb = $('.dash-topbar');
    if (tb && !$('#ag-topbar-btn')) {
      const b = document.createElement('button');
      b.className = 'ag-topbar-btn'; b.id = 'ag-topbar-btn';
      b.innerHTML = '✦ AI 编排引擎';
      b.addEventListener('click', () => agOpenDialog());
      tb.appendChild(b);
    }
    /* 首页引导：首次进入自动浮现编排对话框（视觉焦点），态势感知压暗为背景；
       之后若尚未交互则用问候气泡保持可感知 */
    if (sessionStorage.getItem('ag-autoinvite') !== '1') {
      sessionStorage.setItem('ag-autoinvite', '1');
      later(() => agOpenDialog(), 900);
    } else if (sessionStorage.getItem('ag-engaged') !== '1') {
      later(() => agShowBubble(), 1400);
    }
  }
}

function agShowBubble() {
  if (agRoute() !== 'dashboard' || $('#ag-bubble') || $('#ag-overlay')) return;
  const root = $('#agent-root');
  const el = document.createElement('div');
  el.className = 'ag-bubble'; el.id = 'ag-bubble';
  el.innerHTML = `
    <div class="ag-bubble-head">
      <span class="ag-bubble-ava">✦</span>
      <span class="ag-bubble-title">编排引擎在线 · 3 个执行 Agent 待命中</span>
      <button class="ag-bubble-x" id="ag-bubble-x" aria-label="关闭">✕</button>
    </div>
    <div class="ag-bubble-text">背后是实时攻防态势。告诉我一个目标——渗透、评测或训练——我来编排 Agent 完成它，全程推理可见。</div>
    <div class="ag-bubble-chips">
      <button class="ag-chip-btn" data-say="对异构政务云环境发起多 Agent 协同渗透演练">渗透异构政务云</button>
      <button class="ag-chip-btn" data-say="授权红队 Agent 对跨区互联环境发起自主渗透">发起自动化红队</button>
      <button class="ag-chip-btn" data-say="用长链路攻防轨迹数据训练新一代渗透 Agent">轨迹训练新模型</button>
    </div>`;
  root.appendChild(el);
  $('#ag-bubble-x').addEventListener('click', (e) => { e.stopPropagation(); el.remove(); });
  $$('.ag-chip-btn', el).forEach((c) => c.addEventListener('click', () => {
    el.remove();
    if (c.dataset.href) { location.hash = c.dataset.href; return; }
    agOpenDialog(c.dataset.say || '');
  }));
}

/* ══ 2. 编排对话框（端砚式：大输入框 + 技术亮点模板卡）═══════════ */
function agOpenDialog(prefill) {
  if ($('#ag-overlay')) return;
  sessionStorage.setItem('ag-engaged', '1');
  const bub = $('#ag-bubble'); if (bub) bub.remove();
  const root = $('#agent-root');
  const ov = document.createElement('div');
  ov.className = 'ag-overlay'; ov.id = 'ag-overlay';
  ov.innerHTML = `
  <div class="ag-dialog" role="dialog" aria-label="AI 编排引擎">
    <button class="ag-dialog-close" id="ag-x" aria-label="关闭">✕</button>
    <div class="ag-dialog-kicker">AGENT ORCHESTRATOR · 作战回路入口</div>
    <div class="ag-dialog-title">描述一个目标，<em>Agent 编队</em>完成剩下的</div>
    <div class="ag-dialog-sub">攻击、防御、评测、训练的执行体都是 Agent · 推理、代价与证据全程可见 · 轨迹沉淀回流训练</div>
    <div class="ag-cred">
      <span class="ag-cred-item">CyberGym 漏洞挖掘 <b>90.84%</b> · 国内第一</span>
      <span class="ag-cred-item">PatchEval 漏洞修复 <b>43.48%</b> · 总榜第一</span>
      <span class="ag-cred-item">ExploitGym 漏洞利用 <b>64</b> 个 · 总榜第四</span>
      <span class="ag-cred-note">书安攻防智能体 DoGNAVY · 匿名参赛成绩</span>
    </div>
    <div class="ag-input-box">
      <textarea class="ag-input" id="ag-text" placeholder="描述一个演练目标、一个评测假设，或直接粘贴一段威胁情报……">${prefill ? esc(prefill) : ''}</textarea>
      <div class="ag-input-foot">
        <select class="ag-mode" id="ag-mode" title="编排模式">
          <option>任务规划</option><option>自由探索</option>
        </select>
        <span class="small muted">演示数据 · 真实接入后由 Agent 运行时回传</span>
        <span class="spacer"></span>
        <button class="btn btn-primary" id="ag-go">开始演练 →</button>
      </div>
    </div>
    <div class="ag-section-label">三个演示任务 · 从一次完整演练开始</div>
    <div class="ag-tpl-grid">
      ${AG_TEMPLATES.map((t) => `
      <button class="ag-tpl" data-tpl="${t.id}">
        <div class="ag-tpl-top"><span class="ag-tpl-ico">${t.icon}</span><span class="ag-tpl-title">${t.title}</span></div>
        <div class="ag-tpl-desc">${t.desc}</div>
        <div class="ag-tpl-tags">${t.tags.map((g) => `<span class="badge">${g}</span>`).join('')}<span class="ag-tpl-go">进入 →</span></div>
      </button>`).join('')}
    </div>
  </div>`;
  root.appendChild(ov);
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  $('#ag-x').addEventListener('click', close);
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
  $$('.ag-tpl', ov).forEach((b) => b.addEventListener('click', () => agWizardStart(ov, b.dataset.tpl)));
  $('#ag-go').addEventListener('click', () => {
    const v = $('#ag-text').value.trim();
    if (!v) { showToast('描述一个目标，或选择下方演示任务'); $('#ag-text').focus(); return; }
    agWizardStart(ov, 'auto', v);
  });
  const ta = $('#ag-text');
  ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}

/* ══ 2b. 多轮对话建任务向导（V6）：AI 逐轮引导 → 摘要确认 → 进入执行页 ══ */
function agWizardStart(ov, tplId, freeText) {
  const preset = AG_WIZARD_PRESETS[tplId] || null;
  const kind = preset ? preset.kind : agWizardKindFor(freeText);
  const cfg = AG_WIZARD[kind];
  const st = {
    ov, cfg, kind, idx: 0,
    answers: preset ? { ...preset.answers } : {},
    presetAnswers: preset ? preset.answers : {},
    tplSource: tplId,
  };
  const dlg = $('.ag-dialog', ov);
  dlg.classList.add('ag-dialog-chat');
  dlg.innerHTML = `
    <button class="ag-dialog-close" id="ag-x" aria-label="关闭">✕</button>
    <div class="ag-dialog-kicker">AGENT ORCHESTRATOR · 对话式任务创建</div>
    <div class="wz-body" id="wz-body"></div>
    <div class="wz-foot">演示环境 · 选项式多轮对话（mock 编排）· 手工创建向导保留在任务中心 / 训练任务页</div>`;
  $('#ag-x').addEventListener('click', () => ov.remove());
  if (freeText) agWizardPush('user', freeText);
  else if (preset) {
    const t = AG_TEMPLATES.find((x) => x.id === tplId);
    agWizardPush('user', `发起演示任务：${t ? t.title : tplId}（参数已按模板预填）`);
  }
  later(() => {
    agWizardPush('ai', cfg.intro + (preset ? '各轮已按模板预填推荐项，点击即可确认，也可改选。' : ''));
    later(() => agWizardAsk(st), 320);
  }, 260);
}

function agWizardPush(who, text) {
  const body = $('#wz-body');
  if (!body) return null;
  const el = document.createElement('div');
  el.className = who === 'user' ? 'wz-user' : 'wz-ai';
  el.innerHTML = who === 'user' ? esc(text) : `<span class="wz-ava">✦</span><div class="wz-text">${esc(text)}</div>`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
  return el;
}

function agWizardOptsFor(step, answers) {
  if (step.optionsBy) return step.optionsBy[answers.type] || [];
  return step.options;
}

function agWizardAsk(st) {
  const step = st.cfg.steps[st.idx];
  if (!step) return agWizardSummary(st);
  const q = step.qBy ? step.qBy[st.answers.type] : step.q;
  agWizardPush('ai', q);
  const body = $('#wz-body');
  const box = document.createElement('div');
  box.className = 'wz-opts';
  box.innerHTML = agWizardOptsFor(step, st.answers).map((o) => {
    const isPreset = st.presetAnswers[step.key] === o.id;
    return `<button class="wz-opt${isPreset ? ' preset' : ''}" data-oid="${o.id}">
      <span class="wz-opt-label">${esc(o.label)}${isPreset ? '<span class="wz-opt-tag">已预填 · 点击确认</span>' : ''}</span>
      <span class="wz-opt-desc">${esc(o.desc)}</span>
    </button>`;
  }).join('');
  body.appendChild(box);
  body.scrollTop = body.scrollHeight;
  box.querySelectorAll('.wz-opt').forEach((b) => b.addEventListener('click', () => {
    const o = agWizardOptsFor(step, st.answers).find((x) => x.id === b.dataset.oid);
    st.answers[step.key] = o.id;
    box.querySelectorAll('.wz-opt').forEach((x) => { x.disabled = true; x.classList.toggle('chosen', x === b); });
    agWizardPush('user', o.label + ' · ' + o.desc);
    st.idx += 1;
    later(() => agWizardAsk(st), 360);
  }));
}

function agWizardLabelOf(st, key) {
  const step = st.cfg.steps.find((s) => s.key === key);
  const o = agWizardOptsFor(step, st.answers).find((x) => x.id === st.answers[key]);
  return o ? o.label : st.answers[key];
}

function agWizardSummary(st) {
  const L = (k) => agWizardLabelOf(st, k);
  const summary = st.cfg.summaryFor(st.answers, L);
  agWizardPush('ai', '配置齐了，请确认。点击「确认并执行」后任务进入队列并直接打开执行详情：');
  const body = $('#wz-body');
  const card = document.createElement('div');
  card.className = 'wz-summary';
  card.innerHTML = `
    <div class="wz-sum-kicker">配置摘要 · ${st.cfg.kindLabel}</div>
    ${st.cfg.steps.map((s) => `<div class="wz-sum-row"><span class="k">${esc((s.qBy ? '评测对象' : s.q.replace(/^第 \d 步 · /, '').replace(/：.*$/, '')))}</span><span class="v">${esc(L(s.key))}</span></div>`).join('')}
    <div class="wz-sum-acts">
      <button class="btn btn-primary btn-sm" id="wz-confirm">✓ 确认并执行</button>
      <button class="btn btn-ghost btn-sm" id="wz-restart">↻ 重新选择</button>
    </div>`;
  body.appendChild(card);
  body.scrollTop = body.scrollHeight;
  $('#wz-confirm').addEventListener('click', () => {
    location.hash = '#/arena?tpl=' + st.cfg.tplFor(st.answers) + '&task=' + encodeURIComponent(summary);
  });
  $('#wz-restart').addEventListener('click', () => {
    const src = st.tplSource;
    st.ov.remove();
    later(() => {
      agOpenDialog();
      const ov = $('#ag-overlay');
      if (ov) agWizardStart(ov, src || 'auto', src ? undefined : '重新创建任务');
    }, 60);
  });
}

/* ══ 3. 思维画布执行页（arena）══════════════════════════════════ */
const AG_TRACK_CN = { eval: '评测轨迹', training: '训练轨迹' };

function renderArena() {
  clearTimers(); /* 重播/重入时清掉旧引擎定时器，避免双引擎写同一 DOM */
  const { params } = parseHash();
  const sc = agScenarioFor(params.tpl || 'complex', params.task || '');
  const total = sc.stages.reduce((s, x) => s + x.dur, 0);

  /* ── 布局 ── */
  $('#view').innerHTML = `
  <div class="arena">
    <div class="ar-head">
      <div class="ar-head-row">
        <a class="ar-back" href="#/dashboard">‹ 态势感知</a>
        <div class="ar-title-box">
          <div class="ar-title">${esc(sc.title)}</div>
          <div class="ar-meta">
            <span class="ar-code">${sc.code}</span>
            <span class="badge badge-primary">${AG_TRACK_CN[sc.track]}</span>
            <span class="badge" id="ar-status">● 编排中</span>
            <span class="ar-code" id="ar-clock">00:00</span>
          </div>
        </div>
        <div class="ar-head-right">
          <button class="btn btn-outline btn-sm" id="ar-review">⚑ 结果确认</button>
          <button class="btn btn-outline btn-sm" id="ar-new">✦ 新任务</button>
          <button class="btn btn-outline btn-sm" id="ar-pause">❙❙ 暂停</button>
          <button class="btn btn-outline btn-sm" id="ar-skip">快进 ⏭</button>
          <button class="btn btn-ghost btn-sm" id="ar-replay">↻ 重播</button>
        </div>
      </div>
      <div class="ag-badges">
        ${sc.agents.map((a) => `<span class="ag-badge"><span class="ab-sq"></span>${esc(a.name)}<span class="ab-id">${esc(a.id)}</span><span class="ab-tag">${esc(a.tag)}</span></span>`).join('')}
      </div>
      <div class="ar-budget" id="ar-budget">
        ${agBudgetItems(sc).map(([k, totalV, unit]) => `
        <div class="bm-item">
          <div class="bm-kv"><span class="bm-k">${k}</span><span class="bm-v" data-bmv="${k}">0 / ${totalV}${unit}</span></div>
          <div class="prog-track"><div class="prog-fill" data-bmf="${k}" style="width:0%"></div></div>
        </div>`).join('')}
        ${sc.budgetNote ? `<div class="bm-item" style="display:flex;align-items:flex-end"><span class="small muted">${sc.budgetNote}</span></div>` : ''}
        <div class="ar-watch" id="ar-watch">
          <span class="ar-watch-label">AI 全域监控</span>
          ${(sc.watch || []).map(([k, val]) => `<span class="vz-chip ar-watch-chip">${k} <b data-watch-v="${k}">${typeof val === 'number' ? 0 : val}</b></span>`).join('')}
        </div>
      </div>
    </div>
    <div class="ar-main">
      <aside class="ar-rail ar-rail-l collapsed" id="ar-rail-task">
        <button class="arl-toggle" id="arl-task-toggle" title="展开任务中心">»</button>
        <span class="arl-vlabel">任务中心</span>
        <div class="arl-body">
          <div class="arl-kicker">本任务 · 任务中心</div>
          <div class="arl-code">${sc.code} <span class="badge badge-primary">${AG_TRACK_CN[sc.track]}</span></div>
          ${sc.stages.map((s, i) => `
          <button class="arl-row" id="rail-stg-${i}" data-stg="${i}" title="${esc(s.title)}">
            <span class="arl-dot">${s.no}</span>
            <span class="arl-name">${esc(s.title)}</span>
            ${(sc.gates || []).some((g) => g.stage === i) ? '<span class="arl-gate">⚑</span>' : ''}
            <span class="arl-state" data-state>待执行</span>
          </button>`).join('')}
        </div>
      </aside>
      <div class="ar-stream" id="ar-stream"><div class="ar-stream-inner" id="ar-stream-inner"></div></div>
      <div class="ar-panel" id="ar-panel">
        <div class="ar-panel-head">
          <span class="ar-panel-title">结构化画布</span>
          <span class="small muted">模块随推理推进逐个浮现</span>
          <span class="badge" id="ar-panel-count">0 模块</span>
        </div>
        <div class="ar-panel-body" id="ar-panel-body">
          <div class="ar-panel-empty" id="ar-panel-empty">⬡ 推理产生的拓扑、评分、证据等结构化模块将在这里沉淀</div>
        </div>
      </div>
      <aside class="ar-rail ar-rail-r collapsed" id="ar-rail-asset">
        <button class="arl-toggle" id="arl-asset-toggle" title="展开资产中心">«</button>
        <span class="arl-vlabel">资产中心</span>
        <div class="arl-body">
          <div class="arl-kicker">本任务 · 资产中心</div>
          ${(sc.report ? sc.report.assets : []).map(([name, meta], ai) => `
          <button class="arl-row arl-asset" data-ai="${ai}" title="${esc(name)} · ${esc(meta)}">
            <span class="arl-dot">◇</span>
            <span class="arl-name">${esc(name)}</span>
            <span class="arl-state" data-ast-state>○ 产出中</span>
            <span class="arl-meta">${esc(meta)}</span>
          </button>`).join('') || '<div class="arl-empty">本任务暂无登记资产</div>'}
        </div>
      </aside>
    </div>
    <div class="ar-ask">
      <div class="ar-ask-inner">
        <textarea class="textarea" id="ar-ask-input" placeholder="追问编排引擎，或下达新指令（如：把第 3 阶段的攻击强度调低）……" rows="1"></textarea>
        <button class="btn btn-primary btn-sm" id="ar-ask-go" style="height:40px">发送</button>
        <span class="ar-ask-hint">演示环境 · 追问由编排引擎 mock 响应</span>
      </div>
    </div>
  </div>`;

  /* 训练轨迹时高亮训练导航 */
  if (sc.track === 'training') {
    $$('#sidenav a[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === 'training'));
    $$('#sidenav .sb-l1').forEach((box) => box.classList.toggle('active-child', !!box.querySelector('a.active')));
  }

  /* ── 播放引擎（虚拟时钟，单 interval 驱动） ── */
  const play = { vt: 0, total, paused: false, done: false, cursor: 0, schedule: [], spikes: {}, gateWait: false, skipMode: false };
  let at = 400;
  sc.stages.forEach((s, i) => {
    play.schedule.push({ at, fn: () => agStageStart(sc, i) });
    const gap = Math.max(900, Math.floor(s.dur * 0.72 / Math.max(1, s.events.length)));
    s.events.forEach((ev, j) => {
      play.schedule.push({ at: at + 500 + gap * j, fn: () => {
        if (ev.t === 'tool') { agStreamAppend(agToolRefHtml(ev)); agPanelAdd(ev, i); }
        else agStreamAppend(agEventHtml(ev));
      } });
    });
    at += s.dur;
    play.schedule.push({ at: at - 500, fn: () => agStageDone(sc, i) });
    /* V2 · 人工研判点：默认挂在阶段收尾，可用 offset 插在阶段中段 */
    (sc.gates || []).filter((g) => g.stage === i).forEach((g) => {
      play.schedule.push({ at: g.offset ? (at - s.dur) + g.offset : at - 300, fn: () => agGateShow(play, g) });
    });
  });
  play.schedule.sort((a, b) => a.at - b.at); /* 中段研判点插入后保持时序单调 */
  play.schedule.push({ at: total + 400, fn: () => agFinale(sc) });
  play.total = total + 400;
  window.__agPlay = play;

  every(() => {
    if (play.paused || play.done || play.gateWait) return; /* gateWait：人工研判中，虚拟时钟冻结 */
    play.vt += 200;
    agTickHeader(play, sc);
    while (play.cursor < play.schedule.length && play.schedule[play.cursor].at <= play.vt) {
      play.schedule[play.cursor].fn(); play.cursor++;
    }
    if (play.vt >= play.total) play.done = true;
  }, 200);

  /* ── 控件 ── */
  $('#ar-pause').addEventListener('click', () => {
    play.paused = !play.paused;
    $('#ar-pause').textContent = play.paused ? '▶ 继续' : '❙❙ 暂停';
    const st = $('#ar-status');
    if (st && !play.done) st.textContent = play.paused ? '❙❙ 已暂停' : '● 执行中';
  });
  $('#ar-skip').addEventListener('click', () => {
    AG_VIZ_ANIM = false; /* 快进：分支推演等动画直接定格终态 */
    play.skipMode = true; /* 快进：研判点按推荐项自动通过 */
    /* 已展开的研判卡：直接标记按推荐项通过 */
    $$('.as-gate:not(.resolved)').forEach((box) => {
      box.classList.add('resolved');
      const opts = $('.as-gate-opts', box);
      if (opts) opts.innerHTML = '<span class="as-gate-done">✓ 已裁决（快进按推荐项通过）</span>';
    });
    play.gateWait = false;
    while (play.cursor < play.schedule.length) { play.schedule[play.cursor].fn(); play.cursor++; }
    AG_VIZ_ANIM = true;
    play.vt = play.total; play.done = true;
    agTickHeader(play, sc);
  });
  $('#ar-replay').addEventListener('click', () => renderArena());
  $('#ar-new').addEventListener('click', () => agOpenDialog());
  $('#ar-review').addEventListener('click', () => agReviewOverlay(sc));
  /* V6 · 页面融入执行流：#/confirm 深链改为流内复核视图；结构化画布的监控卡可展开实时监控 */
  $('#ar-stream').addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#/confirm"]');
    if (a) { e.preventDefault(); agReviewOverlay(sc); }
  });
  $('#ar-panel').addEventListener('click', (e) => {
    if (e.target.closest('.as-tool-xp')) agLiveOverlay(sc);
  });
  /* V6 · 左右折叠边栏：任务中心（左）/ 资产中心（右），默认折叠 */
  const railTask = $('#ar-rail-task'), railAsset = $('#ar-rail-asset');
  $('#arl-task-toggle').addEventListener('click', () => {
    const c = railTask.classList.toggle('collapsed');
    $('#arl-task-toggle').textContent = c ? '»' : '«';
    $('#arl-task-toggle').title = c ? '展开任务中心' : '收起任务中心';
  });
  $('#arl-asset-toggle').addEventListener('click', () => {
    const c = railAsset.classList.toggle('collapsed');
    $('#arl-asset-toggle').textContent = c ? '«' : '»';
    $('#arl-asset-toggle').title = c ? '展开资产中心' : '收起资产中心';
  });
  railTask.querySelectorAll('.arl-row').forEach((b) => b.addEventListener('click', () => {
    const mod = $(`#ar-panel-body [data-stg="${b.dataset.stg}"]`);
    if (mod) { mod.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); mod.classList.add('flash'); later(() => mod.classList.remove('flash'), 900); }
  }));
  railAsset.querySelectorAll('.arl-asset').forEach((b) => b.addEventListener('click', () => {
    const kind = (sc.report.assets[+b.dataset.ai] || [])[2];
    if (kind === 'data') { location.hash = '#/data'; return; }
    if (kind === 'model') { location.hash = '#/models'; return; }
    showToast('演示环境：已加入导出队列，完成后可在数据中心取件');
  }));

  /* ── 追问（按当前任务上下文 mock 应答） ── */
  const ask = () => {
    const ta = $('#ar-ask-input');
    const v = ta.value.trim();
    if (!v) return;
    ta.value = '';
    agStreamAppend(`<div class="as-user-box"><div class="as-who"><b>我</b><span>追问编排引擎</span></div>${esc(v)}</div>`);
    later(() => agStreamAppend(agEventHtml({ t: 'msg', text: sc.askReply || '已收到。演示环境中指令仅作记录；真实接入后，编排引擎会将其编译为约束并调度 Agent 响应。' })), 700);
  };
  $('#ar-ask-go').addEventListener('click', ask);
  $('#ar-ask-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } });

  /* 开场：用户目标 + 受理标记 */
  agStreamAppend(`<div class="as-user-box"><div class="as-who"><b>我</b><span>目标下发</span></div>${esc(sc.prompt)}</div>`);
  agStreamAppend(`<div class="as-note">任务 ${sc.code} 已受理 · ${AG_TRACK_CN[sc.track]} · 编排引擎接管</div>`);
}

/* 预算条目（训练轨迹隐藏 Token/工具，改显算力） */
function agBudgetItems(sc) {
  if (sc.track === 'training') return [['算力成本', sc.budget.cost[1], sc.budget.cost[2]], ['训练时长', sc.budget.time[1], sc.budget.time[2]]];
  return [['Token', sc.budget.token[1], ' ' + sc.budget.token[2]], ['工具调用', sc.budget.tools[1], ' ' + sc.budget.tools[2]], ['成本', sc.budget.cost[1], ' ' + sc.budget.cost[2]], ['用时', sc.budget.time[1], ' ' + sc.budget.time[2]]];
}

function agTickHeader(play, sc) {
  const el = $('#ar-clock');
  if (el) el.textContent = fmtElapsed(Math.min(play.vt, play.total));
  /* 预算随进度推进到终值 */
  const p = Math.min(1, play.vt / play.total);
  const finals = sc.budgetFinal;
  const map = sc.track === 'training'
    ? [['算力成本', finals.cost, sc.budget.cost[1], '元'], ['训练时长', finals.time, sc.budget.time[1], '分钟']]
    : [['Token', finals.token, sc.budget.token[1], ' ' + sc.budget.token[2]], ['工具调用', finals.tools, sc.budget.tools[1], ' ' + sc.budget.tools[2]], ['成本', finals.cost, sc.budget.cost[1], ' ' + sc.budget.cost[2]], ['用时', finals.time, sc.budget.time[1], ' ' + sc.budget.time[2]]];
  map.forEach(([k, fin, totalV, unit]) => {
    const spike = (play.spikes && play.spikes[k]) || 0;
    const cur = Math.min(fin, fin * p + spike);
    const disp = Number.isInteger(fin) ? String(Math.round(cur)) : cur.toFixed(1);
    const v = $(`[data-bmv="${k}"]`); if (v) v.textContent = `${disp} / ${totalV}${unit}`;
    const f = $(`[data-bmf="${k}"]`); if (f) f.style.width = Math.min(100, (cur / totalV) * 100) + '%';
  });
  /* AI 全域监控计数随进度推进 */
  (sc.watch || []).forEach(([k, val]) => {
    if (typeof val !== 'number') return;
    const el = $(`[data-watch-v="${k}"]`); if (el) el.textContent = String(Math.round(val * p));
  });
  const st = $('#ar-status');
  if (st) st.textContent = play.done ? '✓ 已完成' : play.paused ? '❙❙ 已暂停' : '● 执行中';
}

function agStageStart(sc, i) {
  const s = sc.stages[i];
  const el = $('#rail-stg-' + i);
  if (!el) return;
  el.classList.add('active');
  $('[data-state]', el).textContent = '● 执行中';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  agStreamAppend(`<div class="as-note">STAGE ${s.no} · ${s.title}</div>`);
  /* F2 · 预算跳变（如大规模分支推演的并行代价） */
  const sp = sc.budgetSpikes && sc.budgetSpikes[i];
  if (sp && window.__agPlay) {
    Object.keys(sp).forEach((k) => {
      window.__agPlay.spikes[k] = (window.__agPlay.spikes[k] || 0) + sp[k];
      const item = $(`[data-bmv="${k}"]`);
      if (item) {
        const chip = document.createElement('span');
        chip.className = 'bm-spike';
        chip.textContent = `+${sp[k]}${k === 'Token' ? ' 万 Token · 并行推演' : ' 次 · 并行推演'}`;
        item.closest('.bm-item').appendChild(chip);
        later(() => chip.remove(), 2600);
      }
    });
  }
}
function agStageDone(sc, i) {
  const el = $('#rail-stg-' + i);
  if (!el) return;
  el.classList.remove('active'); el.classList.add('done');
  $('[data-state]', el).textContent = '✓ 完成';
}

/* V2 · 人工研判点：任务暂停，裁决卡进入执行流；快进按推荐项自动通过 */
function agGateShow(play, g) {
  const primary = g.options.find((o) => o.primary) || g.options[0];
  if (play.skipMode) {
    agStreamAppend(`<div class="as-note">人工研判 · ${esc(primary.note)}（快进按推荐项通过）</div>`);
    window.__agGateAuto = (window.__agGateAuto || 0) + 1;
    window.__agGateDecisions = (window.__agGateDecisions || []).concat(g.id + '#' + g.options.indexOf(primary));
    return;
  }
  play.gateWait = true;
  window.__agGateShown = (window.__agGateShown || 0) + 1;
  const st = $('#ar-status'); if (st) st.textContent = '⏸ 等待人工研判';
  const stg = $('#rail-stg-' + g.stage);
  if (stg) stg.classList.add('gated');
  const id = 'gate-' + g.id + '-' + window.__agGateShown;
  agStreamAppend(`
  <div class="as-gate" id="${id}">
    <div class="as-gate-kicker">${esc(g.kicker)}</div>
    <div class="as-gate-title">${esc(g.title)}</div>
    <div class="as-gate-desc">${esc(g.desc)}</div>
    <div class="as-gate-opts">
      ${g.options.map((o, oi) => `<button class="as-gate-btn${o.primary ? ' primary' : ''}" data-oi="${oi}">${esc(o.label)}</button>`).join('')}
    </div>
    <div class="as-gate-hint">任务已暂停 · 机器速度，人类判断 —— 裁决后自动继续</div>
  </div>`);
  const box = $('#' + id);
  if (!box) return;
  box.querySelectorAll('.as-gate-btn').forEach((btn) => btn.addEventListener('click', () => {
    if (box.classList.contains('resolved')) return;
    const o = g.options[+btn.dataset.oi];
    box.classList.add('resolved');
    $('.as-gate-opts', box).innerHTML = `<span class="as-gate-done">✓ 已裁决：${esc(o.label)}</span>`;
    const hint = $('.as-gate-hint', box); if (hint) hint.remove();
    agStreamAppend(`<div class="as-note">人工研判 · ${esc(o.note)}</div>`);
    play.gateWait = false;
    window.__agGateDecisions = (window.__agGateDecisions || []).concat(g.id + '#' + btn.dataset.oi);
    const st2 = $('#ar-status'); if (st2 && !play.done) st2.textContent = '● 执行中';
  }));
}
function agFinale(sc) {
  const st = $('#ar-status'); if (st) st.textContent = '✓ 已完成';
  agStreamAppend(`
  <div class="as-final">
    <div class="as-final-title">${esc(sc.finale.title)}</div>
    <div class="as-final-text">${esc(sc.finale.text)}</div>
    <div class="as-final-ctas">
      ${sc.finale.ctas.map((c) => `<a class="btn btn-${c.kind} btn-sm" href="${c.href}">${c.label}</a>`).join('')}
      <a class="btn btn-ghost btn-sm" href="#/tasks">返回任务中心</a>
    </div>
  </div>`);
  /* V6 · 收尾：右侧资产中心各项标记已沉淀；结构化画布末尾生成任务报告卡 */
  $$('#ar-rail-asset [data-ast-state]').forEach((el) => { el.textContent = '✓ 已沉淀'; });
  $$('#ar-rail-asset .arl-asset').forEach((el) => el.classList.add('done'));
  agReportCard(sc);
}

/* V6 · 结构化画布：工具产物以模块卡形式在右侧面板逐个浮现 */
function agPanelAdd(ev, stgIdx) {
  const body = $('#ar-panel-body');
  if (!body) return;
  const empty = $('#ar-panel-empty'); if (empty) empty.remove();
  const card = document.createElement('div');
  card.className = 'ap-mod' + (ev.expand ? ' as-tool-xp' : '');
  card.dataset.stg = stgIdx;
  card.innerHTML = `
    <div class="ap-mod-head">
      <span class="as-tool-ico">⚙</span>
      <span class="as-tool-name">${esc(ev.name)}</span>
      <span class="ap-mod-title">${esc(ev.title)}</span>
      ${ev.expand ? '<span class="as-tool-xp-hint">⤢ 展开实时监控</span>' : ''}
      <span class="ap-mod-stg">STAGE ${sc_stg_no(stgIdx)}</span>
      <span class="as-tool-status">✓ 完成</span>
    </div>
    <div class="as-tool-body">${agViz(ev.viz)}</div>
    ${ev.foot && ev.foot.length ? `<div class="as-tool-foot">${ev.foot.map((f) => `<span class="badge">${esc(f)}</span>`).join('')}</div>` : ''}`;
  body.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const cnt = $('#ar-panel-count');
  if (cnt) cnt.textContent = body.querySelectorAll('.ap-mod').length + ' 模块';
}
function sc_stg_no(i) {
  const el = $('#rail-stg-' + i + ' .arl-dot');
  return el ? el.textContent : String(i + 1).padStart(2, '0');
}

/* V6 · 执行流中的工具引用行：推理流保持叙事，产物去右侧画布 */
function agToolRefHtml(ev) {
  return `<div class="as-toolref">⚙ 调用 <b>${esc(ev.name)}</b> · ${esc(ev.title)} <span class="as-toolref-ck">✓</span><span class="as-toolref-hint">→ 已沉淀到结构化画布</span></div>`;
}

/* V6 · 画布末尾任务报告卡：沉淀在结构化画布底部，下一步可直接发起 AI 交互 */
function agReportCard(sc) {
  const r = sc.report;
  const body = $('#ar-panel-body');
  if (!r || !body) return;
  const rp = document.createElement('div');
  rp.className = 'ar-report'; rp.id = 'ar-report';
  rp.innerHTML = `
    <div class="ar-report-kicker">任务报告 · 已生成 · 可继续 AI 交互</div>
    <div class="ar-report-head"><span class="ar-report-title">${esc(r.title)}</span><span class="ar-report-score">${esc(r.score)}</span></div>
    <ul class="ar-report-lines">${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="ar-report-acts">${r.actions.map((a, i) => `<button class="ar-report-act${a.primary ? ' primary' : ''}" data-ai="${i}">${esc(a.label)}</button>`).join('')}</div>`;
  body.appendChild(rp);
  rp.querySelectorAll('.ar-report-act').forEach((b) => b.addEventListener('click', () => {
    const a = r.actions[+b.dataset.ai];
    if (a.kind === 'go') { location.hash = a.href; return; }
    if (a.kind === 'dl') { showToast('演示环境：导出任务已加入队列，完成后可在数据中心取件'); return; }
    /* kind === 'ai'：报告追问，编排引擎接力解读 */
    agStreamAppend(`<div class="as-user-box"><div class="as-who"><b>我</b><span>报告追问</span></div>${esc(a.label.replace(/^✦\s*/, ''))}</div>`);
    later(() => agStreamAppend(agEventHtml({ t: 'msg', text: r.aiBrief })), 600);
  }));
  rp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* V3 · 通用覆盖层（原独立页面融入执行流的容器） */
function agOverlay(id, inner) {
  if ($('#' + id)) return;
  const ov = document.createElement('div');
  ov.className = 'ag-xov'; ov.id = id;
  ov.innerHTML = `<div class="ag-xov-card"><button class="ag-xov-x" data-x aria-label="关闭">✕</button>${inner}</div>`;
  $('#agent-root').appendChild(ov);
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.dataset.x !== undefined) ov.remove(); });
}

/* V3 · 结果确认 → 本任务的研判复核视图（不再是独立菜单页） */
function agReviewOverlay(sc) {
  const decisions = window.__agGateDecisions || [];
  const gates = sc.gates || [];
  const rows = gates.map((g) => {
    const d = decisions.find((x) => x.startsWith(g.id + '#'));
    const chosen = d ? g.options[+d.split('#')[1]] : null;
    return `
    <div class="ag-rv-row ${chosen ? 'done' : 'pending'}">
      <span class="ag-rv-st">${chosen ? '✓ 已裁决' : '◌ 待裁决'}</span>
      <div class="ag-rv-main"><b>${esc(g.title)}</b><small>${chosen ? esc(chosen.label) + ' —— ' + esc(chosen.note) : '回放未到达 · 重播任务可补裁'}</small></div>
    </div>`;
  }).join('');
  const pending = gates.length - gates.filter((g) => decisions.some((x) => x.startsWith(g.id + '#'))).length;
  agOverlay('ag-review-ov', `
    <div class="ag-xov-kicker">结果确认 · 已融入任务执行流</div>
    <div class="ag-xov-title">${esc(sc.code)} · 研判记录与复核</div>
    <div class="ag-xov-sub">低置信事项在执行流的研判点当场裁决；这里沉淀为该任务的复核视图，证据链可回放。</div>
    <div class="ag-rv-list">${rows || '<div class="ag-rv-row pending"><span class="ag-rv-st">◌</span><div class="ag-rv-main"><b>本任务无人工研判项</b><small>全部结论高置信直通</small></div></div>'}</div>
    <div class="ag-rv-foot">${pending ? `◌ ${pending} 项待裁决` : '✓ 全部研判项已闭环'} · 演示环境 mock</div>`);
}

/* V3 · 实时监控 → 训练执行流内同屏展开（不再是独立大屏页） */
function agLiveOverlay(sc) {
  agOverlay('ag-live-ov', `
    <div class="ag-xov-kicker">实时监控 · 已融入训练执行流</div>
    <div class="ag-xov-title">${esc(sc.code)} · 训练实时监控</div>
    <div class="ag-xov-sub">独立监控大屏已并入执行流：实时标量与算力占用在此同屏展开，2s 一拍（演示为静态快照）。</div>
    <div class="ag-live-cell">${agViz({ kind: 'lines' })}</div>
    <div class="ag-live-cell">${agViz({ kind: 'bars', rows: [['H100-0', 93, 'var(--chart-1)'], ['H100-1', 91, 'var(--chart-1)'], ['H100-2', 89, 'var(--chart-1)'], ['H100-3', 92, 'var(--chart-1)'], ['H100-4~7', 90, 'var(--chart-2)']] })}</div>
    <div class="vz-chips" style="margin-top:4px"><span class="vz-chip ok">reward 0.87</span><span class="vz-chip ok">KL &lt; 0.03</span><span class="vz-chip ok">GPU 均值 91%</span><span class="vz-chip">ckpt 30/30 落盘</span></div>`);
}

/* ── 执行流条目渲染 ── */
function agStreamAppend(html) {
  const inner = $('#ar-stream-inner');
  if (!inner) return;
  const box = document.createElement('div');
  box.innerHTML = html;
  inner.appendChild(box.firstElementChild);
  const stream = $('#ar-stream');
  stream.scrollTop = stream.scrollHeight;
}
function agEventHtml(ev) {
  if (ev.t === 'note') return `<div class="as-note">${esc(ev.text)}</div>`;
  if (ev.t === 'msg') return `
    <div class="as-msg">
      <span class="as-ava">OE</span>
      <div class="as-body">
        <div class="as-who"><b>编排引擎</b><span>orchestrator-v3</span></div>
        <div class="as-text">${esc(ev.text)}</div>
      </div>
    </div>`;
  /* tool card */
  return `
  <div class="as-tool${ev.expand ? ' as-tool-xp' : ''}">
    <div class="as-tool-head">
      <span class="as-tool-ico">⚙</span>
      <span class="as-tool-name">${esc(ev.name)}</span>
      <span class="as-tool-title">${esc(ev.title)}</span>
      ${ev.expand ? '<span class="as-tool-xp-hint">⤢ 展开实时监控</span>' : ''}
      <span class="as-tool-status">✓ 完成</span>
    </div>
    <div class="as-tool-body">${agViz(ev.viz)}</div>
    ${ev.foot && ev.foot.length ? `<div class="as-tool-foot">${ev.foot.map((f) => `<span class="badge">${esc(f)}</span>`).join('')}</div>` : ''}
  </div>`;
}

/* ── 内嵌可视化（全部为确定性 mock，暖夜语义色） ── */
function agViz(v) {
  if (!v) return '';
  switch (v.kind) {
    case 'kv':
      return `<div class="vz-kv">${v.rows.map(([k, val]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(val)}</span></div>`).join('')}</div>`;
    case 'chips':
      return `<div class="vz-chips">${v.items.map(([label, st]) => `<span class="vz-chip ${st || ''}">${esc(label)}</span>`).join('')}</div>`;
    case 'term':
      return `<div class="vz-term">${v.lines.map((l) => `<div class="${l.startsWith('[obs]') ? 'tl-obs' : l.startsWith('[watchdog]') ? 'tl-warn' : 'tl-act'}">${esc(l)}</div>`).join('')}</div>`;
    case 'chain':
      return `<div class="vz-chain">${v.steps.map(([label, st], i) => `${i ? '<span class="cn-sep"></span>' : ''}<span class="cn ${st}">${esc(label)}</span>`).join('')}</div>`;
    case 'bars': {
      const max = Math.max(...v.rows.map((r) => r[1]));
      return `<div class="vz-bars">${v.rows.map(([label, val, color]) => `
        <div class="vz-bar-row"><span>${esc(label)}</span>
        <span class="vz-bar-track"><span class="vz-bar-fill" style="width:${Math.round((val / max) * 100)}%;background:${color}"></span></span>
        <span class="bv">${val >= 10000 ? (val / 10000).toFixed(1) + '万' : val.toLocaleString()}</span></div>`).join('')}</div>`;
    }
    case 'table':
      return `<table class="vz-table"><thead><tr>${v.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${v.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'score': {
      const p = Math.min(100, v.total);
      return `<div class="vz-score">
        <div class="vz-score-total"><div class="n">${v.total}</div><div class="t">三维评分 / 100</div></div>
        <div class="vz-score-dims">${v.dims.map(([label, got, full]) => `
          <div class="vz-dim"><span>${esc(label)}</span>
          <span class="vz-bar-track"><span class="vz-bar-fill" style="width:${Math.round((got / full) * 100)}%;background:var(--chart-1)"></span></span>
          <span class="dv">${got} / ${full}</span></div>`).join('')}</div>
      </div>`;
    }
    case 'tree':
      return `<div class="vz-tree">${v.roots.map(([title, pct, kids]) => `
        <div class="tr-root"><span>${esc(title)}</span><span class="tr-pct">${esc(pct)}</span></div>
        <ul>${(kids || []).map(([label, st]) => `<li><span class="${st || ''}">${esc(label)}</span></li>`).join('')}</ul>`).join('')}</div>`;
    case 'topo': return agVizTopo();
    case 'lines': return agVizLines();
    case 'space': return agVizSpace(v);
    case 'branches': return agVizBranches(v);
    case 'trajscale': return agVizTraj(v);
    case 'lanes': return agVizLanes(v);
    case 'funnel': return agVizFunnel(v);
    default: return '';
  }
}

/* 异构环境拓扑 / 攻击面地图（SVG，确定性布局） */
function agVizTopo() {
  const N = (x, y, label, st) => `
    <circle cx="${x}" cy="${y}" r="5" class="st-${st}"/>
    <text x="${x + 9}" y="${y + 3}" class="node-txt">${label}</text>`;
  const G = (x, y, w, h, label) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" class="node-box" fill-opacity="0.35"/>
    <text x="${x + 8}" y="${y + 14}" class="node-sub">${label}</text>`;
  const E = (x1, y1, x2, y2, dash) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge"${dash ? ' stroke-dasharray="3 3"' : ''}/>`;
  return `
  <svg class="vz-svg" viewBox="0 0 560 250" role="img" aria-label="异构环境拓扑">
    ${G(16, 22, 168, 118, '政务云 VPC · K8s')}
    ${G(212, 22, 168, 118, '办公内网 · AD 域')}
    ${G(408, 22, 136, 158, '工控仿真')}
    ${E(70, 210, 62, 66)}${E(62, 66, 258, 64)}${E(258, 64, 300, 120)}${E(300, 120, 452, 96, true)}
    <path d="M52 202 L70 210 L52 218 L34 210 Z" fill="var(--destructive)"/>
    <text x="88" y="214" class="node-sub">Agent 攻击源（双平面隔离）</text>
    ${N(62, 62, 'API 网关', 'owned')}
    ${N(40, 100, 'K8s Pod', 'owned')}
    ${N(118, 100, '云数据库', 'active')}
    ${N(258, 60, 'AD 域控', 'owned')}
    ${N(230, 100, '终端组', 'active')}
    ${N(320, 100, '文件服务', 'idle')}
    ${N(300, 120, '运维跳板', 'owned')}
    ${N(452, 92, 'SCADA', 'idle')}
    ${N(430, 132, 'EMS', 'idle')}
    ${N(496, 132, '历史库', 'idle')}
    ${N(452, 166, '保护装置', 'idle')}
    <g class="node-sub">
      <circle cx="24" cy="240" r="4" class="st-owned"/><text x="33" y="243" class="node-sub">已攻陷</text>
      <circle cx="84" cy="240" r="4" class="st-active"/><text x="93" y="243" class="node-sub">攻击中</text>
      <circle cx="144" cy="240" r="4" class="st-idle"/><text x="153" y="243" class="node-sub">未到达</text>
      <text x="214" y="243" class="node-sub">虚线 = 未突破边界（工控段物理隔离生效）</text>
    </g>
  </svg>`;
}

/* 训练标量曲线（SVG 三线：reward / loss / KL×10） */
function agVizLines() {
  const series = [
    { name: 'raw_reward', color: 'var(--chart-1)', vals: [0.31, 0.35, 0.42, 0.5, 0.55, 0.6, 0.63, 0.66, 0.68, 0.7, 0.73, 0.76, 0.8, 0.84, 0.87] },
    { name: 'loss', color: 'var(--chart-4)', vals: [0.9, 0.7, 0.55, 0.45, 0.38, 0.33, 0.3, 0.28, 0.26, 0.25, 0.24, 0.23, 0.22, 0.22, 0.21] },
    { name: 'ppo_kl ×10', color: 'var(--chart-2)', vals: [0.12, 0.2, 0.24, 0.28, 0.3, 0.29, 0.28, 0.27, 0.28, 0.29, 0.3, 0.29, 0.28, 0.28, 0.27] },
  ];
  const X = (i) => 34 + (i / 14) * 500;
  const Y = (val) => 150 - val * 130;
  const path = (vals) => vals.map((val, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(val).toFixed(1)}`).join(' ');
  return `
  <svg class="vz-svg" viewBox="0 0 560 190" role="img" aria-label="训练曲线">
    ${[0, 0.25, 0.5, 0.75, 1].map((g) => `<line x1="34" y1="${Y(g)}" x2="534" y2="${Y(g)}" class="ln"/><text x="6" y="${Y(g) + 3}" class="axis-txt">${g.toFixed(2)}</text>`).join('')}
    ${['0', '15K', '30K', '45K', '60K'].map((t, i) => `<text x="${(34 + (i / 4) * 500) - 6}" y="168" class="axis-txt">${t}</text>`).join('')}
    ${series.map((s) => `<path d="${path(s.vals)}" class="ln-data" stroke="${s.color}"/>`).join('')}
    ${series.map((s, i) => `<g><rect x="${360 + i * 66}" y="8" width="8" height="8" fill="${s.color}"/><text x="${372 + i * 66}" y="15" class="axis-txt">${s.name}</text></g>`).join('')}
  </svg>`;
}

/* F1 · 任务空间生成（方法库 × 场景池 × 编排策略 → 组合 → 实例化） */
function agVizSpace(v) {
  const col = (title, num, lines) => `
    <div class="vz-sp-col">
      <div class="vz-sp-num">${num}</div>
      <div class="vz-sp-title">${title}</div>
      ${lines.map((l) => `<div class="vz-sp-line">${esc(l)}</div>`).join('')}
    </div>`;
  return `
  <div class="vz-space">
    <div class="vz-sp-formula">
      ${col('攻击方法库', '86 项', ['网络攻击 52', '智能体攻击 24', '物理 AI 10'])}
      <span class="vz-sp-x">×</span>
      ${col('异构场景池', '10.3K', ['网络靶场 5K', '智能体沙箱 3.3K', '物理 AI 仿真 2K'])}
      <span class="vz-sp-x">×</span>
      ${col('编排策略', '12 种', ['串联 5', '并联 4', '条件 3'])}
      <span class="vz-sp-eq">=</span>
      <div class="vz-sp-result">
        <div class="vz-sp-num">1,060 万+</div>
        <div class="vz-sp-title">组合任务空间</div>
        <div class="vz-sp-line">多维扩展达十亿级</div>
      </div>
    </div>
    <div class="vz-sp-pick">
      <span class="vz-sp-pick-label">实例化采样 128 个变体 · 按覆盖度 / 新颖度 / 约束匹配排序</span>
      <span class="vz-sp-pick-win">选中 ${esc(v.variant || '#T-0147')} · 覆盖度 0.91 / 新颖度 0.87</span>
    </div>
  </div>`;
}

/* F2 · 大规模分支推演（24 路并行 · 剪枝 · 收敛） · 快进时静态终态 */
let AG_VIZ_ANIM = true;
function agVizBranches(v) {
  const rows = v.rows.map((r, i) => {
    const [name, rate, st] = r;
    const cls = st === 'win' ? 'win' : st === 'warn' ? 'warn pruned' : 'pruned';
    const status = st === 'win' ? `收敛 · ${rate}%` : st === 'warn' ? '红线邻近' : '已剪枝';
    return `
    <div class="vz-branch ${cls}" style="--d:${(i * 0.11).toFixed(2)}s;--w:${rate}%">
      <span class="vz-br-name">${esc(name)}</span>
      <span class="vz-br-track"><span class="vz-br-fill"></span></span>
      <span class="vz-br-rate">${rate}%</span>
      <span class="vz-br-status">${status}</span>
    </div>`;
  }).join('');
  return `<div class="vz-branches${AG_VIZ_ANIM ? ' vz-anim' : ''}">${rows}</div>
  <div class="vz-br-note">${esc(v.note)}</div>`;
}

/* F3 · 长程轨迹标尺（步数分布 + 三个刻度数字） */
function agVizTraj(v) {
  const max = Math.max(...v.buckets.map((b) => b[1]));
  return `
  <div class="vz-traj">
    <div class="vz-traj-buckets">
      ${v.buckets.map(([label, pct]) => `
      <div class="vz-traj-b">
        <span class="vz-traj-bar" style="height:${Math.round((pct / max) * 44) + 6}px"></span>
        <span class="vz-traj-pct">${pct}%</span>
        <span class="vz-traj-label">${esc(label)}</span>
      </div>`).join('')}
    </div>
    <div class="vz-traj-scale">
      ${v.scale.map(([k, val]) => `<div class="vz-traj-s"><div class="n">${esc(val)}</div><div class="t">${esc(k)}</div></div>`).join('')}
    </div>
  </div>`;
}

/* V5 · 三类异构子任务并行泳道 */
function agVizLanes(v) {
  return `<div class="vz-lanes">${v.lanes.map(([title, stat, steps]) => `
    <div class="vz-lane">
      <div class="vz-lane-title">${esc(title)}</div>
      <div class="vz-lane-stat">${esc(stat)}</div>
      <div class="vz-lane-steps">${steps.map(([label, st]) => `<span class="vz-lane-step ${st}">${esc(label)}</span>`).join('')}</div>
    </div>`).join('')}</div>`;
}

/* V5 · 高价值任务筛选漏斗（宽度按 √ 值映射，避免悬殊数量级压扁） */
function agVizFunnel(v) {
  const vals = v.rows.map((r) => parseFloat(r[1]));
  const max = Math.sqrt(Math.max(...vals));
  return `<div class="vz-funnel">${v.rows.map(([label, val], i) => `
    <div class="vz-funnel-row">
      <span class="vz-funnel-label">${esc(label)}</span>
      <span class="vz-funnel-track"><span class="vz-funnel-fill" style="width:${Math.max(10, Math.round((Math.sqrt(vals[i]) / max) * 100))}%"></span></span>
      <span class="vz-funnel-val">${esc(val)}</span>
      ${i < v.rows.length - 1 ? '<span class="vz-funnel-arrow">↓</span>' : ''}
    </div>`).join('')}</div>`;
}

/* ══ 4. 挂载：路由联动 + 首次启动 ═══════════════════════════════ */
window.addEventListener('hashchange', () => {
  /* 在 app.js 的 router 之后执行：挂载召唤层 / 处理 arena 深链 */
  agMountSummon();
});

(function agBoot() {
  const r = agRoute();
  if (r === 'arena' && typeof renderArena === 'function') {
    /* 初次加载直接深链 arena 时，app.js router 的 typeof 守卫跳过了渲染 */
    if (!$('.arena')) renderArena();
  }
  agMountSummon();
})();
