(() => {
  'use strict';

  const { scenario, presets } = window.DEMO_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  const initialState = {
    prompt: scenario.prompt,
    mode: 'Auto',
    phase: 'home',
    creationIndex: -1,
    eventIndex: -1,
    workspaceTab: 'task',
    selectedEvent: 'EV-001',
    sampleCount: scenario.samples,
    duration: scenario.duration,
    speed: 1,
    assetsOpen: false,
    playing: false
  };

  const state = { ...initialState, ...JSON.parse(localStorage.getItem('frontier-demo-state') || '{}'), playing: false };
  let timer = null;

  function persist() {
    localStorage.setItem('frontier-demo-state', JSON.stringify({ ...state, playing: false, assetsOpen: false }));
  }

  function route() {
    const value = location.hash.replace(/^#\//, '');
    if (['dialogue', 'workbench', 'data', 'report'].includes(value)) return 'studio';
    return ['home', 'studio'].includes(value) ? value : 'home';
  }

  function phaseIndex() {
    if (route() === 'home' || state.phase === 'home' || state.phase === 'draft' || state.phase === 'creating') return 0;
    if (state.phase === 'created' || state.phase === 'running' || state.phase.startsWith('gate')) return 1;
    if (state.phase === 'completed' && state.workspaceTab === 'report') return 3;
    if (state.phase === 'completed') return 2;
    return 0;
  }

  function phaseLabel() {
    return ({ home: '等待输入', draft: '待确认', creating: '正在创建任务', created: 'Agent 已就绪', running: '仿真执行中', 'gate-risk': '等待人工决策', 'gate-conflict': '等待恢复决策', completed: '任务已完成' })[state.phase] || '等待输入';
  }

  function currentEvent() {
    return scenario.events[Math.max(0, state.eventIndex)] || scenario.events[0];
  }

  function pipelineProgress() {
    if (state.phase === 'completed') return 6;
    if (state.eventIndex >= 9) return 5;
    if (state.eventIndex >= 7) return 4;
    if (state.eventIndex >= 5) return 3;
    if (state.eventIndex >= 2) return 2;
    if (state.eventIndex >= 0) return 1;
    return 0;
  }

  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2200);
  }

  function renderShell() {
    const step = phaseIndex();
    $('#global-flow').innerHTML = ['定义任务', 'Agent 执行', '数据生产', '决策结论'].map((label, index) => `
      <div class="global-step ${index < step ? 'done' : ''} ${index === step ? 'active' : ''}">
        <span>${index < step ? '✓' : index + 1}</span><b>${label}</b>
      </div>${index < 3 ? '<i></i>' : ''}`).join('');
    const shellLabel = route() === 'home' ? '等待输入' : phaseLabel();
    $('#run-state').innerHTML = `<span class="status-dot ${state.phase === 'running' && route() !== 'home' ? 'pulse' : ''}"></span>${shellLabel}`;
    $('#asset-toggle').classList.toggle('active', state.assetsOpen);
    $('#asset-drawer').classList.toggle('open', state.assetsOpen);
  }

  function render() {
    stopTimer();
    renderShell();
    const view = $('#view');
    if (route() === 'home') {
      view.innerHTML = renderHome();
      bindHome();
    } else {
      if (state.phase === 'home') state.phase = 'draft';
      view.innerHTML = renderStudio();
      bindStudio();
      if (state.phase === 'creating') continueCreation();
      if (state.phase === 'running' && state.playing) continueRun();
    }
    renderAssets();
    persist();
  }

  function renderHome() {
    return `
      <section class="home-page">
        <div class="home-hero">
          <div class="eyebrow">A SECURITY AGENT OPERATING SYSTEM</div>
          <h1>从一句安全目标开始<br><span>创建并运行 Agent 任务</span></h1>
          <p>AI 将业务意图转化为受控任务，在数字孪生靶场中执行，并把全过程沉淀为可复用数据资产。</p>
          <div class="prompt-box">
            <textarea id="task-prompt" rows="5" aria-label="描述安全任务">${esc(state.prompt)}</textarea>
            <div class="prompt-toolbar">
              <div class="mode-group">
                <button class="mode-button" id="task-type">安全评估⌄</button>
                <button class="mode-button active" id="mode-button">✦ ${esc(state.mode)}</button>
              </div>
              <button class="start-button" id="start-task">开始创建 <span>→</span></button>
            </div>
          </div>
          <div class="boundary-note"><span>✓</span> 演示数据 · 所有动作仅发生在隔离数字孪生靶场</div>
        </div>
        <div class="preset-section">
          <div class="preset-heading"><span>推荐任务</span><small>选择示例会自动填充任务描述</small></div>
          <div class="preset-grid">
            ${presets.map((item, index) => `<button class="preset-card ${index === 0 ? 'featured' : ''}" data-preset="${item.id}">
              <div class="preset-top"><span>${esc(item.tag)}</span><i>0${index + 1}</i></div>
              <h3>${esc(item.title)}</h3><p>${esc(item.subtitle)}</p>
              <div class="preset-tags"><span>${index === 0 ? '越权验证' : index === 1 ? '提示注入' : '补丁回归'}</span><span>${index === 2 ? '数据回流' : '受控执行'}</span></div>
            </button>`).join('')}
          </div>
        </div>
      </section>`;
  }

  function bindHome() {
    $('#task-prompt').addEventListener('input', (event) => { state.prompt = event.target.value; persist(); });
    $('#start-task').addEventListener('click', () => {
      state.prompt = $('#task-prompt').value.trim() || scenario.prompt;
      Object.assign(state, { phase: 'draft', creationIndex: -1, eventIndex: -1, workspaceTab: 'task', selectedEvent: 'EV-001', playing: false, assetsOpen: false });
      location.hash = '#/studio';
    });
    $$('#view [data-preset]').forEach((button) => button.addEventListener('click', () => {
      const preset = presets.find((item) => item.id === button.dataset.preset);
      state.prompt = preset.prompt;
      $('#task-prompt').value = preset.prompt;
      $$('.preset-card').forEach((card) => card.classList.toggle('selected', card === button));
      toast(`已载入：${preset.title}`);
      persist();
    }));
    $('#mode-button').addEventListener('click', () => {
      state.mode = state.mode === 'Auto' ? '深度编排' : 'Auto';
      render();
    });
    $('#task-type').addEventListener('click', () => toast('前沿版聚焦安全评估任务'));
  }

  function renderStudio() {
    return `
      <section class="studio-page">
        <header class="studio-head">
          <div>
            <a href="#/home" class="back-link">← 新建任务</a>
            <h1>${esc(scenario.title)}</h1>
            <p><span class="demo-pill">演示数据</span> TASK-20260916-01 · ${esc(phaseLabel())}</p>
          </div>
          <div class="studio-actions">
            <button class="ghost-button" id="reset-task">重置</button>
            ${state.phase === 'completed' ? '<button class="primary-button" id="view-report">查看决策结论 →</button>' : ''}
          </div>
        </header>
        <div class="studio-grid">
          <section class="conversation-pane">
            <div class="pane-title"><div><span>任务会话</span><small>从意图到执行的完整过程</small></div><span class="live-chip"><i></i>${esc(phaseLabel())}</span></div>
            <div class="conversation-scroll" id="conversation-scroll">
              ${renderConversation()}
            </div>
            ${renderComposer()}
          </section>
          <section class="workspace-pane">
            ${renderWorkspace()}
          </section>
        </div>
      </section>`;
  }

  function renderConversation() {
    const creationVisible = state.creationIndex >= 0 || ['created', 'running', 'gate-risk', 'gate-conflict', 'completed'].includes(state.phase);
    const eventsVisible = state.eventIndex >= 0;
    return `
      <article class="message user-message"><div class="avatar human">您</div><div><small>任务目标</small><p>${esc(state.prompt)}</p></div></article>
      <article class="message agent-message"><div class="avatar agent">AI</div><div><small>意图理解</small><p>我会优先验证越权与漏洞利用风险，使用 ${state.sampleCount} 个高危样本，在 ${state.duration} 分钟预算内完成。所有动作仅在隔离数字孪生靶场执行。</p><div class="intent-tags"><span>对象 · 自主运维 Agent</span><span>风险 · 越权 / 漏洞利用</span><span>边界 · 隔离执行</span></div></div></article>
      ${state.phase === 'draft' ? renderClarification() : ''}
      ${creationVisible ? renderCreationStream() : ''}
      ${eventsVisible ? renderExecutionStream() : ''}
      ${state.phase === 'gate-risk' ? renderRiskGate() : ''}
      ${state.phase === 'gate-conflict' ? renderConflictGate() : ''}
      ${state.phase === 'completed' ? renderCompletionMessage() : ''}`;
  }

  function renderClarification() {
    return `<article class="message agent-message decision-message"><div class="avatar agent">AI</div><div><small>执行建议</small><p>建议采用“高风险优先”：减少低风险覆盖，把演示重点放在越权路径、策略闸门和失败恢复。</p><div class="choice-grid">
      <label>样本规模<select id="sample-count"><option value="10">10 个 · 快速</option><option value="20" selected>20 个 · 推荐</option><option value="40">40 个 · 深度</option></select></label>
      <label>时间预算<select id="duration"><option value="15">15 分钟</option><option value="30" selected>30 分钟</option><option value="55">55 分钟</option></select></label>
    </div><button class="primary-button full" id="confirm-create">确认并创建 Agent 任务 <span>→</span></button></div></article>`;
  }

  function renderCreationStream() {
    const complete = ['created', 'running', 'gate-risk', 'gate-conflict', 'completed'].includes(state.phase);
    return `<article class="process-block"><div class="process-head"><div><span class="process-icon">✦</span><b>Agent 创建任务</b></div><em>${complete ? '4 步完成' : `${Math.max(0, state.creationIndex + 1)} / 4`}</em></div>
      <div class="tool-list">${scenario.creation.map((item, index) => {
        const visible = complete || index <= state.creationIndex;
        const active = !complete && index === state.creationIndex;
        return `<div class="tool-row ${visible ? 'visible' : ''} ${active ? 'active' : ''}"><span>${visible ? (active ? '◌' : '✓') : index + 1}</span><div><code>${esc(item.tool)}</code><b>${esc(item.title)}</b><small>${visible ? esc(item.result) : '等待上一步完成'}</small></div></div>`;
      }).join('')}</div>
      ${complete ? '<div class="process-result"><span>✓</span><div><b>Agent 任务已创建</b><small>TASK-20260916-01 · revision 1 · 安全策略已冻结</small></div></div>' : ''}
    </article>`;
  }

  function renderExecutionStream() {
    return `<article class="process-block execution-block"><div class="process-head"><div><span class="process-icon run">◎</span><b>Agent 执行任务</b></div><em>${state.phase === 'completed' ? '11 步完成' : `${state.eventIndex + 1} / 11`}</em></div>
      <div class="event-stream">${scenario.events.slice(0, state.eventIndex + 1).map((event, index) => `<button class="event-row type-${event.type.toLowerCase()} ${state.selectedEvent === event.id ? 'selected' : ''}" data-event="${event.id}">
        <span class="event-marker">${event.type === 'ACTION' ? '▶' : event.type === 'QUESTION' ? '!' : event.type === 'RESULT' ? '✓' : '●'}</span>
        <div><div><code>${esc(event.tool)}</code><time>${event.time}</time></div><b>${esc(event.title)}</b><small>${esc(event.detail)}</small></div><em>${esc(event.status)}</em>
      </button>`).join('')}</div></article>`;
  }

  function renderRiskGate() {
    return `<article class="gate-card warning"><div class="gate-label">需要您的决定</div><h3>是否扩大验证范围？</h3><p>Agent 发现潜在越权路径。为保持最小权限，建议继续在当前隔离环境验证。</p><div class="gate-options"><button class="primary-button" data-decision="isolate">保持隔离验证</button><button class="ghost-button" data-decision="static">仅使用静态证据</button></div></article>`;
  }

  function renderConflictGate() {
    return `<article class="gate-card danger"><div class="gate-label">证据冲突 · 执行已暂停</div><h3>选择失败恢复策略</h3><p>运行时回显与策略快照不一致。失败记录会保留并进入数据生产管线。</p><div class="gate-options"><button class="primary-button" data-recovery="alternate">切换替代工具</button><button class="ghost-button" data-recovery="review">转人工复核</button></div></article>`;
  }

  function renderCompletionMessage() {
    return `<article class="message agent-message final-message"><div class="avatar agent">AI</div><div><small>任务完成</small><h3>结论与数据资产已同时生成</h3><p>${esc(scenario.report.conclusion)}</p><div class="result-kpis"><span><b>38</b>轨迹事件</span><span><b>17</b>证据节点</span><span><b>6</b>待复核标注</span><span><b>3</b>数据类型</span></div><button class="primary-button" id="open-data">查看数据生产结果 →</button></div></article>`;
  }

  function renderComposer() {
    if (state.phase === 'draft') return '<div class="composer-note">先确认任务参数，再创建执行 Agent</div>';
    if (state.phase === 'creating') return '<div class="composer-note running"><i></i> 正在创建任务并绑定安全策略…</div>';
    if (state.phase === 'created') return '<div class="composer-action"><div><b>Agent 已就绪</b><small>任务快照与安全边界已冻结</small></div><button class="primary-button" id="start-run">启动仿真执行 <span>→</span></button></div>';
    if (state.phase === 'running') return `<div class="composer-action"><div><b>正在执行第 ${state.eventIndex + 1} / 11 步</b><small>可暂停或单步推进</small></div><div><button class="ghost-button" id="toggle-run">${state.playing ? '暂停' : '继续'}</button><button class="primary-button" id="next-step">下一步</button></div></div>`;
    if (state.phase.startsWith('gate')) return '<div class="composer-note waiting">执行已安全暂停，等待上方决策</div>';
    return '<div class="composer-action"><div><b>本轮演示已完成</b><small>可查看数据资产与决策结论</small></div><button class="ghost-button" id="replay-run">重新播放</button></div>';
  }

  function renderWorkspace() {
    const tabs = [
      ['task', '任务卡'], ['plan', '执行画布'], ['twin', '数字孪生'], ['data', '数据管线'], ['report', '决策结论']
    ];
    return `<div class="workspace-head"><div><span>工作空间</span><small>任务事实与执行结果实时联动</small></div><button class="asset-mini" id="workspace-assets">◇ 资产空间</button></div>
      <nav class="workspace-tabs">${tabs.map(([id, label]) => `<button data-tab="${id}" class="${state.workspaceTab === id ? 'active' : ''}">${label}${id === 'data' && pipelineProgress() ? `<i>${pipelineProgress()}/6</i>` : ''}</button>`).join('')}</nav>
      <div class="workspace-content">${renderWorkspaceTab()}</div>`;
  }

  function renderWorkspaceTab() {
    if (state.workspaceTab === 'plan') return renderPlan();
    if (state.workspaceTab === 'twin') return renderTwin();
    if (state.workspaceTab === 'data') return renderPipeline();
    if (state.workspaceTab === 'report') return renderReport();
    return renderTaskCard();
  }

  function renderTaskCard() {
    const created = ['created', 'running', 'gate-risk', 'gate-conflict', 'completed'].includes(state.phase);
    return `<div class="workspace-section"><div class="artifact-title"><div><span>01</span><h2>Agent 任务定义</h2></div><em>${created ? '已冻结 · revision 1' : '草稿'}</em></div>
      <div class="objective-card"><small>目标</small><h3>${esc(scenario.objective)}</h3></div>
      <div class="field-grid">
        <div><small>测试对象</small><b>${esc(scenario.subject)}</b></div><div><small>场景环境</small><b>${esc(scenario.environment)}</b></div>
        <div><small>样本规模</small><b>${state.sampleCount} 个高危样本</b></div><div><small>时间预算</small><b>${state.duration} 分钟</b></div>
        <div><small>风险优先级</small><b>${esc(scenario.priority)}</b></div><div><small>执行模式</small><b>仿真执行</b></div>
      </div>
      <div class="policy-card"><div class="section-label">安全边界</div>${scenario.policy.map((item) => `<p><span>✓</span>${esc(item)}</p>`).join('')}</div>
      <div class="definition-flow"><div><span>输入</span><b>业务目标</b></div><i>→</i><div><span>编排</span><b>任务快照</b></div><i>→</i><div><span>执行体</span><b>安全 Agent</b></div></div>
      ${state.phase === 'draft' ? '<p class="workspace-hint">在左侧确认参数后，系统将自动创建任务快照并实例化执行 Agent。</p>' : ''}
    </div>`;
  }

  function renderPlan() {
    const activeStage = currentEvent().stage;
    return `<div class="workspace-section"><div class="artifact-title"><div><span>02</span><h2>Agent 执行画布</h2></div><em>${state.eventIndex < 0 ? '等待启动' : `当前 ${activeStage + 1} / 5`}</em></div>
      <div class="plan-flow">${scenario.plan.map((node, index) => `<div class="plan-node ${index < activeStage ? 'done' : ''} ${index === activeStage && state.eventIndex >= 0 ? 'active' : ''}"><span>${index < activeStage ? '✓' : index + 1}</span><div><b>${esc(node.name)}</b><small>${esc(node.detail)}</small></div></div>`).join('')}</div>
      ${state.eventIndex >= 0 ? `<div class="current-action"><div class="section-label">当前动作</div><h3>${esc(currentEvent().title)}</h3><p>${esc(currentEvent().detail)}</p><div class="action-meta"><span>工具 · ${esc(currentEvent().tool)}</span><span>事件 · ${esc(currentEvent().id)}</span><span>状态 · ${esc(currentEvent().status)}</span></div></div>` : '<div class="empty-workspace">启动执行后，计划节点、工具调用和重规划分支会在这里同步更新。</div>'}
      ${state.eventIndex >= 5 ? '<div class="replan-branch"><span>重规划分支</span><b>最小权限检查 → 静态证据交叉验证</b><small>由 EV-004 人工决策触发 · 预算 +2 分钟</small></div>' : ''}
    </div>`;
  }

  function renderTwin() {
    const active = Math.max(0, Math.min(5, currentEvent().stage + (state.eventIndex > 7 ? 1 : 0)));
    const nodes = ['任务控制面', '孪生 K8s 集群', '服务账户边界', '策略验证器', '证据规整器', '决策摘要'];
    return `<div class="workspace-section"><div class="artifact-title"><div><span>03</span><h2>数字孪生反馈</h2></div><em>隔离环境 · 仿真状态</em></div>
      <div class="twin-canvas"><svg viewBox="0 0 760 330" role="img" aria-label="数字孪生节点拓扑"><path class="link" d="M115 90 C220 90 220 90 315 90"/><path class="link" d="M410 90 C520 90 520 90 630 90"/><path class="link" d="M630 125 C630 205 520 225 410 225"/><path class="link" d="M315 225 C220 225 220 225 115 225"/></svg>${nodes.map((name, index) => `<button class="twin-node n${index + 1} ${index < active ? 'done' : ''} ${index === active ? 'active' : ''}"><span>${index < active ? '✓' : index + 1}</span><b>${esc(name)}</b><small>${index === 2 && state.eventIndex >= 2 ? '高风险 · 权限异常' : index === 3 && state.eventIndex >= 5 ? '最小权限分支' : index <= active ? '状态已同步' : '等待事件'}</small></button>`).join('')}</div>
      <div class="twin-summary"><span><i class="safe"></i>网络隔离</span><span><i class="safe"></i>真实凭据禁用</span><span><i class="${state.eventIndex >= 2 ? 'risk' : 'safe'}"></i>${state.eventIndex >= 2 ? '1 个风险节点' : '风险节点待检测'}</span></div>
    </div>`;
  }

  function renderPipeline() {
    const progress = pipelineProgress();
    return `<div class="workspace-section"><div class="artifact-title"><div><span>04</span><h2>执行即数据生产</h2></div><em>${progress} / 6 阶段</em></div>
      <p class="workspace-lead">Agent 每执行一步，轨迹、证据、标注与质量状态就同步进入生产管线，不再等任务结束后人工整理。</p>
      <div class="pipeline-flow">${scenario.pipeline.map((item, index) => `<div class="pipeline-stage ${index < progress ? 'done' : ''} ${index === progress && progress < 6 ? 'active' : ''}"><div class="pipeline-index">${index < progress ? '✓' : index + 1}</div><div><b>${esc(item.name)}</b><small>${esc(item.owner)}</small><p><span>输入</span>${esc(item.input)}</p><p><span>输出</span>${index < progress || state.phase === 'completed' ? esc(item.output) : '等待上游'}</p></div></div>`).join('<i class="pipeline-arrow">→</i>')}</div>
      <div class="lineage-card"><div class="section-label">数据血缘</div><div class="lineage-chain"><span>TASK-20260916-01</span><i>→</i><span>RUN-01</span><i>→</i><span>EV-001…011</span><i>→</i><span>DA-004</span></div><p>任务 → Run → 事件 → 证据 → 标注 → 数据包，全链可回指。</p></div>
      <div class="data-kpis"><span><b>${progress >= 1 ? '38' : '—'}</b>轨迹事件</span><span><b>${progress >= 2 ? '17' : '—'}</b>证据节点</span><span><b>${progress >= 4 ? '6' : '—'}</b>待复核</span><span><b>${progress >= 6 ? '3' : '—'}</b>数据类型</span></div>
    </div>`;
  }

  function renderReport() {
    const ready = state.phase === 'completed';
    return `<div class="workspace-section"><div class="artifact-title"><div><span>05</span><h2>一页决策结论</h2></div><em>${ready ? '已生成' : '随执行更新'}</em></div>
      ${ready ? `<div class="report-conclusion"><span>结论</span><h3>${esc(scenario.report.conclusion)}</h3><small>${esc(scenario.report.confidence)} · 演示数据，不代表真实测评结论</small></div>
      <div class="metric-list">${scenario.report.metrics.map(([label, value, baseline]) => `<div><span>${esc(label)}</span><div class="metric-track"><i style="width:${baseline}%"></i><b style="width:${value}%"></b></div><em>${value}</em></div>`).join('')}</div>
      <div class="report-columns"><div><div class="section-label">主要风险</div>${scenario.report.risks.map((item) => `<p><span class="risk-dot"></span>${esc(item)}</p>`).join('')}</div><div><div class="section-label">下一步投入</div>${scenario.report.recommendations.map((item, index) => `<p><b>0${index + 1}</b>${esc(item)}</p>`).join('')}</div></div>` : '<div class="empty-workspace large"><b>结论正在随执行过程形成</b><p>任务完成后，这里将用一页回答：能力如何、风险在哪里、下一步投什么。</p></div>'}
    </div>`;
  }

  function renderAssets() {
    const drawer = $('#asset-drawer');
    drawer.innerHTML = `<div class="drawer-head"><div><span>资产空间</span><small>当前任务沉淀的数据资产</small></div><button id="close-assets">×</button></div><div class="drawer-task"><small>来源任务</small><b>TASK-20260916-01</b><span>${esc(phaseLabel())}</span></div><div class="asset-list">${scenario.assets.map((asset, index) => `<article class="asset-card"><div><span>DA-00${index + 1}</span><em>${state.phase === 'completed' || index < pipelineProgress() - 1 ? esc(asset.state) : '生成中'}</em></div><h3>${esc(asset.type)}</h3><p>${esc(asset.count)} · ${esc(asset.usage)}</p><small>来源 ${esc(asset.source)}</small></article>`).join('')}</div><div class="drawer-foot">演示数据 · 数据隔离 · 用途授权独立</div>`;
    $('#close-assets').addEventListener('click', toggleAssets);
  }

  function bindStudio() {
    $('#reset-task').addEventListener('click', resetDemo);
    $('#view-report')?.addEventListener('click', () => switchTab('report'));
    $('#confirm-create')?.addEventListener('click', () => {
      state.sampleCount = Number($('#sample-count').value);
      state.duration = Number($('#duration').value);
      state.phase = 'creating';
      state.creationIndex = 0;
      state.workspaceTab = 'task';
      render();
    });
    $('#start-run')?.addEventListener('click', startRun);
    $('#toggle-run')?.addEventListener('click', () => { state.playing = !state.playing; render(); });
    $('#next-step')?.addEventListener('click', stepRun);
    $('#replay-run')?.addEventListener('click', () => { state.phase = 'created'; state.eventIndex = -1; state.workspaceTab = 'plan'; render(); });
    $('#open-data')?.addEventListener('click', () => switchTab('data'));
    $('#workspace-assets')?.addEventListener('click', toggleAssets);
    $$('[data-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    $$('[data-event]').forEach((button) => button.addEventListener('click', () => { state.selectedEvent = button.dataset.event; state.workspaceTab = 'plan'; render(); }));
    $$('[data-decision]').forEach((button) => button.addEventListener('click', () => resolveGate('risk', button.dataset.decision)));
    $$('[data-recovery]').forEach((button) => button.addEventListener('click', () => resolveGate('conflict', button.dataset.recovery)));
    requestAnimationFrame(() => { const scroll = $('#conversation-scroll'); if (scroll) scroll.scrollTop = scroll.scrollHeight; });
  }

  function switchTab(tabName) {
    state.workspaceTab = tabName;
    render();
  }

  function continueCreation() {
    timer = setTimeout(() => {
      if (state.phase !== 'creating') return;
      if (state.creationIndex < scenario.creation.length - 1) {
        state.creationIndex += 1;
      } else {
        state.phase = 'created';
      }
      render();
    }, 650);
  }

  function startRun() {
    state.phase = 'running';
    state.eventIndex = -1;
    state.workspaceTab = 'plan';
    state.playing = true;
    render();
  }

  function continueRun() {
    timer = setTimeout(stepRun, Math.round(1100 / state.speed));
  }

  function stepRun() {
    stopTimer();
    if (state.eventIndex >= scenario.events.length - 1) {
      finishRun();
      return;
    }
    state.eventIndex += 1;
    const event = scenario.events[state.eventIndex];
    state.selectedEvent = event.id;
    if (event.gate === 'risk') {
      state.phase = 'gate-risk';
      state.playing = false;
      state.workspaceTab = 'twin';
    } else if (event.gate === 'conflict') {
      state.phase = 'gate-conflict';
      state.playing = false;
      state.workspaceTab = 'plan';
    } else if (state.eventIndex === scenario.events.length - 1) {
      finishRun();
      return;
    }
    render();
  }

  function resolveGate(type, decision) {
    toast(type === 'risk' ? (decision === 'isolate' ? '已保持隔离边界，Agent 开始重规划' : '已切换为静态证据验证') : (decision === 'alternate' ? '已切换替代工具，失败记录进入数据管线' : '已转入人工复核队列'));
    state.eventIndex += 1;
    state.selectedEvent = scenario.events[state.eventIndex].id;
    state.phase = 'running';
    state.playing = true;
    state.workspaceTab = type === 'risk' ? 'plan' : 'data';
    render();
  }

  function finishRun() {
    state.phase = 'completed';
    state.playing = false;
    state.eventIndex = scenario.events.length - 1;
    state.selectedEvent = scenario.events.at(-1).id;
    state.workspaceTab = 'data';
    render();
  }

  function stopTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function toggleAssets() {
    state.assetsOpen = !state.assetsOpen;
    renderShell();
    renderAssets();
  }

  function resetDemo() {
    stopTimer();
    Object.assign(state, { ...initialState, phase: route() === 'studio' ? 'draft' : 'home' });
    localStorage.removeItem('frontier-demo-state');
    render();
    toast('演示已重置');
  }

  $('#brand-home').addEventListener('click', () => { location.hash = '#/home'; });
  $('#asset-toggle').addEventListener('click', toggleAssets);
  $('#reset-all').addEventListener('click', resetDemo);
  window.addEventListener('hashchange', render);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.assetsOpen) toggleAssets();
  });

  if (!location.hash) location.hash = '#/home';
  render();
})();
