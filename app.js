const SYSTEM_KEY = "yang";
const API_URL = "https://script.google.com/macros/s/AKfycbzvpVM9rwy9eC3hUUiP7oIpYa_YNsotLJ5pW8A-c9jG_3eQ5BlLmeV9bQCkB-sH_c4wPA/exec";

let rawSows = [];
let rawBoars = [];
let isDataLoaded = false;

// 1. 密碼驗證
function verifyPassword() {
    const pwd = document.getElementById('inputPassword').value.trim();
    if (pwd === SYSTEM_KEY) {
        sessionStorage.setItem("gla_auth", "ok");
        document.getElementById('authOverlay').style.display = "none";
        document.getElementById('mainApp').style.display = "block";
        loadDataJSONP();
    } else {
        document.getElementById('authErrorMsg').classList.remove('d-none');
    }
}

document.getElementById('authSubmitBtn').addEventListener('click', verifyPassword);
document.getElementById('inputPassword').addEventListener('keyup', e => { 
    if (e.key === 'Enter') verifyPassword(); 
});
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem("gla_auth");
    location.reload();
});

// 2. 透過 JSONP 穿透所有瀏覽器跨域限制載入資料
function loadDataJSONP() {
    const statusDot = document.getElementById('statusDot');
    const syncStatus = document.getElementById('syncStatus');
    
    statusDot.className = "fas fa-circle text-warning me-1";
    syncStatus.innerText = "Connecting Google Sheets...";

    // 建立全域回呼函式
    window.handleSheetData = function(data) {
        rawSows = data.sows || [];
        rawBoars = data.boars || [];
        isDataLoaded = true;
        
        statusDot.className = "fas fa-circle text-success me-1";
        syncStatus.innerText = `Live Connected (${rawSows.length + rawBoars.length} records)`;
        
        // 移除載入完成的 script 標籤
        const oldScript = document.getElementById('gasJsonpScript');
        if (oldScript) oldScript.remove();
    };

    // 動態載入腳本
    const script = document.createElement('script');
    script.id = 'gasJsonpScript';
    script.src = `${API_URL}?callback=handleSheetData&_t=${Date.now()}`;
    script.onerror = function() {
        statusDot.className = "fas fa-circle text-danger me-1";
        syncStatus.innerText = "Connection Failed";
        alert("連線失敗！請確認 Apps Script 部署已更新為新版本。");
    };
    document.body.appendChild(script);
}

// 輔助函式：標準化字串以供模糊比對
function cleanStr(val) {
    return String(val || "").replace(/\s+/g, '').toLowerCase();
}

// 3. 模糊比對查詢
function performSearch() {
    if (!isDataLoaded) {
        alert("資料仍在同步中，請稍候再試！");
        return;
    }

    const cat = document.getElementById('searchCategory').value;
    const query = cleanStr(document.getElementById('searchTagInput').value);
    const container = document.getElementById('individualResultContainer');
    const fuzzyBox = document.getElementById('fuzzyMatchContainer');
    const candidateBtns = document.getElementById('fuzzyCandidateButtons');

    if (!query) {
        alert("請輸入耳號關鍵字進行查詢！");
        return;
    }

    const dataset = (cat === 'sow') ? rawSows : rawBoars;

    const matches = dataset.filter(item => {
        const tag = cleanStr(item["母豬耳號"] || item["Ear Number"] || item["Tag ID"] || item["Boar Ear Tag"] || item["Nombor Telinga"] || item["tag"]);
        return tag.includes(query);
    });

    if (matches.length === 0) {
        fuzzyBox.classList.add('d-none');
        container.style.display = "block";
        document.getElementById('metricBoxesRow').innerHTML = `
            <div class="col-12 text-center py-4 text-muted">
                <i class="fas fa-exclamation-triangle text-warning me-2 fs-5"></i>
                No records found matching "<strong>${query}</strong>".<br>
                <span class="sub-lang">Tiada rekod dijumpai | 查無相符的耳號資料。</span>
            </div>`;
        const badge = document.getElementById('resultBadge');
        badge.className = "badge bg-secondary px-3 py-2 fs-6";
        badge.innerText = "Not Found";
        return;
    }

    candidateBtns.innerHTML = "";
    if (matches.length > 1) {
        fuzzyBox.classList.remove('d-none');
        matches.slice(0, 15).forEach((item, idx) => {
            const t = item["母豬耳號"] || item["Ear Number"] || item["Tag ID"] || item["Boar Ear Tag"] || item["Nombor Telinga"] || "Unknown";
            const btn = document.createElement('button');
            btn.className = `btn btn-sm ${idx === 0 ? 'btn-primary' : 'btn-outline-primary'} fw-bold`;
            btn.innerText = t;
            btn.onclick = () => {
                document.querySelectorAll('#fuzzyCandidateButtons button').forEach(b => b.className = 'btn btn-sm btn-outline-primary fw-bold');
                btn.className = 'btn btn-sm btn-primary fw-bold';
                renderProfileCard(cat, item);
            };
            candidateBtns.appendChild(btn);
        });
    } else {
        fuzzyBox.classList.add('d-none');
    }

    renderProfileCard(cat, matches[0]);
}

// 4. 數值卡片呈現
function renderProfileCard(cat, item) {
    const container = document.getElementById('individualResultContainer');
    const rowBox = document.getElementById('metricBoxesRow');
    const badge = document.getElementById('resultBadge');

    container.style.display = "block";
    rowBox.innerHTML = "";

    const rawGrade = String(item["等級"] || item["Grade"] || "B").toUpperCase();
    const grade = rawGrade.charAt(0);
    badge.className = `badge badge-grade-${grade} px-3 py-2 fs-6`;

    if (cat === 'sow') {
        badge.innerText = `Grade ${grade} Sow / Gred ${grade} Induk / ${grade} 級母豬`;

        const tag = item["母豬耳號"] || item["Ear Number"] || item["Tag ID"] || item["Nombor Telinga"] || "--";
        const breed = item["親代品系 1"] || item["Breed"] || item["Baka induk"] || "--";
        const parity = item["胎次"] || item["Parity"] || item["Pariti"] || "--";
        const spi = item["計算 SPI"] || item["SPI"] || "--";
        const ggp = item["GGP選拔指數"] || item["GGP"] || "--";
        const psy = item["PSY (Pigs per sow per year每頭母豬每年離乳豬數 ("] || item["PSY"] || "--";

        const isPure = !String(tag).toUpperCase().includes("LY") && !String(breed).toUpperCase().includes("LY");
        const pNum = parseInt(parity) || 0;
        let adviceHtml = "";

        if (isPure) {
            if (pNum >= 4) {
                adviceHtml = (grade === 'A' || grade === 'B')
                    ? `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>Retain for Purebred Breeding (Parity ${pNum})<span class="sub-lang">Syor Pembiakan Baka Tulen | 建議留種 (第 ${pNum} 胎純種)</span></span>`
                    : `<span class="text-secondary"><i class="fas fa-eye me-1"></i>Observe for Culling<span class="sub-lang">Pemerhatian Penyingkiran | 評級較低，列入淘汰觀察</span></span>`;
            } else {
                adviceHtml = `<span class="text-muted">Purebred Parity < 4 (Current P${pNum})<span class="sub-lang">Belum Capai Pariti 4 | 純種未滿 4 胎，持續評估</span></span>`;
            }
        } else {
            adviceHtml = `<span class="text-secondary">LY Commercial Crossbred (No Breeding)<span class="sub-lang">Kacukan Komersial (Tiada Pembiakan) | LY 雜交商品母豬 (僅作肉豬生產，不留種)</span></span>`;
        }

        rowBox.innerHTML = `
            <div class="col-md-3"><div class="metric-box"><div class="metric-label">Ear Tag <span class="sub-lang">No. Telinga | 耳號</span></div><div class="metric-value text-primary">${tag}</div></div></div>
            <div class="col-md-3"><div class="metric-box"><div class="metric-label">Breed <span class="sub-lang">Baka | 品種</span></div><div class="metric-value">${breed}</div></div></div>
            <div class="col-md-3"><div class="metric-box"><div class="metric-label">Parity <span class="sub-lang">Pariti | 胎次</span></div><div class="metric-value">P ${parity}</div></div></div>
            <div class="col-md-3"><div class="metric-box"><div class="metric-label">SPI Index <span class="sub-lang">Indeks SPI | SPI 生產指數</span></div><div class="metric-value text-success">${spi}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">GGP Index <span class="sub-lang">Indeks GGP | GGP 選拔指數</span></div><div class="metric-value text-dark">${ggp}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">PSY <span class="sub-lang">Anak Cerai/Tahun | 年離乳頭數</span></div><div class="metric-value text-dark">${psy}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Breeding Advice <span class="sub-lang">Cadangan | 留種建議</span></div><div class="mt-2">${adviceHtml}</div></div></div>
        `;
    } else {
        badge.innerText = `Grade ${grade} Boar / Gred ${grade} Jantan / ${grade} 級公豬`;

        const tag = item["Tag ID"] || item["Boar Ear Tag"] || "--";
        const breed = item["Breed"] || "--";
        const score = item["Score"] || "--";
        const strategy = item["Strategy"] || "--";
        const tso = item["TSO"] || "--";

        rowBox.innerHTML = `
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Boar Tag <span class="sub-lang">No. Telinga | 公豬耳號</span></div><div class="metric-value text-primary">${tag}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Breed <span class="sub-lang">Baka | 品種</span></div><div class="metric-value">${breed}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Strategy <span class="sub-lang">Strategi | 策略方向</span></div><div class="metric-value text-dark">${strategy}</div></div></div>
            <div class="col-md-6"><div class="metric-box"><div class="metric-label">Performance Score <span class="sub-lang">Skor | 綜合評分</span></div><div class="metric-value text-success">${score}</div></div></div>
            <div class="col-md-6"><div class="metric-box"><div class="metric-label">TSO (Sperm Output) <span class="sub-lang">Jumlah Mani | 總精子量</span></div><div class="metric-value text-dark">${tso}</div></div></div>
        `;
    }
}

// 5. 畫布生成與圖檔下載
document.getElementById('downloadImageBtn').addEventListener('click', () => {
    if (!isDataLoaded) {
        alert("資料載入中，請稍候！");
        return;
    }

    const gradeFilter = document.getElementById('filterGrade').value.toUpperCase();
    const scale = parseInt(document.getElementById('imageResolution').value) || 2;

    const chkL = document.getElementById('chkL').checked;
    const chkY = document.getElementById('chkY').checked;
    const chkD = document.getElementById('chkD').checked;
    const chkLY = document.getElementById('chkLY').checked;

    let selectedBreeds = [];
    if (chkL) selectedBreeds.push('L');
    if (chkY) selectedBreeds.push('Y');
    if (chkD) selectedBreeds.push('D');
    if (chkLY) selectedBreeds.push('LY');

    let exportList = [];

    rawSows.forEach(i => {
        const g = String(i["等級"] || i["Grade"] || "B").toUpperCase().charAt(0);
        const b = String(i["親代品系 1"] || i["Breed"] || "").toUpperCase();
        const tag = i["母豬耳號"] || i["Ear Number"] || i["Nombor Telinga"] || "";
        const matchG = !gradeFilter || g === gradeFilter;
        const matchB = selectedBreeds.length === 0 || selectedBreeds.some(x => b.includes(x));
        if (matchG && matchB && tag) {
            exportList.push({ type: "Sow (母豬)", grade: g, tag: tag, breed: b, metric: `Parity: ${i["胎次"]||1} | SPI: ${i["計算 SPI"]||"--"}` });
        }
    });

    rawBoars.forEach(i => {
        const g = String(i["Grade"] || i["等級"] || "B").toUpperCase().charAt(0);
        const b = String(i["Breed"] || "").toUpperCase();
        const tag = i["Tag ID"] || i["Boar Ear Tag"] || "";
        const matchG = !gradeFilter || g === gradeFilter;
        const matchB = selectedBreeds.length === 0 || selectedBreeds.some(x => b.includes(x));
        if (matchG && matchB && tag) {
            exportList.push({ type: "Boar (公豬)", grade: g, tag: tag, breed: b, metric: `Score: ${i["Score"]||"--"} | TSO: ${i["TSO"]||"--"}` });
        }
    });

    if (exportList.length === 0) {
        alert("沒有符合所選條件的資料！");
        return;
    }

    const renderList = exportList.slice(0, 100);
    const canvas = document.getElementById('exportCanvas');
    const ctx = canvas.getContext('2d');

    const baseWidth = 1000;
    const rowHeight = 36;
    const headerHeight = 130;
    const baseHeight = headerHeight + (renderList.length * rowHeight) + 60;

    canvas.width = baseWidth * scale;
    canvas.height = baseHeight * scale;
    ctx.scale(scale, scale);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, baseWidth, 75);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillText("GLA SWINE BREEDING & SELECTION REPORT", 30, 36);

    ctx.font = "normal 12px Inter, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Generated: ${new Date().toLocaleString()} | Filter: Grade [${gradeFilter || 'ALL'}] | Breeds [${selectedBreeds.join(',') || 'ALL'}]`, 30, 58);

    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "right";
    ctx.fillText("CONFIDENTIAL - IMAGE EXPORT ONLY", baseWidth - 30, 45);
    ctx.textAlign = "left";

    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(20, 85, baseWidth - 40, 35);

    ctx.fillStyle = "#334155";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillText("TYPE (類別)", 35, 107);
    ctx.fillText("GRADE (等級)", 180, 107);
    ctx.fillText("EAR TAG (耳號)", 300, 107);
    ctx.fillText("BREED (品種)", 480, 107);
    ctx.fillText("PERFORMANCE METRICS (關鍵指標與數據)", 620, 107);

    ctx.font = "12px Inter, sans-serif";
    renderList.forEach((r, idx) => {
        const y = headerHeight + (idx * rowHeight);

        if (idx % 2 === 1) {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(20, y - 22, baseWidth - 40, rowHeight);
        }

        ctx.strokeStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.moveTo(20, y + 14);
        ctx.lineTo(baseWidth - 20, y + 14);
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.fillText(r.type, 35, y);

        if (r.grade === 'A') ctx.fillStyle = "#10b981";
        else if (r.grade === 'B') ctx.fillStyle = "#f59e0b";
        else ctx.fillStyle = "#ef4444";
        ctx.font = "bold 13px Inter, sans-serif";
        ctx.fillText(`Grade ${r.grade}`, 180, y);

        ctx.font = "bold 13px Inter, sans-serif";
        ctx.fillStyle = "#0f172a";
        ctx.fillText(r.tag, 300, y);

        ctx.font = "normal 12px Inter, sans-serif";
        ctx.fillStyle = "#475569";
        ctx.fillText(r.breed, 480, y);
        ctx.fillText(r.metric, 620, y);
    });

    const footerY = baseHeight - 25;
    ctx.font = "italic 11px Inter, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Showing ${renderList.length} of ${exportList.length} filtered items. Internal document.`, 30, footerY);

    const link = document.createElement('a');
    link.download = `GLA_Breeding_Report_${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
});

// 6. 事件監聽
document.getElementById('executeSearchBtn').addEventListener('click', performSearch);
document.getElementById('searchTagInput').addEventListener('keyup', e => {
    if (e.key === 'Enter') performSearch();
});

window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem("gla_auth") === "ok") {
        document.getElementById('authOverlay').style.display = "none";
        document.getElementById('mainApp').style.display = "block";
        loadDataJSONP();
    }
});
