const SYSTEM_KEY = "yang";
const API_URL = "https://script.google.com/macros/s/AKfycbzvpVM9rwy9eC3hUUiP7oIpYa_YNsotLJ5pW8A-c9jG_3eQ5BlLmeV9bQCkB-sH_c4wPA/exec";

let rawSows = [];
let rawBoars = [];
let isDataLoaded = false;

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

function loadDataJSONP() {
    const statusDot = document.getElementById('statusDot');
    const syncStatus = document.getElementById('syncStatus');
    
    statusDot.className = "fas fa-circle text-warning me-1";
    syncStatus.innerText = "Connecting Google Sheets...";

    window.handleSheetData = function(data) {
        rawSows = data.sows || [];
        rawBoars = data.boars || [];
        isDataLoaded = true;
        
        statusDot.className = "fas fa-circle text-success me-1";
        syncStatus.innerText = `Live Connected (Sows: ${rawSows.length}, Boars: ${rawBoars.length})`;
        
        const oldScript = document.getElementById('gasJsonpScript');
        if (oldScript) oldScript.remove();
    };

    const script = document.createElement('script');
    script.id = 'gasJsonpScript';
    script.src = `${API_URL}?callback=handleSheetData&_t=${Date.now()}`;
    script.onerror = function() {
        statusDot.className = "fas fa-circle text-danger me-1";
        syncStatus.innerText = "Connection Failed";
    };
    document.body.appendChild(script);
}

function cleanStr(val) {
    return String(val || "").replace(/[\s\r\n\t\(\)]/g, '').toLowerCase();
}

function getVal(item, candidates) {
    for (let c of candidates) {
        if (item[c] !== undefined && item[c] !== null && String(item[c]).trim() !== "") {
            return String(item[c]).trim();
        }
    }
    const keys = Object.keys(item);
    for (let c of candidates) {
        const matchedKey = keys.find(k => cleanStr(k).includes(cleanStr(c)));
        if (matchedKey && item[matchedKey] !== undefined && String(item[matchedKey]).trim() !== "") {
            return String(item[matchedKey]).trim();
        }
    }
    return "--";
}

function performSearch() {
    if (!isDataLoaded) {
        alert("資料仍在同步中，請稍候再試！");
        return;
    }

    const selectedCat = document.getElementById('searchCategory').value;
    const query = cleanStr(document.getElementById('searchTagInput').value);
    const container = document.getElementById('individualResultContainer');
    const fuzzyBox = document.getElementById('fuzzyMatchContainer');
    const candidateBtns = document.getElementById('fuzzyCandidateButtons');

    if (!query) {
        alert("請輸入耳號關鍵字進行查詢！");
        return;
    }

    let activeCat = selectedCat;
    let dataset = (activeCat === 'sow') ? rawSows : rawBoars;

    let matches = dataset.filter(item => {
        const tag = cleanStr(getVal(item, ["Tag ID", "Boar Ear Tag", "母豬耳號", "Ear Number", "Nombor Telinga"]));
        return tag.includes(query);
    });

    // 跨表自動搜尋
    if (matches.length === 0) {
        const otherCat = (selectedCat === 'sow') ? 'boar' : 'sow';
        const otherDataset = (otherCat === 'sow') ? rawSows : rawBoars;
        const otherMatches = otherDataset.filter(item => {
            const tag = cleanStr(getVal(item, ["Tag ID", "Boar Ear Tag", "母豬耳號", "Ear Number", "Nombor Telinga"]));
            return tag.includes(query);
        });

        if (otherMatches.length > 0) {
            activeCat = otherCat;
            dataset = otherDataset;
            matches = otherMatches;
            document.getElementById('searchCategory').value = otherCat;
        }
    }

    if (matches.length === 0) {
        if (fuzzyBox) fuzzyBox.classList.add('d-none');
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

    if (candidateBtns) {
        candidateBtns.innerHTML = "";
        if (matches.length > 1) {
            fuzzyBox.classList.remove('d-none');
            matches.slice(0, 15).forEach((item, idx) => {
                const t = getVal(item, ["Tag ID", "Boar Ear Tag", "母豬耳號", "Ear Number"]);
                const btn = document.createElement('button');
                btn.className = `btn btn-sm ${idx === 0 ? 'btn-primary' : 'btn-outline-primary'} fw-bold`;
                btn.innerText = t;
                btn.onclick = () => {
                    document.querySelectorAll('#fuzzyCandidateButtons button').forEach(b => b.className = 'btn btn-sm btn-outline-primary fw-bold');
                    btn.className = 'btn btn-sm btn-primary fw-bold';
                    renderProfileCard(activeCat, item);
                };
                candidateBtns.appendChild(btn);
            });
        } else {
            fuzzyBox.classList.add('d-none');
        }
    }

    renderProfileCard(activeCat, matches[0]);
}

function renderProfileCard(cat, item) {
    const container = document.getElementById('individualResultContainer');
    const rowBox = document.getElementById('metricBoxesRow');
    const badge = document.getElementById('resultBadge');

    container.style.display = "block";
    rowBox.innerHTML = "";

    const rawGrade = getVal(item, ["Grade", "等級"]);
    const grade = rawGrade !== "--" ? rawGrade.charAt(0).toUpperCase() : "B";
    badge.className = `badge badge-grade-${grade} px-3 py-2 fs-6`;

    if (cat === 'sow') {
        badge.innerText = `Grade ${grade} Sow / Gred ${grade} Induk / ${grade} 級母豬`;

        const tag = getVal(item, ["母豬耳號", "Ear Number", "Tag ID", "Nombor Telinga"]);
        const breed = getVal(item, ["親代品系 1", "Breed", "Baka"]);
        const parity = getVal(item, ["胎次", "Parity", "Pariti"]);
        const spi = getVal(item, ["計算 SPI", "SPI"]);
        const ggp = getVal(item, ["GGP選拔指數", "GGP"]);
        const psy = getVal(item, ["PSY", "每頭母豬每年離乳豬數"]);

        const isPure = !tag.toUpperCase().includes("LY") && !breed.toUpperCase().includes("LY");
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

        const tag = getVal(item, ["Tag ID", "Boar Ear Tag", "耳號"]);
        const breed = getVal(item, ["Breed", "品種"]);
        const score = getVal(item, ["Score", "評分"]);
        const strategy = getVal(item, ["Strategy", "策略"]);
        const tso = getVal(item, ["TSO", "總精子量"]);

        rowBox.innerHTML = `
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Boar Tag <span class="sub-lang">No. Telinga | 公豬耳號</span></div><div class="metric-value text-primary">${tag}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Breed <span class="sub-lang">Baka | 品種</span></div><div class="metric-value">${breed}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Strategy <span class="sub-lang">Strategi | 策略方向</span></div><div class="metric-value text-dark">${strategy}</div></div></div>
            <div class="col-md-6"><div class="metric-box"><div class="metric-label">Performance Score <span class="sub-lang">Skor | 綜合評分</span></div><div class="metric-value text-success">${score}</div></div></div>
            <div class="col-md-6"><div class="metric-box"><div class="metric-label">TSO (Sperm Output) <span class="sub-lang">Jumlah Mani | 總精子量</span></div><div class="metric-value text-dark">${tso}</div></div></div>
        `;
    }
}

// 圖檔生成
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

    function isBreedMatch(breedStr, tagStr) {
        if (selectedBreeds.length === 0) return true;
        const b = cleanStr(breedStr);
        const t = cleanStr(tagStr);
        for (let sel of selectedBreeds) {
            if (sel === 'LY' && (b.includes('ly') || t.startsWith('ly'))) return true;
            if (sel === 'D' && (b.includes('duroc') || b === 'd' || t.startsWith('d'))) return true;
            if (sel === 'L' && (b.includes('landrace') || b === 'l' || t.startsWith('l')) && !b.includes('ly') && !t.startsWith('ly')) return true;
            if (sel === 'Y' && (b.includes('yorkshire') || b === 'y' || t.startsWith('y')) && !b.includes('ly') && !t.startsWith('ly')) return true;
        }
        return false;
    }

    let exportList = [];

    rawSows.forEach(i => {
        const rawG = getVal(i, ["等級", "Grade"]);
        const g = rawG !== "--" ? rawG.charAt(0).toUpperCase() : "B";
        const b = getVal(i, ["親代品系 1", "Breed"]);
        const tag = getVal(i, ["母豬耳號", "Ear Number"]);
        const spi = getVal(i, ["計算 SPI", "SPI"]);
        const parity = getVal(i, ["胎次", "Parity"]);

        if ((!gradeFilter || g === gradeFilter) && isBreedMatch(b, tag) && tag !== "--") {
            exportList.push({ type: "Sow (母豬)", grade: g, tag: tag, breed: b, metric: `Parity: ${parity} | SPI: ${spi}` });
        }
    });

    rawBoars.forEach(i => {
        const rawG = getVal(i, ["Grade", "等級"]);
        const g = rawG !== "--" ? rawG.charAt(0).toUpperCase() : "B";
        const b = getVal(i, ["Breed", "品種"]);
        const tag = getVal(i, ["Tag ID", "Boar Ear Tag"]);
        const score = getVal(i, ["Score", "評分"]);
        const tso = getVal(i, ["TSO", "總精子量"]);

        if ((!gradeFilter || g === gradeFilter) && isBreedMatch(b, tag) && tag !== "--") {
            exportList.push({ type: "Boar (公豬)", grade: g, tag: tag, breed: b, metric: `Score: ${score} | TSO: ${tso}` });
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
    ctx.fillText(`Showing ${renderList.length} of ${exportList.length} filtered items. Internal operational document.`, 30, footerY);

    const link = document.createElement('a');
    link.download = `GLA_Breeding_Report_${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
});

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
