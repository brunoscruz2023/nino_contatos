// eventos_dados.js
window.App = window.App || {};
App.Eventos = App.Eventos || {};

// Estado Global
let eventosDatabase = [];
let contatosBase = {};
let bolhaDatabase = {}; 
let tarefasDatabase = [];
let materialsDatabase = []; // NOVO: Array para Movimentação de Materiais

// Constantes de Planilha
const EVENTOS_SHEET_ID = '1MRycZz_03uglcwJqYs_G3Kzc2osx6S_z9zYxGMAzsNM'; 
const EVENTOS_SHEET_NAME = 'Eventos';
const BASE_CONTATOS_SHEET_NAME = 'Base_Contatos';
const PRESENCAS_SHEET_NAME = 'Presencas';
const TASKS_SHEET_NAME = 'Tarefas';
const MATERIALS_SHEET_NAME = 'Materiais_Movimentacao'; // NOVO

// Helper para limpar apóstrofos remanescentes da leitura do Sheets
function cleanStr(val) {
  return val ? val.toString().replace(/'/g, "").trim() : "";
}

// ==========================================
// MÓDULO: DADOS DE EVENTOS (App.Eventos.Dados)
// ==========================================
App.Eventos.Dados = {
    fetchEventosData: async function(isPreload = false) {
        try {
            const cbEv = 'cb_ev_' + Date.now();
            const cbBase = 'cb_bs_' + Date.now();
            const cbPres = 'cb_ps_' + Date.now();
            const cbTasks = 'cb_tk_' + Date.now();
            const cbMat = 'cb_mat_db_' + Date.now(); // NOVO
            
            const urlEventos = `https://docs.google.com/spreadsheets/d/${EVENTOS_SHEET_ID}/gviz/tq?tqx=responseHandler:${cbEv}&sheet=${encodeURIComponent(EVENTOS_SHEET_NAME)}`;
            const urlBase = `https://docs.google.com/spreadsheets/d/${EVENTOS_SHEET_ID}/gviz/tq?tqx=responseHandler:${cbBase}&sheet=${encodeURIComponent(BASE_CONTATOS_SHEET_NAME)}`;
            const urlPresencas = `https://docs.google.com/spreadsheets/d/${EVENTOS_SHEET_ID}/gviz/tq?tqx=responseHandler:${cbPres}&sheet=${encodeURIComponent(PRESENCAS_SHEET_NAME)}`;
            const urlTasks = `https://docs.google.com/spreadsheets/d/${EVENTOS_SHEET_ID}/gviz/tq?tqx=responseHandler:${cbTasks}&sheet=${encodeURIComponent(TASKS_SHEET_NAME)}`;
            const urlMaterials = `https://docs.google.com/spreadsheets/d/${EVENTOS_SHEET_ID}/gviz/tq?tqx=responseHandler:${cbMat}&sheet=${encodeURIComponent(MATERIALS_SHEET_NAME)}`; // NOVO
            
            const [dataEventos, dataBase, dataPresencas, dataTasks, dataMaterials] = await Promise.all([
                App.Core.Utils.fetchJsonp(urlEventos, cbEv),
                App.Core.Utils.fetchJsonp(urlBase, cbBase),
                App.Core.Utils.fetchJsonp(urlPresencas, cbPres),
                App.Core.Utils.fetchJsonp(urlTasks, cbTasks),
                App.Core.Utils.fetchJsonp(urlMaterials, cbMat) // NOVO
            ]);
            
            this.processarDadosEventos(dataEventos, dataBase, dataPresencas, dataTasks, dataMaterials);
            
            try {
                localStorage.setItem('eventos_cache_v1', JSON.stringify(eventosDatabase));
                localStorage.setItem('contatos_base_cache_v1', JSON.stringify(contatosBase));
                localStorage.setItem('tarefas_cache_v1', JSON.stringify(tarefasDatabase));
                localStorage.setItem('materials_cache_v1', JSON.stringify(materialsDatabase)); // NOVO
            } catch(e) { console.error("Erro ao salvar cache de eventos/tarefas/materiais", e); }

            const viewEventos = document.getElementById('view-eventos');
            if (!isPreload || (viewEventos && !viewEventos.classList.contains('hidden'))) {
                renderEventosView();
            }
        } catch (e) {
            console.error("Erro ao buscar eventos/tarefas/materiais", e);
            if (!isPreload) {
                if (eventosDatabase.length > 0 || tarefasDatabase.length > 0) renderEventosView();
                else {
                    const container = document.getElementById('view-eventos');
                    if(container) container.innerHTML = '<p class="text-center text-rose-500 p-8">Erro ao carregar dados. Verifique o console.</p>';
                }
            }
        }
    },

    loadFromCache: function() {
        const cachedEventos = localStorage.getItem('eventos_cache_v1');
        const cachedContatos = localStorage.getItem('contatos_base_cache_v1');
        const cachedTarefas = localStorage.getItem('tarefas_cache_v1');
        const cachedMaterials = localStorage.getItem('materials_cache_v1'); // NOVO
        
        if (cachedEventos && cachedContatos && cachedTarefas && cachedMaterials) { 
            try {
                eventosDatabase = JSON.parse(cachedEventos);
                contatosBase = JSON.parse(cachedContatos);
                tarefasDatabase = JSON.parse(cachedTarefas);
                materialsDatabase = JSON.parse(cachedMaterials); // NOVO
                window.contatosBase = contatosBase;
                return true;
            } catch(e) {
                console.error("Erro ao ler cache", e);
                return false;
            }
        }
        return false;
    },

    // Função recursiva para achatar a árvore JSON no formato de lista que a UI espera
    extractParticipacoes: function(node, currentCoord, currentSup, presencasDoEvento) {
        var participacoes = [];
        if (!node) return participacoes;
        
        var tipo = (node.tipo || "").toLowerCase();
        if (tipo.includes("coord")) currentCoord = node.id;
        if (tipo.includes("sup")) currentSup = node.id;
        
        if (tipo.includes("mob")) {
            var presIds = presencasDoEvento[node.id] || [];
            participacoes.push({
                coordenadorId: currentCoord || "ND",
                supervisorId: currentSup || "ND",
                mobilizadorId: node.id,
                presentesIds: presIds,
                qtdPresentes: presIds.length
            });
        }
        
        if (node.filhos && Array.isArray(node.filhos)) {
            node.filhos.forEach(function(child) {
                participacoes = participacoes.concat(App.Eventos.Dados.extractParticipacoes(child, currentCoord, currentSup, presencasDoEvento));
            });
        }
        return participacoes;
    },

    processarDadosEventos: function(jsonEventos, jsonBase, jsonPresencas, jsonTasks, jsonMaterials) {
        // 1. Monta a base de contatos na memória
        contatosBase = {};
        if (jsonBase && jsonBase.table && jsonBase.table.rows) {
            jsonBase.table.rows.forEach(row => {
                if (!row.c || !row.c[0]) return;
                let id = row.c[25] && row.c[25].v ? cleanStr(row.c[25].v).toUpperCase() : "";
                if (id) {
                    contatosBase[id] = {
                        nome: row.c[1] && row.c[1].v ? cleanStr(row.c[1].v) : "Desconhecido",
                        bairro: row.c[0] && row.c[0].v ? cleanStr(row.c[0].v) : "",
                        telefone: App.Core.Utils.formatPhone(row.c[2] && row.c[2].v ? row.c[2].v : ""),
                        ref: row.c[3] && row.c[3].v ? cleanStr(row.c[3].v) : "",
                        funcao: row.c[4] && row.c[4].v ? cleanStr(row.c[4].v) : "",
                        equipe: row.c[5] && row.c[5].v ? cleanStr(row.c[5].v) : ""
                    };
                }
            });
        }
        window.contatosBase = contatosBase;

        // 2. Processa a aba Presencas e agrupa por Evento -> Mobilizador -> [Participantes]
        let presencasMap = {};
        if (jsonPresencas && jsonPresencas.table && jsonPresencas.table.rows) {
            jsonPresencas.table.rows.forEach(row => {
                if (!row.c || !row.c[0]) return;
                let evId = row.c[1] && row.c[1].v ? cleanStr(row.c[1].v) : "";
                let mobId = row.c[2] && row.c[2].v ? cleanStr(row.c[2].v).toUpperCase() : "";
                let partId = row.c[3] && row.c[3].v ? cleanStr(row.c[3].v).toUpperCase() : "";
                
                if (evId && mobId && partId) {
                    if (!presencasMap[evId]) presencasMap[evId] = {};
                    if (!presencasMap[evId][mobId]) presencasMap[evId][mobId] = [];
                    presencasMap[evId][mobId].push(partId);
                }
            });
        }

        // 3. Processa os Eventos (1 linha por evento, com JSON)
        eventosDatabase = [];
        if (jsonEventos && jsonEventos.table && jsonEventos.table.rows) {
            jsonEventos.table.rows.forEach((row, index) => {
                if (!row.c || !row.c[0] || !row.c[0].v) return; 
                
                let idEvento = cleanStr(row.c[0].v);
                let nome = row.c[1] && row.c[1].v ? cleanStr(row.c[1].v) : "";
                let data = row.c[2] && row.c[2].v ? row.c[2].v : "";
                let tipo = row.c[3] && row.c[3].v ? cleanStr(row.c[3].v) : "";
                let bairro = row.c[4] && row.c[4].v ? cleanStr(row.c[4].v) : "";
                
                let estruturaJsonStr = row.c[5] && row.c[5].v ? cleanStr(row.c[5].v) : "[]";
                let arvoreHierarquica = [];
                try {
                    arvoreHierarquica = JSON.parse(estruturaJsonStr);
                } catch (e) {
                    console.error("Erro ao fazer parse do JSON do evento " + idEvento, e);
                }
                
                let desc = row.c[7] && row.c[7].v ? cleanStr(row.c[7].v) : "";

                let parsedDate = App.Core.Utils.parseCustomDate(data);
                if (!parsedDate) return;

                let presencasDoEvento = presencasMap[idEvento] || {};
                let participacoes = [];
                
                arvoreHierarquica.forEach(function(node) {
                    participacoes = participacoes.concat(App.Eventos.Dados.extractParticipacoes(node, "ND", "ND", presencasDoEvento));
                });

                let qtdPresentes = participacoes.reduce((acc, curr) => acc + curr.qtdPresentes, 0);

                eventosDatabase.push({
                    idEvento: idEvento, 
                    nome: nome, 
                    date: parsedDate, 
                    tipo: tipo, 
                    bairro: bairro,
                    descricao: desc, 
                    participacoes: participacoes,
                    qtdPresentes: qtdPresentes,
                    rawJson: estruturaJsonStr
                });
            });
        }

        // 4. Processa as Tarefas Avulsas
        tarefasDatabase = [];
        if (jsonTasks && jsonTasks.table && jsonTasks.table.rows) {
            jsonTasks.table.rows.forEach(row => {
                if (!row.c || !row.c[1]) return;
                let id = row.c[1] && row.c[1].v ? cleanStr(row.c[1].v) : "";
                let respId = row.c[2] && row.c[2].v ? cleanStr(row.c[2].v).toUpperCase() : "";
                let titulo = row.c[3] && row.c[3].v ? cleanStr(row.c[3].v) : "Tarefa Sem Título";
                let desc = row.c[4] && row.c[4].v ? cleanStr(row.c[4].v) : "";
                let dataLimite = row.c[5] && row.c[5].v ? row.c[5].v : "";
                let status = row.c[6] && row.c[6].v ? cleanStr(row.c[6].v) : "Pendente";
                let relato = row.c[7] && row.c[7].v ? cleanStr(row.c[7].v) : "";
                let criadorId = row.c[8] && row.c[8].v ? cleanStr(row.c[8].v).toUpperCase() : "";

                let parsedDate = App.Core.Utils.parseCustomDate(dataLimite);
                if (!parsedDate) return; 

                tarefasDatabase.push({
                    id: id,
                    responsavelId: respId,
                    titulo: titulo,
                    descricao: desc,
                    date: parsedDate,
                    status: status,
                    relato: relato,
                    criadorId: criadorId
                });
            });
        }

        // 5. NOVO: Processa Movimentação de Materiais
        materialsDatabase = [];
        if (jsonMaterials && jsonMaterials.table && jsonMaterials.table.rows) {
            jsonMaterials.table.rows.forEach(row => {
                if (!row.c || !row.c[1]) return;
                
                let timestamp = row.c[0] && row.c[0].v ? new Date(row.c[0].v) : new Date();
                let id = row.c[1] && row.c[1].v ? cleanStr(row.c[1].v) : "";
                let tipoMov = row.c[2] && row.c[2].v ? cleanStr(row.c[2].v).toUpperCase() : "";
                let item = row.c[3] && row.c[3].v ? cleanStr(row.c[3].v) : "Indefinido";
                let quantidade = row.c[4] && row.c[4].v ? parseInt(row.c[4].v) || 0 : 0;
                let idOrigemDestino = row.c[5] && row.c[5].v ? cleanStr(row.c[5].v).toUpperCase() : "";
                let idResponsavel = row.c[6] && row.c[6].v ? cleanStr(row.c[6].v).toUpperCase() : "";
                let status = row.c[8] && row.c[8].v ? cleanStr(row.c[8].v).toUpperCase() : "CONCLUÍDO";
                
                materialsDatabase.push({
                    timestamp: timestamp,
                    id: id,
                    tipoMov: tipoMov,
                    item: item,
                    quantidade: quantidade,
                    idReceptor: idOrigemDestino, // Em distribuição, é o mobilizador
                    idResponsavel: idResponsavel,
                    status: status
                });
            });
        }

        this.calcularAgregacaoEventos();
    },

    calcularAgregacaoEventos: function() {
        bolhaDatabase = {
            regioes: {}, coordenadores: {}, supervisores: {}, mobilizadores: {}
        };

        const addTotals = (obj, key, eventos, pessoas) => {
            if (!obj[key]) obj[key] = { eventos: 0, pessoas: 0 };
            obj[key].eventos += eventos;
            obj[key].pessoas += pessoas;
        };

        eventosDatabase.forEach(ev => {
            let totalPessoas = ev.qtdPresentes;
            let bairroInfo = geoDicionario[ev.bairro.toLowerCase()];
            let regiao = bairroInfo ? bairroInfo.regiao : "Não definida";
            addTotals(bolhaDatabase.regioes, regiao, 1, totalPessoas);

            let tree = {};
            ev.participacoes.forEach(p => {
                let cId = p.coordenadorId || "_empty_";
                let sId = p.supervisorId || "_empty_";
                let mId = p.mobilizadorId || "_empty_";
                let pPessoas = p.qtdPresentes;

                if (!tree[cId]) tree[cId] = { pessoas: 0, sups: {} };
                tree[cId].pessoas += pPessoas;

                if (sId !== "_empty_") {
                    if (!tree[cId].sups[sId]) tree[cId].sups[sId] = { pessoas: 0, mobs: {} };
                    tree[cId].sups[sId].pessoas += pPessoas;

                    if (mId !== "_empty_") {
                        if (!tree[cId].sups[sId].mobs[mId]) tree[cId].sups[sId].mobs[mId] = 0;
                        tree[cId].sups[sId].mobs[mId] += pPessoas;
                    }
                }
            });

            for (let cId in tree) {
                if (cId !== "_empty_") addTotals(bolhaDatabase.coordenadores, cId, 1, tree[cId].pessoas);
                for (let sId in tree[cId].sups) {
                    addTotals(bolhaDatabase.supervisores, sId, 1, tree[cId].sups[sId].pessoas);
                    for (let mId in tree[cId].sups[sId].mobs) {
                        addTotals(bolhaDatabase.mobilizadores, mId, 1, tree[cId].sups[sId].mobs[mId]);
                    }
                }
            }
        });
    }
};

window.fetchEventosData = App.Eventos.Dados.fetchEventosData;
window.processarDadosEventos = App.Eventos.Dados.processarDadosEventos;
window.calcularAgregacaoEventos = App.Eventos.Dados.calcularAgregacaoEventos;