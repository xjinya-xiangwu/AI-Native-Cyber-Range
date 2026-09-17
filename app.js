(() => {
  'use strict';

  const { scenarios, presets, defaultScenarioId } = window.DEMO_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const saved = JSON.parse(localStorage.getItem('frontier-demo-state') || '{}');
  const stateVersion = 9;

  const initialState = {
    selectedScenarioId: defaultScenarioId,
    prompt: scenarios[defaultScenarioId].prompt,
    mode: 'Auto', phase: 'home', creationIndex: -1, eventIndex: -1,
    workspaceTab: 'canvas', selectedEvent: 'EV-001',
    sampleCount: scenarios[defaultScenarioId].samples,
    duration: scenarios[defaultScenarioId].duration,
    speed: 1, assetsOpen: false, playing: false, operatorInterventions: [], selectedTwinAsset: null, assetDetail: null,
    model: 'gpt-5.6-sol', agent: 'security-ops'
  };
  const state = saved.stateVersion === stateVersion && saved.selectedScenarioId
    ? { ...initialState, ...saved, playing: false, assetsOpen: false }
    : { ...initialState, stateVersion };
  if (!scenarios[state.selectedScenarioId]) Object.assign(state, initialState);
  if (!['canvas', 'data'].includes(state.workspaceTab)) state.workspaceTab = 'canvas';
  state.operatorInterventions ||= [];
  let timer = null;
  let streamTimer = null;

  function scenario() { return scenarios[state.selectedScenarioId]; }
  function taskId() { return `TASK-${scenario().id}-01`; }
  function optionLabel(options, value) { return (options.find(([id]) => id === value) || [value, value])[1]; }
  function runnerLabel() { return `${optionLabel(MODEL_OPTIONS, state.model)} · ${optionLabel(AGENT_OPTIONS, state.agent)}`; }
  function route() {
    const value = location.hash.replace(/^#\//, '');
    if (['dialogue', 'workbench', 'data', 'report'].includes(value)) return 'studio';
    return ['home', 'studio'].includes(value) ? value : 'home';
  }
  function persist() { localStorage.setItem('frontier-demo-state', JSON.stringify({ ...state, stateVersion, playing: false, assetsOpen: false })); }
  function phaseLabel() {
    return ({ home: '等待输入', draft: '待确认', creating: '正在建立任务', created: '任务已就绪', running: '自动执行中', completed: '任务已完成' })[state.phase] || '等待输入';
  }
  function phaseIndex() {
    if (route() === 'home' || ['home', 'draft', 'creating'].includes(state.phase)) return 0;
    if (['created', 'running'].includes(state.phase)) return 1;
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
    $('#asset-toggle').classList.toggle('active', state.assetsOpen);
    $('#asset-drawer').classList.toggle('open', state.assetsOpen);
  }

  function render() {
    stopTimer(); stopStream(); renderShell();
    if (route() === 'home') { $('#view').innerHTML = renderHome(); bindHome(); }
    else {
      if (state.phase === 'home') state.phase = 'draft';
      $('#view').innerHTML = renderStudio(); bindStudio();
      if (state.phase === 'creating') continueCreation();
      if (state.phase === 'running' && state.playing) continueRun();
      const streamRoot = $('.cot-block.is-streaming');
      if (streamRoot) streamLines(streamRoot);
    }
    renderAssets(); persist();
  }

  const MODEL_OPTIONS = [
    ['gpt-5.6-sol', 'GPT-5.6-sol · 通用安全推理'],
    ['claude-opus-5', 'Claude-Opus-5 · 长程任务规划'],
    ['qwen3.8-max', 'Qwen3.8-Max · 中文安全语料']
  ];
  const AGENT_OPTIONS = [
    ['security-ops', '安全运营 Agent'],
    ['vuln-hunter', '漏洞挖掘 Agent'],
    ['exploit-verifier', '受控利用 Agent'],
    ['patch-engineer', '漏洞修复 Agent'],
    ['twin-commander', '数字孪生红蓝 Agent']
  ];
  const PLATFORM_STATS = [
    ['1000+', '已接入真实靶场环境'],
    ['100000+', '测试任务集'],
    ['1000万+条', '累计产生轨迹数据'],
    ['20+', '支撑“关基”场景']
  ];

  function selectOptions(options, value) {
    return options.map(([id, label]) => `<option value="${id}" ${id === value ? 'selected' : ''}>${esc(label)}</option>`).join('');
  }

  function renderHome() {
    const current = scenario();
    return `<section class="home-page"><div class="home-hero">
      <div class="eyebrow">AI-NATIVE CYBER OPERATIONS RANGE</div>
      <h1>按真实网安动线<span>创建并执行安全任务</span></h1>
      <div class="platform-stats">${PLATFORM_STATS.map(([value, label]) => `<div><b>${esc(value)}</b><small>${esc(label)}</small></div>`).join('')}</div>
      <div class="prompt-box"><textarea id="task-prompt" rows="3" aria-label="描述安全任务">${esc(state.prompt)}</textarea><div class="prompt-toolbar"><div class="mode-group">
        <label class="select-field"><span>执行模型</span><select id="model-select">${selectOptions(MODEL_OPTIONS, state.model)}</select></label>
        <label class="select-field"><span>执行智能体</span><select id="agent-select">${selectOptions(AGENT_OPTIONS, state.agent)}</select></label>
        <label class="select-field"><span>任务类型</span><select id="task-type">${presets.map((item) => `<option value="${item.id}" ${item.id === current.id ? 'selected' : ''}>${esc(item.type)}</option>`).join('')}</select></label>
      </div><button class="start-button" id="start-task">启动任务 <span>→</span></button></div></div>
      <div class="boundary-note"><span>✓</span> 演示数据 · 授权定界 · 隔离执行 · 可回滚 · 全程留痕</div>
    </div><div class="preset-section"><div class="preset-heading"><span>典型任务示例</span><small>每类采用不同的专业里程碑与工具链</small></div><div class="preset-grid four">
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
    $('#model-select').addEventListener('change', (event) => { state.model = event.target.value; persist(); toast('执行模型已切换'); });
    $('#agent-select').addEventListener('change', (event) => { state.agent = event.target.value; persist(); toast('执行智能体已切换'); });
    $('#task-type').addEventListener('change', (event) => { state.selectedScenarioId = event.target.value; state.prompt = scenario().prompt; state.sampleCount = scenario().samples; state.duration = scenario().duration; render(); });
  }

  function renderStudio() {
    const current = scenario();
    return `<section class="studio-page"><header class="studio-head"><div><a href="#/home" class="back-link">← 新建任务</a><h1>${esc(current.title)}</h1><p><span class="demo-pill">${esc(current.type)}</span> ${taskId()} · ${esc(phaseLabel())} · ${esc(runnerLabel())}</p></div><div class="studio-actions"><button class="ghost-button" id="reset-task">重置</button>${state.phase === 'completed' ? '<button class="primary-button" id="show-assets">查看产出物 →</button>' : ''}</div></header>
      <div class="studio-grid"><section class="conversation-pane"><div class="pane-title"><div><span>推理会话</span><small>只展示可审查的推理、观测与人工干预</small></div><span class="live-chip"><i></i>${esc(phaseLabel())}</span></div>${renderConversationAnchor()}<div class="conversation-scroll" id="conversation-scroll">${renderConversation()}</div></section><section class="workspace-pane">${renderWorkspace()}</section></div></section>`;
  }

  function renderConversationAnchor() {
    const current = scenario();
    const active = !['home', 'completed'].includes(state.phase);
    return `<div class="conversation-anchor"><div class="anchor-crumb"><span class="crumb-pill"><i></i>${esc(phaseLabel())}</span><span class="crumb-sep">·</span><b>${esc(current.title)}</b><span class="crumb-sep">·</span><small>${taskId()}</small></div><div class="anchor-goal"><small>任务目标</small><p>${esc(state.prompt)}</p></div><div class="anchor-composer"><textarea id="intervention-input" rows="2" placeholder="继续提问，或对本轮执行补充验证重点、优先级与约束……"></textarea><div class="composer-bar"><span class="composer-hint">Enter 发送 · Shift+Enter 换行 · 干预实时同步执行画布</span><div class="composer-actions">${active ? '<button class="fast-forward-button" id="fast-forward">快进至产出 ⏩</button>' : ''}<button class="composer-send" id="submit-intervention">干预 →</button></div></div></div><small class="anchor-note">${active ? '对话干预不会改变已建立的授权边界；也可直接快进查看最终产出。' : '任务已完成，可继续补充复盘意见。'}</small></div>`;
  }

  function reasoningSummary(event) {
    const summaries = {
      PLAN: '将授权范围、停止条件和交付标准转化为可审查约束，再进入下一阶段。',
      ACTION: '在既定授权边界内执行最小必要动作，并同步记录环境状态与工具回显。',
      OBSERVATION: '将观测结果与基线、策略和上下文关联；异常仅作为待验证假设。',
      QUESTION: '该事件仅用于记录已建立的策略约束或任务提问；自动流程不会因此暂停。',
      INTERVENTION: '已将对话干预写入运行记录，并更新执行优先级、环境状态和后续验证路径。',
      EVIDENCE: '交叉核验事件、快照和观测数据，保留支持结论与反证所需的可回放记录。',
      REPLAN: '根据新证据调整顺序和资源预算，但不改变已冻结的授权边界。',
      RESULT: '汇总任务结果、风险边界和可复用轨迹；所有产出均可回指到本次 Run。'
    };
    return summaries[event.type] || '持续更新当前执行上下文、可核验运行记录与下一步待验证假设。';
  }

  function renderConversation() {
    const current = scenario();
    const eventsVisible = ['running', 'completed'].includes(state.phase) && state.eventIndex >= 0;
    return `<article class="reasoning-intro"><span>推理框架 · ${esc(current.type)}</span><p>系统基于已建立的授权范围、最小权限与环境基线持续生成可审查推理摘要；任务编排、步骤和环境状态在右侧执行画布呈现。</p></article>${eventsVisible ? renderExecutionStream() : '<div class="reasoning-wait">正在建立任务边界、环境基线与执行计划…</div>'}${renderOperatorInterventions()}${state.phase === 'completed' ? renderCompletionMessage() : ''}`;
  }

  function renderOperatorInterventions() {
    return state.operatorInterventions.map((item) => `<article class="operator-intervention"><div class="message user-message"><div class="avatar human">您</div><div><small>对话式干预 · ${esc(item.time)}</small><p>${esc(item.text)}</p></div></div><div class="intervention-ack"><span>↳</span><p><b>已同步到执行画布</b><small>${esc(item.response)}</small></p></div></article>`).join('');
  }


  function renderClarification() { return ''; }


  function reasoningTrace(event) {
    const constraint = event.type === 'PLAN'
      ? '检索已冻结的范围、授权和停止条件，确认本次动作不扩大任务边界。'
      : '复核当前动作仍符合建立阶段确认的最小权限与环境隔离约束。';
    const evidence = event.type === 'OBSERVATION' || event.type === 'EVIDENCE'
      ? `关联观测与运行记录：${event.detail}`
      : `读取工具回显与环境状态：${event.tool}。`;
    const judgment = event.type === 'RESULT'
      ? '完成结果归并，生成可回指的报告与数据集产出。'
      : `形成当前判断：${event.title}。`;
    return [constraint, evidence, judgment, `→ 输出：${event.title}`];
  }

  function cotBlocks(events) {
    return events.map((event) => {
      const trace = reasoningTrace(event);
      return { time: event.time, type: event.type, tool: event.tool, lines: trace.map((text, index) => ({ cls: index === trace.length - 1 ? 'cot-out' : '', text })) };
    });
  }

  function cotBlockHtml(block, streaming) {
    const lines = block.lines.map((line) => `<p class="cot-line${line.cls ? ` ${line.cls}` : ''}"${streaming ? ` data-full="${esc(line.text)}"` : ''}>${streaming ? '' : esc(line.text)}</p>`).join('');
    return `<section class="cot-block${streaming ? ' is-streaming' : ''}"><header><i>◇</i><span>${esc(block.type)}</span><code>${esc(block.time)} · ${esc(block.tool)}</code></header>${lines}</section>`;
  }

  function renderExecutionStream() {
    const current = scenario();
    const events = current.events.slice(0, state.eventIndex + 1);
    const blocks = cotBlocks(events);
    const settled = state.phase === 'completed' ? blocks : blocks.slice(0, -1);
    const streaming = state.phase === 'completed' ? null : blocks.at(-1);
    return `<article class="cot-panel"><div class="cot-head"><span class="cot-pill"><i></i>${state.phase === 'completed' ? '推理完成' : '深度推理中'}</span><em>${state.phase === 'completed' ? `${current.events.length} 段推理轨迹` : `第 ${state.eventIndex + 1} / ${current.events.length} 段`}</em></div><p class="cot-notice">展示的是面向演示的可审查推理轨迹与依据，不包含模型隐藏思维链。</p><div class="cot-stream">${settled.map((block) => cotBlockHtml(block, false)).join('')}${streaming ? cotBlockHtml(streaming, true) : ''}</div></article>`;
  }

  function renderRiskGate() { return ''; }
  function renderConflictGate() { return ''; }

  function renderCompletionMessage() {
    const current = scenario();
    return `<article class="message agent-message final-message"><div class="avatar agent">AI</div><div><small>任务完成 · 产出物卡片</small><h3>${esc(current.type)}任务已完成并完成环境清理</h3><p>${esc(current.events.at(-1).detail)}</p><div class="result-kpis"><span><b>${current.metrics.traces}</b>轨迹事件</span><span><b>${current.metrics.evidence}</b>运行记录</span><span><b>${current.metrics.review}</b>复核项</span><span><b>${current.outputs.length}</b>类产出物</span></div><div class="output-list">${current.assets.map((item) => `<button data-asset="${esc(item.id)}"><span>✓</span><p><b>${esc(item.type)}</b><small>${esc(item.count)} · ${esc(item.state)} · 点击查看 Trace</small></p></button>`).join('')}</div><div class="completion-actions"><button class="primary-button" id="open-assets">打开资产空间</button><button class="ghost-button" id="open-data">查看数据管线</button></div></div></article>`;
  }

  function renderComposer() { return ''; }

  function renderWorkspace() {
    const tabs = [['canvas', '执行画布'], ['data', '数据管线']];
    return `<div class="workspace-head"><div><span>工作空间</span><small>执行画布承载任务拆分、里程碑、拓扑和实时动作</small></div><button class="asset-mini" id="workspace-assets">◇ 资产空间</button></div><nav class="workspace-tabs compact-tabs">${tabs.map(([id, label]) => `<button data-tab="${id}" class="${state.workspaceTab === id ? 'active' : ''}">${label}${id === 'data' && pipelineProgress() ? `<i>${pipelineProgress()}/6</i>` : ''}</button>`).join('')}</nav><div class="workspace-content">${state.workspaceTab === 'data' ? renderPipeline() : renderCanvas()}</div>`;
  }


  function renderOrchestrationCanvas(current) {
    const complete = ['running', 'completed'].includes(state.phase) || state.phase.startsWith('gate');
    const visible = Math.max(0, state.creationIndex + 1);
    return `<div class="orchestration-head"><div><span>任务建立与执行编排</span><small>权限边界在建立阶段确认；后续执行自动遵循该边界。</small></div><em>${complete ? '已冻结' : `建立中 ${visible}/${current.creation.length}`}</em></div><div class="orchestration-flow">${current.creation.map((item,index) => `<article class="${complete || index <= state.creationIndex ? 'done' : ''} ${!complete && index === state.creationIndex ? 'active' : ''}"><span>${complete || index < state.creationIndex ? '✓' : index + 1}</span><div><code>${esc(item.tool)}</code><b>${esc(item.title)}</b><small>${complete || index <= state.creationIndex ? esc(item.result) : '等待建立'}</small></div></article>`).join('')}</div>`;
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
      <div class="canvas-block orchestration-block">${renderOrchestrationCanvas(current)}<div class="section-heading"><div><span>任务拆分与 Milestones</span><small>遵循该类任务的标准安全执行主线</small></div><em>6 个阶段</em></div><div class="milestone-flow">${current.plan.map((node, index) => `<article class="milestone-node ${index < activeStage ? 'done' : ''} ${index === activeStage && state.eventIndex >= 0 ? 'active' : ''}"><span>${index < activeStage ? '✓' : index + 1}</span><div><b>${esc(node.name)}</b><small>${esc(node.detail)}</small><em>${esc(node.deliverable)}</em></div></article>`).join('')}</div></div>
      <div class="canvas-block"><div class="section-heading"><div><span>${current.twinAssets ? '三维数字孪生生产环境' : '靶场拓扑与环境状态'}</span><small>${current.twinAssets ? '选择任一节点查看仿真资产、遥测与演练状态' : '拓扑、状态与当前执行里程碑同步'}</small></div><em>隔离 · 可回滚</em></div>${renderTwinScene(current, activeStage)}<div class="twin-summary"><span><i class="safe"></i>授权范围已冻结</span><span><i class="safe"></i>环境快照可回滚</span><span><i class="${state.phase.startsWith('gate') ? 'risk' : 'safe'}"></i>${state.phase.startsWith('gate') ? '人工闸门已触发' : '真实网络已隔离'}</span></div></div>
      <div class="canvas-block action-board"><div class="section-heading"><div><span>当前动作与运行记录</span><small>点击左侧事件可回看任一步骤</small></div><em>${executed.length} / ${current.events.length} 事件</em></div>${state.eventIndex >= 0 ? `<div class="current-action"><div class="section-label">${esc(focus.id)} · ${esc(focus.type)}</div><h3>${esc(focus.title)}</h3><p>${esc(focus.detail)}</p><div class="action-meta"><span>工具 · ${esc(focus.tool)}</span><span>时间 · ${esc(focus.time)}</span><span>状态 · ${esc(focus.status)}</span></div></div>` : '<div class="empty-workspace"><b>执行上下文已准备</b><p>启动后，计划、工具调用、观测、人工闸门和重规划会在此联动。</p></div>'}<div class="evidence-strip">${executed.slice(-6).map((event) => `<button data-event="${event.id}" class="${focus.id === event.id ? 'active' : ''}"><span>${esc(event.id)}</span><b>${esc(event.type)}</b><small>${esc(event.status)}</small></button>`).join('')}</div>${renderInterventionProjection()}</div>
      <div class="policy-card compact-policy"><div class="section-label">交战规则</div>${current.policy.map((item) => `<p><span>✓</span>${esc(item)}</p>`).join('')}</div></div>`;
  }

  function renderPipeline() {
    const current = scenario(); const progress = pipelineProgress();
    const traceEvents = state.eventIndex >= 0 ? current.events.slice(Math.max(0, state.eventIndex - 4), state.eventIndex + 1) : [];
    return `<div class="workspace-section"><div class="artifact-title"><div><span>02</span><h2>长轨迹与 Trace 数据生产管线</h2></div><em>${progress} / 6 阶段</em></div><p class="workspace-lead">每个计划、动作、观测、工具回显、人工决策、失败分支和环境状态都进入同一条可追溯生产管线。</p><div class="pipeline-flow">${current.pipeline.map((item, index) => `<div class="pipeline-stage ${index < progress ? 'done' : ''} ${index === progress && progress < 6 ? 'active' : ''}"><div class="pipeline-index">${index < progress ? '✓' : index + 1}</div><div><b>${esc(item.name)}</b><small>${esc(item.owner)}</small><p><span>输入</span>${esc(item.input)}</p><p><span>输出</span>${index < progress || state.phase === 'completed' ? esc(item.output) : '等待上游'}</p></div></div>`).join('<i class="pipeline-arrow">→</i>')}</div><div class="trace-panel"><div class="section-heading"><div><span>实时 Trace 样例</span><small>计划—动作—观测—决策—结果保持上下文连续</small></div><em>${current.metrics.toolCalls} 次工具调用</em></div>${traceEvents.length ? traceEvents.map((event) => `<div class="trace-row"><code>${esc(event.time)}</code><span>${esc(event.type)}</span><b>${esc(event.tool)}</b><p>${esc(event.title)}</p></div>`).join('') : '<div class="empty-workspace">任务启动后显示实时 Trace。</div>'}</div><div class="lineage-card"><div class="section-label">数据血缘</div><div class="lineage-chain"><span>${taskId()}</span><i>→</i><span>RUN-01</span><i>→</i><span>TRACE / EVENT</span><i>→</i><span>DATASET</span></div><p>任务 → Run → 事件 → 工具回显 → 环境快照 → 标注 → 数据包，全链可回指。</p></div><div class="data-kpis"><span><b>${progress >= 1 ? current.metrics.traces : '—'}</b>轨迹事件</span><span><b>${progress >= 2 ? current.metrics.evidence : '—'}</b>运行记录</span><span><b>${progress >= 4 ? current.metrics.review : '—'}</b>待复核</span><span><b>${progress >= 6 ? current.metrics.datasets : '—'}</b>数据类型</span></div></div>`;
  }

  function reportMarkdown(asset) {
    const current = scenario();
    const generatedAt = '2026-09-16';
    const findings = asset.trace.slice(0, 3).map((row, index) => `| F-${String(index + 1).padStart(2, '0')} | ${row.title} | ${row.tool} | ${row.type} | 已核验 |`).join('\n');
    const methodology = current.plan.map((step, index) => `${index + 1}. **${step.name}**：${step.detail}`).join('\n');
    return `# 网络安全评估报告\n\n> **报告编号：** ${taskId()}-${asset.id}  \n> **生成日期：** ${generatedAt}  \n> **任务类型：** ${current.type}  \n> **环境：** ${current.environment}  \n> **报告状态：** 演示仿真数据 / 已归档\n\n---\n\n## 1. 执行摘要\n\n本报告针对 **${current.subject}** 的 ${current.type} 任务进行受控评估。结论基于隔离环境中的工具回显、环境快照、运行记录与复核轨迹生成；不代表真实生产系统的安全结论。\n\n**本次交付：** ${asset.type}（${asset.count}）。\n\n## 2. 范围与交战规则\n\n- 测试对象：${current.subject}\n- 执行环境：${current.environment}\n- 边界：仅授权、隔离、可回滚环境；禁止真实账号、生产凭据、持久化及无约束破坏动作。\n- 权限确认：最小权限、允许动作、停止条件与留痕要求已在任务建立阶段冻结。\n\n## 3. 方法与执行过程\n\n${methodology}\n\n## 4. 关键发现与证据\n\n| 编号 | 发现 / 结论 | 证据来源 | 类型 | 状态 |\n|---|---|---|---|---|\n${findings}\n\n## 5. 风险判断与建议\n\n1. 将当前验证结论与可核验运行记录一并纳入后续复测基线。\n2. 对高风险或低置信观察保留人工复核入口，并持续沉淀失败恢复样本。\n3. 在下一轮受控演练中复用本报告关联的环境快照和数据集，验证修复或防护效果。\n\n## 6. 可追溯性与限制\n\n- Trace 引用：${asset.trace.map((row) => row.time + ' ' + row.tool).join('；')}。\n- 本报告采用公开安全测试报告常见的范围、方法、发现、证据、风险与建议结构。\n- 所有内容为演示仿真数据，仅用于产品演示、训练与评测流程说明。\n`;
  }

  function assetExport(asset) {
    return asset.category === 'report' ? encodeURIComponent(reportMarkdown(asset)) : encodeURIComponent(JSON.stringify({ asset_id: asset.id, type: asset.type, category: asset.category, task: taskId(), state: asset.state, source: asset.source, usage: asset.usage, trace: asset.trace }, null, 2));
  }

  function assetHref(asset) { return `data:${asset.category === 'report' ? 'text/markdown' : 'application/json'};charset=utf-8,${assetExport(asset)}`; }
  function assetFilename(asset) { return `${asset.id}-${asset.category === 'report' ? 'report.md' : 'trace.json'}`; }

  function renderReportPreview(asset) {
    const current = scenario();
    return `<section class="report-preview"><div class="report-banner"><span>NETWORK SECURITY ASSESSMENT REPORT</span><b>${esc(asset.type)}</b><small>${taskId()} · 演示仿真数据</small></div><section><h3>执行摘要</h3><p>针对 ${esc(current.subject)} 的 ${esc(current.type)} 任务，在 ${esc(current.environment)} 中完成受控评估。${esc(asset.count)} 已归档，全部结论可回指到运行记录与 Trace。</p></section><section><h3>范围与方法</h3><ul><li>授权范围、最小权限、允许动作和停止条件已在任务建立阶段冻结。</li><li>执行过程遵循 ${esc(current.plan.map((step) => step.name).join(' → '))}。</li></ul></section><section><h3>关键证据</h3><table><thead><tr><th>时间</th><th>工具</th><th>结论</th></tr></thead><tbody>${asset.trace.slice(0,3).map((row)=>`<tr><td>${esc(row.time)}</td><td>${esc(row.tool)}</td><td>${esc(row.title)}</td></tr>`).join('')}</tbody></table></section><section><h3>建议</h3><ol><li>将本次证据与结论纳入复测基线。</li><li>对低置信观察继续保留人工复核与数据回流。</li></ol></section><details><summary>查看原始 Markdown</summary><pre>${esc(reportMarkdown(asset))}</pre></details></section>`;
  }

  function renderAssetDetail(asset) {
    if (!asset) return '';
    const report = asset.category === 'report';
    return `<div class="asset-modal-backdrop"><section class="asset-modal ${report ? 'report-modal' : ''}" role="dialog" aria-modal="true" aria-label="资产详情"><header><div><span>${report ? '报告产出 · Markdown 预览' : '数据集产出 · Trace 详情'}</span><h2>${esc(asset.type)}</h2><p>${esc(asset.count)} · ${esc(asset.usage)}</p></div><button id="close-asset-detail">×</button></header>${report ? renderReportPreview(asset) : `<div class="asset-trace">${asset.trace.map((row) => `<article><code>${esc(row.time)}</code><span>${esc(row.type)}</span><b>${esc(row.tool)}</b><p>${esc(row.title)}</p><small>${esc(row.detail)}</small></article>`).join('')}</div>`}<a class="primary-button asset-download" download="${assetFilename(asset)}" href="${assetHref(asset)}">${report ? '下载 Markdown 报告 ↓' : '导出 Trace JSON ↓'}</a></section></div>`;
  }

  function renderAssetGroup(current, category, title, subtitle) {
    const assets=current.assets.filter((asset) => asset.category === category);
    return `<section class="asset-group"><div><span>${title}</span><small>${subtitle}</small></div>${assets.map((asset) => `<article class="asset-card"><button class="asset-open" data-asset="${esc(asset.id)}"><div><span>${esc(asset.id)}</span><em>${state.phase === 'completed' ? esc(asset.state) : '生成中'}</em></div><h3>${esc(asset.type)}</h3><p>${esc(asset.count)} · ${esc(asset.usage)}</p><small>点击查看 ${category === 'report' ? 'Markdown 报告' : 'Trace'}</small></button><a class="asset-download" download="${assetFilename(asset)}" href="${assetHref(asset)}">${category === 'report' ? '下载 MD ↓' : '导出 JSON ↓'}</a></article>`).join('')}</section>`;
  }

  function renderAssets() {
    const current=scenario(), drawer=$('#asset-drawer'); const detail=current.assets.find((asset) => asset.id === state.assetDetail);
    drawer.innerHTML=`<div class="drawer-head"><div><span>资产空间</span><small>按任务归档的报告与数据集</small></div><button id="close-assets">×</button></div><div class="drawer-task"><small>来源任务</small><b>${taskId()}</b><span>${esc(phaseLabel())}</span></div>${renderAssetGroup(current,'report','报告产出','结论、评估、复测与场景报告')}${renderAssetGroup(current,'dataset','数据集产出','轨迹、运行记录、样本与回放数据')}<div class="drawer-foot">演示数据 · 项目隔离 · 用途授权独立 · 导出受控</div>`;
    $('#close-assets').addEventListener('click', toggleAssets); $$('[data-asset]',drawer).forEach((button)=>button.addEventListener('click',()=>{state.assetDetail=button.dataset.asset; render();}));
    $('#asset-modal').innerHTML=renderAssetDetail(detail);
    $('#close-asset-detail')?.addEventListener('click',()=>{state.assetDetail=null; render();});
  }

  function bindStudio() {
    $('#reset-task').addEventListener('click', resetDemo); $('#show-assets')?.addEventListener('click', toggleAssets); $('#open-assets')?.addEventListener('click', toggleAssets); $('#open-data')?.addEventListener('click', () => switchTab('data')); $('#fast-forward')?.addEventListener('click', fastForward);
    $('#submit-intervention')?.addEventListener('click', submitIntervention); $('#intervention-input')?.addEventListener('keydown',(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitIntervention();}});
    $('#workspace-assets')?.addEventListener('click', toggleAssets);
    $$('[data-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    $$('[data-event]').forEach((button) => button.addEventListener('click', () => { state.selectedEvent = button.dataset.event; state.workspaceTab = 'canvas'; render(); }));
    $$('[data-twin]').forEach((button) => button.addEventListener('click', () => { state.selectedTwinAsset = button.dataset.twin; render(); }));
    $$('[data-asset]').forEach((button) => button.addEventListener('click', () => { state.assetDetail = button.dataset.asset; render(); }));
    requestAnimationFrame(()=>{const scroll=$('#conversation-scroll');if(scroll)scroll.scrollTop=scroll.scrollHeight;});
  }

  function submitIntervention() {
    const input = $('#intervention-input'); const text = input?.value.trim();
    if (!text) return toast('请输入要同步到执行画布的干预内容');
    const current = currentEvent(); state.operatorInterventions.push({ id: `OP-${String(state.operatorInterventions.length + 1).padStart(2, '0')}`, time: current.time, text, response: `已关联到 ${current.id} · ${current.title}，执行画布将在当前里程碑下显示该约束。` });
    state.workspaceTab = 'canvas'; render(); toast('干预已写入运行记录并同步到执行画布');
  }
  function fastForward() {
    if (state.phase === 'completed') return;
    stopTimer(); state.eventIndex = scenario().events.length - 1; state.selectedEvent = scenario().events.at(-1).id; state.phase = 'completed'; state.playing = false; state.workspaceTab = 'data'; render(); toast('已快进至任务完成，可查看产出物');
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
    if (state.eventIndex === current.events.length - 1) return finishRun();
    render();
  }

  function finishRun() { state.phase = 'completed'; state.playing = false; state.eventIndex = scenario().events.length - 1; state.selectedEvent = scenario().events.at(-1).id; state.workspaceTab = 'data'; render(); }
  function stopTimer() { if (timer) clearTimeout(timer); timer = null; }
  function stopStream() { if (streamTimer) clearInterval(streamTimer); streamTimer = null; }
  function streamLines(root) {
    stopStream();
    const lines = Array.from(root.querySelectorAll('.cot-line[data-full]'));
    if (!lines.length) return;
    const caret = document.createElement('span');
    caret.className = 'cot-caret';
    lines.forEach((line) => line.insertBefore(document.createTextNode(''), line.firstChild));
    lines[0].appendChild(caret);
    let lineIndex = 0;
    let charIndex = 0;
    streamTimer = setInterval(() => {
      const line = lines[lineIndex];
      if (!line) return stopStream();
      const full = line.dataset.full || '';
      charIndex = Math.min(full.length, charIndex + 2);
      line.firstChild.nodeValue = full.slice(0, charIndex);
      const host = document.scrollingElement;
      if (host && host.scrollHeight - (window.scrollY + window.innerHeight) < 160) window.scrollTo(0, host.scrollHeight);
      if (charIndex >= full.length) {
        lineIndex += 1;
        charIndex = 0;
        if (lineIndex >= lines.length) return stopStream();
        lines[lineIndex].appendChild(caret);
      }
    }, 16);
  }
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
