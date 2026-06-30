function log(msg, side="system"){
  const el = document.getElementById("battleLog");
  let color;
  switch(side){
    case "player": color = "#4FC3F7"; break; // ฟ้า
    case "enemy":  color = "#FF7043"; break; // ส้ม
    default:       color = "#FFD54F"; break; // เหลืองทอง (system)
  }
  el.innerHTML += `<span style="color:${color}">${msg}</span><br>`;
  el.scrollTop = el.scrollHeight;
}

function logClear(){ document.getElementById("battleLog").innerHTML = ""; document.getElementById("result").innerText = ""; }

function updateResult(text){
  document.getElementById("result").innerText = text;
}

function delay(ms){ return new Promise(r=>setTimeout(r, ms)); }
