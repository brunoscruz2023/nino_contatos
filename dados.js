const SHEET_ID = '1VGgM5QNBY0SiN3VuVYdQB78joPz9blvdrdHNQj9v73I'; 
const SHEET_NAME = 'Página 1';
const ACESSOS_SHEET_NAME = 'Acessos';

let geoDatabase = [];
let allFunctionsList = new Set();
let allTeamsList = new Set();
let fetchTimeout;
let currentSession = null;

// ==========================================
// FUNÇÕES DE DATA E CÁLCULO (À PROVA DE FALHAS)
// ==========================================
function parseCustomDate(dateInput) {
    if (!dateInput) return null;
    
    // Se já for um objeto Date do JavaScript
    if (dateInput instanceof Date) {
        const d = new Date(dateInput);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    const dateStr = dateInput.toString().trim();
    
    // Padrão Google Sheets API: Date(YYYY, M, D)
    if (dateStr.startsWith('Date(')) {
        const match = dateStr.match(/Date\((\d+),(\d+),(\d+)/);
        if (match) {
            // O gviz usa mês 0-11 (janeiro é 0), igual ao JS. Então não precisa subtrair 1.
            const d = new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
            d.setHours(0, 0, 0, 0);
            return d;
        }
    }
    
    // Padrão DD/MM/AAAA
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const d = new Date(parts[2], parts[1] - 1, parts[0]);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // Fallback para string nativa (ex: ISO string vinda do cache)
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
    }
    
    return null;
}

const today = new Date();
const currentWeekStart = new Date(today);
const dayOfWeek = today.getDay(); // 0 = Domingo
currentWeekStart.setDate(today.getDate() - dayOfWeek);
currentWeekStart.setHours(0, 0, 0, 0);

const lastWeekStart = new Date(currentWeekStart);
lastWeekStart.setDate(currentWeekStart.getDate() - 7);
lastWeekStart.setHours(0, 0, 0, 0);

const geoDicionario = {
    // --- BAIXADA ---
    "Caxias": {x: 58, y: 11, regiao: "Baixada"},
    "Nilópolis": {x: 44, y: 13, regiao: "Baixada"}, "Nilopolis": {x: 44, y: 13, regiao: "Baixada"},
    "Coronel Almeida": {x: 50, y: 8, regiao: "Baixada"},
    "Itaguaí": {x: 18, y: 20, regiao: "Baixada"},
    "Mesquita": {x: 35, y: 10, regiao: "Baixada"},
    "Queimados": {x: 42, y: 5, regiao: "Baixada"},
    "Nova Iguaçu": {x: 30, y: 5, regiao: "Baixada"},
    "Belford Roxo": {x: 50, y: 5, regiao: "Baixada"},
    "São João de Meriti": {x: 55, y: 7, regiao: "Baixada"},
    "Japeri": {x: 22, y: 10, regiao: "Baixada"},
    "Paracambi": {x: 15, y: 12, regiao: "Baixada"},
    "Serpentina": {x: 65, y: 8, regiao: "Baixada"},
    "Cachoeira de Macacu": {x: 98, y: 5, textX: 90, textY: 12, regiao: "Baixada"}, 

    // --- ZONA OESTE ---
    "Magalhães Bastos": {x: 30, y: 40, regiao: "Zona Oeste"}, "Magalhaes Bastos": {x: 30, y: 40, regiao: "Zona Oeste"},
    "Mallet": {x: 26, y: 48, regiao: "Zona Oeste"}, "Malet": {x: 26, y: 48, regiao: "Zona Oeste"},
    "Vila Kennedy": {x: 12, y: 45, regiao: "Zona Oeste"},
    "Campo Grande": {x: 18, y: 55, regiao: "Zona Oeste"},
    "Santa Cruz": {x: 8, y: 50, regiao: "Zona Oeste"},
    "Senador Camará": {x: 15, y: 48, regiao: "Zona Oeste"},
    "Paciência": {x: 12, y: 60, regiao: "Zona Oeste"},
    "Sepetiba": {x: 5, y: 58, regiao: "Zona Oeste"},
    "Santíssimo": {x: 10, y: 55, regiao: "Zona Oeste"},
    "Inhoaíba": {x: 8, y: 45, regiao: "Zona Oeste"},
    "Cosmos": {x: 15, y: 60, regiao: "Zona Oeste"},
    "Camorim": {x: 20, y: 70, regiao: "Zona Oeste"},
    "Padre Miguel": {x: 28, y: 46, textX: 22, textY: 54, regiao: "Zona Oeste"}, 

    // --- ZONA SUDOESTE ---
    "Realengo": {x: 20, y: 42, regiao: "Zona Sudoeste"},
    "Gardênia": {x: 42, y: 55, regiao: "Zona Sudoeste"}, "Gardenia": {x: 42, y: 55, regiao: "Zona Sudoeste"},
    "Sulacap": {x: 32, y: 52, regiao: "Zona Sudoeste"},
    "Taquara": {x: 38, y: 62, regiao: "Zona Sudoeste"}, 
    "Bangu": {x: 15, y: 36, regiao: "Zona Sudoeste"}, 
    "Curicica": {x: 34, y: 68, regiao: "Zona Sudoeste"},
    "Guaratiba": {x: 10, y: 65, regiao: "Zona Sudoeste"},
    "Cidade de Deus": {x: 36, y: 60, textX: 30, textY: 70, regiao: "Zona Sudoeste"},
    "Pedra de Guaratiba": {x: 6, y: 70, textX: 8, textY: 82, regiao: "Zona Sudoeste"},
    "Barra de Guaratiba": {x: 4, y: 75, regiao: "Zona Sudoeste"},
    "Recreio dos Bandeirantes": {x: 12, y: 78, regiao: "Zona Sudoeste"},
    "Vargem Grande": {x: 8, y: 85, regiao: "Zona Sudoeste"},
    "Vargem Pequena": {x: 10, y: 82, regiao: "Zona Sudoeste"},
    "Vila Valqueire": {x: 25, y: 55, regiao: "Zona Sudoeste"},
    "Tanque": {x: 22, y: 60, regiao: "Zona Sudoeste"},
    "Praça Seca": {x: 28, y: 58, regiao: "Zona Sudoeste"},
    "Pechincha": {x: 30, y: 65, regiao: "Zona Sudoeste"},
    "Freguesia": {x: 28, y: 72, regiao: "Zona Sudoeste"},

    // --- ZONA NORTE ---
    "Penha": {x: 82, y: 38, textX: 92, textY: 44, regiao: "Zona Norte"},
    "Vila da Penha": {x: 82, y: 38, textX: 92, textY: 44, regiao: "Zona Norte"},
    "Maré": {x: 76, y: 30, textX: 88, textY: 24, regiao: "Zona Norte"}, 
    "Cordovil": {x: 72, y: 26, textX: 82, textY: 20, regiao: "Zona Norte"}, 
    "Éden": {x: 70, y: 24, textX: 60, textY: 18, regiao: "Zona Norte"}, 
    "Jardim América": {x: 74, y: 24, textX: 64, textY: 16, regiao: "Zona Norte"}, 
    "Deodoro": {x: 38, y: 36, textX: 25, textY: 30, regiao: "Zona Norte"}, 
    "Ricardo de Albuquerque": {x: 44, y: 32, textX: 35, textY: 22, regiao: "Zona Norte"}, 
    "Anchieta": {x: 41, y: 26, textX: 30, textY: 16, regiao: "Zona Norte"}, 
    "Cachambi": {x: 68, y: 46, textX: 88, textY: 42, regiao: "Zona Norte"}, 
    "Costa Barros": {x: 49, y: 25, textX: 55, textY: 14, regiao: "Zona Norte"}, 
    "Bonsucesso": {x: 74, y: 34, textX: 90, textY: 30, regiao: "Zona Norte"}, 
    "Ilha do Governador": {x: 80, y: 20, textX: 92, textY: 16, regiao: "Zona Norte"}, 
    "Jacarezinho": {x: 71, y: 40, textX: 85, textY: 36, regiao: "Zona Norte"}, 
    "Madureira": {x: 53, y: 42, textX: 40, textY: 50, regiao: "Zona Norte"}, 
    "Piedade": {x: 59, y: 47, textX: 70, textY: 56, regiao: "Zona Norte"}, 
    "Vigário Geral": {x: 65, y: 22, textX: 75, textY: 12, regiao: "Zona Norte"}, 
    "Bento Ribeiro": {x: 48, y: 39, textX: 35, textY: 42, regiao: "Zona Norte"}, 
    "Cavalcante": {x: 56, y: 36, textX: 60, textY: 22, regiao: "Zona Norte"}, 
    "Engenho Novo": {x: 65, y: 52, textX: 80, textY: 52, regiao: "Zona Norte"}, 
    "Guadalupe": {x: 50, y: 30, textX: 48, textY: 16, regiao: "Zona Norte"}, 
    "Kelson": {x: 76, y: 28, textX: 85, textY: 24, regiao: "Zona Norte"}, 
    "Abolição": {x: 61, y: 42, textX: 50, textY: 60, regiao: "Zona Norte"}, 
    "Água Santa": {x: 58, y: 53, textX: 60, textY: 66, regiao: "Zona Norte"}, 
    "Cascadura": {x: 54, y: 47, textX: 30, textY: 60, regiao: "Zona Norte"}, 
    "Encantado": {x: 63, y: 46, textX: 75, textY: 48, regiao: "Zona Norte"}, 
    "Engenho da Rainha": {x: 59, y: 33, textX: 65, textY: 16, regiao: "Zona Norte"}, 
    "Fazenda Botafogo": {x: 53, y: 26, textX: 42, textY: 16, regiao: "Zona Norte"}, 
    "Honório Gurgel": {x: 48, y: 34, textX: 25, textY: 36, regiao: "Zona Norte"}, 
    "Inhaúma": {x: 64, y: 38, textX: 72, textY: 30, regiao: "Zona Norte"}, "Inhauma": {x: 64, y: 38, textX: 72, textY: 30, regiao: "Zona Norte"},
    "Lins de Vasconcelos": {x: 67, y: 58, textX: 80, textY: 62, regiao: "Zona Norte"}, 
    "Marechal Hermes": {x: 44, y: 45, textX: 20, textY: 50, regiao: "Zona Norte"}, 
    "Mariópolis": {x: 38, y: 28, textX: 15, textY: 22, regiao: "Zona Norte"}, "Mariopolis": {x: 38, y: 28, textX: 15, textY: 22, regiao: "Zona Norte"},
    "Méier": {x: 70, y: 52, textX: 88, textY: 56, regiao: "Zona Norte"}, "Meier": {x: 70, y: 52, textX: 88, textY: 56, regiao: "Zona Norte"},
    "Oswaldo Cruz": {x: 50, y: 45, textX: 25, textY: 56, regiao: "Zona Norte"}, 
    "Pavuna": {x: 56, y: 21, textX: 50, textY: 8, regiao: "Zona Norte"}, 
    "Pilares": {x: 62, y: 39, textX: 68, textY: 24, regiao: "Zona Norte"}, 
    "Quintino": {x: 56, y: 51, textX: 45, textY: 66, regiao: "Zona Norte"},
    "Quintino Bocaiúva": {x: 56, y: 51, textX: 45, textY: 66, regiao: "Zona Norte"}, 
    "São Francisco Xavier": {x: 72, y: 48, textX: 65, textY: 40, regiao: "Zona Norte"},
    "Irajá": {x: 60, y: 30, regiao: "Zona Norte"},
    "Colégio": {x: 58, y: 28, regiao: "Zona Norte"},
    "Vaz Lobo": {x: 55, y: 25, regiao: "Zona Norte"},
    "Turiaçu": {x: 52, y: 22, regiao: "Zona Norte"},
    "Parada de Lucas": {x: 62, y: 25, regiao: "Zona Norte"},
    "Acari": {x: 60, y: 20, regiao: "Zona Norte"},
    "Barros Filho": {x: 57, y: 18, regiao: "Zona Norte"},
    "Coelho Neto": {x: 59, y: 15, regiao: "Zona Norte"},
    "Engenho de Dentro": {x: 66, y: 45, regiao: "Zona Norte"},
    "Sampaio": {x: 68, y: 48, regiao: "Zona Norte"},
    "Maracanã": {x: 72, y: 45, regiao: "Zona Norte"},
    "Vila Isabel": {x: 74, y: 48, regiao: "Zona Norte"},
    "Todos os Santos": {x: 70, y: 50, regiao: "Zona Norte"},
    "Grajaú": {x: 66, y: 55, regiao: "Zona Norte"},
    "Andaraí": {x: 75, y: 54, regiao: "Zona Norte"}, "Andarai": {x: 75, y: 54, regiao: "Zona Norte"},
    "Rocha Miranda": {x: 52, y: 35, regiao: "Zona Norte"},
    "Souto": {x: 50, y: 38, regiao: "Zona Norte"},
    "Tijuca": {x: 70, y: 50, textX: 60, textY: 42, regiao: "Zona Norte"},
    "Vila Cosmos": {x: 45, y: 22, textX: 35, textY: 14, regiao: "Zona Norte"},
    "Tomas Coelho": {x: 68, y: 20, textX: 58, textY: 10, regiao: "Zona Norte"}, 
    "Cidade Alta": {x: 78, y: 28, textX: 88, textY: 22, regiao: "Zona Norte"}, 

    // --- CENTRO ---
    "Estácio / Centro": {x: 84, y: 48, regiao: "Centro"}, "Estacio / Centro": {x: 84, y: 48, regiao: "Centro"},
    "Estácio": {x: 80, y: 45, textX: 68, textY: 35, regiao: "Centro"}, "Estacio": {x: 80, y: 45, textX: 68, textY: 35, regiao: "Centro"},
    "Rua Luís Vargas": {x: 88, y: 53, regiao: "Centro"}, "Rua Luis Vargas": {x: 88, y: 53, regiao: "Centro"},
    "Santa Tereza": {x: 78, y: 45, textX: 75, textY: 35, regiao: "Centro"}, 
    "Catete": {x: 80, y: 60, regiao: "Centro"}, 
    "Lapa": {x: 78, y: 55, regiao: "Centro"}, 
    "Glória": {x: 82, y: 60, regiao: "Centro"},
    "Rio Comprido": {x: 76, y: 50, regiao: "Centro"}, 
    "Cidade Nova": {x: 80, y: 50, regiao: "Centro"},
    "Praça da Bandeira": {x: 75, y: 45, regiao: "Centro"}, 
    "Santo Cristo": {x: 85, y: 55, regiao: "Centro"},
    "Gamboa": {x: 88, y: 58, regiao: "Centro"}, 
    "Saúde": {x: 82, y: 65, regiao: "Centro"},
    "Cosme Velho": {x: 72, y: 65, regiao: "Centro"},

    // --- ZONA SUL ---
    "Urca": {x: 85, y: 78, textX: 92, textY: 82, regiao: "Zona Sul"},
    "Leme": {x: 78, y: 82, textX: 85, textY: 86, regiao: "Zona Sul"},
    "Copacabana": {x: 72, y: 88, textX: 80, textY: 92, regiao: "Zona Sul"},
    "Ipanema": {x: 65, y: 92, textX: 72, textY: 96, regiao: "Zona Sul"},
    "Leblon": {x: 58, y: 95, textX: 50, textY: 92, regiao: "Zona Sul"},
    "Rocinha": {x: 55, y: 90, textX: 45, textY: 86, regiao: "Zona Sul"},
    "Vidigal": {x: 60, y: 96, textX: 65, textY: 98, regiao: "Zona Sul"},
    "São Conrado": {x: 50, y: 98, textX: 42, textY: 92, regiao: "Zona Sul"}, "Sao Conrado": {x: 50, y: 98, textX: 42, textY: 92, regiao: "Zona Sul"},
    "Gávea": {x: 62, y: 78, textX: 55, textY: 75, regiao: "Zona Sul"}, "Gavea": {x: 62, y: 78, textX: 55, textY: 75, regiao: "Zona Sul"},
    "Jardim Botânico": {x: 68, y: 76, textX: 60, textY: 72, regiao: "Zona Sul"}, "Jardim Botanico": {x: 68, y: 76, textX: 60, textY: 72, regiao: "Zona Sul"},
    "Laranjeiras": {x: 77, y: 68, textX: 65, textY: 64, regiao: "Zona Sul"},
    "Botafogo": {x: 80, y: 72, textX: 90, textY: 75, regiao: "Zona Sul"},
    "Flamengo": {x: 75, y: 65, textX: 65, textY: 70, regiao: "Zona Sul"},
    "Humaitá": {x: 76, y: 72, textX: 68, textY: 78, regiao: "Zona Sul"}, "Humaita": {x: 76, y: 72, textX: 68, textY: 78, regiao: "Zona Sul"},

    // --- REGIÃO LESTE ---
    "Niterói": {x: 95, y: 38, textX: 92, textY: 48, regiao: "Região Leste"}, "Niteroi": {x: 95, y: 38, textX: 92, textY: 48, regiao: "Região Leste"},
    "São Gonçalo": {x: 98, y: 30, textX: 95, textY: 22, regiao: "Região Leste"}, "Sao Goncalo": {x: 98, y: 30, textX: 95, textY: 22, regiao: "Região Leste"},
    "Itaboraí": {x: 99, y: 15, textX: 92, textY: 8, regiao: "Região Leste"}, "Itaborai": {x: 99, y: 15, textX: 92, textY: 8, regiao: "Região Leste"},
    "Tanguá": {x: 92, y: 5, textX: 85, textY: 12, regiao: "Região Leste"}, "Tangua": {x: 92, y: 5, textX: 85, textY: 12, regiao: "Região Leste"},
    "Guapimirim": {x: 80, y: 8, textX: 75, textY: 2, regiao: "Região Leste"},

    // --- INTERIOR ---
    "Angra dos Reis": {x: 2, y: 98, textX: 10, textY: 96, regiao: "Interior"},
    "Volta Redonda": {x: 5, y: 95, textX: 12, textY: 92, regiao: "Interior"},
    "Barra do Piraí": {x: 2, y: 88, textX: 10, textY: 86, regiao: "Interior"}, "Barra do Pirai": {x: 2, y: 88, textX: 10, textY: 86, regiao: "Interior"},
    "Miguel Pereira": {x: 2, y: 80, textX: 10, textY: 78, regiao: "Interior"}
};

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
        let query = "SELECT *";
        if (currentSession && !currentSession.teams.includes("TODAS")) {
            let conditions = currentSession.teams.map(team => `F = '${team}'`).join(' OR ');
            query = `SELECT * WHERE ${conditions}`;
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
    
    const mapaBusca = Object.keys(geoDicionario).reduce((acc, bairro) => {
        acc[bairro.toLowerCase()] = bairro;
        return acc;
    }, {});

    json.table.rows.forEach((row, index) => {
        if (!row.c || !row.c[0] || !row.c[0].v) {
            console.warn(`Linha ${index + 2} ignorada: Coluna A (Bairro) está vazia.`);
            return; 
        }
        
        let valorBairro = row.c[0].v;
        if (typeof valorBairro !== 'string') return; 
        
        let valorFuncao = row.c[4] && row.c[4].v ? row.c[4].v.toString().trim() : "Não definida";
        let nomeContato = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "Não informado";
        let valorEquipe = row.c[5] && row.c[5].v ? row.c[5].v.toString().trim() : "Não definida";
        let valorData = row.c[6] && row.c[6].v ? row.c[6].v : ""; // Pode vir como Date Object ou String
        
        allFunctionsList.add(valorFuncao);
        allTeamsList.add(valorEquipe);

        let textoFormatado = valorBairro.trim().toLowerCase();
        if (!mapaBusca[textoFormatado]) {
            console.warn(`Linha ${index + 2} ignorada: Bairro "${valorBairro}" não encontrado no geoDicionario.`);
            return;
        }

        let nomeRealDoBairro = mapaBusca[textoFormatado];
        
        if (!bairroAgrupamento[nomeRealDoBairro]) {
            bairroAgrupamento[nomeRealDoBairro] = { total: 0, funcoes: {}, nomes: [] };
        }
        
        bairroAgrupamento[nomeRealDoBairro].total++;
        bairroAgrupamento[nomeRealDoBairro].funcoes[valorFuncao] = (bairroAgrupamento[nomeRealDoBairro].funcoes[valorFuncao] || 0) + 1;
        bairroAgrupamento[nomeRealDoBairro].nomes.push({ nome: nomeContato, funcao: valorFuncao, equipe: valorEquipe, data: valorData });
    });

    populateFilters();

    for (let bairro in bairroAgrupamento) {
        let dadosBairro = bairroAgrupamento[bairro];
        let geoInfo = geoDicionario[bairro];
        
        geoDatabase.push({
            bairro: bairro, 
            regiao: geoInfo.regiao, 
            x: geoInfo.x, y: geoInfo.y,
            textX: geoInfo.textX, textY: geoInfo.textY, 
            totalGeral: dadosBairro.total,
            funcoes: dadosBairro.funcoes,
            nomes: dadosBairro.nomes
        });
    }

    try {
        localStorage.setItem(`painel_cache_${currentSession.key}`, JSON.stringify(geoDatabase));
        localStorage.setItem(`painel_funcoes_${currentSession.key}`, JSON.stringify(Array.from(allFunctionsList)));
        localStorage.setItem(`painel_equipes_${currentSession.key}`, JSON.stringify(Array.from(allTeamsList)));
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