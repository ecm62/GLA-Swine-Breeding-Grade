const SYSTEM_KEY = "yang";
const API_URL = "https://script.google.com/macros/s/AKfycbzvpVM9rwy9eC3hUUiP7oIpYa_YNsotLJ5pW8A-c9jG_3eQ5BlLmeV9bQCkB-sH_c4wPA/exec";

let rawSows = [];
let rawBoars = [];

function verifyPassword() {
    if (document.getElementById('inputPassword').value.trim() === SYSTEM_KEY) {
        sessionStorage.setItem("gla_auth", "ok");
        document.getElementById('authOverlay').style.display = "none";
        document.getElementById('mainApp').style.display = "block";
        loadData();
    } else {
        document.getElementById('authErrorMsg').classList.remove('d-none');
    }
}

document.getElementById('authSubmitBtn').addEventListener('click', verifyPassword);
document.getElementById('inputPassword').addEventListener('keyup', e => { if (e.key === 'Enter') verifyPassword(); });
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem("gla_auth");
    location.reload();
});

async function loadData() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        rawSows = data.sows || [];
        rawBoars = data.boars || [];
        document.getElementById('syncStatus').innerText = "Live Connected";
        renderTable();
    } catch (e) {
        document.getElementById('syncStatus').innerText = "Connection Failed";
    }
}

document.getElementById('executeSearchBtn').addEventListener('click', () => {
    const cat = document.getElementById('searchCategory').value;
    const tagQuery = document.getElementById('searchTagInput').value.trim().toLowerCase();
    const container = document.getElementById('individualResultContainer');
    const rowBox = document.getElementById('metricBoxesRow');
    const badge = document.getElementById('resultBadge');

    if (!tagQuery) {
        alert("Please enter an ear tag number! / 请先输入要查询的耳号！");
        return;
    }

    container.style.display = "block";
    rowBox.innerHTML = "";

    if (cat === 'sow') {
        const found = rawSows.find(i => {
            const t = String(i["母豬耳號"] || i["Ear Number"] || i["Tag ID"] || "").toLowerCase();
            return t.includes(tagQuery);
        });

        if (!found) {
            rowBox.innerHTML = `<div class="col-12 text-muted py-3">No record found. / 找不到此母猪资料。</div>`;
            badge.className = "badge bg-secondary px-3 py-2 fs-6";
            badge.innerText = "Not Found";
            return;
        }

        const grade = (found["等級"] || found["Grade"] || "B").toUpperCase().charAt(0);
        badge.className = `badge badge-grade-${grade} px-3 py-2 fs-6`;
        badge.innerText = `Grade ${grade} Sow`;

        const tag = found["母豬耳號"] || found["Ear Number"] || "--";
        const breed = found["親代品系 1"] || found["Breed"] || "--";
        const parity = found["胎次"] || found["Parity"] || "--";
        const spi = found["計算 SPI"] || found["SPI"] || "--";
        const ggp = found["GGP選拔指數"] || found["GGP"] || "--";
        const psy = found["PSY (Pigs per sow per year每頭母豬每年離乳豬數 ("] || found["PSY"] || "--";

        rowBox.innerHTML = `
            <div class="col-md-3"><div class="metric-box"><div class="metric-label">Ear Tag</div><div class="metric-value text-primary">${tag}</div></div></div>
            <div class="col-md-3"><div class="metric-box"><div class="metric-label">Breed</div><div class="metric-value">${breed}</div></div></div>
            <div class="col-md-3"><div class="metric-box"><div class="metric-label">Parity</div><div class="metric-value">P ${parity}</div></div></div>
            <div class="col-md-3"><div class="metric-box"><div class="metric-label">SPI</div><div class="metric-value text-success">${spi}</div></div></div>
            <div class="col-md-6"><div class="metric-box"><div class="metric-label">GGP Index</div><div class="metric-value">${ggp}</div></div></div>
            <div class="col-md-6"><div class="metric-box"><div class="metric-label">PSY</div><div class="metric-value">${psy}</div></div></div>
        `;
    } else {
        const found = rawBoars.find(i => {
            const t = String(i["Tag ID"] || i["Boar Ear Tag"] || "").toLowerCase();
            return t.includes(tagQuery);
        });

        if (!found) {
            rowBox.innerHTML = `<div class="col-12 text-muted py-3">No record found. / 找不到此公猪资料。</div>`;
            badge.className = "badge bg-secondary px-3 py-2 fs-6";
            badge.innerText = "Not Found";
            return;
        }

        const grade = (found["Grade"] || found["等級"] || "B").toUpperCase().charAt(0);
        badge.className = `badge badge-grade-${grade} px-3 py-2 fs-6`;
        badge.innerText = `Grade ${grade} Boar`;

        const tag = found["Tag ID"] || found["Boar Ear Tag"] || "--";
        const breed = found["Breed"] || "--";
        const score = found["Score"] || "--";
        const strategy = found["Strategy"] || "--";
        const tso = found["TSO"] || "--";

        rowBox.innerHTML = `
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Boar Tag</div><div class="metric-value text-primary">${tag}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Breed</div><div class="metric-value">${breed}</div></div></div>
            <div class="col-md-4"><div class="metric-box"><div class="metric-label">Strategy</div><div class="metric-value">${strategy}</div></div></div>
            <div class="col-md-6"><div class="metric-box"><div class="metric-label">Score</div><div class="metric-value text-success">${score}</div></div></div>
            <div class="col-md-6"><div class="metric-box"><div class="metric-label">TSO</div><div class="metric-value">${tso}</div></div></div>
        `;
    }
});

function renderTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = "";
    let allRows = [];
    rawSows.forEach(i => allRows.push({ type: 'Sow', item: i }));
    rawBoars.forEach(i => allRows.push({ type: 'Boar', item: i }));
    document.getElementById('totalCount').innerText = allRows.length + " Records";
    
    allRows.slice(0, 50).forEach(r => {
        const isSow = r.type === 'Sow';
        const tag = isSow ? (r.item["母豬耳號"] || r.item["Ear Number"] || "--") : (r.item["Tag ID"] || r.item["Boar Ear Tag"] || "--");
        const breed = isSow ? (r.item["親代品系 1"] || r.item["Breed"] || "--") : (r.item["Breed"] || "--");
        const grade = (r.item["等級"] || r.item["Grade"] || "B").toUpperCase().charAt(0);
        const info = isSow ? `Parity: ${r.item["胎次"]||1} | SPI: ${r.item["計算 SPI"]||"--"}` : `Score: ${r.item["Score"]||"--"} | TSO: ${r.item["TSO"]||"--"}`;

        tbody.innerHTML += `
            <tr>
                <td><span class="badge bg-dark">${r.type}</span></td>
                <td><span class="badge badge-grade-${grade}">${grade}</span></td>
                <td class="fw-bold">${tag}</td>
                <td>${breed}</td>
                <td>${info}</td>
            </tr>
        `;
    });
}

document.getElementById('downloadReportBtn').addEventListener('click', () => {
    const gradeFilter = document.getElementById('filterGrade').value.toUpperCase();
    const chkL = document.getElementById('chkL').checked;
    const chkY = document.getElementById('chkY').checked;
    const chkD = document.getElementById('chkD').checked;
    const chkLY = document.getElementById('chkLY').checked;

    let selectedBreeds = [];
    if (chkL) selectedBreeds.push('L');
    if (chkY) selectedBreeds.push('Y');
    if (chkD) selectedBreeds.push('D');
    if (chkLY) selectedBreeds.push('LY');

    let csvContent = "\uFEFFCategory,Grade,EarTag,Breed,Metrics\n";

    rawSows.forEach(i => {
        const grade = (i["等級"] || i["Grade"] || "B").toUpperCase().charAt(0);
        const breed = String(i["親代品系 1"] || i["Breed"] || "").toUpperCase();
        const tag = i["母豬耳號"] || i["Ear Number"] || "";
        const matchGrade = !gradeFilter || grade === gradeFilter;
        const matchBreed = selectedBreeds.length === 0 || selectedBreeds.some(b => breed.includes(b));
        if (matchGrade && matchBreed) csvContent += `"Sow","${grade}","${tag}","${breed}","SPI: ${i["計算 SPI"]||""}"\n`;
    });

    rawBoars.forEach(i => {
        const grade = (i["Grade"] || i["等級"] || "B").toUpperCase().charAt(0);
        const breed = String(i["Breed"] || "").toUpperCase();
        const tag = i["Tag ID"] || i["Boar Ear Tag"] || "";
        const matchGrade = !gradeFilter || grade === gradeFilter;
        const matchBreed = selectedBreeds.length === 0 || selectedBreeds.some(b => breed.includes(b));
        if (matchGrade && matchBreed) csvContent += `"Boar","${grade}","${tag}","${breed}","Score: ${i["Score"]||""}, TSO: ${i["TSO"]||""}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `GLA_Breeding_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem("gla_auth") === "ok") {
        document.getElementById('authOverlay').style.display = "none";
        document.getElementById('mainApp').style.display = "block";
        loadData();
    }
});
