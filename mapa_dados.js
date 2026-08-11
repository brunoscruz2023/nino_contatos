// mapa_dados.js
window.App = window.App || {};
App.Mapa = App.Mapa || {};

let geoDatabase = [];
let allFunctionsList = new Set();
let allTeamsList = new Set();
let fetchTimeout;

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

App.Mapa.Dados = {
    loadBairrosFromCache: function() {
        const cachedBairros = localStorage.getItem(`painel_bairros_cache_${CACHE_VERSION}`);
        if (cachedBairros) {
            try { geoDicionario = JSON.parse(cachedBairros); } catch(e) { console.error("Erro cache bairros", e); }
        }
    },

    fetchBairrosFromNetwork: async function() {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:cb_bairros&sheet=${encodeURIComponent(BAIRROS_SHEET_NAME)}`;
            const data = await App.Core.Utils.fetchJsonp(url, 'cb_bairros');
            
            let freshData = {};
            if (data && data.table && data.table.rows) {
                data.table.rows.forEach((row, index) => {
                    if (index === 0 && row.c[0] && row.c[0].v === 'Bairro') return;
                    
                    let nome = row.c[0] && row.c[0].v ? row.c[0].v.toString().trim() : "";
                    let regiao = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "";
                    let subzona = row.c[2] && row.c[2].v ? row.c[2].v.toString().trim() : null;
                    let x = row.c[3] && row.c[3].v ? parseFloat(row.c[3].v) : null;
                    let y = row.c[4] && row.c[4].v ? parseFloat(row.c[4].v) : null;
                    let textX = row.c[5] && row.c[5].v ? parseFloat(row.c[5].v) : undefined;
                    let textY = row.c[6] && row.c[6].v ? parseFloat(row.c[6].v) : undefined;

                    if (nome && regiao && x !== null && y !== null) {
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
    },

    fetchSpreadsheetData: async function() {
        const statusEl = document.getElementById('status-text');
        const mobileStatusEl = document.getElementById('mobile-status-text');
        if(statusEl) { statusEl.innerText = "Sincronizando..."; statusEl.className = "text-xs font-semibold text-sky-500 mt-1 animate-pulse"; }
        if(mobileStatusEl) { mobileStatusEl.innerText = "Sincronizando"; mobileStatusEl.className = "text-[10px] font-medium text-sky-500 animate-pulse"; }

        try {
            let mapLvl = (currentSession && currentSession.funcoes) ? currentSession.funcoes.mapa : '000';
            let isTotal = mapLvl === '999';
            let isCard = mapLvl === '003';
            let isZap = mapLvl === '002';

            let queryCols = "A, B, E, F, G"; 
            if (isTotal || isCard) queryCols = "A, B, C, D, E, F, G"; 
            else if (isZap) queryCols = "A, B, C, E, F, G"; 
            
            let query = `SELECT ${queryCols}`;
            
            if (currentSession && !currentSession.teams.includes("TODAS")) {
                let conditions = currentSession.teams.map(team => `UPPER(F) LIKE '%${team}%'`).join(' OR ');
                query += ` WHERE ${conditions}`;
            }
            
            const encodedQuery = encodeURIComponent(query);
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:cb_data&sheet=${encodeURIComponent(SHEET_NAME)}&tq=${encodedQuery}`;
            
            const data = await App.Core.Utils.fetchJsonp(url, 'cb_data');
            this.processarRetornoPlanilha(data);
        } catch (e) {
            this.handleFetchError();
        }
    },

    processarRetornoPlanilha: function(json) {
        clearTimeout(fetchTimeout);
        
        if (!json || !json.table || !json.table.rows) {
            this.handleFetchError();
            return;
        }

        geoDatabase = [];
        const bairroAgrupamento = {}; 
        allFunctionsList = new Set(); 
        allTeamsList = new Set();
        
        const mapaBusca = Object.keys(geoDicionario).reduce((acc, bairro) => {
            acc[bairro.toLowerCase()] = bairro;
            return acc;
        }, {});

        let mapLvl = (currentSession && currentSession.funcoes) ? currentSession.funcoes.mapa : '000';
        let isTotal = mapLvl === '999';
        let isCard = mapLvl === '003';
        let isZap = mapLvl === '002';

        json.table.rows.forEach((row, index) => {
            if (!row.c || !row.c[0] || !row.c[0].v) return; 
            
            let valorBairro = row.c[0].v;
            if (typeof valorBairro !== 'string') return; 
            
            let nomeContato = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "Não informado";
            
            let fone = "";
            let ref = "";
            let funcao = "";
            let rawEquipe = "";
            let data = "";

            let idx = 2;
            if (isTotal || isCard) {
                fone = App.Core.Utils.formatPhone(row.c[idx] ? row.c[idx].v : ""); idx++;
                ref = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim() : ""; idx++;
                funcao = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim().toUpperCase() : "NÃO DEFINIDA"; idx++;
                rawEquipe = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim().toUpperCase() : ""; idx++;
                data = row.c[idx] && row.c[idx].v ? row.c[idx].v : ""; idx++;
            } else if (isZap) {
                fone = App.Core.Utils.formatPhone(row.c[idx] ? row.c[idx].v : ""); idx++;
                funcao = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim().toUpperCase() : "NÃO DEFINIDA"; idx++;
                rawEquipe = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim().toUpperCase() : ""; idx++;
                data = row.c[idx] && row.c[idx].v ? row.c[idx].v : ""; idx++;
            } else {
                funcao = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim().toUpperCase() : "NÃO DEFINIDA"; idx++;
                rawEquipe = row.c[idx] && row.c[idx].v ? row.c[idx].v.toString().trim().toUpperCase() : ""; idx++;
                data = row.c[idx] && row.c[idx].v ? row.c[idx].v : ""; idx++;
            }
            
            // Quebra a string de equipes em um array
            let equipesArr = rawEquipe ? rawEquipe.split(',').map(e => e.trim()).filter(e => e.length > 0) : ["NÃO DEFINIDA"];
            
            allFunctionsList.add(funcao);
            equipesArr.forEach(e => allTeamsList.add(e));

            let textoFormatado = valorBairro.trim().toLowerCase();
            if (!mapaBusca[textoFormatado]) return;

            let geoInfo = geoDicionario[textoFormatado];
            let nomeRealDoBairro = mapaBusca[textoFormatado];
            
            if (!bairroAgrupamento[nomeRealDoBairro]) {
                bairroAgrupamento[nomeRealDoBairro] = { total: 0, funcoes: {}, nomes: [] };
            }
            
            bairroAgrupamento[nomeRealDoBairro].total++;
            bairroAgrupamento[nomeRealDoBairro].funcoes[funcao] = (bairroAgrupamento[nomeRealDoBairro].funcoes[funcao] || 0) + 1;
            bairroAgrupamento[nomeRealDoBairro].nomes.push({ nome: nomeContato, funcao: funcao, rawEquipe: rawEquipe, equipes: equipesArr, data: data, fone: fone, ref: ref });
        });

        for (let bairro in bairroAgrupamento) {
            let dadosBairro = bairroAgrupamento[bairro];
            let geoInfo = geoDicionario[bairro.toLowerCase()];
            
            geoDatabase.push({
                bairro: bairro, 
                regiao: geoInfo.regiao, 
                subzona: geoInfo.subzona || null,
                x: geoInfo.x, y: geoInfo.y,
                textX: geoInfo.textX, textY: geoInfo.textY, 
                totalGeral: dadosBairro.total,
                funcoes: dadosBairro.funcoes,
                nomes: dadosBairro.nomes
            });
        }

        // CORREÇÃO: populateFilters movido para depois da montagem do geoDatabase
        populateFilters();

        const cacheSuffix = currentSession.funcoes.mapa || 'default';
        const cacheKey = currentSession.key || 'logado';
        try {
            localStorage.setItem(`painel_cache_${cacheKey}_${cacheSuffix}_${CACHE_VERSION}`, JSON.stringify(geoDatabase));
            localStorage.setItem(`painel_funcoes_${cacheKey}_${cacheSuffix}_${CACHE_VERSION}`, JSON.stringify(Array.from(allFunctionsList)));
            localStorage.setItem(`painel_equipes_${cacheKey}_${cacheSuffix}_${CACHE_VERSION}`, JSON.stringify(Array.from(allTeamsList)));
        } catch(e) { console.error("Erro ao salvar cache", e); }

        const statusEl = document.getElementById('status-text');
        const mobileStatusEl = document.getElementById('mobile-status-text');
        if(statusEl) { statusEl.innerText = "Tempo Real"; statusEl.className = "text-xs font-semibold text-emerald-500 mt-1"; }
        if(mobileStatusEl) { mobileStatusEl.innerText = "Online"; mobileStatusEl.className = "text-[10px] font-medium text-emerald-500"; }

        initMap();
        initMobileList(); 
        applyFilters(); 
    },

    handleFetchError: function() {
        clearTimeout(fetchTimeout);
        const statusEl = document.getElementById('status-text');
        const mobileStatusEl = document.getElementById('mobile-status-text');
        
        if (geoDatabase.length > 0) {
            if(statusEl) { statusEl.innerText = "Modo Offline (Cache)"; statusEl.className = "text-xs font-semibold text-rose-500 mt-1"; }
            if(mobileStatusEl) { mobileStatusEl.innerText = "Offline"; mobileStatusEl.className = "text-[10px] font-medium text-rose-500"; }
        } else {
            if(statusEl) { statusEl.innerText = "Erro ao carregar dados"; statusEl.className = "text-xs font-semibold text-rose-500 mt-1"; }
            if(mobileStatusEl) { mobileStatusEl.innerText = "Erro"; mobileStatusEl.className = "text-[10px] font-medium text-rose-500"; }
        }
    }
};

window.loadBairrosFromCache = App.Mapa.Dados.loadBairrosFromCache;
window.fetchBairrosFromNetwork = App.Mapa.Dados.fetchBairrosFromNetwork;
window.fetchSpreadsheetData = App.Mapa.Dados.fetchSpreadsheetData;
window.processarRetornoPlanilha = App.Mapa.Dados.processarRetornoPlanilha;
window.handleFetchError = App.Mapa.Dados.handleFetchError;