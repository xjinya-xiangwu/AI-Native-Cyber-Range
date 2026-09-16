(() => {
  'use strict';

  const { scenarios, presets, defaultScenarioId } = window.DEMO_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const saved = JSON.parse(localStorage.getItem('frontier-demo-state') || '{}');
  const stateVersion = 5;

  const initialState = {
    selectedScenarioId: defaultScenarioId,
    prompt: scenarios[defaultScenarioId].prompt,
    mode: 'Auto', phase: 'home', creationIndex: -1, eventIndex: -1,
    workspaceTab: 'canvas', selectedEvent: 'EV-001',
    sampleCount: scenarios[defaultScenarioId].samples,
    duration: scenarios[defaultScenarioId].duration,
    speed: 1, assetsOpen: false, playing: false, operatorInterventions: [], selectedTwinAsset: null, assetDetail: null
  };
  const state = saved.stateVersion === stateVersion && saved.selectedScenarioId
    ? { ...initialState, ...saved, playing: false, assetsOpen: false }
    : { ...initialState, stateVersion };
  if (!scenarios[state.selectedScenarioId]) Object.assign(state, initialState);
  if (!['canvas', 'data'].includes(state.workspaceTab)) state.workspaceTab = 'canvas';
  state.operatorInterventions ||= [];
  let timer = null;

  function scenario() { return scenarios[state.selectedScenarioId]; }
  function taskId() { return `TASK-${scenario().id}-01`; }
  function route() {
    const value = location.hash.replace(/^#\//, '');
    if (['dialogue', 'workbench', 'data', 'report'].includes(value)) return 'studio';
    return ['home', 'studio'].includes(value) ? value : 'home';
  }
  function persist() { localStorage.setItem('frontier-demo-state', JSON.stringify({ ...state, stateVersion, playing: false, assetsOpen: false })); }
  function phaseLabel() {
    return ({ home: '等待输入', draft: '待确认', creating: '正在创建任务', created: '任务已就绪', running: '受控执行中', 'gate-risk': '等待人工决策', 'gate-conflict': '等待恢复决策', completed: '任务已完成' })[state.phase] || '等待输入';
  }
  function phaseIndex() {
    if (route() === 'home' || ['home', 'draft', 'creating'].includes(state.phase)) return 0;
    if (['created', 'running', 'gate-risk', 'gate-conflict'].includes(state.phase)) return 1;
    return 2;
  }
  function currentEvent() { return scenario().events[Math.max(0, state.eventIndex)] || scenario().events[0]; }
  function selectedEvent() { return scenario().events.find((event) => event.id === state.selectedEvent) || currentEvent(); }
  function pipelineProgress() {
    if (state.phase === 'completed') return 6;
    if (state.eventIndex < 0) return 0;
    return Math.min(5, Math.max(1, Math.ceil(((state.eventIndex + 1) / scenario().events.length) * 6)));
  }
  function toast(message) {
    const node = $('#toast'); node.textContent = message; node.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2200);
  }

  function renderShell() {
    const step = phaseIndex();
    const labels = ['任务定义', '受控执行', '产出归档'];
    $('#global-flow').innerHTML = labels.map((label, index) => `
      <div class="global-step ${index < step ? 'done' : ''} ${index === step ? 'active' : ''}"><span>${index < step ? '✓' : index + 1}</span><b>${label}</b></div>${index < labels.length - 1 ? '<i></i>' : ''}`).join('');
    $('#run-state').innerHTML = `<span class="status-dot ${state.phase === 'running' && route() !== 'home' ? 'pulse' : ''}"></span>${route() === 'home' ? '等待输入' : phaseLabel()}`;
    $('#asset-toggle').classList.toggle('active', state.assetsOpen);
    $('#asset-drawer').classList.toggle('open', state.assetsOpen);
  }

  function render() {
    stopTimer(); renderShell();
    if (route() === 'home') { $('#view').innerHTML = renderHome(); bindHome(); }
    else {
      if (state.phase === 'home') state.phase = 'draft';
      $('#view').innerHTML = renderStudio(); bindStudio();
      if (state.phase === 'creating') continueCreation();
      if (state.phase === 'running' && state.playing) continueRun();
    }
    renderAssets(); persist();
  }

  function renderHome() {
    const current = scenario();
    return `<section class="home-page"><div class="home-hero">
      <div class="eyebrow">AI-NATIVE CYBER OPERATIONS RANGE</div>
      <h1>按真实网安动线<br><span>创建并执行安全任务</span></h1>
      <p>从授权定界开始，经过环境基线、技术执行、人工闸门、验证复测与产出归档；全程仅在隔离靶场中模拟。</p>
      <div class="prompt-box"><textarea id="task-prompt" rows="5" aria-label="描述安全任务">${esc(state.prompt)}</textarea><div class="prompt-toolbar"><div class="mode-group"><button class="mode-button" id="task-type">${esc(current.type)}⌄</button><button class="mode-button active" id="mode-button">✦ ${esc(state.mode)}</button></div><button class="start-button" id="start-task">启动演示任务 <span>→</span></button></div></div>
      <div class="boundary-note"><span>✓</span> 演示数据 · 授权定界 · 隔离执行 · 可回滚 · 全程留痕</div>
    </div><div class="preset-section"><div class="preset-heading"><span>四类典型网安任务</span><small>每类采用不同的专业里程碑与工具链</small></div><div class="preset-grid four">
      ${presets.map((item, index) => `<button class="preset-card ${item.id === current.id ? 'featured selected' : ''}" data-preset="${item.id}"><div class="preset-top"><span>${esc(item.tag)}</span><i>0${index + 1}</i></div><h3>${esc(item.title)}</h3><p>${esc(item.subtitle)}</p><div class="preset-tags"><span>${esc(item.type)}</span><span>${index === 3 ? '红蓝协同' : index === 2 ? '安全回归' : index === 1 ? '受控验证' : '发现研判'}</span></div></button>`).join('')}
    </div></div></section>`;
  }

  function bindHome() {
    $('#task-prompt').addEventListener('input', (event) => { state.prompt = event.target.value; persist(); });
    $('#start-task').addEventListener('click', () => {
      state.prompt = $('#task-prompt').value.trim() || scenario().prompt;
      Object.assign(state, { phase: 'creating', creationIndex: 0, eventIndex: -1, workspaceTab: 'canvas', selectedEvent: 'EV-001', playing: false, assetsOpen: false });
      location.hash = '#/studio';
    });
    $$('#view [data-preset]').forEach((button) => button.addEventListener('click', () => {
      state.selectedScenarioId = button.dataset.preset; state.prompt = scenario().prompt;
      state.sampleCount = scenario().samples; state.duration = scenario().duration; render();
      toast(`已切换：${scenario().type}`);
    }));
    $('#mode-button').addEventListener('click', () => { state.mode = state.mode === 'Auto' ? '深度编排' : 'Auto'; render(); });
    $('#task-type').addEventListener('click', () => toast('请从下方选择四类典型任务'));
  }

  function renderStudio() {
    const current = scenario();
    return `<section class="studio-page"><header class="studio-head"><div><a href="#/home" class="back-link">← 新建任务</a><h1>${esc(current.title)}</h1><p><span class="demo-pill">${esc(current.type)}</span> ${taskId()} · ${esc(phaseLabel())}</p></div><div class="studio-actions"><button class="ghost-button" id="reset-task">重置</button>${state.phase === 'completed' ? '<button class="primary-button" id="show-assets">查看产出物 →</button>' : ''}</div></header>
      <div class="studio-grid"><section class="conversation-pane"><div class="pane-title"><div><span>任务会话</span><small>范围确认、推理拆分、执行干预与最终产出</small></div><span class="live-chip"><i></i>${esc(phaseLabel())}</span></div><div class="conversation-scroll" id="conversation-scroll">${renderConversation()}</div>${renderComposer()}</section><section class="workspace-pane">${renderWorkspace()}</section></div></section>`;
  }

  function reasoningSummary(event) {
    const summaries = {
      PLAN: '将授权范围、停止条件和交付标准转化为可审查约束，再进入下一阶段。',
      ACTION: '在既定授权边界内执行最小必要动作，并同步记录环境状态与工具回显。',
      OBSERVATION: '将观测结果与基线、策略和上下文关联；异常仅作为待验证假设。',
      QUESTION: '当前动作可能影响业务或风险边界，暂停自动推进，等待人工给出明确处置意图。',
      INTERVENTION: '已将人工选择写入运行记录，并更新执行优先级、环境状态和后续验证路径。',
      EVIDENCE: '交叉核验事件、快照和观测数据，保留支持结论与反证所需的可回放记录。',
      REPLAN: '根据新证据调整顺序和资源预算，但不改变已冻结的授权边界。',
      RESULT: '汇总任务结果、风险边界和可复用轨迹；所有产出均可回指到本次 Run。'
    };
    return summaries[event.type] || '持续更新当前执行上下文、可核验运行记录与下一步待验证假设。';
  }

  function renderConversation() {
    const current = scenario();
    const creationVisible = ['creating', 'created', 'running', 'gate-risk', 'gate-conflict', 'completed'].includes(state.phase);
    const eventsVisible = ['running', 'gate-risk', 'gate-conflict', 'completed'].includes(state.phase) && state.eventIndex >= 0;
    return `<article class="message user-message"><div class="avatar human">您</div><div><small>任务目标</small><p>${esc(state.prompt)}</p></div></article>
      <article class="message agent-message"><div class="avatar agent">AI</div><div><small>任务识别 · ${esc(current.type)}</small><p>我会遵循“授权定界 → 环境基线 → 专业执行 → 验证复测 → 清理归档”的网安任务主线。左侧展示可审查推理摘要和人工干预；右侧执行画布实时映射对应的里程碑、环境状态与运行记录。</p><div class="intent-tags"><span>对象 · ${esc(current.subject)}</span><span>重点 · ${esc(current.priority)}</span><span>环境 · ${esc(current.environment)}</span></div></div></article>
      ${state.phase === 'draft' ? renderClarification() : ''}${creationVisible ? renderCreationStream() : ''}${eventsVisible ? renderExecutionStream() : ''}${renderOperatorInterventions()}${['running', 'gate-risk', 'gate-conflict'].includes(state.phase) ? renderInterventionComposer() : ''}${state.phase === 'gate-risk' ? renderRiskGate() : ''}${state.phase === 'gate-conflict' ? renderConflictGate() : ''}${state.phase === 'completed' ? renderCompletionMessage() : ''}`;
  }

  function renderOperatorInterventions() {
    return state.operatorInterventions.map((item) => `<article class="operator-intervention"><div class="message user-message"><div class="avatar human">您</div><div><small>对话式干预 · ${esc(item.time)}</small><p>${esc(item.text)}</p></div></div><div class="intervention-ack"><span>↳</span><p><b>已同步到执行画布</b><small>${esc(item.response)}</small></p></div></article>`).join('');
  }

  function renderInterventionComposer() {
    return `<article class="intervention-composer"><div><span>对话式干预</span><small>输入约束、验证重点或优先级调整；不会改变冻结的授权范围。</small></div><textarea id="intervention-input" rows="2" placeholder="例如：优先核验根因证据，并将业务回归放到补丁审查之后"></textarea><button class="ghost-button" id="submit-intervention">发送干预 →</button></article>`;
  }

  function renderClarification() {
    return `<article class="message agent-message decision-message"><div class="avatar agent">AI</div><div><small>执行前确认</small><p>先冻结范围、交战规则和资源预算，再允许 Agent 创建任务；执行中任何越界或破坏性动作都会暂停。</p><div class="choice-grid"><label>验证样本<select id="sample-count"><option value="${state.sampleCount}" selected>${state.sampleCount} 个 · 当前任务</option><option value="12">12 个 · 快速</option><option value="40">40 个 · 深度</option></select></label><label>时间预算<select id="duration"><option value="${state.duration}" selected>${state.duration} 分钟 · 当前任务</option><option value="30">30 分钟</option><option value="60">60 分钟</option></select></label></div><button class="primary-button full" id="confirm-create">冻结规则并创建任务 <span>→</span></button></div></article>`;
  }

  function renderCreationStream() {
    const current = scenario();
    const complete = ['created', 'running', 'gate-risk', 'gate-conflict', 'completed'].includes(state.phase);
    return `<article class="process-block"><div class="process-head"><div><span class="process-icon">✦</span><b>安全任务编排</b></div><em>${complete ? '4 步完成' : `${Math.max(0, state.creationIndex + 1)} / 4`}</em></div><div class="tool-list">${current.creation.map((item, index) => {
      const visible = complete || index <= state.creationIndex; const active = !complete && index === state.creationIndex;
      return `<div class="tool-row ${visible ? 'visible' : ''} ${active ? 'active' : ''}"><span>${visible ? (active ? '◌' : '✓') : index + 1}</span><div><code>${esc(item.tool)}</code><b>${esc(item.title)}</b><small>${visible ? esc(item.result) : '等待上一步完成'}</small></div></div>`;
    }).join('')}</div>${complete ? `<div class="process-result"><span>✓</span><div><b>${esc(current.type)}任务已创建</b><small>${taskId()} · 6 个里程碑 · 交战规则已冻结</small></div></div>` : ''}</article>`;
  }

  function renderExecutionStream() {
    const current = scenario();
    return `<article class="process-block execution-block"><div class="process-head"><div><span class="process-icon run">◎</span><b>${esc(current.type)}执行记录</b></div><em>${state.phase === 'completed' ? `${current.events.length} 步完成` : `${state.eventIndex + 1} / ${current.events.length}`}</em></div><div class="event-stream">${current.events.slice(0, state.eventIndex + 1).map((event) => `<section class="execution-entry"><button class="event-row type-${event.type.toLowerCase()} ${state.selectedEvent === event.id ? 'selected' : ''}" data-event="${event.id}"><span class="event-marker">${event.type === 'ACTION' ? '▶' : event.type === 'QUESTION' ? '!' : event.type === 'RESULT' ? '✓' : '●'}</span><div><div><code>${esc(event.tool)}</code><time>${event.time}</time></div><b>${esc(event.title)}</b><small>${esc(event.detail)}</small></div><em>${esc(event.status)}</em></button><div class="reasoning-summary"><span>可审查推理摘要</span><p>${esc(reasoningSummary(event))}</p><small>依据：${esc(event.tool)} · ${esc(event.type)} · ${esc(event.time)}</small></div></section>`).join('')}</div></article>`;
  }

  function renderRiskGate() {
    return `<article class="gate-card warning"><div class="gate-label">交战规则闸门 · 需要人工决定</div><h3>${esc(currentEvent().title)}</h3><p>${esc(currentEvent().detail)}</p><div class="gate-options"><button class="primary-button" data-decision="isolate">批准受控继续</button><button class="ghost-button" data-decision="static">转非侵入式验证</button></div></article>`;
  }
  function renderConflictGate() {
    return `<article class="gate-card danger"><div class="gate-label">证据冲突 · 执行已暂停</div><h3>选择失败恢复策略</h3><p>原始失败记录将保留并进入长轨迹数据管线。</p><div class="gate-options"><button class="primary-button" data-recovery="alternate">切换替代工具</button><button class="ghost-button" data-recovery="review">转人工复核</button></div></article>`;
  }

  function renderCompletionMessage() {
    const current = scenario();
    return `<article class="message agent-message final-message"><div class="avatar agent">AI</div><div><small>任务完成 · 产出物卡片</small><h3>${esc(current.type)}任务已完成并完成环境清理</h3><p>${esc(current.events.at(-1).detail)}</p><div class="result-kpis"><span><b>${current.metrics.traces}</b>轨迹事件</span><span><b>${current.metrics.evidence}</b>运行记录</span><span><b>${current.metrics.review}</b>复核项</span><span><b>${current.outputs.length}</b>类产出物</span></div><div class="output-list">${current.assets.map((item) => `<button data-asset="${esc(item.id)}"><span>✓</span><p><b>${esc(item.type)}</b><small>${esc(item.count)} · ${esc(item.state)} · 点击查看 Trace</small></p></button>`).join('')}</div><div class="completion-actions"><button class="primary-button" id="open-assets">打开资产空间</button><button class="ghost-button" id="open-data">查看数据管线</button></div></div></article>`;
  }

  function renderComposer() {
    const total = scenario().events.length;
    if (state.phase === 'draft') return '<div class="composer-note">先确认授权范围、交战规则和任务预算</div>';
    if (state.phase === 'creating') return '<div class="composer-note running"><i></i> 正在创建任务、环境基线与恢复检查点，完成后自动启动…</div>';
    if (state.phase === 'created') return '<div class="composer-action"><div><b>任务已就绪</b><small>交战规则、里程碑和环境快照已冻结</small></div><button class="primary-button" id="start-run">启动受控执行 <span>→</span></button></div>';
    if (state.phase === 'running') return `<div class="composer-action"><div><b>正在执行第 ${state.eventIndex + 1} / ${total} 步</b><small>可暂停或单步推进</small></div><div><button class="ghost-button" id="toggle-run">${state.playing ? '暂停' : '继续'}</button><button class="primary-button" id="next-step">下一步</button></div></div>`;
    if (state.phase.startsWith('gate')) return '<div class="composer-note waiting">执行已安全暂停，等待上方人工决策</div>';
    return '<div class="composer-action"><div><b>本轮任务已完成</b><small>产出物已显示在会话末尾并同步到资产空间</small></div><button class="ghost-button" id="replay-run">重新播放</button></div>';
  }

  function renderWorkspace() {
    const tabs = [['canvas', '执行画布'], ['data', '数据管线']];
    return `<div class="workspace-head"><div><span>工作空间</span><small>执行画布承载任务拆分、里程碑、拓扑和实时动作</small></div><button class="asset-mini" id="workspace-assets">◇ 资产空间</button></div><nav class="workspace-tabs compact-tabs">${tabs.map(([id, label]) => `<button data-tab="${id}" class="${state.workspaceTab === id ? 'active' : ''}">${label}${id === 'data' && pipelineProgress() ? `<i>${pipelineProgress()}/6</i>` : ''}</button>`).join('')}</nav><div class="workspace-content">${state.workspaceTab === 'data' ? renderPipeline() : renderCanvas()}</div>`;
  }

  function renderTwinScene(current, activeStage) {
    if (!current.twinAssets) return `<div class="topology-canvas"><svg viewBox="0 0 760 260" aria-hidden="true"><path d="M110 72 C205 72 205 72 300 72 M392 72 C485 72 485 72 650 72 M650 110 C650 190 500 196 390 196 M300 196 C205 196 205 196 110 196"/></svg>${current.topology.map((name, index) => `<div class="topology-node t${index + 1} ${index < Math.min(current.topology.length, activeStage + 1) && state.eventIndex >= 0 ? 'done' : ''} ${index === Math.min(current.topology.length - 1, activeStage) && state.eventIndex >= 0 ? 'active' : ''}"><span>${index + 1}</span><b>${esc(name)}</b><small>${index === Math.min(current.topology.length - 1, activeStage) && state.eventIndex >= 0 ? '当前关联' : index < activeStage ? '状态已同步' : '等待事件'}</small></div>`).join('')}</div>`;
    const selected = current.twinAssets.find((asset) => asset.id === state.selectedTwinAsset) || current.twinAssets[0];
    return `<div class="twin-3d-layout"><div class="twin-3d-scene"><div class="scene-grid"></div><div class="scene-link l1"></div><div class="scene-link l2"></div><div class="scene-link l3"></div>${current.twinAssets.map((asset, index) => `<button data-twin="${asset.id}" class="twin-asset a${index + 1} kind-${asset.kind} ${asset.id === selected.id ? 'selected' : ''} ${asset.status === '告警' ? 'alert' : ''}"><span class="asset-model"><i></i><i></i><i></i></span><b>${esc(asset.name)}</b><small>${esc(asset.zone)} · ${esc(asset.status)}</small></button>`).join('')}</div><aside class="twin-info"><span>数字孪生节点</span><h3>${esc(selected.name)}</h3><em>${esc(selected.zone)} · ${esc(selected.status)}</em><p>${esc(selected.detail)}</p><div><small>遥测</small><b>${esc(selected.telemetry)}</b></div></aside></div>`;
  }

  function renderInterventionProjection() {
    if (!state.operatorInterventions.length) return '';
    return `<div class="intervention-projection"><div class="section-label">对话干预投影</div>${state.operatorInterventions.slice(-3).map((item) => `<article><span>${esc(item.id)}</span><p>${esc(item.text)}</p><small>已关联 ${esc(item.time)} · 当前里程碑</small></article>`).join('')}</div>`;
  }

  function renderCanvas() {
    const current = scenario(); const activeStage = currentEvent().stage; const focus = selectedEvent();
    const executed = state.eventIndex >= 0 ? current.events.slice(0, state.eventIndex + 1) : [];
    return `<div class="workspace-section canvas-section"><div class="artifact-title"><div><span>01</span><h2>${esc(current.type)}执行画布</h2></div><em>${state.eventIndex < 0 ? '等待启动' : `里程碑 ${activeStage + 1} / ${current.plan.length}`}</em></div>
      <div class="canvas-brief"><div><small>任务目标</small><h3>${esc(current.objective)}</h3></div><div class="canvas-facts"><span><small>测试对象</small><b>${esc(current.subject)}</b></span><span><small>环境</small><b>${esc(current.environment)}</b></span><span><small>预算</small><b>${state.sampleCount} 样本 / ${state.duration} 分钟</b></span></div></div>
      <div class="canvas-block"><div class="section-heading"><div><span>任务拆分与 Milestones</span><small>遵循该类任务的标准安全执行主线</small></div><em>6 个阶段</em></div><div class="milestone-flow">${current.plan.map((node, index) => `<article class="milestone-node ${index < activeStage ? 'done' : ''} ${index === activeStage && state.eventIndex >= 0 ? 'active' : ''}"><span>${index < activeStage ? '✓' : index + 1}</span><div><b>${esc(node.name)}</b><small>${esc(node.detail)}</small><em>${esc(node.deliverable)}</em></div></article>`).join('')}</div></div>
      <div class="canvas-block"><div class="section-heading"><div><span>${current.twinAssets ? '三维数字孪生生产环境' : '靶场拓扑与环境状态'}</span><small>${current.twinAssets ? '选择任一节点查看仿真资产、遥测与演练状态' : '拓扑、状态与当前执行里程碑同步'}</small></div><em>隔离 · 可回滚</em></div>${renderTwinScene(current, activeStage)}<div class="twin-summary"><span><i class="safe"></i>授权范围已冻结</span><span><i class="safe"></i>环境快照可回滚</span><span><i class="${state.phase.startsWith('gate') ? 'risk' : 'safe'}"></i>${state.phase.startsWith('gate') ? '人工闸门已触发' : '真实网络已隔离'}</span></div></div>
      <div class="canvas-block action-board"><div class="section-heading"><div><span>当前动作与运行记录</span><small>点击左侧事件可回看任一步骤</small></div><em>${executed.length} / ${current.events.length} 事件</em></div>${state.eventIndex >= 0 ? `<div class="current-action"><div class="section-label">${esc(focus.id)} · ${esc(focus.type)}</div><h3>${esc(focus.title)}</h3><p>${esc(focus.detail)}</p><div class="action-meta"><span>工具 · ${esc(focus.tool)}</span><span>时间 · ${esc(focus.time)}</span><span>状态 · ${esc(focus.status)}</span></div></div>` : '<div class="empty-workspace"><b>执行上下文已准备</b><p>启动后，计划、工具调用、观测、人工闸门和重规划会在此联动。</p></div>'}<div class="evidence-strip">${executed.slice(-6).map((event) => `<button data-event="${event.id}" class="${focus.id === event.id ? 'active' : ''}"><span>${esc(event.id)}</span><b>${esc(event.type)}</b><small>${esc(event.status)}</small></button>`).join('')}</div>${renderInterventionProjection()}</div>
      <div class="policy-card compact-policy"><div class="section-label">交战规则</div>${current.policy.map((item) => `<p><span>✓</span>${esc(item)}</p>`).join('')}</div></div>`;
  }

  function renderPipeline() {
    const current = scenario(); const progress = pipelineProgress();
    const traceEvents = state.eventIndex >= 0 ? current.events.slice(Math.max(0, state.eventIndex - 4), state.eventIndex + 1) : [];
    return `<div class="workspace-section"><div class="artifact-title"><div><span>02</span><h2>长轨迹与 Trace 数据生产管线</h2></div><em>${progress} / 6 阶段</em></div><p class="workspace-lead">每个计划、动作、观测、工具回显、人工决策、失败分支和环境状态都进入同一条可追溯生产管线。</p><div class="pipeline-flow">${current.pipeline.map((item, index) => `<div class="pipeline-stage ${index < progress ? 'done' : ''} ${index === progress && progress < 6 ? 'active' : ''}"><div class="pipeline-index">${index < progress ? '✓' : index + 1}</div><div><b>${esc(item.name)}</b><small>${esc(item.owner)}</small><p><span>输入</span>${esc(item.input)}</p><p><span>输出</span>${index < progress || state.phase === 'completed' ? esc(item.output) : '等待上游'}</p></div></div>`).join('<i class="pipeline-arrow">→</i>')}</div><div class="trace-panel"><div class="section-heading"><div><span>实时 Trace 样例</span><small>计划—动作—观测—决策—结果保持上下文连续</small></div><em>${current.metrics.toolCalls} 次工具调用</em></div>${traceEvents.length ? traceEvents.map((event) => `<div class="trace-row"><code>${esc(event.time)}</code><span>${esc(event.type)}</span><b>${esc(event.tool)}</b><p>${esc(event.title)}</p></div>`).join('') : '<div class="empty-workspace">任务启动后显示实时 Trace。</div>'}</div><div class="lineage-card"><div class="section-label">数据血缘</div><div class="lineage-chain"><span>${taskId()}</span><i>→</i><span>RUN-01</span><i>→</i><span>TRACE / EVENT</span><i>→</i><span>DATASET</span></div><p>任务 → Run → 事件 → 工具回显 → 环境快照 → 标注 → 数据包，全链可回指。</p></div><div class="data-kpis"><span><b>${progress >= 1 ? current.metrics.traces : '—'}</b>轨迹事件</span><span><b>${progress >= 2 ? current.metrics.evidence : '—'}</b>运行记录</span><span><b>${progress >= 4 ? current.metrics.review : '—'}</b>待复核</span><span><b>${progress >= 6 ? current.metrics.datasets : '—'}</b>数据类型</span></div></div>`;
  }

  function assetExport(asset) { return encodeURIComponent(JSON.stringify({ asset_id: asset.id, type: asset.type, task: taskId(), state: asset.state, source: asset.source, usage: asset.usage, trace: asset.trace }, null, 2)); }
  function renderAssetDetail(asset) {
    if (!asset) return '';
    return `<section class="asset-detail"><div><div><span>Trace 详情</span><h3>${esc(asset.type)}</h3><p>${esc(asset.count)} · ${esc(asset.usage)}</p></div><button id="close-asset-detail">×</button></div><div class="asset-trace">${asset.trace.map((row) => `<article><code>${esc(row.time)}</code><span>${esc(row.type)}</span><b>${esc(row.tool)}</b><p>${esc(row.title)}</p><small>${esc(row.detail)}</small></article>`).join('')}</div><a class="primary-button asset-download" download="${esc(asset.id)}-trace.json" href="data:application/json;charset=utf-8,${assetExport(asset)}">导出 Trace JSON ↓</a></section>`;
  }
  function renderAssets() {
    const current = scenario(); const drawer = $('#asset-drawer'); const detail = current.assets.find((asset) => asset.id === state.assetDetail);
    drawer.innerHTML = `<div class="drawer-head"><div><span>资产空间</span><small>按任务归档的报告、记录、场景与数据</small></div><button id="close-assets">×</button></div><div class="drawer-task"><small>来源任务</small><b>${taskId()}</b><span>${esc(phaseLabel())}</span></div><div class="asset-list">${current.assets.map((asset) => `<article class="asset-card"><button class="asset-open" data-asset="${esc(asset.id)}"><div><span>${esc(asset.id)}</span><em>${state.phase === 'completed' ? esc(asset.state) : '生成中'}</em></div><h3>${esc(asset.type)}</h3><p>${esc(asset.count)} · ${esc(asset.usage)}</p><small>来源 ${esc(asset.source)} · 点击查看 Trace</small></button><a class="asset-download" download="${esc(asset.id)}-trace.json" href="data:application/json;charset=utf-8,${assetExport(asset)}">导出 JSON ↓</a></article>`).join('')}</div>${renderAssetDetail(detail)}<div class="drawer-foot">演示数据 · 项目隔离 · 用途授权独立 · 导出受控</div>`;
    $('#close-assets').addEventListener('click', toggleAssets);
    $$('[data-asset]', drawer).forEach((button) => button.addEventListener('click', () => { state.assetDetail = button.dataset.asset; renderAssets(); }));
    $('#close-asset-detail')?.addEventListener('click', () => { state.assetDetail = null; renderAssets(); });
  }

  function bindStudio() {
    $('#reset-task').addEventListener('click', resetDemo); $('#show-assets')?.addEventListener('click', toggleAssets); $('#open-assets')?.addEventListener('click', toggleAssets);
    $('#confirm-create')?.addEventListener('click', () => { state.sampleCount = Number($('#sample-count').value); state.duration = Number($('#duration').value); state.phase = 'creating'; state.creationIndex = 0; state.workspaceTab = 'canvas'; render(); });
    $('#start-run')?.addEventListener('click', startRun); $('#toggle-run')?.addEventListener('click', () => { state.playing = !state.playing; render(); }); $('#next-step')?.addEventListener('click', stepRun); $('#replay-run')?.addEventListener('click', startRun); $('#open-data')?.addEventListener('click', () => switchTab('data')); $('#workspace-assets')?.addEventListener('click', toggleAssets);
    $('#submit-intervention')?.addEventListener('click', submitIntervention); $('#intervention-input')?.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submitIntervention(); });
    $$('[data-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    $$('[data-event]').forEach((button) => button.addEventListener('click', () => { state.selectedEvent = button.dataset.event; state.workspaceTab = 'canvas'; render(); }));
    $$('[data-twin]').forEach((button) => button.addEventListener('click', () => { state.selectedTwinAsset = button.dataset.twin; render(); }));
    $$('[data-asset]').forEach((button) => button.addEventListener('click', () => { state.assetDetail = button.dataset.asset; state.assetsOpen = true; render(); }));
    $$('[data-decision]').forEach((button) => button.addEventListener('click', () => resolveGate('risk', button.dataset.decision)));
    $$('[data-recovery]').forEach((button) => button.addEventListener('click', () => resolveGate('conflict', button.dataset.recovery)));
    requestAnimationFrame(() => { const scroll = $('#conversation-scroll'); if (scroll) scroll.scrollTop = scroll.scrollHeight; });
  }

  function submitIntervention() {
    const input = $('#intervention-input'); const text = input?.value.trim();
    if (!text) return toast('请输入要同步到执行画布的干预内容');
    const current = currentEvent(); state.operatorInterventions.push({ id: `OP-${String(state.operatorInterventions.length + 1).padStart(2, '0')}`, time: current.time, text, response: `已关联到 ${current.id} · ${current.title}，执行画布将在当前里程碑下显示该约束。` });
    state.workspaceTab = 'canvas'; render(); toast('干预已写入运行记录并同步到执行画布');
  }
  function switchTab(tabName) { state.workspaceTab = tabName; render(); }
  function continueCreation() {
    timer = setTimeout(() => {
      if (state.phase !== 'creating') return;
      if (state.creationIndex < scenario().creation.length - 1) state.creationIndex += 1;
      else Object.assign(state, { phase: 'running', eventIndex: -1, workspaceTab: 'canvas', playing: true });
      render();
    }, 1200);
  }
  function startRun() { state.phase = 'running'; state.eventIndex = -1; state.workspaceTab = 'canvas'; state.playing = true; render(); }
  function continueRun() { timer = setTimeout(stepRun, Math.round(3500 / state.speed)); }
  function stepRun() {
    stopTimer(); const current = scenario();
    if (state.eventIndex >= current.events.length - 1) return finishRun();
    state.eventIndex += 1; const event = current.events[state.eventIndex]; state.selectedEvent = event.id;
    if (event.gate === 'risk') { state.phase = 'gate-risk'; state.playing = false; state.workspaceTab = 'canvas'; }
    else if (event.gate === 'conflict') { state.phase = 'gate-conflict'; state.playing = false; state.workspaceTab = 'canvas'; }
    else if (state.eventIndex === current.events.length - 1) return finishRun();
    render();
  }
  function resolveGate(type, decision) {
    toast(type === 'risk' ? (decision === 'isolate' ? '已批准在原授权边界内继续' : '已切换为非侵入式验证') : (decision === 'alternate' ? '已切换替代工具并保留失败轨迹' : '已转入人工复核'));
    state.eventIndex += 1; state.selectedEvent = scenario().events[state.eventIndex].id; state.phase = 'running'; state.playing = true; state.workspaceTab = type === 'risk' ? 'canvas' : 'data'; render();
  }
  function finishRun() { state.phase = 'completed'; state.playing = false; state.eventIndex = scenario().events.length - 1; state.selectedEvent = scenario().events.at(-1).id; state.workspaceTab = 'data'; render(); }
  function stopTimer() { if (timer) clearTimeout(timer); timer = null; }
  function toggleAssets() { state.assetsOpen = !state.assetsOpen; renderShell(); renderAssets(); }
  function resetDemo() {
    stopTimer(); const current = scenario();
    Object.assign(state, { ...initialState, stateVersion, selectedScenarioId: current.id, prompt: current.prompt, sampleCount: current.samples, duration: current.duration });
    localStorage.removeItem('frontier-demo-state');
    if (route() === 'home') render(); else location.hash = '#/home';
    toast('演示已重置');
  }

  $('#brand-home').addEventListener('click', () => { location.hash = '#/home'; });
  $('#asset-toggle').addEventListener('click', toggleAssets); $('#reset-all').addEventListener('click', resetDemo);
  window.addEventListener('hashchange', render); window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.assetsOpen) toggleAssets(); });
  if (!location.hash) location.hash = '#/home'; render();
})();
