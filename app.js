'use strict';

const { scenario, scenarios } = window.V14_DATA;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const state = {
  status: localStorage.getItem('v14-status') || 'draft',
  step: Number(localStorage.getItem('v14-step') || 2),
  sampleCount: Number(localStorage.getItem('v14-samples') || 20),
  priority: localStorage.getItem('v14-priority') || '高风险优先',
  plan: localStorage.getItem('v14-plan') || 'standard',
  intervention: localStorage.getItem('v14-intervention') || '',
  recovery: localStorage.getItem('v14-recovery') || '',
  selectedEvent: localStorage.getItem('v14-event') || 'EV-003',
  selectedAsset: localStorage.getItem('v14-asset') || 'DA-002',
  selectedView: localStorage.getItem('v14-view') || '能力',
  speed: Number(localStorage.getItem('v14-speed') || 1),
  playing: false,
  timer: null
};

const routes = {
  dashboard: { title: '领导驾驶舱', render: renderDashboard },
  dialogue: { title: 'AI 任务对话', render: renderDialogue },
  workbench: { title: 'Agent 执行工作台', render: renderWorkbench },
  data: { title: '数据生产中枢', render: renderDataHub },
  report: { title: '决策报告', render: renderReport }
};

function route() { return location.hash.replace(/^#\//, '') || 'dashboard'; }
function save() {
  localStorage.setItem('v14-status', state.status);
  localStorage.setItem('v14-step', state.step);
  localStorage.setItem('v14-samples', state.sampleCount);
  localStorage.setItem('v14-priority', state.priority);
  localStorage.setItem('v14-plan', state.plan);
  localStorage.setItem('v14-intervention', state.intervention);
  localStorage.setItem('v14-recovery', state.recovery);
  localStorage.setItem('v14-event', state.selectedEvent);
  localStorage.setItem('v14-asset', state.selectedAsset);
  localStorage.setItem('v14-view', state.selectedView);
  localStorage.setItem('v14-speed', state.speed);
}
function statusText() {
  const labels = { draft: '任务草稿', clarifying: '正在澄清', ready: '等待确认', confirmed: '已确认', planning: '正在规划', running: '仿真执行中', intervention_required: '等待领导干预', reviewing: '证据复核中', data_processing: '数据处理中', completed: '已完成', paused: '已暂停', replaying: '回放中' };
  return labels[state.status] || state.status;
}
function badge(label, type = 'neutral') { return `<span class="badge ${type}"><i></i>${esc(label)}</span>`; }
function mock() { return `<span class="mock">演示数据</span>`; }
function eventById(id) { return scenario.events.find((event) => event.event_id === id) || scenario.events[0]; }
function assetById(id) { return scenario.assets.find((asset) => asset.asset_id === id) || scenario.assets[0]; }
function visibleEvents() { return scenario.events.slice(0, clamp(state.step + 1, 1, scenario.events.length)); }
function eventTone(event) { return ({ PLAN: 'plan', QUESTION: 'question', ACTION: 'action', OBSERVATION: 'observation', REPLAN: 'replan', INTERVENTION: 'intervention', EVIDENCE: 'evidence', RESULT: 'result' }[event.type] || 'plan'); }
function showToast(text) { const node = $('#toast'); node.textContent = text; node.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => node.classList.remove('show'), 2600); }
function openModal(content) { $('#modal-root').innerHTML = `<div class="modal-shade" data-close></div><section class="modal" role="dialog" aria-modal="true"><button class="modal-x" data-close aria-label="关闭">×</button>${content}</section>`; $$('[data-close]').forEach((button) => button.addEventListener('click', closeModal)); }
function closeModal() { $('#modal-root').innerHTML = ''; }
function section(kicker, title, description = '', action = '') { return `<div class="section-head"><div><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ''}</div>${action}</div>`; }
function currentPlan() { return scenario.plan_options.find((option) => option.id === state.plan) || scenario.plan_options[1]; }

function render() {
  stopPlayback();
  const current = routes[route()] ? route() : 'dashboard';
  $('#page-name').textContent = routes[current].title;
  $$('.nav a').forEach((link) => link.classList.toggle('active', link.dataset.route === current));
  $('#run-badge').style.opacity = ['running', 'intervention_required', 'reviewing', 'data_processing'].includes(state.status) ? '1' : '.25';
  $('#view').innerHTML = routes[current].render();
  bindPage(current);
  $('#view').focus({ preventScroll: true });
}

function renderDashboard() {
  const progress = Math.round(visibleEvents().length / scenario.events.length * 100);
  return `<div class="page dashboard">
    <section class="hero">
      <div class="hero-copy"><div class="eyebrow-row"><span class="eyebrow">TODAY'S AI-NATIVE DEMONSTRATION</span>${mock()}</div><h1>让一次安全任务，变成领导看得懂的未来能力</h1><p>从一句业务目标开始，观察智能体如何规划、受控执行、被干预、形成证据与数据资产，最后给出投入建议。</p><div class="hero-actions"><a class="primary" href="#/dialogue">从一句目标开始 <span>→</span></a><button class="secondary" id="open-story">查看 20 分钟演示主线</button></div><div class="hero-questions"><span>是否值得投入？</span><span>优先建什么？</span><span>主要风险是什么？</span></div></div>
      <div class="hero-map"><div class="map-ring ring-a"></div><div class="map-ring ring-b"></div><div class="map-core"><b>AI</b><small>安全任务闭环</small></div><span class="map-chip c1">意图理解</span><span class="map-chip c2">受控执行</span><span class="map-chip c3">数据生产</span><span class="map-chip c4">决策结论</span></div>
    </section>
    <section class="scene-grid"><div class="scene-lead">${section("TODAY'S STORIES", "今天演示什么", "选择一个预置场景，或用自然语言描述目标。")}</div>${scenarios.map((item, index) => `<button class="scene-card ${index === 0 ? 'selected' : ''}" data-scene="${item.id}"><span class="scene-num">${item.accent}</span><div><b>${esc(item.title)}</b><small>${esc(item.subtitle)}</small></div><em>${esc(item.duration)}</em><i>→</i></button>`).join('')}</section>
    <section class="dashboard-grid">
      <article class="panel active-run">${section('IN PROGRESS', '正在执行', '当前场景的过程、风险和待办。', '<a href="#/workbench" class="text-link">进入工作台 →</a>')}<div class="run-summary"><div class="run-orb"><b>${progress}%</b><small>主线进度</small></div><div><div class="run-title"><b>${esc(scenario.title)}</b>${badge(statusText(), state.status === 'intervention_required' ? 'warn' : 'run')}</div><p>当前：${esc(eventById(state.selectedEvent).summary)}</p><div class="mini-bar"><i style="width:${progress}%"></i></div><small>已用 ${scenario.budget.used} / ${scenario.budget.limit} 分钟 · ${visibleEvents().length} 个事件 · ${state.intervention ? '已发生 1 次领导干预' : '等待关键决策'}</small></div></div></article>
      <article class="panel outcome-panel">${section('CAPABILITY SIGNAL', '能力收益', '演示对比，不代表真实训练或实际评测结论。')}<div class="signal-rows"><span><i class="dot blue"></i>任务理解 <b>+13</b></span><span><i class="dot cyan"></i>边界遵守 <b>+10</b></span><span><i class="dot violet"></i>失败恢复 <b>+11</b></span></div><button class="text-link report-link" data-go-report>查看能力与投入建议 →</button></article>
      <article class="panel asset-panel">${section('DATA OUTPUT', '数据产出', '所有数字由同一场景事实驱动。', '<a href="#/data" class="text-link">查看回流 →</a>')}<div class="asset-kpis"><span><b>38</b><small>轨迹事件</small></span><span><b>17</b><small>证据节点</small></span><span><b>6</b><small>待复核标注</small></span><span><b>3</b><small>可复用类型</small></span></div></article>
      <article class="panel decision-prompt">${section('DECISION PROMPT', '今天的三个管理问题', '把技术过程收敛为可讨论的下一步。')}<ol><li>候选 Agent 是否具备可控的自主执行能力？</li><li>高风险动作需要哪些策略闸门和工程底座？</li><li>哪些轨迹、证据和失败样本最值得先沉淀？</li></ol><a class="primary compact" href="#/report">查看一页决策摘要 <span>→</span></a></article>
    </section>
  </div>`;
}

function renderDialogue() {
  const plan = currentPlan();
  const turns = scenario.conversation;
  return `<div class="page dialogue-page">
    <div class="page-title">${section('INTENT TO TASK', 'AI 任务对话', '领导只需说明目标与顾虑；AI 负责收敛范围、建议方案与安全边界。')}</div>
    <div class="dialogue-layout">
      <section class="panel conversation-panel"><div class="assistant-head"><span>✦</span><div><b>安全任务助手</b><small>只展示可见解释与不确定性，不展示隐藏思维链。</small></div>${mock()}</div><div class="chat-list"><div class="chat ai"><i>AI</i><p>告诉我你想验证哪类 Agent、最担心什么风险，以及希望在多长时间内看到结论。</p></div>${turns.map((turn) => `<div class="chat ${turn.role === 'leader' ? 'leader' : 'ai'}"><i>${turn.role === 'leader' ? '您' : 'AI'}</i><p>${esc(turn.message)}</p></div>`).join('')}<div class="chat ai latest"><i>AI</i><p>我已形成一张可确认任务卡。您可以继续调整风险优先级、样本数或方案档位，所有影响都会同步更新。</p></div></div><div class="suggestion-row"><button data-prompt="priority">高风险优先</button><button data-prompt="samples">调整样本规模</button><button data-prompt="plan">比较三档方案</button></div><div class="fake-input"><span>继续描述目标或修改约束…</span><button id="generate-intent">✦ 生成建议</button></div></section>
      <section class="panel task-card"><div class="card-top"><div><div class="kicker">TASK SNAPSHOT · revision ${scenario.revision}</div><h2>可确认任务卡</h2></div>${badge(state.status === 'draft' ? '等待确认' : statusText(), 'run')}</div><div class="task-objective"><small>一句话目标</small><b>${esc(scenario.objective)}</b></div><div class="task-rows"><span><small>评测对象</small><b>${esc(scenario.subject)}</b></span><span><small>场景范围</small><b>${esc(scenario.scope)}</b></span></div><div class="task-controls"><label>风险优先级<select id="priority-select"><option ${state.priority === '高风险优先' ? 'selected' : ''}>高风险优先</option><option ${state.priority === '覆盖优先' ? 'selected' : ''}>覆盖优先</option><option ${state.priority === '证据优先' ? 'selected' : ''}>证据优先</option></select></label><label>样本规模<div class="number-control"><button id="sample-down">−</button><b id="sample-value">${state.sampleCount}</b><button id="sample-up">＋</button></div></label></div>
        <div class="plan-options">${scenario.plan_options.map((option) => `<button class="plan-option ${state.plan === option.id ? 'chosen' : ''}" data-plan="${option.id}"><span>${option.recommended ? '推荐' : option.name.slice(0, 2)}</span><div><b>${esc(option.name)}</b><small>${esc(option.duration)} · ${esc(option.coverage)}</small></div><i>${option.recommended ? '✓' : ''}</i></button>`).join('')}</div>
        <div class="plan-impact"><b>当前方案影响</b><span>${esc(plan.name)}：${esc(plan.duration)}、${esc(plan.coverage)}；${esc(plan.risk)}。</span></div>
        <div class="policy-list"><div><i>✓</i><span><b>隔离靶场</b><small>${esc(scenario.policy.environment)}</small></span></div><div><i>✓</i><span><b>网络边界</b><small>${esc(scenario.policy.network)}</small></span></div><div><i>✓</i><span><b>停止条件</b><small>${esc(scenario.policy.stop)}</small></span></div></div>
        <div class="confirm-bar"><div><small>预计执行</small><b>${state.sampleCount} 个样本 · ${esc(plan.duration)} · 不超过 ${scenario.budget.limit} 分钟</b></div><button class="primary" id="confirm-task">确认并开始演示 <span>→</span></button></div>
      </section>
    </div>
  </div>`;
}
function renderWorkbench() {
  const events = visibleEvents();
  const selected = eventById(state.selectedEvent);
  const progress = Math.round(events.length / scenario.events.length * 100);
  const interventionPending = !state.intervention && state.step >= 3;
  const recoveryPending = state.intervention && !state.recovery && state.step >= 7;
  return `<div class="page workbench-page">
    <section class="workbench-top panel"><div><div class="eyebrow-row"><span class="eyebrow">AGENTIC EXECUTION</span>${mock()}</div><div class="workbench-title"><h1>${esc(scenario.title)}</h1>${badge(interventionPending ? '等待领导干预' : statusText(), interventionPending ? 'warn' : 'run')}</div><p>${esc(scenario.objective)}</p></div><div class="run-controls"><button class="secondary" id="play-run">${state.playing ? '❙❙ 暂停' : '▶ 播放'}</button><button class="secondary" id="step-run">单步推进</button><button class="quiet-btn" id="speed-run">${state.speed}× 速度</button><button class="danger-btn" id="stop-run">结束演示</button></div><div class="run-line"><span>任务进度 <b>${progress}%</b></span><i><em style="width:${progress}%"></em></i><span>已用 ${scenario.budget.used} / ${scenario.budget.limit} 分钟</span><span>风险：<b class="risk-text">中高</b></span><span>事件：${events.length} / ${scenario.events.length}</span></div></section>
    <section class="workbench-grid">
      <article class="panel plan-panel">${section('STAGE PLAN', '阶段计划', '点击阶段查看输入、产出和停止条件。')}<div class="stage-list">${scenario.plan.map((node, index) => `<button class="stage ${node.status}" data-stage="${node.id}"><span>${String(index + 1).padStart(2, '0')}</span><div><b>${esc(node.stage)}</b><small>${esc(node.goal)}</small></div><i>${node.status === 'complete' ? '✓' : node.status === 'current' ? '●' : '○'}</i></button>`).join('')}</div><div class="plan-note"><b>当前阶段</b><p>${esc(selected.explanation)}</p></div></article>
      <article class="panel canvas-panel">${section('TRAJECTORY CANVAS', '轨迹画布', '节点表示计划、动作、观察、证据、决策与结果；边表示可解释的因果关系。', '<button class="text-link" id="focus-current">聚焦当前节点</button>')}<div class="canvas" id="trajectory-canvas"><div class="canvas-grid"></div>${events.map((event, index) => `<button class="canvas-node ${eventTone(event)} ${event.event_id === selected.event_id ? 'selected' : ''}" data-event="${event.event_id}" style="--x:${8 + (index % 4) * 24}%;--y:${10 + Math.floor(index / 4) * 29}%"><span>${event.type.slice(0, 2)}</span><b>${esc(event.event_id)}</b><small>${esc(event.summary.slice(0, 18))}</small></button>`).join('')}<svg class="canvas-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${events.slice(1).map((_, i) => `<line x1="${17 + (i % 4) * 24}" y1="${20 + Math.floor(i / 4) * 29}" x2="${8 + ((i + 1) % 4) * 24}" y2="${20 + Math.floor((i + 1) / 4) * 29}" />`).join('')}</svg></div><div class="canvas-legend"><span><i class="legend plan"></i>计划</span><span><i class="legend action"></i>执行</span><span><i class="legend observation"></i>观察</span><span><i class="legend question"></i>干预</span><span><i class="legend evidence"></i>证据</span></div></article>
      <article class="panel event-panel">${section('EVENT TIMELINE', '事件时间线', '每个事件都可回指计划节点、证据和数字孪生节点。')}<div class="event-filter"><button class="active" data-filter="all">全部</button><button data-filter="interaction">交互</button><button data-filter="execution">执行</button><button data-filter="risk">风险</button></div><div class="event-list">${events.map((event) => `<button class="event-row ${event.event_id === selected.event_id ? 'selected' : ''}" data-event="${event.event_id}" data-kind="${event.type}"><time>${event.time}</time><span class="event-type ${eventTone(event)}">${event.type}</span><div><b>${esc(event.summary)}</b><small>${esc(event.tool)} · ${esc(event.evidence_refs.join(' / '))}</small></div></button>`).join('')}</div></article>
      <article class="panel explain-panel">${section('EXPLANATION', '解释摘要', '只呈现用户可见的依据与不确定性。')}<div class="explain-type ${eventTone(selected)}">${selected.type}</div><h3>${esc(selected.summary)}</h3><p>${esc(selected.explanation)}</p><div class="explain-meta"><span><small>工具</small><b>${esc(selected.tool)}</b></span><span><small>关联证据</small><b>${esc(selected.evidence_refs.join(' / '))}</b></span><span><small>孪生节点</small><button class="inline-link" data-twin="${selected.twin_node_id}">${esc(selected.twin_node_id)} →</button></span></div><div class="uncertainty"><b>不确定性声明</b><p>${selected.type === 'OBSERVATION' || selected.type === 'QUESTION' ? '当前信息不足以支持扩大验证范围；需要策略选择或交叉证据。' : '该说明基于场景包中的可见事件和证据摘要，不代表真实系统运行。'}</p></div></article>
      <article class="panel twin-panel">${section('DIGITAL TWIN', '数字孪生靶场', '节点状态、路径、资源与证据随同一场景事件联动。')}<div class="twin-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M17 46 L37 22 L60 46 L84 23 M60 46 L84 72"/><path class="hot-path" d="M37 22 L60 46 L84 72"/></svg>${scenario.twin_nodes.map((node, index) => `<button class="twin-node ${node.state} ${node.twin_node_id === selected.twin_node_id ? 'selected' : ''}" data-twin="${node.twin_node_id}" style="--tx:${[7,30,52,76,51,77][index]}%;--ty:${[39,15,39,16,64,67][index]}%"><span>${node.type.slice(0, 2).toUpperCase()}</span><b>${esc(node.name)}</b><small>${esc(node.metrics)}</small></button>`).join('')}</div><div class="twin-facts"><span><b>靶场</b> K8s Twin v0.9</span><span><b>网络</b> 隔离</span><span><b>路径</b> 1 条受控验证</span></div></article>
    </section>
    ${interventionPending ? renderIntervention('policy') : ''}${recoveryPending ? renderIntervention('recovery') : ''}
  </div>`;
}

function renderIntervention(kind) {
  const policy = kind === 'policy';
  const title = policy ? '策略风险命中：下一步可能扩大网络访问范围' : '证据冲突：工具回显与策略快照不一致';
  const body = policy ? '演示环境已隔离。为保持最小权限，系统建议继续使用隔离验证。未作出选择前，不会继续高风险动作。' : '系统已保留失败事件与原始证据。请选择如何恢复，不会将回放状态伪装为实时成功。';
  const choices = policy ? [
    ['isolate', '保持隔离验证', '推荐 · 在当前孪生环境中执行最小化验证'],
    ['static', '使用静态证据替代', '停止执行分支，仅基于证据形成限定结论'],
    ['stop', '终止该分支', '保留当前证据与风险事件，直接进入总结']
  ] : [
    ['retry', '重试当前工具', '保留失败事件，重新运行同一验证'],
    ['alternate', '替代工具验证', '推荐 · 使用静态清单与第二判定器交叉验证'],
    ['review', '转人工复核', '暂停自动执行，标记为待复核样本']
  ];
  return `<section class="intervention-banner panel"><div class="intervention-head"><span class="alarm">!</span><div><div class="kicker">${policy ? 'HUMAN GOVERNANCE GATE' : 'TRUSTED RECOVERY'}</div><h2>${title}</h2><p>${body}</p></div>${badge('需要您决定', 'warn')}</div><div class="choice-grid">${choices.map(([id, name, desc], index) => `<button class="choice ${index === 0 && policy || index === 1 && !policy ? 'recommended' : ''}" data-choice="${id}" data-kind="${kind}"><span>${index === 0 && policy || index === 1 && !policy ? '建议' : '选项'}</span><b>${name}</b><small>${desc}</small></button>`).join('')}</div></section>`;
}

function renderDataHub() {
  const selected = assetById(state.selectedAsset);
  const stages = [
    ['01', '交互采集', '领导目标、AI 问题、选择与任务卡', '任务轨迹 / 偏好数据'],
    ['02', '执行采集', '动作、工具调用、环境事件与孪生状态', '原始轨迹 / 工具调用'],
    ['03', '证据规整', '去重、脱敏、哈希与结论关联', '可核验运行记录'],
    ['04', '智能预标注', '阶段、动作、风险与质量标签建议', '候选标注 / 待复核项'],
    ['05', '数据封存', '质量检查、版本化、用途标记与拆分', 'SFT / 偏好 / 评测数据包'],
    ['06', '评测回灌', '比较基线、归因提升与失败模式', '能力对比 / 补数建议']
  ];
  return `<div class="page data-page">
    <div class="page-title">${section('EXECUTION BECOMES DATA', '数据生产中枢', '一次任务不仅给出结论，也持续形成可治理、可标注、可训练、可评测的数据资产。')}</div>
    <section class="flow-panel panel"><div class="flow-top"><div><div class="eyebrow-row"><span class="eyebrow">SIX-STAGE FEEDBACK LOOP</span>${mock()}</div><h2>从一次 Run 到下一轮能力迭代</h2></div><span class="flow-note">${scenario.scenario_id} · 统一场景事实</span></div><div class="data-flow">${stages.map(([no, name, input, output], index) => `<button class="flow-step ${index <= 4 ? 'active' : ''}" data-flow="${index}"><span>${no}</span><div><b>${name}</b><small>${input}</small></div><i>→</i><em>${output}</em></button>`).join('')}</div></section>
    <section class="data-kpi-grid"><div class="kpi-card"><span>原始轨迹</span><b>38</b><small>可见事件 · 100% 关联 run_id</small></div><div class="kpi-card"><span>证据节点</span><b>17</b><small>97% 完整 · 1 项冲突已保留</small></div><div class="kpi-card"><span>待复核标注</span><b>6</b><small>自动预标注 · 等待确认</small></div><div class="kpi-card"><span>数据包</span><b>3</b><small>轨迹 / 偏好 / 评测样本</small></div></section>
    <section class="data-main-grid"><article class="panel lineage-panel">${section('DATA LINEAGE', '数据血缘', '任务 → Run → 事件 → 证据 → 标注 → 数据包 → 模型与评测。')}<div class="lineage-graph"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M10 50 H25 M31 50 H42 M48 50 H58 M64 50 H73 M79 50 H89"/></svg>${[['任务','SCN-01'],['Run','RUN-20260916'],['事件','38'],['证据','17'],['标注','6'],['数据包','3'],['评测','候选']].map((item, index) => `<button class="lineage-node ${index === 3 ? 'selected' : ''}" data-asset-link="${index < 2 ? 'DA-001' : index < 4 ? 'DA-002' : index < 5 ? 'DA-003' : 'DA-004'}" style="--lx:${4 + index * 14}%"><b>${item[0]}</b><small>${item[1]}</small></button>`).join('')}</div><div class="lineage-hint">点击节点查看来源、状态、数量、质量和用途；不展示复杂后台管理操作。</div></article><article class="panel asset-detail">${section('SELECTED ASSET', selected.type, '来源、状态、版本、质量与用途均可追溯。')}<div class="asset-detail-id">${selected.asset_id} · ${mock()}</div><div class="asset-detail-grid"><span><small>来源事件</small><b>${selected.source_events.join(' / ')}</b></span><span><small>状态</small><b>${selected.status}</b></span><span><small>质量</small><b>${selected.quality}</b></span><span><small>版本</small><b>${selected.version}</b></span><span><small>数量</small><b>${selected.count}</b></span><span><small>用途</small><b>${selected.usage}</b></span></div><button class="secondary" id="open-asset-proof">查看上游取证记录</button></article></section>
    <section class="panel trajectory-library">${section('TRAJECTORY LIBRARY', '轨迹库', '当前演示任务与 3 条典型历史样例；每条记录都标注来源。')}<div class="trajectory-list"><button class="trajectory-row selected"><span class="source-live">当前</span><div><b>云原生自主运维 Agent 风险评估</b><small>SCN-01 · ${visibleEvents().length} 事件 · ${state.intervention ? '已干预' : '待干预'} · 17 证据节点</small></div><em>仿真执行</em></button><button class="trajectory-row"><span class="source-history">样例</span><div><b>Web 业务 Agent 工具滥用恢复</b><small>SCN-02 · 2026-09-15 · 失败轨迹与替代工具验证</small></div><em>历史样例</em></button><button class="trajectory-row"><span class="source-history">样例</span><div><b>代码修复 Agent 安全回归失败</b><small>SCN-03 · 2026-09-14 · 补丁对与失败原因标签</small></div><em>历史样例</em></button></div></section>
  </div>`;
}
function renderReport() {
  const report = scenario.report;
  const views = {
    '能力': { title: '能力表现：基础自主执行已具备，但高风险分支仍需约束', lead: '候选 Agent 在任务理解、受控执行、证据规整和失败恢复上优于场景基线；边界遵守仍需要策略闸门保障。', cards: [['任务理解', '72', '+13'], ['受控执行', '64', '+13'], ['边界遵守', '58', '+10'], ['证据规整', '69', '+15']] },
    '风险': { title: '风险与边界：把不可自动放行的部分明确留给人', lead: '本次演示验证了策略闸门、证据冲突和失败恢复的可解释闭环。所有高风险动作均限定在数字孪生靶场。', cards: [['策略闸门', '1', '已触发'], ['证据冲突', '1', '已保留'], ['未授权外联', '0', '未发生'], ['人工干预', state.intervention ? '1' : '0', '已记录']] },
    '投入': { title: '投入建议：优先夯实可审计轨迹、环境标准化与失败数据闭环', lead: '领导可据此判断是否投入，以及下一阶段先建设什么，而不是把演示数字当作生产测评结论。', cards: [['可审计轨迹', 'P0', '先建设'], ['环境标准化', 'P0', '先建设'], ['失败数据闭环', 'P1', '持续沉淀'], ['真实接入调度', '后续', '不在本期']] }
  };
  const selected = views[state.selectedView] || views['能力'];
  return `<div class="page report-page">
    <section class="report-hero panel"><div><div class="eyebrow-row"><span class="eyebrow">LEADERSHIP DECISION SUMMARY</span>${mock()}</div><h1>${selected.title}</h1><p>${selected.lead}</p><div class="report-meta"><span>${scenario.scenario_id}</span><span>任务快照 revision ${scenario.revision}</span><span>仿真执行</span><span>证据完整率 97%</span></div></div><div class="decision-actions"><button class="secondary" id="copy-summary">复制摘要</button><button class="primary" id="export-summary">导出 JSON</button></div></section>
    <section class="view-switch"><span>切换管理视角</span>${Object.keys(views).map((key) => `<button class="${state.selectedView === key ? 'active' : ''}" data-report-view="${key}">${key}</button>`).join('')}</section>
    <section class="report-kpis">${selected.cards.map((card, index) => `<article class="kpi-card report-kpi"><small>${card[0]}</small><b>${card[1]}</b><span class="${index === 2 ? 'risk-text' : ''}">${card[2]}</span></article>`).join('')}</section>
    <section class="report-grid"><article class="panel radar-panel">${section('CAPABILITY COMPARISON', '能力与基线对比', '演示对比，用于说明数据回灌和工程底座的价值，不代表真实训练收益。')}<div class="radar-wrap"><svg viewBox="0 0 360 300" aria-label="能力雷达图"><g transform="translate(180 145)"><polygon points="0,-105 100,-32 62,85 -62,85 -100,-32" class="radar-grid"/><polygon points="0,-78 74,-24 46,63 -46,63 -74,-24" class="radar-grid"/><polygon points="0,-52 49,-16 31,42 -31,42 -49,-16" class="radar-grid"/><polygon points="0,-105 100,-32 62,85 -62,85 -100,-32" class="radar-axis"/><line x1="0" y1="0" x2="0" y2="-105"/><line x1="0" y1="0" x2="100" y2="-32"/><line x1="0" y1="0" x2="62" y2="85"/><line x1="0" y1="0" x2="-62" y2="85"/><line x1="0" y1="0" x2="-100" y2="-32"/><polygon points="0,-72 61,-20 36,50 -43,59 -61,-20" class="radar-candidate"/><polygon points="0,-59 48,-15 30,39 -34,46 -47,-15" class="radar-base"/></g><text x="180" y="25">任务理解</text><text x="300" y="113">受控执行</text><text x="257" y="258">边界遵守</text><text x="77" y="258">证据规整</text><text x="35" y="113">失败恢复</text></svg></div><div class="radar-legend"><span><i class="candidate"></i>候选 Agent</span><span><i class="baseline"></i>场景基线</span></div></article>
      <article class="panel conclusion-panel">${section('ONE-PAGE CONCLUSION', '一句话结论', '所有结论可回指任务、事件、证据和数据资产。')}<blockquote>${esc(report.conclusion)}</blockquote><div class="conclusion-block"><b>主要风险</b>${report.risks.map((item) => `<span><i>!</i>${esc(item)}</span>`).join('')}</div><div class="conclusion-block"><b>过程可信度</b><span><i>✓</i>${esc(report.confidence)}</span><span><i>✓</i>${visibleEvents().length} 个可见事件均关联计划或证据</span><span><i>✓</i>${state.intervention ? '领导干预已写入任务轨迹' : '关键风险点仍等待领导选择'}</span></div></article></section>
    <section class="report-grid lower"><article class="panel output-panel">${section('DATA OUTPUT', '本次数据产出', '执行结果已进入数据生产主链。', '<a class="text-link" href="#/data">查看数据中枢 →</a>')}<div class="output-list">${scenario.assets.map((asset) => `<button data-report-asset="${asset.asset_id}"><span>${asset.asset_id}</span><div><b>${asset.type}</b><small>${asset.count} · ${asset.usage}</small></div><em>${asset.status}</em></button>`).join('')}</div></article><article class="panel next-panel">${section('NEXT INVESTMENT', '下一阶段建议', '优先建设平台未来能力的可复用底座。')}<ol>${report.recommendations.map((item, index) => `<li><span>0${index + 1}</span>${esc(item)}</li>`).join('')}</ol><div class="investment-foot"><small>当前投入消耗</small><b>${report.cost}</b><span>仅为场景演示测算</span></div></article></section>
  </div>`;
}

function bindPage(current) {
  if (current === 'dashboard') bindDashboard();
  if (current === 'dialogue') bindDialogue();
  if (current === 'workbench') bindWorkbench();
  if (current === 'data') bindData();
  if (current === 'report') bindReport();
}
function bindDashboard() {
  $('#open-story').addEventListener('click', () => openStoryModal());
  $$('.scene-card').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.scene !== 'SCN-01') return showToast('该场景为演示预案；主线已固定为 SCN-01');
    location.hash = '#/dialogue';
  }));
  $('[data-go-report]')?.addEventListener('click', () => location.hash = '#/report');
}
function bindDialogue() {
  $('#priority-select').addEventListener('change', (event) => { state.priority = event.target.value; save(); render(); });
  $('#sample-down').addEventListener('click', () => { state.sampleCount = clamp(state.sampleCount - 5, 5, 40); save(); render(); });
  $('#sample-up').addEventListener('click', () => { state.sampleCount = clamp(state.sampleCount + 5, 5, 40); save(); render(); });
  $$('[data-plan]').forEach((button) => button.addEventListener('click', () => { state.plan = button.dataset.plan; save(); render(); }));
  $('#generate-intent').addEventListener('click', () => showToast('AI 已更新意图摘要与任务卡建议'));
  $$('[data-prompt]').forEach((button) => button.addEventListener('click', () => showToast(`已聚焦：${button.textContent}`)));
  $('#confirm-task').addEventListener('click', () => { state.status = 'running'; state.step = Math.max(state.step, 2); save(); showToast('任务快照已封存：revision 1'); setTimeout(() => location.hash = '#/workbench', 260); });
}
function bindWorkbench() {
  $$('.canvas-node,[data-event]').forEach((button) => button.addEventListener('click', () => { if (!button.dataset.event) return; state.selectedEvent = button.dataset.event; save(); render(); }));
  $('#play-run').addEventListener('click', togglePlayback);
  $('#step-run').addEventListener('click', () => advance(1));
  $('#speed-run').addEventListener('click', () => { state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1; save(); render(); });
  $('#stop-run').addEventListener('click', () => { state.status = 'completed'; state.step = scenario.events.length - 1; save(); render(); showToast('演示已结束，保留所有事件与证据'); });
  $('#focus-current').addEventListener('click', () => { state.selectedEvent = visibleEvents().at(-1).event_id; save(); render(); });
  $$('.choice').forEach((button) => button.addEventListener('click', () => handleChoice(button.dataset.kind, button.dataset.choice)));
  $$('[data-twin]').forEach((button) => button.addEventListener('click', () => openTwinModal(button.dataset.twin)));
  $$('.event-filter button').forEach((button) => button.addEventListener('click', () => filterEvents(button.dataset.filter, button)));
}
function bindData() {
  $$('[data-asset-link]').forEach((button) => button.addEventListener('click', () => { state.selectedAsset = button.dataset.assetLink; save(); render(); }));
  $('#open-asset-proof').addEventListener('click', () => openProofModal(assetById(state.selectedAsset)));
  $$('.flow-step').forEach((button) => button.addEventListener('click', () => showToast(`已展开第 ${Number(button.dataset.flow) + 1} 阶段的数据输入与输出`)));
}
function bindReport() {
  $$('[data-report-view]').forEach((button) => button.addEventListener('click', () => { state.selectedView = button.dataset.reportView; save(); render(); }));
  $$('.output-list button').forEach((button) => button.addEventListener('click', () => { state.selectedAsset = button.dataset.reportAsset; save(); location.hash = '#/data'; }));
  $('#copy-summary').addEventListener('click', async () => { const text = `${scenario.report.conclusion}\n主要风险：${scenario.report.risks.join('；')}\n下一步：${scenario.report.recommendations.join('；')}\n注：演示数据 / 仿真执行。`; try { await navigator.clipboard.writeText(text); showToast('决策摘要已复制'); } catch { showToast('当前浏览器未开放剪贴板权限'); } });
  $('#export-summary').addEventListener('click', exportSummary);
}
function handleChoice(kind, choice) {
  if (kind === 'policy') { state.intervention = choice; state.status = 'running'; state.step = Math.max(state.step, 6); state.selectedEvent = 'EV-006'; }
  if (kind === 'recovery') { state.recovery = choice; state.status = 'reviewing'; state.step = Math.max(state.step, 9); state.selectedEvent = choice === 'alternate' ? 'EV-009' : 'EV-008'; }
  save(); render(); showToast(kind === 'policy' ? '领导选择已记录，计划已生成新分支' : '失败记录已保留，恢复方案已写入重规划');
}
function advance(amount) {
  if (!state.intervention && state.step + amount >= 3) { state.step = 3; state.status = 'intervention_required'; state.selectedEvent = 'EV-004'; save(); render(); showToast('策略风险命中：请先选择干预方案'); return; }
  if (state.intervention && !state.recovery && state.step + amount >= 7) { state.step = 7; state.status = 'reviewing'; state.selectedEvent = 'EV-008'; save(); render(); showToast('证据冲突：请先选择恢复方案'); return; }
  state.step = clamp(state.step + amount, 0, scenario.events.length - 1);
  state.selectedEvent = visibleEvents().at(-1).event_id;
  state.status = state.step >= scenario.events.length - 1 ? 'completed' : 'running';
  save(); render();
}
function togglePlayback() { state.playing = !state.playing; render(); if (state.playing) startPlayback(); }
function startPlayback() { stopPlayback(false); state.timer = setInterval(() => { if (route() !== 'workbench') return stopPlayback(); if (!state.intervention && state.step >= 3 || state.intervention && !state.recovery && state.step >= 7 || state.step >= scenario.events.length - 1) { state.playing = false; render(); return; } advance(1); }, 1300 / state.speed); }
function stopPlayback(clear = true) { if (state.timer) clearInterval(state.timer); state.timer = null; if (clear) state.playing = false; }
function filterEvents(filter, active) { $$('.event-filter button').forEach((button) => button.classList.toggle('active', button === active)); $$('.event-row').forEach((row) => { const kind = row.dataset.kind; const matched = filter === 'all' || filter === 'interaction' && ['QUESTION', 'INTERVENTION'].includes(kind) || filter === 'execution' && ['PLAN', 'ACTION', 'OBSERVATION', 'REPLAN'].includes(kind) || filter === 'risk' && ['QUESTION', 'OBSERVATION', 'REPLAN'].includes(kind); row.hidden = !matched; }); }
function openTwinModal(id) { const node = scenario.twin_nodes.find((item) => item.twin_node_id === id); if (!node) return; openModal(`<div class="modal-head"><div><div class="kicker">DIGITAL TWIN NODE</div><h2>${esc(node.name)}</h2></div>${badge(node.state === 'risk' ? '风险节点' : node.state, node.state === 'risk' ? 'warn' : 'run')}</div><div class="modal-grid"><span><small>节点 ID</small><b>${node.twin_node_id}</b></span><span><small>节点类型</small><b>${node.type}</b></span><span><small>当前指标</small><b>${node.metrics}</b></span><span><small>关联风险</small><b>${node.risk}</b></span></div><div class="modal-list"><b>关联事件</b>${node.related_events.map((id) => `<button data-modal-event="${id}">${id} · ${esc(eventById(id).summary)} →</button>`).join('')}</div>`); $$('[data-modal-event]').forEach((button) => button.addEventListener('click', () => { state.selectedEvent = button.dataset.modalEvent; save(); closeModal(); render(); })); }
function openProofModal(asset) { openModal(`<div class="modal-head"><div><div class="kicker">TRACEABLE PROOF</div><h2>${esc(asset.type)}</h2></div>${mock()}</div><div class="modal-grid"><span><small>资产 ID</small><b>${asset.asset_id}</b></span><span><small>版本</small><b>${asset.version}</b></span><span><small>质量</small><b>${asset.quality}</b></span><span><small>用途</small><b>${asset.usage}</b></span></div><div class="modal-list"><b>来源事件</b>${asset.source_events.map((id) => `<button data-modal-event="${id}">${id} · ${esc(eventById(id).summary)} →</button>`).join('')}</div>`); $$('[data-modal-event]').forEach((button) => button.addEventListener('click', () => { state.selectedEvent = button.dataset.modalEvent; save(); closeModal(); location.hash = '#/workbench'; })); }
function openStoryModal() { openModal(`<div class="modal-head"><div><div class="kicker">20-MINUTE STORYLINE</div><h2>标准领导演示主线</h2></div>${mock()}</div><ol class="storyline"><li><b>0–2 分钟</b><span>从驾驶舱选择云原生自主运维 Agent 风险评估。</span></li><li><b>2–5 分钟</b><span>完成 3 轮澄清，选择标准验证并确认安全边界。</span></li><li><b>5–10 分钟</b><span>展示计划、轨迹画布与数字孪生靶场。</span></li><li><b>10–12 分钟</b><span>风险闸门触发，领导选择保持隔离验证。</span></li><li><b>12–15 分钟</b><span>证据冲突后选择替代工具，观看重规划。</span></li><li><b>15–18 分钟</b><span>查看轨迹、证据、标注、数据包与评测回灌。</span></li><li><b>18–20 分钟</b><span>用一页报告回答能力、风险与投入建议。</span></li></ol><div class="modal-actions"><button class="primary" data-close>开始演示</button></div>`); }
function exportSummary() { const payload = { mock: true, mode: '仿真执行', scenario_id: scenario.scenario_id, task_snapshot: { objective: scenario.objective, samples: state.sampleCount, priority: state.priority, plan: currentPlan().name, revision: scenario.revision }, events: visibleEvents(), assets: scenario.assets, decision: scenario.report }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'SCN-01-leadership-demo-summary.json'; link.click(); URL.revokeObjectURL(url); showToast('演示决策摘要已导出'); }

function openScenarioPicker() { openModal(`<div class="modal-head"><div><div class="kicker">PRESET SCENARIOS</div><h2>选择预置故事</h2></div>${mock()}</div><div class="scenario-modal-list">${scenarios.map((item, index) => `<button data-modal-scene="${item.id}" class="${index === 0 ? 'selected' : ''}"><span>${item.accent}</span><div><b>${item.title}</b><small>${item.subtitle} · ${item.duration}</small></div><i>${index === 0 ? '当前' : '预案'}</i></button>`).join('')}</div>`); $$('[data-modal-scene]').forEach((button) => button.addEventListener('click', () => { if (button.dataset.modalScene !== 'SCN-01') { showToast('该场景为预置预案；当前交互主线固定为 SCN-01'); return; } closeModal(); location.hash = '#/dialogue'; })); }
function resetDemo() { stopPlayback(); Object.assign(state, { status: 'draft', step: 2, sampleCount: 20, priority: '高风险优先', plan: 'standard', intervention: '', recovery: '', selectedEvent: 'EV-003', selectedAsset: 'DA-002', selectedView: '能力', speed: 1, playing: false }); ['v14-status', 'v14-step', 'v14-samples', 'v14-priority', 'v14-plan', 'v14-intervention', 'v14-recovery', 'v14-event', 'v14-asset', 'v14-view', 'v14-speed'].forEach((key) => localStorage.removeItem(key)); render(); showToast('SCN-01 已恢复为初始演示状态'); }

$('#scenario-switch').addEventListener('click', openScenarioPicker);
$('#reset-demo').addEventListener('click', resetDemo);
$('#menu-btn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#theme-btn').addEventListener('click', () => { document.documentElement.classList.toggle('dark'); localStorage.setItem('v14-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); $('#theme-btn').textContent = document.documentElement.classList.contains('dark') ? '◐' : '◑'; });
if (localStorage.getItem('v14-theme') === 'light') document.documentElement.classList.remove('dark');
window.addEventListener('hashchange', render);
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
if (!location.hash) location.hash = '#/dashboard'; else render();
