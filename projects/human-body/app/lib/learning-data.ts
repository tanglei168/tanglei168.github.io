import type { OrganId } from "./anatomy-data";

export type ModuleId =
  "overview" | "explore" | "systems" | "lessons" | "library" | "notes";
export type Region = "头颈" | "胸部" | "腹部" | "盆腔" | "全身";
export type AtlasOrgan = {
  id: string;
  name: string;
  en: string;
  region: Region;
  systems: string[];
  location: string;
  role: string;
  modelId?: OrganId;
  point: [number, number];
};
export type BodySystem = {
  id: string;
  name: string;
  en: string;
  color: string;
  role: string;
  partners: string[];
};
export type Relation = {
  from: string;
  to: string;
  label: string;
  kind: "transport" | "control" | "support";
};
export type Chain = {
  id: string;
  title: string;
  question: string;
  summary: string;
  relations: Relation[];
  sourceIds: string[];
};
export type Lesson = {
  id: string;
  title: string;
  stage: string;
  minutes: number;
  prerequisites: string[];
  objectives: string[];
  paragraphs: { title: string; body: string }[];
  organIds: string[];
  chainId?: string;
  quiz: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  };
  sourceIds: string[];
};
export type Resource = {
  id: string;
  type: "organ" | "chain" | "reference";
  title: string;
  summary: string;
  tags: string[];
  entityId: string;
  sourceIds: string[];
  version: number;
};
export type Note = {
  id: string;
  title: string;
  body: string;
  kind: "理解" | "问题" | "复习";
  resourceId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};
export type LearningState = {
  version: 1;
  savedIds: string[];
  completedIds: string[];
  notes: Note[];
};

export const sources = [
  {
    id: "organization",
    title: "OpenStax · 人体组织层级与 11 个系统",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-2-structural-organization-of-the-human-body",
  },
  {
    id: "position",
    title: "OpenStax · 解剖方位与体腔",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology",
  },
  {
    id: "circulation",
    title: "NIH / NHLBI · 血液如何流经心脏",
    url: "https://www.nhlbi.nih.gov/health/heart/blood-flow",
  },
  {
    id: "digestion",
    title: "NIH / NIDDK · 消化系统如何工作",
    url: "https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works",
  },
  {
    id: "kidney",
    title: "NIH / NIDDK · 肾脏如何工作",
    url: "https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work",
  },
];
export const systems: BodySystem[] = [
  {
    id: "circulatory",
    name: "心血管系统",
    en: "Circulatory",
    color: "#d67664",
    role: "让血液循环，把氧和营养送到组织，运走代谢产物。",
    partners: ["respiratory", "digestive", "urinary"],
  },
  {
    id: "respiratory",
    name: "呼吸系统",
    en: "Respiratory",
    color: "#cc8a91",
    role: "让空气进入肺，在肺泡与血液之间交换氧和二氧化碳。",
    partners: ["circulatory", "muscular"],
  },
  {
    id: "digestive",
    name: "消化系统",
    en: "Digestive",
    color: "#ba8e4e",
    role: "分解食物、吸收营养，并排出未被吸收的残渣。",
    partners: ["circulatory", "endocrine"],
  },
  {
    id: "nervous",
    name: "神经系统",
    en: "Nervous",
    color: "#9a80b6",
    role: "接收感觉信息，通过神经信号协调动作和身体活动。",
    partners: ["muscular", "endocrine"],
  },
  {
    id: "urinary",
    name: "泌尿系统",
    en: "Urinary",
    color: "#8a9c77",
    role: "形成并排出尿液，参与调节水、电解质和酸碱平衡。",
    partners: ["circulatory", "endocrine"],
  },
  {
    id: "endocrine",
    name: "内分泌系统",
    en: "Endocrine",
    color: "#b28baa",
    role: "通过激素协调生长、代谢和生殖等长期过程。",
    partners: ["nervous", "digestive", "reproductive"],
  },
  {
    id: "skeletal",
    name: "骨骼系统",
    en: "Skeletal",
    color: "#aa987c",
    role: "支撑身体、保护器官，与肌肉共同产生运动；骨髓参与造血。",
    partners: ["muscular", "circulatory"],
  },
  {
    id: "muscular",
    name: "肌肉系统",
    en: "Muscular",
    color: "#c88876",
    role: "骨骼肌收缩产生动作、维持姿势并产热。",
    partners: ["skeletal", "nervous"],
  },
  {
    id: "lymphatic",
    name: "淋巴与免疫系统",
    en: "Lymphatic & immune",
    color: "#7d9d84",
    role: "回收组织液，参与免疫防御，并运输部分吸收的脂肪。",
    partners: ["circulatory", "digestive"],
  },
  {
    id: "integumentary",
    name: "皮肤系统",
    en: "Integumentary",
    color: "#c6a17d",
    role: "形成身体表面的屏障，参与感觉与体温调节。",
    partners: ["nervous", "circulatory"],
  },
  {
    id: "reproductive",
    name: "生殖系统",
    en: "Reproductive",
    color: "#ba8795",
    role: "产生生殖细胞和性激素；女性生殖器官也支持妊娠。",
    partners: ["endocrine"],
  },
];
export const atlas: AtlasOrgan[] = [
  {
    id: "brain",
    name: "脑",
    en: "Brain",
    region: "头颈",
    systems: ["nervous"],
    location: "颅腔内，由颅骨包围。",
    role: "整合信息，参与思考、感觉及运动控制。",
    modelId: "brain",
    point: [50, 12],
  },
  {
    id: "eyeball",
    name: "眼球",
    en: "Eye",
    region: "头颈",
    systems: ["nervous"],
    location: "面部左右眼眶内。",
    role: "将光刺激转换为神经信号。",
    modelId: "eyeball",
    point: [55, 16],
  },
  {
    id: "thyroid",
    name: "甲状腺",
    en: "Thyroid",
    region: "头颈",
    systems: ["endocrine"],
    location: "颈前部，喉下方、气管两侧。",
    role: "分泌参与代谢调节的激素。",
    point: [50, 24],
  },
  {
    id: "lungs",
    name: "肺",
    en: "Lungs",
    region: "胸部",
    systems: ["respiratory"],
    location: "胸腔左右两侧，膈肌上方。",
    role: "在肺泡处完成气体交换。",
    modelId: "lungs",
    point: [40, 35],
  },
  {
    id: "heart",
    name: "心脏",
    en: "Heart",
    region: "胸部",
    systems: ["circulatory"],
    location: "两肺之间的纵隔内，大部分偏身体左侧。",
    role: "推动血液经过肺循环与体循环。",
    modelId: "heart",
    point: [53, 38],
  },
  {
    id: "diaphragm",
    name: "膈肌",
    en: "Diaphragm",
    region: "胸部",
    systems: ["muscular", "respiratory"],
    location: "胸腔与腹腔之间的穹顶状肌肉。",
    role: "收缩时帮助胸腔扩大，促进吸气。",
    point: [50, 44],
  },
  {
    id: "liver",
    name: "肝脏",
    en: "Liver",
    region: "腹部",
    systems: ["digestive"],
    location: "右上腹，主要位于膈肌下方。",
    role: "处理吸收的营养，产生胆汁。",
    modelId: "liver",
    point: [42, 49],
  },
  {
    id: "stomach",
    name: "胃",
    en: "Stomach",
    region: "腹部",
    systems: ["digestive"],
    location: "左上腹，食管与小肠之间。",
    role: "暂存、搅拌食物，参与消化。",
    point: [57, 50],
  },
  {
    id: "pancreas",
    name: "胰腺",
    en: "Pancreas",
    region: "腹部",
    systems: ["digestive", "endocrine"],
    location: "上腹部、胃的后方。",
    role: "分泌消化酶，也分泌调节血糖的激素。",
    modelId: "pancreas",
    point: [51, 54],
  },
  {
    id: "spleen",
    name: "脾脏",
    en: "Spleen",
    region: "腹部",
    systems: ["lymphatic"],
    location: "左上腹、胃的外侧。",
    role: "过滤血液并参与免疫反应。",
    point: [63, 49],
  },
  {
    id: "kidneys",
    name: "肾脏",
    en: "Kidneys",
    region: "腹部",
    systems: ["urinary"],
    location: "腹部后方、脊柱两侧，位于腹膜后。",
    role: "过滤血液，形成尿液并调节体液。",
    modelId: "kidneys",
    point: [38, 56],
  },
  {
    id: "intestine",
    name: "小肠",
    en: "Small intestine",
    region: "腹部",
    systems: ["digestive"],
    location: "腹腔中部，盘曲于大肠围成的区域内。",
    role: "完成大部分营养物质的消化和吸收。",
    modelId: "intestine",
    point: [50, 61],
  },
  {
    id: "colon",
    name: "大肠",
    en: "Large intestine",
    region: "腹部",
    systems: ["digestive"],
    location: "围绕小肠，末端经直肠延伸入盆腔。",
    role: "吸收水分并形成粪便。",
    point: [61, 61],
  },
  {
    id: "bladder",
    name: "膀胱",
    en: "Bladder",
    region: "盆腔",
    systems: ["urinary"],
    location: "盆腔前部、耻骨联合后方。",
    role: "暂时储存由输尿管送来的尿液。",
    point: [50, 70],
  },
  {
    id: "ovaries",
    name: "卵巢",
    en: "Ovaries",
    region: "盆腔",
    systems: ["reproductive", "endocrine"],
    location: "女性盆腔内、子宫两侧。",
    role: "产生卵细胞并分泌性激素。",
    point: [59, 72],
  },
  {
    id: "testes",
    name: "睾丸",
    en: "Testes",
    region: "盆腔",
    systems: ["reproductive", "endocrine"],
    location: "盆腔外的阴囊中（按盆部区域归类）。",
    role: "产生精子并分泌性激素。",
    point: [50, 77],
  },
  {
    id: "skin",
    name: "皮肤",
    en: "Skin",
    region: "全身",
    systems: ["integumentary"],
    location: "覆盖身体表面。",
    role: "保护、感知外界，并帮助调节体温。",
    modelId: "skin",
    point: [26, 47],
  },
  {
    id: "bones",
    name: "骨骼",
    en: "Bones",
    region: "全身",
    systems: ["skeletal"],
    location: "从颅骨、脊柱、胸廓到四肢。",
    role: "支撑和保护，作为运动的杠杆。",
    point: [42, 87],
  },
  {
    id: "muscles",
    name: "骨骼肌",
    en: "Skeletal muscles",
    region: "全身",
    systems: ["muscular"],
    location: "广泛分布，多经肌腱附着于骨。",
    role: "在神经控制下收缩，产生运动。",
    point: [60, 86],
  },
  {
    id: "lymph-nodes",
    name: "淋巴结",
    en: "Lymph nodes",
    region: "全身",
    systems: ["lymphatic"],
    location: "沿淋巴管分布，颈部、腋窝和腹股沟等处成群。",
    role: "过滤淋巴，参与免疫防御。",
    point: [69, 32],
  },
];
export const chains: Chain[] = [
  {
    id: "oxygen",
    title: "一口空气的旅程",
    question: "吸进来的氧，怎样到达脚趾？",
    summary:
      "呼吸负责交换，循环负责运输。箭头表示氧运输的简化路径；静脉血经右心到肺，含氧血经左心到全身。",
    relations: [
      { from: "lungs", to: "heart", label: "肺静脉 → 左心", kind: "transport" },
      {
        from: "heart",
        to: "muscles",
        label: "主动脉 → 组织毛细血管",
        kind: "transport",
      },
      {
        from: "muscles",
        to: "heart",
        label: "体静脉 → 右心（携带二氧化碳）",
        kind: "transport",
      },
      {
        from: "heart",
        to: "lungs",
        label: "肺动脉 → 肺，排出二氧化碳",
        kind: "transport",
      },
    ],
    sourceIds: ["circulation"],
  },
  {
    id: "nutrition",
    title: "一餐饭的接力",
    question: "食物如何变成身体可用的营养？",
    summary:
      "胃和小肠参与消化；此处追踪糖和氨基酸等经门静脉到肝脏的路径。多数长链脂肪的吸收先经淋巴运输。",
    relations: [
      {
        from: "stomach",
        to: "intestine",
        label: "食糜进入小肠",
        kind: "transport",
      },
      {
        from: "pancreas",
        to: "intestine",
        label: "消化酶经导管进入",
        kind: "support",
      },
      {
        from: "intestine",
        to: "liver",
        label: "吸收 → 门静脉运输",
        kind: "transport",
      },
      {
        from: "liver",
        to: "heart",
        label: "处理后经静脉回到循环",
        kind: "transport",
      },
    ],
    sourceIds: ["digestion"],
  },
  {
    id: "water",
    title: "血液与水的平衡",
    question: "喝下的水会直接流进膀胱吗？",
    summary:
      "不会。水被消化道吸收后进入体液循环，肾脏通过过滤、重吸收和分泌调节尿液的组成。",
    relations: [
      {
        from: "intestine",
        to: "heart",
        label: "水被吸收，进入循环",
        kind: "transport",
      },
      {
        from: "heart",
        to: "kidneys",
        label: "血液经肾动脉送入",
        kind: "transport",
      },
      {
        from: "kidneys",
        to: "heart",
        label: "经肾静脉回流",
        kind: "transport",
      },
      {
        from: "kidneys",
        to: "bladder",
        label: "尿液经输尿管流入",
        kind: "transport",
      },
    ],
    sourceIds: ["kidney"],
  },
  {
    id: "movement",
    title: "从想法到迈步",
    question: "脑、肌肉与骨骼怎样合作？",
    summary:
      "这是随意运动的概念图：脑的运动指令经脊髓和周围神经传到肌肉，肌肉牵拉骨骼；感觉信息持续反馈。",
    relations: [
      {
        from: "brain",
        to: "muscles",
        label: "经脊髓和运动神经传递指令",
        kind: "control",
      },
      {
        from: "muscles",
        to: "bones",
        label: "经肌腱牵拉，围绕关节运动",
        kind: "support",
      },
      {
        from: "skin",
        to: "brain",
        label: "感觉信息经神经通路反馈",
        kind: "control",
      },
    ],
    sourceIds: ["organization"],
  },
];
export const lessons: Lesson[] = [
  {
    id: "body-map",
    title: "先认识身体的地图",
    stage: "01 · 整体认识",
    minutes: 6,
    prerequisites: [],
    objectives: ["区分区域和系统", "用自身左右描述器官位置"],
    paragraphs: [
      {
        title: "先有地图，再记名字",
        body: "从头颈、胸部、腹部、盆部和全身结构开始。脑在颅腔，心和肺在胸部，肝、胃和肠在腹部。体表区域是查找入口，并不等同于严格的体腔分类。",
      },
      {
        title: "左右以被观察者为准",
        body: "面对人体正面图时，图左侧是身体右侧。胸腹之间的膈肌是重要边界；肾脏在腹部后方。示意图中的点只帮助定位，不表达器官真实尺寸、深度或个体差异。",
      },
      {
        title: "区域回答哪里，系统回答怎样合作",
        body: "同一区域容纳不同系统；一个系统跨越多个区域。胰腺既参与消化，也属于内分泌系统。",
      },
    ],
    organIds: ["brain", "lungs", "heart", "liver", "kidneys"],
    quiz: {
      question: "正面看人体，图左侧通常对应哪一侧？",
      options: ["被观察者的身体右侧", "被观察者的身体左侧", "所有器官都在中线"],
      answer: 0,
      explanation: "解剖学的左右以被观察者自身为准。",
    },
    sourceIds: ["position", "organization"],
  },
  {
    id: "oxygen-lesson",
    title: "呼吸与循环：氧的接力",
    stage: "02 · 系统协作",
    minutes: 8,
    prerequisites: ["body-map"],
    objectives: ["区分气体交换和血液运输", "说出肺循环与体循环的连接"],
    paragraphs: [
      {
        title: "肺是交换站",
        body: "空气到达肺泡；氧进入血液，二氧化碳从血液进入肺泡，再随呼气排出。空气本身不会沿血管跑遍身体。",
      },
      {
        title: "心脏连接两条循环",
        body: "右心将血液送到肺；血液获得氧后回到左心，再被送往全身。肺动脉携带的血液含氧相对较低，所以不能只靠动脉这个名字判断含氧量。",
      },
    ],
    organIds: ["lungs", "heart", "muscles"],
    chainId: "oxygen",
    quiz: {
      question: "从肺返回左心的血液通过什么血管？",
      options: ["肺动脉", "肺静脉", "输尿管"],
      answer: 1,
      explanation: "肺静脉把经过肺部气体交换的血液送回左心房。",
    },
    sourceIds: ["circulation"],
  },
  {
    id: "food-lesson",
    title: "消化与吸收：一餐饭的去向",
    stage: "02 · 系统协作",
    minutes: 8,
    prerequisites: ["body-map"],
    objectives: ["区分消化与吸收", "解释肝和胰腺的协作"],
    paragraphs: [
      {
        title: "分解不等于进入身体内部",
        body: "消化把食物分解为可吸收的小分子；吸收让这些物质通过肠壁进入血液或淋巴。小肠是主要吸收场所。",
      },
      {
        title: "消化道之外也有伙伴",
        body: "胰腺把消化酶送入小肠，肝脏产生胆汁。糖和氨基酸等先经门静脉到肝脏；多数长链脂肪走淋巴通路，再进入血液。",
      },
    ],
    organIds: ["stomach", "intestine", "pancreas", "liver"],
    chainId: "nutrition",
    quiz: {
      question: "大部分营养吸收发生在哪里？",
      options: ["胃", "小肠", "膀胱"],
      answer: 1,
      explanation: "胃参与消化，小肠承担大部分营养物质的吸收。",
    },
    sourceIds: ["digestion"],
  },
  {
    id: "water-lesson",
    title: "肾脏与循环：保持内部平衡",
    stage: "03 · 整合应用",
    minutes: 7,
    prerequisites: ["oxygen-lesson", "food-lesson"],
    objectives: ["区分血液通路与尿液通路", "解释肾与膀胱的分工"],
    paragraphs: [
      {
        title: "肾脏处理的是血液",
        body: "肾脏接收循环中的血液。过滤并不是把所有成分直接丢弃：身体需要的大部分水和其他物质会被重吸收，剩余液体形成尿液。",
      },
      {
        title: "两种液体有不同出口",
        body: "处理后的血液经肾静脉回流；尿液经输尿管到膀胱，排尿时再经尿道离开身体。膀胱主要储存尿液，不是过滤血液的器官。",
      },
    ],
    organIds: ["kidneys", "bladder", "heart"],
    chainId: "water",
    quiz: {
      question: "连接肾脏与膀胱、运输尿液的是？",
      options: ["肾静脉", "输尿管", "肺动脉"],
      answer: 1,
      explanation: "输尿管运输尿液；肾静脉运输回流的血液。",
    },
    sourceIds: ["kidney"],
  },
  {
    id: "move-lesson",
    title: "神经、肌肉和骨骼：一起迈步",
    stage: "03 · 整合应用",
    minutes: 6,
    prerequisites: ["body-map"],
    objectives: ["区分控制、动力与支撑", "描述感觉反馈"],
    paragraphs: [
      {
        title: "动作需要分工",
        body: "随意运动由神经系统发出并传递指令，骨骼肌收缩，经肌腱牵拉骨，关节允许身体部分相对运动。骨骼本身不会主动收缩。",
      },
      {
        title: "身体不断修正动作",
        body: "感觉信息帮助神经系统了解身体与周围环境。触觉以及肌肉、关节相关的感觉反馈，让我们不断调整动作。",
      },
    ],
    organIds: ["brain", "muscles", "bones", "skin"],
    chainId: "movement",
    quiz: {
      question: "迈步时，直接收缩产生拉力的主要结构是什么？",
      options: ["骨骼肌", "骨", "皮肤"],
      answer: 0,
      explanation: "肌肉收缩产生拉力，骨与关节提供支撑和运动结构。",
    },
    sourceIds: ["organization"],
  },
];
export const resources: Resource[] = [
  ...atlas.map((o) => ({
    id: `organ:${o.id}`,
    type: "organ" as const,
    title: o.name,
    summary: `${o.location} ${o.role}`,
    tags: [
      o.region,
      ...o.systems.map((id) => systems.find((s) => s.id === id)!.name),
    ],
    entityId: o.id,
    sourceIds: ["organization", "position"],
    version: 1,
  })),
  ...chains.map((c) => ({
    id: `chain:${c.id}`,
    type: "chain" as const,
    title: c.title,
    summary: c.summary,
    tags: ["协作链路"],
    entityId: c.id,
    sourceIds: c.sourceIds,
    version: 1,
  })),
  ...sources.map((s) => ({
    id: `reference:${s.id}`,
    type: "reference" as const,
    title: s.title,
    summary: "权威参考原文 · 用于长期查阅与核对概念",
    tags: ["参考资料"],
    entityId: s.id,
    sourceIds: [s.id],
    version: 1,
  })),
];
export const emptyLearningState: LearningState = {
  version: 1,
  savedIds: [],
  completedIds: [],
  notes: [],
};
export function parseLearningState(raw: string): LearningState {
  const data = JSON.parse(raw);
  if (
    data?.version !== 1 ||
    !Array.isArray(data.savedIds) ||
    !Array.isArray(data.completedIds) ||
    !Array.isArray(data.notes)
  )
    throw new Error("不支持的学习数据格式");
  if (
    !data.savedIds.every((x: unknown) => typeof x === "string") ||
    !data.completedIds.every((x: unknown) => typeof x === "string")
  )
    throw new Error("学习记录格式错误");
  for (const n of data.notes)
    if (
      !n ||
      typeof n.id !== "string" ||
      typeof n.title !== "string" ||
      typeof n.body !== "string" ||
      !["理解", "问题", "复习"].includes(n.kind) ||
      !(n.resourceId === null || typeof n.resourceId === "string") ||
      !Array.isArray(n.tags) ||
      !n.tags.every((t: unknown) => typeof t === "string") ||
      typeof n.createdAt !== "string" ||
      typeof n.updatedAt !== "string" ||
      typeof n.archived !== "boolean"
    )
      throw new Error("笔记格式错误");
  if (new Set(data.notes.map((n: Note) => n.id)).size !== data.notes.length)
    throw new Error("笔记 ID 重复");
  if (
    data.notes.some(
      (n: Note) =>
        !Number.isFinite(Date.parse(n.createdAt)) ||
        !Number.isFinite(Date.parse(n.updatedAt)),
    )
  )
    throw new Error("笔记时间格式错误");
  return {
    version: 1,
    savedIds: [...new Set<string>(data.savedIds)],
    completedIds: [...new Set<string>(data.completedIds)],
    notes: data.notes,
  };
}
