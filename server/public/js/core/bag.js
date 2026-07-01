// 🔐 Config Key สำหรับกระเป๋า
const BAG_KEY1 = [23, 19, 47, 83, 11, 59];  // XOR ชั้นแรก
const BAG_KEY2 = [13, 7, 29, 71];           // XOR ชั้นสอง + shift
const BAG_HASH_SALT = 135792468;            // Salt สำหรับ hash

// ----------------- ฟังก์ชันเข้ารหัส bag -----------------
function encryptBag(bag) {
    const str = JSON.stringify(bag);
    // ชั้นแรก XOR
    let step1 = str.split('').map((c,i) => c.charCodeAt(0) ^ BAG_KEY1[i % BAG_KEY1.length]);
    // ชั้นสอง XOR + shift
    let step2 = step1.map((v,i) => ((v ^ BAG_KEY2[i % BAG_KEY2.length]) + 17) % 256);
    return step2.join(',');
}

// ----------------- ฟังก์ชันถอดรหัส bag -----------------
function decryptBag(enc) {
    if(!enc) return {};
    let arr = enc.split(',').map(Number);
    // ชั้นสองถอดรหัส
    let step1 = arr.map((v,i) => ((v - 17 + 256) % 256) ^ BAG_KEY2[i % BAG_KEY2.length]);
    // ชั้นแรกถอดรหัส
    let step2 = step1.map((v,i) => String.fromCharCode(v ^ BAG_KEY1[i % BAG_KEY1.length]));
    try {
        return JSON.parse(step2.join(''));
    } catch(e) {
        console.warn("Bag corrupted! Reset to default.");
        return {};
    }
}

// ----------------- hash ตรวจสอบ -----------------
function hashBag(bag) {
    let str = JSON.stringify(bag);
    let hash = 0;
    for(let i=0;i<str.length;i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return (hash ^ BAG_HASH_SALT) >>> 0;
}

// ----------------- ซิงค์จากเซิฟเวอร์ (source of truth) -----------------
function applyServerBag(serverBag) {
    if (!serverBag || typeof serverBag !== "object") return;
    saveBag({ ...loadBag(), ...serverBag });
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

    const defaults = {
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
    bag = { ...defaults, ...bag };

    // ตรวจสอบ hash
    if(hash !== hashBag(bag)) {
        console.warn("Bag corrupted! Reset to default.");
        bag = { ...defaults };
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

// ----------------- เริ่มต้น -----------------
updateBagUI();