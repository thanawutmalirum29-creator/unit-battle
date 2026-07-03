// หมายเหตุ: กระเป๋าฝั่ง client เก็บเป็น JSON ตรงๆ ไม่เข้ารหัสแล้ว
// เพราะเซิร์ฟเวอร์เป็น source of truth อยู่แล้ว ต่อให้แก้ localStorage ตรงๆ ก็ไม่มีผลจริง
// (แค่ตัวเลขที่โชว์ผิดชั่วคราวจนกว่าจะ sync ใหม่จากเซิร์ฟเวอร์)
const BAG_HASH_SALT = 135792468; // ยังใช้ hash กันข้อมูล localStorage เพี้ยน/พังโดยไม่ตั้งใจ (ไม่ใช่กันโกง)

// ค่าเริ่มต้นของกระเป๋า ใช้ร่วมกันทั้งตอน merge จาก localStorage (ensureBagDefaults)
// และตอน merge จากเซิร์ฟเวอร์ (applyServerBag) เพื่อให้ชุด key ที่ถูกเซฟ+แฮชตรงกันเป๊ะทุกจุด
const BAG_DEFAULTS = {
    memoryRare: 0,
    memoryEpic: 0,
    memoryLegendary: 0,
    memoryMythical: 0,
    memoryCosmic: 0,
    shardGray: 0,
    shardBlue: 0,
    shardPurple: 0,
    shardGold: 0,
    shardRed: 0,
    shardSky: 0
};

// ----------------- ฟังก์ชันเข้ารหัส bag (คงชื่อเดิมไว้ ไม่ต้องแก้จุดที่เรียกใช้) -----------------
function encryptBag(bag) {
    return JSON.stringify(bag);
}

// ----------------- ฟังก์ชันถอดรหัส bag -----------------
function decryptBag(enc) {
    if(!enc) return {};
    try {
        return JSON.parse(enc);
    } catch(e) {
        console.warn("Bag corrupted! Reset to default.");
        return {};
    }
}

// ----------------- hash ตรวจสอบ -----------------
// สำคัญ: ต้อง stringify ด้วยลำดับ key ที่แน่นอน (เรียง key ก่อนเสมอ) ไม่งั้น object
// เดียวกันแต่ key คนละลำดับ (เช่น bag จากเซิร์ฟเวอร์ที่ JSON key order มาจาก DB
// ไม่ตรงกับลำดับใน defaults ของฝั่ง client) จะได้ hash ไม่ตรงกัน ทั้งที่ข้อมูลเหมือนกันทุกอย่าง
// แล้วโดน "ตรวจจับ" ว่า corrupted แล้วรีเซ็ตเป็น 0 ทันทีหลัง sync จากเซิฟเวอร์
function hashBag(bag) {
    const sorted = {};
    for (const key of Object.keys(bag).sort()) sorted[key] = bag[key];
    let str = JSON.stringify(sorted);
    let hash = 0;
    for(let i=0;i<str.length;i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return (hash ^ BAG_HASH_SALT) >>> 0;
}

// ----------------- ซิงค์จากเซิฟเวอร์ (source of truth) -----------------
// Overwrites local bag entirely — loadBag()/ensureBagDefaults() fills in any
// keys the server response doesn't include with 0, so this never merges in
// stale local values for keys the server considers gone/reset.
function applyServerBag(serverBag) {
    if (!serverBag || typeof serverBag !== "object") return;
    // เติม default keys ให้ครบก่อนเซฟ+แฮช เผื่อ bag จากเซิฟเวอร์ขาดคีย์ไหนไป (เช่น
    // player เก่าที่ยังไม่มีไอเทมชนิดใหม่) จะได้ไม่ไปเจอ key เพิ่มทีหลังตอน
    // ensureBagDefaults() merge แล้ว hash ไม่ตรงจนโดนรีเซ็ตเป็น 0
    saveBag({ ...BAG_DEFAULTS, ...serverBag });
}

async function syncBagFromServer() {
    if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) return;
    const state = await GameAPI.fetchEconomyState();
    if (state && state.bag) applyServerBag(state.bag);
}


function ensureBagDefaults() {
    const enc = localStorage.getItem("bag");
    const hash = parseInt(localStorage.getItem("bag_hash") || "0",10);
    let bag = decryptBag(enc);
    bag = { ...BAG_DEFAULTS, ...bag };

    // ตรวจสอบ hash
    if(hash !== hashBag(bag)) {
        console.warn("Bag corrupted! Reset to default.");
        bag = { ...BAG_DEFAULTS };
        saveBag(bag);
    }

    return bag;
}

// ----------------- โหลดและบันทึก -----------------
function loadBag() {
    return ensureBagDefaults();
}

function saveBag(bag) {
    localStorage.setItem("bag", encryptBag(bag));
    localStorage.setItem("bag_hash", hashBag(bag));
    updateBagUI();
}

// ----------------- เพิ่มของในกระเป๋า -----------------
function addToBag(key, amount) {
    let bag = loadBag();
    if (!(key in bag)) return;
    bag[key] += amount;
    if(bag[key] < 0) bag[key] = 0;
    saveBag(bag);
}

// ----------------- อัปเดต UI -----------------
function updateBagUI() {
    const bag = loadBag();
    for(const [id,value] of Object.entries(bag)){
        const el = document.getElementById(id);
        if(el) el.textContent = value;
    }
}

/* ============================================================
   กระเป๋า (UI) — วาดทั้งหมดจากไฟล์นี้ไฟล์เดียว
   หน้าไหนอยากโชว์กระเป๋า แค่ใส่ <div id="bagMount"></div> ไว้ตรงจุดที่ต้องการ
   แล้ว include bag.js ตามปกติ — ไม่ต้องก็อปโครงสร้าง/สไตล์กระเป๋าไปแปะเองอีก
   แก้ไอเทม/หน้าตา/ปุ่มเปิดปิด แก้ที่นี่ที่เดียวพอ
   ============================================================ */

// รายการไอเทมในกระเป๋า เรียงตามลำดับที่จะแสดง (sep:true = ขึ้นบรรทัดใหม่ด้วย <hr> ก่อนอันนี้)
const BAG_DISPLAY_ITEMS = [
    { id: "memoryRare",      label: "ความทรงจำ Rare" },
    { id: "memoryEpic",      label: "ความทรงจำ Epic" },
    { id: "memoryLegendary", label: "ความทรงจำ Legendary" },
    { id: "memoryMythical",  label: "ความทรงจำ Mythical" },
    { id: "memoryCosmic",    label: "ความทรงจำ Cosmic" },
    { id: "shardGray",       label: "ชาร์ดเทา",     sep: true },
    { id: "shardBlue",       label: "ชาร์ดน้ำเงิน" },
    { id: "shardPurple",     label: "ชาร์ดม่วง" },
    { id: "shardGold",       label: "ชาร์ดทอง" },
    { id: "shardRed",        label: "ชาร์ดแดง" },
    { id: "shardSky",        label: "ชาร์ดฟ้า" },
];

/* ============================================================
   ไอคอนไอเทม — วาดเองด้วย CSS ล้วนๆ เป็นรูปชิ้นส่วนจิ๊กซอ (ปุ่มนูน 1 จุด
   + รอยเว้า 1 จุด) แทนอิโมจิ ใช้สีจาก theme.css (--c-rare/--c-epic/...)
   เพื่อให้เฉดสีตรงกับระบบ rarity เดิม ไฟล์ไหน include bag.js อยู่แล้ว
   (game/boss/inf/shop/gacha/upgrade/upgradeskills/account) เรียก
   itemIconHTML(key) ได้เลยที่เดียว ไม่ต้องแก้ CSS ซ้ำในแต่ละหน้า
   ============================================================ */
const ITEM_ICON_META = {
    memoryRare:      { color: "var(--c-rare)" },
    memoryEpic:      { color: "var(--c-epic)" },
    memoryLegendary: { color: "var(--c-legend)",    glow: true },
    memoryMythical:  { color: "var(--c-mythical)",  glow: true },
    memoryCosmic:    { color: "var(--c-cosmic)",    glow: true },
    shardGray:       { color: "var(--c-common)" },
    shardBlue:       { color: "var(--c-rare)" },
    shardPurple:     { color: "var(--c-epic)" },
    shardGold:       { color: "var(--c-legend)",    glow: true },
    shardRed:        { color: "var(--bad)" },
    shardSky:        { color: "var(--accent-2)" },
};

function itemIconHTML(key) {
    const meta = ITEM_ICON_META[key];
    if (!meta) return "";
    const kind = key.indexOf("shard") === 0 ? "item-icon--shard" : "item-icon--memory";
    const cls = "item-icon " + kind + (meta.glow ? " item-icon--glow" : "");
    return '<span class="' + cls + '" style="--icon-color:' + meta.color + '" aria-hidden="true"></span>';
}

function injectItemIconStyles() {
    if (document.getElementById("itemIconStyles")) return;
    const style = document.createElement("style");
    style.id = "itemIconStyles";
    style.textContent = `
.item-icon{
  --icon-color:#9aa5b1;
  position:relative;
  display:inline-block;
  width:15px; height:15px;
  margin-right:6px;
  vertical-align:-3px;
  background:var(--icon-color);
  box-shadow:
    inset -2px -3px 4px rgba(0,0,0,.35),
    inset 2px 2px 3px rgba(255,255,255,.28),
    0 1px 2px rgba(0,0,0,.4);
}
/* ชิ้นส่วนความทรงจำ (memory) — รูปจิ๊กซอ: สี่เหลี่ยมมุมโค้ง + ปุ่มนูน 1 จุด + รอยเว้า 1 จุด */
.item-icon--memory{
  border-radius:4px;
}
.item-icon--memory::before{
  content:"";
  position:absolute;
  top:-4px; left:50%;
  width:6px; height:6px;
  margin-left:-3px;
  border-radius:50%;
  background:var(--icon-color);
  box-shadow:
    inset -1px -1px 2px rgba(0,0,0,.35),
    inset 1px 1px 1px rgba(255,255,255,.3);
}
.item-icon--memory::after{
  content:"";
  position:absolute;
  bottom:-2px; right:-2px;
  width:6px; height:6px;
  border-radius:50%;
  background:var(--bg-1,#0c121b);
  box-shadow:inset 1px 1px 2px rgba(0,0,0,.55);
}
/* ชาร์ด (shard) — รูปเศษคริสตัลเหลี่ยม ไม่มีปุ่มนูน/รอยเว้าแบบจิ๊กซอ ให้แยกจากความทรงจำชัดเจน */
.item-icon--shard{
  border-radius:0;
  clip-path: polygon(50% 0%, 88% 38%, 72% 100%, 28% 100%, 12% 38%);
}
.item-icon--shard::before{
  content:"";
  position:absolute;
  top:8%; left:46%;
  width:2px; height:58%;
  background:rgba(255,255,255,.45);
  transform:skewX(-12deg);
}
.item-icon--shard::after{
  content:"";
  position:absolute;
  left:26%; right:26%; top:60%; bottom:0;
  background:rgba(0,0,0,.2);
  clip-path: polygon(0% 0%, 100% 0%, 68% 100%, 32% 100%);
}
/* ของหายากขึ้น (Legendary/Mythical/Cosmic/shardGold) เรืองแสงรอบนอกเบาๆ —
   ใช้ drop-shadow แทน box-shadow เพราะ clip-path (ชาร์ด) จะตัด box-shadow ที่ล้นออกนอกกรอบทิ้ง */
.item-icon--glow{
  filter: drop-shadow(0 0 3px var(--icon-color)) drop-shadow(0 0 1px var(--icon-color));
}
`;
    document.head.appendChild(style);
}

const BAG_COLLAPSE_KEY = "bagPanelCollapsed"; // จำสถานะเปิด/ปิดไว้ข้ามหน้า (เหมือนกันทุกหน้าที่มีกระเป๋า)

function injectBagStyles() {
    if (document.getElementById("bagPanelStyles")) return;
    const style = document.createElement("style");
    style.id = "bagPanelStyles";
    style.textContent = `
.bag-panel{ margin:0 0 14px; }
.bag-panel-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  margin:0 0 8px;
}
.bag-panel-header h3{ margin:0; }
.bag-toggle-btn{
  flex:0 0 auto;
  width:32px; height:32px;
  border-radius:50%;
  border:1px solid var(--border, rgba(255,255,255,.08));
  background:var(--panel, #141d2b);
  color:var(--text, #e8edf5);
  font-size:15px;
  line-height:1;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  transition:background .15s ease, color .15s ease;
}
.bag-toggle-btn:hover{
  background:linear-gradient(135deg,var(--accent,#5c8bff),#3f63d6);
  border-color:transparent;
  color:#fff;
}
.bag-collapse{
  display:grid;
  grid-template-rows:1fr;
  transition:grid-template-rows .22s ease;
}
.bag-collapse.collapsed{ grid-template-rows:0fr; }
.bag-collapse-inner{ overflow:hidden; min-height:0; }
.bag-panel #bag{ margin:0; }
`;
    document.head.appendChild(style);
}

function bagCollapseState() {
    try { return localStorage.getItem(BAG_COLLAPSE_KEY) === "1"; }
    catch (e) { return false; }
}

function setBagCollapseState(collapsed) {
    try { localStorage.setItem(BAG_COLLAPSE_KEY, collapsed ? "1" : "0"); }
    catch (e) { /* localStorage ไม่พร้อมใช้งาน — แค่ไม่จำสถานะ ไม่กระทบการเล่น */ }
}

// วาดกระเป๋าลงใน <div id="bagMount"></div> ถ้าหน้านั้นมี — ถ้าไม่มีก็ข้ามเงียบๆ
// (หน้าที่ include bag.js เพื่อใช้แค่ addToBag/loadBag เช่น shop/gacha จะไม่มี bagMount เลยไม่โชว์แผงนี้)
function renderBagPanel() {
    const mount = document.getElementById("bagMount");
    if (!mount || document.getElementById("bagPanel")) return;

    injectBagStyles();

    const panel = document.createElement("div");
    panel.id = "bagPanel";
    panel.className = "bag-panel";

    const header = document.createElement("div");
    header.className = "bag-panel-header";

    const h3 = document.createElement("h3");
    h3.textContent = "🎒 กระเป๋า";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.id = "bagToggleBtn";
    toggleBtn.className = "bag-toggle-btn";
    toggleBtn.setAttribute("aria-controls", "bag");

    header.appendChild(h3);
    header.appendChild(toggleBtn);

    const collapseWrap = document.createElement("div");
    collapseWrap.className = "bag-collapse";

    const inner = document.createElement("div");
    inner.className = "bag-collapse-inner";

    const bagGrid = document.createElement("div");
    bagGrid.id = "bag";

    BAG_DISPLAY_ITEMS.forEach((item) => {
        if (item.sep) bagGrid.appendChild(document.createElement("hr"));
        const row = document.createElement("div");
        row.innerHTML = itemIconHTML(item.id) + item.label + ': <span id="' + item.id + '">0</span>';
        bagGrid.appendChild(row);
    });

    inner.appendChild(bagGrid);
    collapseWrap.appendChild(inner);
    panel.appendChild(header);
    panel.appendChild(collapseWrap);
    mount.appendChild(panel);

    function applyCollapsed(collapsed) {
        collapseWrap.classList.toggle("collapsed", collapsed);
        toggleBtn.textContent = collapsed ? "▸" : "▾";
        toggleBtn.setAttribute("aria-label", collapsed ? "เปิดกระเป๋า" : "ปิดกระเป๋า");
        toggleBtn.setAttribute("aria-expanded", String(!collapsed));
    }

    toggleBtn.addEventListener("click", () => {
        const collapsed = !collapseWrap.classList.contains("collapsed");
        applyCollapsed(collapsed);
        setBagCollapseState(collapsed);
    });

    applyCollapsed(bagCollapseState());
}

// ----------------- เริ่มต้น -----------------
injectItemIconStyles(); // สไตล์จิ๊กซอไอคอนต้องมีทุกหน้าที่ include ไฟล์นี้ ไม่ใช่แค่หน้าที่มี #bagMount
                         // (account.html เรียกใช้ itemIconHTML() เองโดยไม่มีแผงกระเป๋า)
renderBagPanel();
updateBagUI();