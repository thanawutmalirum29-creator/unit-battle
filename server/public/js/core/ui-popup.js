/* ============================================================
   UI POPUP — ระบบกล่องข้อความ/ยืนยัน/กรอกข้อมูล แบบ CSS ล้วน
   ------------------------------------------------------------
   แทนที่ window.alert / window.confirm / window.prompt ของ browser
   ซึ่งเป็น native dialog แบบ "synchronous" ที่จะหยุด (block) เกม
   ทั้งหน้าเว็บทั้งหมดไว้ทันทีที่เรียก (รวมถึง requestAnimationFrame,
   setTimeout, setInterval, animation, เสียง ฯลฯ) จนกว่าผู้เล่นจะกด
   ปุ่มบนกล่อง native นั้น

   กล่องที่ไฟล์นี้สร้างขึ้นเป็น <div> ธรรมดา วาดและควบคุมด้วย CSS
   ล้วน ๆ จึงไม่ทำให้ event loop ของเบราว์เซอร์หยุด — แอนิเมชัน
   ต่อสู้ เสียง หรือ auto-battle ที่กำลังรันอยู่เบื้องหลังจะไม่ค้าง
   ระหว่างที่กล่องแสดงอยู่

   วิธีใช้ (แทนที่โค้ดเดิม):
     alert("ข้อความ")                 -> ใช้ได้เหมือนเดิมทุกที่
                                          (ไฟล์นี้ override
                                          window.alert ให้อัตโนมัติ)
     if (confirm("ถามอะไรสักอย่าง")) …  -> เปลี่ยนเป็น
     if (await uiConfirm("ถามอะไรสักอย่าง")) … (ต้องอยู่ใน async function)
     const v = prompt("กรอกชื่อ", "เดิม") -> เปลี่ยนเป็น
     const v = await uiPrompt("กรอกชื่อ", "เดิม")
   ============================================================ */
(function () {
  if (window.__uiPopupInstalled) return; // กันโหลดซ้ำ
  window.__uiPopupInstalled = true;

  // ---------- โครง DOM ของ overlay (สร้างครั้งเดียว ใช้ซ้ำทุกครั้ง) ----------
  let overlay, box, iconEl, msgEl, inputEl, btnRow;

  function ensureDom() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "ui-popup-overlay";

    box = document.createElement("div");
    box.className = "ui-popup-box";

    iconEl = document.createElement("div");
    iconEl.className = "ui-popup-icon";

    msgEl = document.createElement("div");
    msgEl.className = "ui-popup-message";

    inputEl = document.createElement("input");
    inputEl.className = "ui-popup-input";
    inputEl.type = "text";

    btnRow = document.createElement("div");
    btnRow.className = "ui-popup-buttons";

    box.appendChild(iconEl);
    box.appendChild(msgEl);
    box.appendChild(inputEl);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    // แปะไว้ใต้ <html> โดยตรง ไม่ใช่ <body> — กันไม่ให้ UI scale (zoom ที่ <body>)
    // ทำให้ป๊อปอัปเลื่อนตำแหน่งหนีจากกึ่งกลางจอจริง
    document.documentElement.appendChild(overlay);

    // คลิกพื้นหลังมืด ๆ = ปิดแบบเดียวกับกด "ยกเลิก"
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && overlay.dataset.dismissable === "1") {
        overlay.dataset.backdropClose = "1";
        overlay.classList.remove("open");
      }
    });
  }

  function openBox() {
    ensureDom();
    overlay.classList.add("open");
  }
  function closeBox() {
    overlay.classList.remove("open");
  }

  // คิว: กันไม่ให้กล่องซ้อนกันหลายใบพร้อมกัน (แสดงทีละกล่องตามลำดับ)
  let queue = Promise.resolve();
  function enqueue(task) {
    const run = () => task();
    queue = queue.then(run, run);
    return queue;
  }

  /**
   * uiAlert(message, opts) -> Promise<void>
   * กล่องแจ้งเตือน มีปุ่ม "ตกลง" ปุ่มเดียว
   */
  function uiAlert(message, opts) {
    opts = opts || {};
    return enqueue(() => new Promise((resolve) => {
      ensureDom();
      box.className = "ui-popup-box ui-popup-alert";
      iconEl.style.display = "block";
      iconEl.textContent = opts.icon || "ℹ";
      msgEl.textContent = message == null ? "" : String(message);
      inputEl.style.display = "none";
      overlay.dataset.dismissable = "0";

      btnRow.innerHTML = "";
      const okBtn = document.createElement("button");
      okBtn.className = "ui-popup-btn ui-popup-btn-primary";
      okBtn.textContent = "ตกลง";
      okBtn.onclick = () => { closeBox(); resolve(); };
      btnRow.appendChild(okBtn);

      openBox();
      okBtn.focus();
    }));
  }

  /**
   * uiConfirm(message, opts) -> Promise<boolean>
   * กล่องยืนยัน มีปุ่ม "ยกเลิก" / "ตกลง"
   */
  function uiConfirm(message, opts) {
    opts = opts || {};
    return enqueue(() => new Promise((resolve) => {
      ensureDom();
      box.className = "ui-popup-box ui-popup-confirm";
      iconEl.style.display = "block";
      iconEl.innerHTML = opts.icon || "<span class=gicon-help></span>";
      msgEl.textContent = message == null ? "" : String(message);
      inputEl.style.display = "none";
      overlay.dataset.dismissable = "1";
      overlay.dataset.backdropClose = "0";

      let settled = false;
      const finish = (val) => { if (settled) return; settled = true; closeBox(); resolve(val); };

      btnRow.innerHTML = "";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "ui-popup-btn ui-popup-btn-cancel";
      cancelBtn.textContent = opts.cancelText || "ยกเลิก";
      cancelBtn.onclick = () => finish(false);

      const okBtn = document.createElement("button");
      okBtn.className = "ui-popup-btn ui-popup-btn-primary";
      okBtn.textContent = opts.okText || "ตกลง";
      okBtn.onclick = () => finish(true);

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okBtn);

      // ปิดผ่านพื้นหลังมืด = เท่ากับยกเลิก
      const watchBackdrop = () => {
        if (overlay.dataset.backdropClose === "1") {
          overlay.dataset.backdropClose = "0";
          finish(false);
        } else if (overlay.classList.contains("open")) {
          requestAnimationFrame(watchBackdrop);
        }
      };

      openBox();
      okBtn.focus();
      requestAnimationFrame(watchBackdrop);
    }));
  }

  /**
   * uiPrompt(message, defaultValue) -> Promise<string|null>
   * กล่องกรอกข้อความ คืนค่า null ถ้ากดยกเลิก
   */
  function uiPrompt(message, defaultValue) {
    return enqueue(() => new Promise((resolve) => {
      ensureDom();
      box.className = "ui-popup-box ui-popup-prompt";
      iconEl.style.display = "none";
      msgEl.textContent = message == null ? "" : String(message);
      inputEl.style.display = "block";
      inputEl.value = defaultValue == null ? "" : String(defaultValue);
      overlay.dataset.dismissable = "1";
      overlay.dataset.backdropClose = "0";

      let settled = false;
      const finish = (val) => { if (settled) return; settled = true; closeBox(); resolve(val); };

      btnRow.innerHTML = "";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "ui-popup-btn ui-popup-btn-cancel";
      cancelBtn.textContent = "ยกเลิก";
      cancelBtn.onclick = () => finish(null);

      const okBtn = document.createElement("button");
      okBtn.className = "ui-popup-btn ui-popup-btn-primary";
      okBtn.textContent = "ตกลง";
      okBtn.onclick = () => finish(inputEl.value);

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okBtn);

      inputEl.onkeydown = (e) => {
        if (e.key === "Enter") finish(inputEl.value);
        if (e.key === "Escape") finish(null);
      };

      const watchBackdrop = () => {
        if (overlay.dataset.backdropClose === "1") {
          overlay.dataset.backdropClose = "0";
          finish(null);
        } else if (overlay.classList.contains("open")) {
          requestAnimationFrame(watchBackdrop);
        }
      };

      openBox();
      setTimeout(() => { inputEl.focus(); inputEl.select(); }, 0);
      requestAnimationFrame(watchBackdrop);
    }));
  }

  // ---------- เผยแพร่สู่ global ----------
  window.uiAlert = uiAlert;
  window.uiConfirm = uiConfirm;
  window.uiPrompt = uiPrompt;

  // ทับ window.alert ตรง ๆ ได้เลย เพราะโค้ดเดิมทุกจุดไม่ได้ใช้ค่าที่คืนจาก
  // alert() (ตัวมันคืน undefined เสมออยู่แล้ว) จึงสลับมาใช้กล่อง CSS แบบ
  // non-blocking แทนได้โดยไม่ต้องแก้โค้ดจุดอื่นเลย
  window.alert = function (message) {
    uiAlert(message);
  };
})();
