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
    { id: "memoryRare",      icon: "💙", label: "ความทรงจำ Rare" },
    { id: "memoryEpic",      icon: "💜", label: "ความทรงจำ Epic" },
    { id: "memoryLegendary", icon: "💛", label: "ความทรงจำ Legendary" },
    { id: "memoryMythical",  icon: "🩷", label: "ความทรงจำ Mythical" },
    { id: "memoryCosmic",    icon: "🌌", label: "ความทรงจำ Cosmic" },
    { id: "shardGray",       icon: "⚪", label: "ชาร์ดเทา",     sep: true },
    { id: "shardBlue",       icon: "🔵", label: "ชาร์ดน้ำเงิน" },
    { id: "shardPurple",     icon: "🟣", label: "ชาร์ดม่วง" },
    { id: "shardGold",       icon: "🟡", label: "ชาร์ดทอง" },
    { id: "shardRed",        icon: "🔴", label: "ชาร์ดแดง" },
    { id: "shardSky",        icon: "🌌", label: "ชาร์ดฟ้า" },
];

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
        row.innerHTML = item.icon + " " + item.label + ': <span id="' + item.id + '">0</span>';
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
renderBagPanel();
updateBagUI();