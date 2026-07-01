// js/core/auth-ui.js — เดิมเกมใช้ guest username สุ่ม ไม่มีรหัสผ่านเลย ตอนนี้เงิน/กระเป๋า/เด็คอยู่บนเซิฟจริง
// จึงต้องมี PIN กันคนอื่นสวมชื่อไปใช้ของเรา หน้านี้แสดง modal เข้าสู่ระบบ/สมัคร แบบฉีดเข้า DOM เอง
// ไม่ต้องแก้ HTML ของแต่ละหน้า แค่ใส่ <script src="../js/core/auth-ui.js"></script> หลัง api.js
(function () {
  function injectStyle() {
    if (document.getElementById("authui-style")) return;
    const style = document.createElement("style");
    style.id = "authui-style";
    style.textContent = `
      #authui-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75);
        display: flex; align-items: center; justify-content: center; z-index: 99999; font-family: sans-serif; }
      #authui-box { background: #1e1e2e; color: #eee; padding: 24px 28px; border-radius: 12px;
        width: 280px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
      #authui-box h2 { margin: 0 0 12px; font-size: 18px; text-align: center; }
      #authui-box input { width: 100%; box-sizing: border-box; padding: 8px 10px; margin: 6px 0;
        border-radius: 6px; border: 1px solid #444; background: #2a2a3a; color: #fff; font-size: 14px; }
      #authui-box button { width: 100%; padding: 9px; margin-top: 8px; border: none; border-radius: 6px;
        cursor: pointer; font-size: 14px; font-weight: bold; }
      #authui-submit { background: #4a7dff; color: white; }
      #authui-toggle { background: transparent; color: #9ab; text-decoration: underline; margin-top: 10px; }
      #authui-error { color: #ff8080; font-size: 12px; min-height: 16px; margin-top: 6px; text-align: center; }
    `;
    document.head.appendChild(style);
  }

  function loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      if (document.getElementById("google-identity-script")) {
        document.getElementById("google-identity-script").addEventListener("load", () => resolve());
        return;
      }
      const script = document.createElement("script");
      script.id = "google-identity-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("โหลดสคริปต์ Google ไม่สำเร็จ"));
      document.head.appendChild(script);
    });
  }

  // เพิ่มปุ่ม "เข้าสู่ระบบด้วย Google" เข้าไปใน modal — ถ้า server ยังไม่ได้ตั้งค่า
  // GOOGLE_CLIENT_ID ไว้ (ยังไม่ได้ตั้งค่าใน Railway) จะไม่แสดงปุ่มนี้ให้เงียบๆ
  async function mountGoogleButton(container, onDone) {
    const config = await GameAPI.getAuthConfig();
    if (!config?.googleClientId) return; // ยังไม่ได้ตั้งค่า Google ฝั่ง server

    try {
      await loadGoogleScript();
    } catch (err) {
      console.warn("[auth-ui]", err);
      return;
    }

    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: async (response) => {
        const result = await GameAPI.loginWithGoogle(response.credential);
        onDone(result);
      },
    });

    const divider = document.createElement("div");
    divider.style.cssText = "text-align:center;color:#778;font-size:12px;margin:10px 0;";
    divider.textContent = "หรือ";
    container.appendChild(divider);

    const btnWrap = document.createElement("div");
    btnWrap.style.cssText = "display:flex;justify-content:center;";
    container.appendChild(btnWrap);

    window.google.accounts.id.renderButton(btnWrap, {
      theme: "filled_black",
      size: "large",
      width: 232,
      text: "signin_with",
      locale: "th",
    });
  }

  function showModal() {
    injectStyle();
    if (document.getElementById("authui-overlay")) return;

    let mode = "login"; // or "register"
    const overlay = document.createElement("div");
    overlay.id = "authui-overlay";
    overlay.innerHTML = `
      <div id="authui-box">
        <h2 id="authui-title">เข้าสู่ระบบ</h2>
        <input id="authui-username" type="text" placeholder="ชื่อผู้เล่น (2-32 ตัวอักษร)" autocomplete="username" />
        <input id="authui-pin" type="password" inputmode="numeric" placeholder="PIN (ตัวเลข 4-8 หลัก)" autocomplete="current-password" />
        <button id="authui-submit">เข้าสู่ระบบ</button>
        <button id="authui-toggle">ยังไม่มีบัญชี? สมัครใหม่</button>
        <div id="authui-error"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const title = overlay.querySelector("#authui-title");
    const submitBtn = overlay.querySelector("#authui-submit");
    const toggleBtn = overlay.querySelector("#authui-toggle");
    const errorBox = overlay.querySelector("#authui-error");
    const usernameInput = overlay.querySelector("#authui-username");
    const pinInput = overlay.querySelector("#authui-pin");

    const prevUsername = localStorage.getItem("username");
    if (prevUsername) usernameInput.value = prevUsername;

    function setMode(next) {
      mode = next;
      title.textContent = mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิกใหม่";
      submitBtn.textContent = mode === "login" ? "เข้าสู่ระบบ" : "สมัคร";
      toggleBtn.textContent = mode === "login" ? "ยังไม่มีบัญชี? สมัครใหม่" : "มีบัญชีแล้ว? เข้าสู่ระบบ";
      errorBox.textContent = "";
    }
    toggleBtn.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));

    async function submit() {
      const username = usernameInput.value.trim();
      const pin = pinInput.value.trim();
      errorBox.textContent = "";
      if (username.length < 2) { errorBox.textContent = "ชื่อผู้เล่นสั้นเกินไป"; return; }
      if (!/^[0-9]{4,8}$/.test(pin)) { errorBox.textContent = "PIN ต้องเป็นตัวเลข 4-8 หลัก"; return; }

      submitBtn.disabled = true;
      submitBtn.textContent = "กำลังดำเนินการ...";
      const result = mode === "login" ? await GameAPI.login(username, pin) : await GameAPI.register(username, pin);
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "login" ? "เข้าสู่ระบบ" : "สมัคร";

      if (result && result.token) {
        overlay.remove();
        if (typeof window.onAuthReady === "function") window.onAuthReady();
        location.reload(); // ให้หน้าที่โหลด economy state ไว้ก่อนหน้านี้ (ถ้ามี) รีเฟรชด้วยข้อมูลจริง
      } else {
        errorBox.textContent = result?.error || "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
      }
    }

    submitBtn.addEventListener("click", submit);
    pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    setMode("login");

    // ปุ่ม Google — ใช้ callback แยกจาก submit() ปกติ เพราะไม่มี username/pin ให้กรอก
    mountGoogleButton(overlay.querySelector("#authui-box"), (result) => {
      if (result && result.token) {
        overlay.remove();
        if (typeof window.onAuthReady === "function") window.onAuthReady();
        location.reload();
      } else {
        errorBox.textContent = result?.error || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้ง";
      }
    });
  }

  // เรียกอัตโนมัติเมื่อโหลดสคริปต์นี้ ถ้ายังไม่มี session
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.GameAPI) { console.warn("[auth-ui] ต้องโหลด api.js ก่อน auth-ui.js"); return; }
    if (!GameAPI.isLoggedIn()) showModal();
  });

  window.AuthUI = { showModal };
})();