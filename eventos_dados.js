// eventos_dados.js
window.App = window.App || {};
App.Eventos = App.Eventos || {};

// Estado Global
let eventosDatabase = [];
let contatosBase = {};
let bolhaDatabase = {}; 

// Constantes de Planilha
const EVENTOS_SHEET_ID = '1MRycZz_03uglcwJqYs_G3Kzc2osx6S_z9zYxGMAzsNM'; 
const EVENTOS_SHEET_NAME = 'Eventos';
const BASE_CONTATOS_SHEET_NAME = 'Base_Contatos';

// ==========================================
// MÓDULO: DADOS DE EVENTOS (App.Eventos.Dados)
// ==========================================
App.Eventos.Dados = {
    fetchEventosData: async function(isPreload = false) {
        try {
            // CORREÇÃO: Callbacks únicos para evitar colisão em requisições paralelas (Preload vs Init)
            const cbEv = 'cb_ev_' + Date.now();
            const cbBase = 'cb_bs_' + Date.now();
            
            const urlEventos = `https://docs.google.com/spreadsheets/d/${EVENTOS_SHEET_ID}/gviz/tq?tqx=responseHandler:${cbEv}&sheet=${encodeURIComponent(EVENTOS_SHEET_NAME)}`;
            const urlBase = `https://docs.google.com/spreadsheets/d/${EVENTOS_SHEET_ID}/gviz/tq?tqx=responseHandler:${cbBase}&sheet=${encodeURIComponent(BASE_CONTATOS_SHEET_NAME)}`;
            
            const [dataEventos, dataBase] = await Promise.all([
                App.Core.Utils.fetchJsonp(urlEventos, cbEv),
                App.Core.Utils.fetchJsonp(urlBase, cbBase)
            ]);
            
            this.processarDadosEventos(dataEventos, dataBase);
            
            try {
                localStorage.setItem('eventos_cache_v1', JSON.stringify(eventosDatabase));
                localStorage.setItem('contatos_base_cache_v1', JSON.stringify(contatosBase));
            } catch(e) { console.error("Erro ao salvar cache de eventos", e); }

            const viewEventos = document.getElementById('view-eventos');
            if (!isPreload || (viewEventos && !viewEventos.classList.contains('hidden'))) {
                renderEventosView();
            }
        } catch (e) {
            console.error("Erro ao buscar eventos", e);
            if (!isPreload) {
                if (eventosDatabase.length > 0) renderEventosView();
                else {
                    const container = document.getElementById('view-eventos');
                    if(container) container.innerHTML = '<p class="text-center text-rose-500 p-8">Erro ao carregar eventos. Verifique o console.</p>';
                }
            }
        }
    },

    loadFromCache: function() {
        const cachedEventos = localStorage.getItem('eventos_cache_v1');
        const cachedContatos = localStorage.getItem('contatos_base_cache_v1');
        
        if (cachedEventos && cachedContatos) {
            try {
                eventosDatabase = JSON.parse(cachedEventos);
                contatosBase = JSON.parse(cachedContatos);
                return true;
            } catch(e) {
                console.error("Erro ao ler cache de eventos", e);
                return false;
            }
        }
        return false;
    },

    processarDadosEventos: function(jsonEventos, jsonBase) {
        contatosBase = {};
        if (jsonBase && jsonBase.table && jsonBase.table.rows) {
            jsonBase.table.rows.forEach(row => {
                if (!row.c || !row.c[0]) return;
                let id = row.c[25] && row.c[25].v ? row.c[25].v.toString().trim().toUpperCase() : "";
                if (id) {
                    contatosBase[id] = {
                        nome: row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "Desconhecido",
                        bairro: row.c[0] && row.c[0].v ? row.c[0].v.toString().trim() : "",
                        telefone: App.Core.Utils.formatPhone(row.c[2] && row.c[2].v ? row.c[2].v : ""),
                        ref: row.c[3] && row.c[3].v ? row.c[3].v.toString().trim() : "",
                        funcao: row.c[4] && row.c[4].v ? row.c[4].v.toString().trim() : "",
                        equipe: row.c[5] && row.c[5].v ? row.c[5].v.toString().trim() : ""
                    };
                }
            });
        }

        let eventosMap = {};
        if (jsonEventos && jsonEventos.table && jsonEventos.table.rows) {
            jsonEventos.table.rows.forEach((row, index) => {
                if (!row.c || !row.c[0] || !row.c[0].v) return; 
                
                let idEvento = row.c[0].v.toString().trim();
                let nome = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "";
                let data = row.c[2] && row.c[2].v ? row.c[2].v : "";
                let tipo = row.c[3] && row.c[3].v ? row.c[3].v.toString().trim() : "";
                let bairro = row.c[4] && row.c[4].v ? row.c[4].v.toString().trim() : "";
                let coordId = row.c[5] && row.c[5].v ? row.c[5].v.toString().trim().toUpperCase() : "";
                let supId = row.c[6] && row.c[6].v ? row.c[6].v.toString().trim().toUpperCase() : "";
                let mobId = row.c[7] && row.c[7].v ? row.c[7].v.toString().trim().toUpperCase() : "";
                let listaPresenca = row.c[8] && row.c[8].v ? row.c[8].v.toString().trim() : "";
                let desc = row.c[9] && row.c[9].v ? row.c[9].v.toString().trim() : "";

                let parsedDate = App.Core.Utils.parseCustomDate(data);
                if (!parsedDate) return;

                let presentesIds = listaPresenca.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                let participacao = {
                    coordenadorId: coordId, supervisorId: supId, mobilizadorId: mobId,
                    presentesIds: presentesIds, qtdPresentes: presentesIds.length
                };

                if (!eventosMap[idEvento]) {
                    eventosMap[idEvento] = {
                        idEvento, nome, date: parsedDate, tipo, bairro,
                        descricao: desc, participacoes: [participacao],
                        qtdPresentes: presentesIds.length
                    };
                } else {
                    eventosMap[idEvento].participacoes.push(participacao);
                    eventosMap[idEvento].qtdPresentes += presentesIds.length;
                    if (!eventosMap[idEvento].descricao && desc) eventosMap[idEvento].descricao = desc;
                }
            });
        }

        eventosDatabase = Object.values(eventosMap);
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