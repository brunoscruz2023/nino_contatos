const SHEET_ID = '1VGgM5QNBY0SiN3VuVYdQB78joPz9blvdrdHNQj9v73I'; 
const SHEET_NAME = 'Página 1';
const ACESSOS_SHEET_NAME = 'Acessos';
const BAIRROS_SHEET_NAME = 'Bairros';

// Cache version bump por mudança de schema (adicao da coluna Subzona na aba Bairros).
// Cache antigo (sem sufixo _v2) fica orfao no localStorage e e sobrescrito na primeira carga.
const CACHE_VERSION = 'v2';

let geoDatabase = [];
let allFunctionsList = new Set();
let allTeamsList = new Set();
let fetchTimeout;
let currentSession = null;
let geoDicionario = {}; // Agora é populado dinamicamente

// ATENCAO NOMENCLATURA (decisao do usuario Task ID 2-subdivisao-zonas):
//   geoDicionario[bairro].regiao  -> regiao macro  (ex: "Zona Norte", "Centro")
//   geoDicionario[bairro].subzona -> subdivisao interna (ex: "Subprefeitura 1") ou null
//   O nome do campo "subzona" foi escolhido pelo usuario para evitar confusao semantica
//   com o valor "Zona Norte" que aparece em "regiao".

// ==========================================
// FUNÇÕES DE DATA E CÁLCULO
// ==========================================
function parseCustomDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) {
        const d = new Date(dateInput);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    const dateStr = dateInput.toString().trim();
    if (dateStr.startsWith('Date(')) {
        const match = dateStr.match(/Date\((\d+),(\d+),(\d+)/);
        if (match) {
            const d = new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
            d.setHours(0, 0, 0, 0);
            return d;
        }
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const d = new Date(parts[2], parts[1] - 1, parts[0]);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
    }
    return null;
}

const today = new Date();
const currentWeekStart = new Date(today);
currentWeekStart.setDate(today.getDate() - today.getDay());
currentWeekStart.setHours(0, 0, 0, 0);

const lastWeekStart = new Date(currentWeekStart);
lastWeekStart.setDate(currentWeekStart.getDate() - 7);
lastWeekStart.setHours(0, 0, 0, 0);

const colorsMap = {
    "Zona Norte": { text: "text-sky-600", dot: "bg-sky-500", border: "border-sky-400" },
    "Zona Oeste": { text: "text-emerald-600", dot: "bg-emerald-500", border: "border-emerald-400" },
    "Zona Sudoeste": { text: "text-violet-600", dot: "bg-violet-500", border: "border-violet-400" },
    "Centro": { text: "text-indigo-600", dot: "bg-indigo-500", border: "border-indigo-400" },
    "Baixada": { text: "text-amber-600", dot: "bg-amber-500", border: "border-amber-400" },
    "Zona Sul": { text: "text-rose-600", dot: "bg-rose-500", border: "border-rose-400" },
    "Região Leste": { text: "text-cyan-600", dot: "bg-cyan-500", border: "border-cyan-400" },
    "Interior": { text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-400" }
};

const svgStrokeColors = {
    "Zona Norte": "#38bdf8", "Zona Oeste": "#34d399", "Zona Sudoeste": "#8b5cf6", "Centro": "#818cf8", "Baixada": "#fbbf24", "Zona Sul": "#fb7185",
    "Região Leste": "#22d3ee", "Interior": "#64748b"
};

function fetchJsonp(url, callbackName) {
    return new Promise((resolve, reject) => {
        window[callbackName] = function(data) {
            resolve(data);
            delete window[callbackName];
        };
        const script = document.createElement('script');
        script.src = url;
        document.body.appendChild(script);
        script.onerror = () => reject(new Error('Falha de rede'));
        setTimeout(() => reject(new Error('Timeout')), 10000);
    });
}

function formatPhone(rawFone) {
    if (!rawFone) return "";
    let cleanFone = rawFone.toString().trim().replace(/\D/g, '');
    if (cleanFone && !cleanFone.startsWith('55')) {
        cleanFone = '55' + cleanFone;
    }
    return cleanFone;
}

// ==========================================
// CARREGAMENTO DINÂMICO DE BAIRROS
// ==========================================
function loadBairrosFromCache() {
    const cachedBairros = localStorage.getItem(`painel_bairros_cache_${CACHE_VERSION}`);
    if (cachedBairros) {
        try {
            geoDicionario = JSON.parse(cachedBairros);
        } catch(e) { console.error("Erro cache bairros", e); }
    }
}

async function fetchBairrosFromNetwork() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:cb_bairros&sheet=${encodeURIComponent(BAIRROS_SHEET_NAME)}`;
        const data = await fetchJsonp(url, 'cb_bairros');
        
        let freshData = {};
        if (data && data.table && data.table.rows) {
            data.table.rows.forEach((row, index) => {
                if (index === 0 && row.c[0] && row.c[0].v === 'Bairro') return; // Pula cabeçalho
                
                // Colunas da aba Bairros (schema v2):
                //   A: Bairro | B: Regiao | C: Subzona (NOVA, opcional) | D: X | E: Y | F: TextX | G: TextY
                let nome = row.c[0] && row.c[0].v ? row.c[0].v.toString().trim() : "";
                let regiao = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "";
                let subzona = row.c[2] && row.c[2].v ? row.c[2].v.toString().trim() : null;
                let x = row.c[3] && row.c[3].v ? parseFloat(row.c[3].v) : null;
                let y = row.c[4] && row.c[4].v ? parseFloat(row.c[4].v) : null;
                let textX = row.c[5] && row.c[5].v ? parseFloat(row.c[5].v) : undefined;
                let textY = row.c[6] && row.c[6].v ? parseFloat(row.c[6].v) : undefined;

                if (nome && regiao && x !== null && y !== null) {
                    // A chave é sempre minúscula para facilitar a busca, e guarda o nome oficial
                    freshData[nome.toLowerCase()] = { nomeOriginal: nome, regiao, subzona, x, y, textX, textY };
                }
            });
        }
        
        if (Object.keys(freshData).length > 0) {
            geoDicionario = freshData;
            localStorage.setItem(`painel_bairros_cache_${CACHE_VERSION}`, JSON.stringify(geoDicionario));
        }
    } catch (e) {
        console.error("Erro ao buscar bairros", e);
    }
}

async function fetchSpreadsheetData() {
    const statusEl = document.getElementById('status-text');
    const mobileStatusEl = document.getElementById('mobile-status-text');
    if(statusEl) {
        statusEl.innerText = "Sincronizando...";
        statusEl.className = "text-xs font-semibold text-sky-500 mt-1 animate-pulse";
    }
    if(mobileStatusEl) {
        mobileStatusEl.innerText = "Sincronizando";
        mobileStatusEl.className = "text-[10px] font-medium text-sky-500 animate-pulse";
    }

    try {
        let queryCols = "A, B, E, F, G";
        if (currentSession.nivel === 'TOTAL') queryCols = "A, B, C, D, E, F, G";
        if (currentSession.nivel === 'CARD') queryCols = "A, B, D, E, F, G";
        if (currentSession.nivel === 'ZAP') queryCols = "A, B, C, E, F, G";
        
        let query = `SELECT ${queryCols}`;
        if (currentSession && !currentSession.teams.includes("TODAS")) {
            let conditions = currentSession.teams.map(team => `F = '${team}'`).join(' OR ');
            query += ` WHERE ${conditions}`;
        }
        
        const encodedQuery = encodeURIComponent(query);
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:cb_data&sheet=${encodeURIComponent(SHEET_NAME)}&tq=${encodedQuery}`;
        
        const data = await fetchJsonp(url, 'cb_data');
        processarRetornoPlanilha(data);
    } catch (e) {
        handleFetchError();
    }
}

function processarRetornoPlanilha(json) {
    clearTimeout(fetchTimeout);
    
    if (!json || !json.table || !json.table.rows) {
        handleFetchError();
        return;
    }

    geoDatabase = [];
    const bairroAgrupamento = {}; 
    allFunctionsList = new Set(); 
    allTeamsList = new Set();

    json.table.rows.forEach((row, index) => {
        if (!row.c || !row.c[0] || !row.c[0].v) {
            console.warn(`Linha ${index + 2} ignorada: Coluna A (Bairro) está vazia.`);
            return; 
        }
        
        let valorBairro = row.c[0].v;
        if (typeof valorBairro !== 'string') return; 
        
        let nomeContato = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "Não informado";
        
        let fone = "";
        let ref = "";
        let funcao = "";
        let equipe = "";
        let data = "";

        let idx = 2;
        if (currentSession.nivel === 'TOTAL') {
            fone = formatPhone(row.c[idx] ? row.c[idx].v : ""); idx++;
            ref = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : ""; idx++;
            funcao = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : "Não definida"; idx++;
            equipe = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : "Não definida"; idx++;
            data = row.c[idx] && row.c[idx].v ? row.c[idx].v : ""; idx++;
        } else if (currentSession.nivel === 'CARD') {
            ref = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : ""; idx++;
            funcao = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : "Não definida"; idx++;
            equipe = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : "Não definida"; idx++;
            data = row.c[idx] && row.c[idx].v ? row.c[idx].v : ""; idx++;
        } else if (currentSession.nivel === 'ZAP') {
            fone = formatPhone(row.c[idx] ? row.c[idx].v : ""); idx++;
            funcao = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : "Não definida"; idx++;
            equipe = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : "Não definida"; idx++;
            data = row.c[idx] && row.c[idx].v ? row.c[idx].v : ""; idx++;
        } else {
            funcao = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : "Não definida"; idx++;
            equipe = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : "Não definida"; idx++;
            data = row.c[idx] && row.c[idx].v ? row.c[idx].v : ""; idx++;
        }
        
        allFunctionsList.add(funcao);
        allTeamsList.add(equipe);

        let textoFormatado = valorBairro.trim().toLowerCase();
        if (!geoDicionario[textoFormatado]) {
            console.warn(`Linha ${index + 2} ignorada: Bairro "${valorBairro}" não encontrado na aba Bairros.`);
            return;
        }

        let geoInfo = geoDicionario[textoFormatado];
        let nomeRealDoBairro = geoInfo.nomeOriginal;
        
        if (!bairroAgrupamento[nomeRealDoBairro]) {
            bairroAgrupamento[nomeRealDoBairro] = { total: 0, funcoes: {}, nomes: [] };
        }
        
        bairroAgrupamento[nomeRealDoBairro].total++;
        bairroAgrupamento[nomeRealDoBairro].funcoes[funcao] = (bairroAgrupamento[nomeRealDoBairro].funcoes[funcao] || 0) + 1;
        bairroAgrupamento[nomeRealDoBairro].nomes.push({ nome: nomeContato, funcao: funcao, equipe: equipe, data: data, fone: fone, ref: ref });
    });

    populateFilters();

    for (let bairro in bairroAgrupamento) {
        let dadosBairro = bairroAgrupamento[bairro];
        let geoInfo = geoDicionario[bairro.toLowerCase()];
        
        geoDatabase.push({
            bairro: bairro, 
            regiao: geoInfo.regiao, 
            subzona: geoInfo.subzona || null, // NOVO: subdivisao interna da regiao (string ou null)
            x: geoInfo.x, y: geoInfo.y,
            textX: geoInfo.textX, textY: geoInfo.textY, 
            totalGeral: dadosBairro.total,
            funcoes: dadosBairro.funcoes,
            nomes: dadosBairro.nomes
        });
    }

    const cacheSuffix = currentSession.nivel || 'default';
    try {
        localStorage.setItem(`painel_cache_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`, JSON.stringify(geoDatabase));
        localStorage.setItem(`painel_funcoes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`, JSON.stringify(Array.from(allFunctionsList)));
        localStorage.setItem(`painel_equipes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`, JSON.stringify(Array.from(allTeamsList)));
    } catch(e) { console.error("Erro ao salvar cache", e); }

    const statusEl = document.getElementById('status-text');
    const mobileStatusEl = document.getElementById('mobile-status-text');
    if(statusEl) {
        statusEl.innerText = "Tempo Real";
        statusEl.className = "text-xs font-semibold text-emerald-500 mt-1";
    }
    if(mobileStatusEl) {
        mobileStatusEl.innerText = "Online";
        mobileStatusEl.className = "text-[10px] font-medium text-emerald-500";
    }

    initMap();
    initMobileList(); 
    applyFilters(); 
}
