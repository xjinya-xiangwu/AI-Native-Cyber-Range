(() => {
  'use strict';

  const commonPolicy = [
    '仅在授权、隔离的靶场或数字孪生环境执行',
    '禁止连接真实业务网络、真实账号与生产凭据',
    '破坏性或越界动作必须经过人工闸门',
    '完整保留工具回显、环境快照与停止原因'
  ];

  const commonCreation = (type, environment) => [
    { id: 'C1', tool: 'scope_parser', title: '解析任务范围与授权', result: `识别为${type}，提取目标、排除项和成功标准` },
    { id: 'C2', tool: 'rules_of_engagement', title: '冻结交战规则', result: '绑定允许动作、停止条件、人工闸门和留痕要求' },
    { id: 'C3', tool: 'range_orchestrator', title: '编排环境与工具', result: `装载${environment}、基线快照和最小工具集` },
    { id: 'C4', tool: 'security_agent_factory', title: '创建执行 Agent', result: '生成任务快照、里程碑与可恢复检查点' }
  ];

  const commonPipeline = [
    { id: 'D1', name: 'Trace 采集', input: '计划 / 工具调用 / 环境事件', output: '长轨迹事件流', owner: 'Trace Collector' },
    { id: 'D2', name: '运行记录规整', input: '日志 / 流量 / 快照 / 回显', output: '可核验运行记录', owner: 'Evidence Normalizer' },
    { id: 'D3', name: '步骤与意图标注', input: '事件 + 里程碑 + 决策依据', output: '步骤级候选标注', owner: 'Label Agent' },
    { id: 'D4', name: '失败与分支提取', input: '暂停 / 冲突 / 重规划', output: '失败恢复与偏好样本', owner: 'Branch Miner' },
    { id: 'D5', name: '人工复核与质检', input: '低置信 / 高风险 / 敏感项', output: '复核结论与质量分', owner: 'Review Queue' },
    { id: 'D6', name: '数据封装与回流', input: '通过门禁的数据', output: '训练 / 评测 / 回放数据包', owner: 'Dataset Builder' }
  ];

  const scenarios = {
    'VULN-DISCOVERY': {
      id: 'VULN-DISCOVERY', type: '漏洞挖掘', tag: '典型任务 01',
      title: 'Web 业务系统漏洞挖掘', subtitle: '攻击面梳理、扫描、验证与去重',
      prompt: '在授权的 Web 靶场中开展漏洞挖掘：先确认范围和交战规则，再完成资产与攻击面梳理、自动化扫描、模糊测试、人工验证、风险分级与复测准备。只允许在隔离靶场执行。',
      objective: '发现并验证可复现的安全缺陷，形成去重后的漏洞清单、运行记录和复测基线。',
      subject: '电商业务靶场 · Web/API 资产', environment: '隔离 Web 靶场', samples: 24, duration: 45, priority: '高危与可达路径优先',
      policy: commonPolicy, creation: commonCreation('漏洞挖掘任务', '隔离 Web 靶场'),
      plan: [
        { id: 'P1', name: '授权定界', detail: '确认目标、排除项、允许动作与停止条件', deliverable: '范围快照' },
        { id: 'P2', name: '环境基线', detail: '创建靶场快照并校验监控、账号和回滚点', deliverable: '环境基线' },
        { id: 'P3', name: '攻击面测绘', detail: '资产发现、服务枚举、入口与依赖关系梳理', deliverable: '攻击面清单' },
        { id: 'P4', name: '发现与验证', detail: '扫描、模糊测试、手工验证与最小化复现', deliverable: '候选发现' },
        { id: 'P5', name: '研判去重', detail: '关联证据、确认可达性、风险分级和去重', deliverable: '有效漏洞集' },
        { id: 'P6', name: '报告与复测', detail: '输出修复建议、复测条件并清理环境', deliverable: '漏洞报告' }
      ],
      topology: ['任务控制面', '侦察节点', 'WAF / 网关', 'Web / API', '身份与数据服务', '运行记录仓'],
      events: [
        { id: 'EV-001', type: 'PLAN', time: '00:00', stage: 0, tool: 'Scope Controller', title: '冻结授权范围与排除项', detail: '目标限定为靶场域名与测试账号，禁止访问外部依赖。', status: '完成' },
        { id: 'EV-002', type: 'ACTION', time: '00:42', stage: 1, tool: 'Range Snapshot', title: '建立环境基线与回滚点', detail: '记录版本、配置、测试数据与观测探针状态。', status: '完成' },
        { id: 'EV-003', type: 'ACTION', time: '03:10', stage: 2, tool: 'Surface Mapper', title: '完成资产与入口测绘', detail: '归并 Web、API、身份入口和关键依赖，未越出授权范围。', status: '完成' },
        { id: 'EV-004', type: 'OBSERVATION', time: '08:25', stage: 3, tool: 'Scanner + Fuzzer', title: '发现 7 个候选异常', detail: '其中 2 个涉及身份边界，需要低影响人工验证。', status: '待验证' },
        { id: 'EV-005', type: 'QUESTION', time: '08:31', stage: 3, tool: 'Safety Gate', title: '高风险验证需要人工确认', detail: '继续使用最小化请求验证，不执行持久化、批量读取或破坏性动作。', status: '等待确认', gate: 'risk' },
        { id: 'EV-006', type: 'INTERVENTION', time: '08:44', stage: 3, tool: 'Human Approval', title: '批准最小化验证', detail: '保持样本数据、单次请求和只读证据边界。', status: '完成' },
        { id: 'EV-007', type: 'EVIDENCE', time: '14:20', stage: 4, tool: 'Evidence Correlator', title: '确认 3 个有效漏洞并完成去重', detail: '每项均关联请求回显、日志、版本和可达路径。', status: '完成' },
        { id: 'EV-008', type: 'REPLAN', time: '16:05', stage: 4, tool: 'Hypothesis Planner', title: '调整验证顺序', detail: '优先补齐高危发现的前置条件与反证，低危项进入后续队列。', status: '完成' },
        { id: 'EV-009', type: 'ACTION', time: '21:40', stage: 5, tool: 'Retest Builder', title: '生成复测基线与修复建议', detail: '将复现条件转换为非武器化回归检查。', status: '完成' },
        { id: 'EV-010', type: 'RESULT', time: '24:12', stage: 5, tool: 'Artifact Builder', title: '封装漏洞挖掘产出物', detail: '报告、攻击面清单、运行记录和复测用例已归档。', status: '完成' }
      ],
      metrics: { traces: 126, evidence: 31, review: 5, datasets: 4, toolCalls: 48, checkpoints: 6 },
      outputs: [
        { type: '漏洞发现报告', count: '3 个有效漏洞', state: '已生成', usage: '风险研判与修复派单' },
        { type: '攻击面与资产清单', count: '18 个入口节点', state: '已冻结', usage: '后续复测基线' },
        { type: '非武器化复测用例', count: '7 条检查', state: '已生成', usage: '修复验证' },
        { type: '可核验运行记录', count: '31 个记录节点', state: '质量通过', usage: '审计与数据回流' }
      ]
    },

    'VULN-EXPLOIT': {
      id: 'VULN-EXPLOIT', type: '漏洞利用', tag: '典型任务 02',
      title: '已知漏洞受控利用验证', subtitle: '前置核验、利用链、影响边界与清理',
      prompt: '在授权的隔离靶场中验证一个已知漏洞是否可被利用：先核对版本与前置条件，再构建最小化利用链，执行受控验证、影响边界确认、环境清理和复测留痕。禁止连接真实网络和真实凭据。',
      objective: '验证已知漏洞的真实可利用性与影响边界，不扩大权限、不持久化并确保环境可恢复。',
      subject: '云原生应用靶场 · 已知漏洞样本', environment: '可回滚利用验证靶场', samples: 12, duration: 35, priority: '可利用性与影响边界优先',
      policy: commonPolicy, creation: commonCreation('漏洞利用验证任务', '可回滚利用验证靶场'),
      plan: [
        { id: 'P1', name: '授权与目标确认', detail: '核对目标、漏洞编号、禁止动作与停止条件', deliverable: '交战规则' },
        { id: 'P2', name: '前置条件核验', detail: '验证版本、配置、暴露面和依赖条件', deliverable: '可利用性假设' },
        { id: 'P3', name: '利用链构建', detail: '选择最小化、可观测、可回滚的验证路径', deliverable: '受控验证方案' },
        { id: 'P4', name: '受控利用', detail: '执行单目标验证并在高风险节点触发人工闸门', deliverable: '利用运行记录' },
        { id: 'P5', name: '影响边界验证', detail: '确认权限、数据与横向边界，不做持久化', deliverable: '影响范围' },
        { id: 'P6', name: '清理与归档', detail: '回滚快照、核验无残留并封装结果', deliverable: '清理证明' }
      ],
      topology: ['任务控制面', '验证节点', '入口网关', '易受影响服务', '隔离目标资源', '观测与回滚仓'],
      events: [
        { id: 'EV-001', type: 'PLAN', time: '00:00', stage: 0, tool: 'ROE Controller', title: '冻结目标与停止条件', detail: '仅允许单目标、单会话、可回滚验证。', status: '完成' },
        { id: 'EV-002', type: 'ACTION', time: '01:02', stage: 1, tool: 'Prerequisite Checker', title: '核验版本与配置前置条件', detail: '目标样本与漏洞条件匹配，外部依赖已替换为模拟服务。', status: '完成' },
        { id: 'EV-003', type: 'PLAN', time: '03:18', stage: 2, tool: 'Chain Planner', title: '生成最小化利用链', detail: '仅验证控制流与权限边界，不包含持久化和外传步骤。', status: '完成' },
        { id: 'EV-004', type: 'ACTION', time: '05:26', stage: 3, tool: 'Controlled Runner', title: '启动受控利用验证', detail: '运行在隔离容器和一次性测试数据上。', status: '完成' },
        { id: 'EV-005', type: 'QUESTION', time: '05:48', stage: 3, tool: 'Impact Gate', title: '即将进入权限边界验证', detail: '继续将触达模拟敏感资源，但不会读取真实数据或建立持久化。', status: '等待确认', gate: 'risk' },
        { id: 'EV-006', type: 'INTERVENTION', time: '06:03', stage: 3, tool: 'Human Approval', title: '批准隔离影响验证', detail: '限制为只读标记对象，并设置自动终止阈值。', status: '完成' },
        { id: 'EV-007', type: 'EVIDENCE', time: '08:32', stage: 4, tool: 'Boundary Observer', title: '确认漏洞可利用但横向边界被阻断', detail: '权限提升在模拟命名空间内成立，跨域访问被策略拒绝。', status: '完成' },
        { id: 'EV-008', type: 'ACTION', time: '10:15', stage: 5, tool: 'Cleanup Verifier', title: '执行快照回滚与残留检查', detail: '临时会话、测试对象和工具容器均已销毁。', status: '完成' },
        { id: 'EV-009', type: 'EVIDENCE', time: '12:20', stage: 5, tool: 'Replay Builder', title: '生成攻击路径回放', detail: '保留阶段、工具、观测、人工决策和停止原因。', status: '完成' },
        { id: 'EV-010', type: 'RESULT', time: '13:08', stage: 5, tool: 'Artifact Builder', title: '封装受控利用产出物', detail: '利用验证记录、影响边界、攻击路径和清理证明已归档。', status: '完成' }
      ],
      metrics: { traces: 98, evidence: 27, review: 4, datasets: 4, toolCalls: 36, checkpoints: 5 },
      outputs: [
        { type: '受控利用验证记录', count: '1 条完整链路', state: '已生成', usage: '确认真实可利用性' },
        { type: '攻击路径图', count: '6 个阶段节点', state: '已冻结', usage: '攻击链分析' },
        { type: '影响边界说明', count: '3 类边界', state: '已核验', usage: '风险定级' },
        { type: '环境清理证明', count: '5 项检查', state: '质量通过', usage: '安全闭环' }
      ]
    },

    'VULN-REMEDIATION': {
      id: 'VULN-REMEDIATION', type: '漏洞修复', tag: '典型任务 03',
      title: '漏洞修复与安全回归', subtitle: '复现、根因、补丁、回归与发布核验',
      prompt: '对已确认漏洞执行修复任务：在隔离环境复现问题并定位根因，设计最小补丁，完成代码与配置修复、安全回归、兼容性检查、发布前核验和复测闭环。保留失败尝试与补丁演进轨迹。',
      objective: '消除漏洞根因并证明修复有效、无明显回归，形成可审查补丁与复测记录。',
      subject: '代码仓与应用镜像 · 漏洞工单 VUL-2026-017', environment: '修复验证流水线', samples: 16, duration: 50, priority: '根因修复与无回归优先',
      policy: commonPolicy, creation: commonCreation('漏洞修复任务', '修复验证流水线'),
      plan: [
        { id: 'P1', name: '工单接收与分级', detail: '核验漏洞、资产、风险、责任人与发布窗口', deliverable: '修复任务单' },
        { id: 'P2', name: '隔离复现与根因', detail: '稳定复现并定位代码、配置或依赖根因', deliverable: '根因分析' },
        { id: 'P3', name: '补丁设计', detail: '比较代码修复、配置缓解和依赖升级方案', deliverable: '修复方案' },
        { id: 'P4', name: '实施与审查', detail: '生成最小补丁并完成静态检查和双人审查', deliverable: '补丁集' },
        { id: 'P5', name: '安全与业务回归', detail: '执行原漏洞复测、边界测试和兼容性回归', deliverable: '回归报告' },
        { id: 'P6', name: '发布核验与关闭', detail: '验证部署版本、监控与回滚策略后关闭工单', deliverable: '关闭记录' }
      ],
      topology: ['任务控制面', '代码与依赖仓', '构建流水线', '隔离复现环境', '回归测试集', '制品与审计仓'],
      events: [
        { id: 'EV-001', type: 'PLAN', time: '00:00', stage: 0, tool: 'Ticket Triage', title: '完成漏洞工单分级与责任绑定', detail: '冻结受影响版本、修复目标和发布约束。', status: '完成' },
        { id: 'EV-002', type: 'ACTION', time: '02:11', stage: 1, tool: 'Reproducer', title: '在隔离环境稳定复现', detail: '复现条件、失败日志和环境版本已固化。', status: '完成' },
        { id: 'EV-003', type: 'OBSERVATION', time: '05:42', stage: 1, tool: 'Root Cause Analyzer', title: '定位到授权校验顺序缺陷', detail: '问题源于共享中间件的边界检查晚于资源解析。', status: '完成' },
        { id: 'EV-004', type: 'PLAN', time: '08:06', stage: 2, tool: 'Patch Planner', title: '比较三种修复方案', detail: '选择共享校验层最小补丁，避免在多个调用点重复打补丁。', status: '完成' },
        { id: 'EV-005', type: 'ACTION', time: '12:30', stage: 3, tool: 'Patch Agent', title: '生成补丁并通过静态检查', detail: '修改共享入口并补充一个安全回归用例。', status: '完成' },
        { id: 'EV-006', type: 'QUESTION', time: '14:02', stage: 3, tool: 'Change Gate', title: '补丁涉及共享授权组件', detail: '需要确认是否进入完整业务回归，而非仅执行漏洞复测。', status: '等待确认', gate: 'risk' },
        { id: 'EV-007', type: 'INTERVENTION', time: '14:19', stage: 4, tool: 'Release Owner', title: '批准完整安全与业务回归', detail: '增加关键调用链兼容性检查，发布时间预算 +8 分钟。', status: '完成' },
        { id: 'EV-008', type: 'EVIDENCE', time: '23:45', stage: 4, tool: 'Regression Runner', title: '原漏洞已阻断且核心回归通过', detail: '16 项安全与业务检查全部通过，未发现同类旁路。', status: '完成' },
        { id: 'EV-009', type: 'ACTION', time: '26:10', stage: 5, tool: 'Release Verifier', title: '核验修复制品与回滚策略', detail: '镜像签名、版本、监控项和回滚点一致。', status: '完成' },
        { id: 'EV-010', type: 'RESULT', time: '28:02', stage: 5, tool: 'Closure Builder', title: '关闭漏洞修复任务', detail: '补丁、根因、回归报告、发布核验和失败轨迹已归档。', status: '完成' }
      ],
      metrics: { traces: 142, evidence: 34, review: 7, datasets: 4, toolCalls: 41, checkpoints: 7 },
      outputs: [
        { type: '安全补丁集', count: '1 个最小补丁', state: '审查通过', usage: '合并与发布' },
        { type: '根因分析记录', count: '1 条根因链', state: '已确认', usage: '同类问题治理' },
        { type: '安全回归报告', count: '16 项检查', state: '全部通过', usage: '发布闸门' },
        { type: '修复关闭记录', count: '7 个检查点', state: '已封存', usage: '审计与复盘' }
      ]
    },

    'DIGITAL-TWIN': {
      id: 'DIGITAL-TWIN', type: '数字孪生攻防', tag: '典型任务 04',
      title: '数字孪生系统红蓝对抗演练', subtitle: '状态同步、攻击注入、检测处置与韧性恢复',
      prompt: '基于数字孪生系统开展红蓝对抗任务：构建并校准孪生拓扑与业务基线，注入授权攻击场景，联动红队动作与蓝队检测处置，评估业务影响、恢复时间和策略有效性，最后完成状态对比与轨迹回放。',
      objective: '在数字孪生环境中验证攻击路径、检测响应和业务韧性，并形成可重复回放的攻防数据。',
      subject: '工业园区数字孪生 · IT/OT 联合场景', environment: '联邦数字孪生靶场', samples: 20, duration: 40, priority: '检测响应与业务韧性优先',
      policy: commonPolicy, creation: commonCreation('数字孪生攻防任务', '联邦数字孪生靶场'),
      plan: [
        { id: 'P1', name: '场景与规则定义', detail: '冻结红蓝目标、攻击窗口、胜负条件与停止条件', deliverable: '演练规则' },
        { id: 'P2', name: '孪生同步与校准', detail: '加载拓扑、资产、业务状态、传感器和防护策略', deliverable: '可信基线' },
        { id: 'P3', name: '攻击场景注入', detail: '按阶段注入攻击动作与故障扰动', deliverable: '红队轨迹' },
        { id: 'P4', name: '检测与响应对抗', detail: '验证告警、研判、隔离和策略联动', deliverable: '蓝队轨迹' },
        { id: 'P5', name: '韧性恢复验证', detail: '恢复关键业务并测量状态偏差和恢复时间', deliverable: '韧性指标' },
        { id: 'P6', name: '状态对比与回放', detail: '对比基线、受攻击态和恢复态并封装场景', deliverable: '攻防回放包' }
      ],
      topology: ['演练控制面', '红队仿真器', '企业 IT 区', '安全监测区', '工业控制孪生', '状态与事件总线'],
      twinAssets: [
        { id: 'TWIN-CTRL', kind: 'command', name: '演练控制中心', zone: '安全运营区', status: '健康', detail: '承载演练编排、授权闸门、回滚检查点和评分控制。', telemetry: 'Run 01 · 4 条编排策略' },
        { id: 'TWIN-SOC', kind: 'soc', name: 'SOC 研判中心', zone: '安全运营区', status: '监测中', detail: '关联 SIEM、EDR 与流量探针，对异常事件生成研判队列。', telemetry: '27 条遥测 / 分钟' },
        { id: 'TWIN-IT', kind: 'datacenter', name: '企业数据中心', zone: 'IT 生产区', status: '受控', detail: '模拟应用集群、身份服务、数据库与边界网关的生产依赖。', telemetry: '18 台虚拟资产 · 3 条风险路径' },
        { id: 'TWIN-OT', kind: 'factory', name: '工业控制单元', zone: 'OT 生产区', status: '稳定', detail: '模拟 PLC、HMI、工程站与工艺状态；关键控制回路受保护。', telemetry: '6 类工艺指标 · 82% 业务保持' },
        { id: 'TWIN-EDGE', kind: 'gateway', name: '边缘接入网关', zone: 'DMZ / 边缘区', status: '告警', detail: '模拟业务入口、协议转发、策略执行与可疑指令检测。', telemetry: '2 条异常指令待研判' },
        { id: 'TWIN-RED', kind: 'operator', name: '红队仿真节点', zone: '授权攻击区', status: '受控', detail: '仅注入预置、可回放的授权攻击动作，不连接真实网络。', telemetry: '场景 ATK-03 · 4 个阶段' }
      ],
      events: [
        { id: 'EV-001', type: 'PLAN', time: '00:00', stage: 0, tool: 'Exercise Director', title: '冻结红蓝规则与胜负条件', detail: '攻击窗口、业务保护线、终止阈值和评分指标已确认。', status: '完成' },
        { id: 'EV-002', type: 'ACTION', time: '01:25', stage: 1, tool: 'Twin Synchronizer', title: '同步拓扑与业务状态', detail: '资产、通信关系、控制逻辑和观测探针已装载。', status: '完成' },
        { id: 'EV-003', type: 'EVIDENCE', time: '04:10', stage: 1, tool: 'Baseline Calibrator', title: '完成可信基线校准', detail: '正常流量、控制状态和关键业务指标进入稳定区间。', status: '完成' },
        { id: 'EV-004', type: 'ACTION', time: '06:30', stage: 2, tool: 'Attack Injector', title: '注入授权攻击场景', detail: '在仿真器中按阶段生成入口、横向和控制扰动事件。', status: '完成' },
        { id: 'EV-005', type: 'OBSERVATION', time: '08:18', stage: 3, tool: 'Blue Sensor Mesh', title: '检测到异常控制指令与业务偏差', detail: '两类告警已关联到同一攻击轨迹，业务保护线尚未突破。', status: '风险' },
        { id: 'EV-006', type: 'QUESTION', time: '08:25', stage: 3, tool: 'Safety Gate', title: '是否执行受控降载与策略加固？', detail: '该动作保持关键控制回路，以最小影响抑制模拟风险扩散。', status: '等待确认', gate: 'risk' },
        { id: 'EV-007', type: 'INTERVENTION', time: '08:42', stage: 3, tool: 'Blue Commander', title: '批准受控降载与策略加固', detail: '保持关键控制回路，启用安全策略加固和受控降载。', status: '完成' },
        { id: 'EV-008', type: 'EVIDENCE', time: '12:05', stage: 4, tool: 'Resilience Monitor', title: '攻击被遏制并进入恢复阶段', detail: '关键业务最低保持 82%，模拟恢复时间 6 分 20 秒。', status: '完成' },
        { id: 'EV-009', type: 'ACTION', time: '15:22', stage: 5, tool: 'State Comparator', title: '对比基线、攻击态与恢复态', detail: '拓扑、配置、业务指标和防护策略差异已归档。', status: '完成' },
        { id: 'EV-010', type: 'RESULT', time: '17:11', stage: 5, tool: 'Replay Packager', title: '生成数字孪生攻防回放包', detail: '红蓝轨迹、状态快照、韧性指标和场景配置已封装。', status: '完成' }
      ],
      metrics: { traces: 186, evidence: 42, review: 8, datasets: 5, toolCalls: 57, checkpoints: 9 },
      outputs: [
        { type: '数字孪生场景包', count: '1 套可复现场景', state: '已封存', usage: '重复演练与评测' },
        { type: '红蓝对抗回放', count: '186 个轨迹事件', state: '已生成', usage: '过程复盘' },
        { type: '业务韧性评估', count: '6 项关键指标', state: '已核验', usage: '防护优化' },
        { type: '状态差异快照', count: '3 个状态版本', state: '质量通过', usage: '策略验证' }
      ]
    }
  };

  Object.values(scenarios).forEach((scenario) => {
    scenario.pipeline = commonPipeline;
    scenario.success = '任务结果、运行记录、长轨迹与可复用数据资产均可回指。';
    scenario.assets = scenario.outputs.map((output, index) => ({
      id: `${scenario.id}-A${index + 1}`,
      ...output,
      source: `TASK-${scenario.id} → RUN-01`,
      trace: scenario.events.slice(Math.max(0, index * 2), Math.min(scenario.events.length, index * 2 + 5)).map((event) => ({
        time: event.time, type: event.type, tool: event.tool, title: event.title, detail: event.detail
      }))
    }));
  });

  const presets = Object.values(scenarios).map(({ id, tag, title, subtitle, prompt, type }) => ({ id, tag, title, subtitle, prompt, type }));
  window.DEMO_DATA = { scenarios, presets, defaultScenarioId: 'VULN-DISCOVERY' };
})();
