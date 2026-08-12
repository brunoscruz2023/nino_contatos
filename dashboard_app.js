// dashboard_app.js
window.App = window.App || {};
App.Dashboard = App.Dashboard || {};

App.Dashboard.Dados = {
    // Filtra eventos para o Dashboard baseado em RBAC (ABAC)
    getVisibleEvents: function() {
        if (!currentSession || !currentSession.funcoes) return [];
        
        let isAdmin = currentSession.funcoes.admin === '999' || currentSession.funcoes.agenda === '999';
        if (isAdmin) return eventosDatabase;

        let userId = currentSession.id;
        if (!userId || userId === 'LEGADO' || userId === 'ADMIN') return [];

        return eventosDatabase.filter(ev => {
            if (!ev.participacoes || ev.participacoes.length === 0) return false;
            return ev.participacoes.some(p => p.coordenadorId === userId || p.supervisorId === userId || p.mobilizadorId === userId);
        });
    },

    // Métricas de Eventos
    getEventMetrics: function(dateRange) {
        let totalEventos = 0;
        let totalPessoas = 0;
        let porTipo = {};
        let porLocal = {};
        let eventosRanking = [];

        const visibleEvents = this.getVisibleEvents();

        if (visibleEvents.length > 0) {
            visibleEvents.forEach(ev => {
                let evDate = new Date(ev.date);
                evDate.setHours(0, 0, 0, 0);

                if (evDate >= dateRange.start && evDate <= dateRange.end) {
                    totalEventos++;
                    totalPessoas += ev.qtdPresentes || 0;

                    let tipo = ev.tipo || "Indefinido";
                    if (!porTipo[tipo]) porTipo[tipo] = { count: 0, pessoas: 0 };
                    porTipo[tipo].count++;
                    porTipo[tipo].pessoas += ev.qtdPresentes || 0;
                    
                    let local = ev.bairro || "Indefinido";
                    if (!porLocal[local]) porLocal[local] = { count: 0, pessoas: 0 };
                    porLocal[local].count++;
                    porLocal[local].pessoas += ev.qtdPresentes || 0;

                    eventosRanking.push({ 
                        id: ev.idEvento, 
                        nome: ev.nome, 
                        tipo: ev.tipo, 
                        local: ev.bairro, 
                        date: evDate,
                        ativas: ev.qtdPresentes || 0 
                    });
                }
            });
        }

        eventosRanking.sort((a, b) => b.ativas - a.ativas);

        return {
            totalEventos: totalEventos,
            totalPessoas: totalPessoas,
            porTipo: porTipo,
            porLocal: porLocal,
            ranking: eventosRanking.slice(0, 3)
        };
    },

    // Métricas do Mapa (Crescimento Territorial)
    getMapMetrics: function(dateRange) {
        let totalLeads = 0;
        let novosLeads = 0;
        let porRegiao = {};
        let bairrosRanking = {};

        if (geoDatabase && geoDatabase.length > 0) {
            geoDatabase.forEach(bairro => {
                totalLeads += bairro.nomes.length;
                let novosNoBairro = 0;
                
                bairro.nomes.forEach(nome => {
                    let leadDate = App.Core.Utils.parseCustomDate(nome.data);
                    if (leadDate) {
                        if (leadDate >= dateRange.start && leadDate <= dateRange.end) {
                            novosLeads++;
                            novosNoBairro++;
                            
                            if (!porRegiao[bairro.regiao]) porRegiao[bairro.regiao] = 0;
                            porRegiao[bairro.regiao]++;
                        }
                    }
                });
                
                if (novosNoBairro > 0) {
                    bairrosRanking[bairro.bairro] = novosNoBairro;
                }
            });
        }

        let rankingArr = Object.keys(bairrosRanking).map(b => ({ bairro: b, count: bairrosRanking[b] }));
        rankingArr.sort((a, b) => b.count - a.count);

        return {
            totalLeads: totalLeads,
            novosLeads: novosLeads,
            porRegiao: porRegiao,
            topBairros: rankingArr.slice(0, 5)
        };
    },

    getDateRange: function(period) {
        let today = new Date();
        today.setHours(0, 0, 0, 0);
        let start = new Date(today);
        let end = new Date(today);

        if (period === '7d') {
            start.setDate(today.getDate() - 6);
        } else if (period === '30d') {
            start.setDate(today.getDate() - 29);
        } else if (period === 'month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        return { start, end };
    }
};

App.Dashboard.UI = {
    currentPeriod: 'today',
    currentTab: 'operacao',
    availableTabs: [],

    init: function() {
        const view = document.getElementById('view-dashboard');
        if (!view) return;

        view.innerHTML = `
            <div class="max-w-4xl mx-auto p-4 md:p-8 w-full">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-slate-800">Painel Gerencial</h2>
                    <p class="text-sm text-slate-500 mt-1">Visão geral e em tempo real da operação.</p>
                </div>

                <div id="dashboard-tabs"></div>
                <div id="dashboard-period-selector"></div>
                <div id="dashboard-content" class="space-y-6">
                    <div class="text-center text-slate-500 animate-pulse">Carregando métricas...</div>
                </div>
            </div>
        `;

        // Define as abas disponíveis baseado no RBAC
        this.availableTabs = [];
        if (App.Core.Security.hasModuleAccess('agenda') && (currentSession.funcoes.agenda === '003' || currentSession.funcoes.agenda === '999' || currentSession.funcoes.admin === '999')) {
            this.availableTabs.push({ id: 'operacao', label: 'Operação' });
        }
        if (App.Core.Security.hasModuleAccess('mapa') && (currentSession.funcoes.mapa === '003' || currentSession.funcoes.mapa === '999' || currentSession.funcoes.admin === '999')) {
            this.availableTabs.push({ id: 'territorio', label: 'Território' });
        }

        // Se a aba atual não estiver mais disponível, reseta para a primeira
        if (this.availableTabs.length > 0 && !this.availableTabs.find(t => t.id === this.currentTab)) {
            this.currentTab = this.availableTabs[0].id;
        }

        this.renderShell();
        
        // Carrega dados se necessário e renderiza métricas
        const hasEventData = eventosDatabase && eventosDatabase.length > 0;
        const hasMapData = geoDatabase && geoDatabase.length > 0;

        if (!hasEventData && this.availableTabs.find(t => t.id === 'operacao')) {
            fetchEventosData(false).then(() => this.renderContent());
        } else if (!hasMapData && this.availableTabs.find(t => t.id === 'territorio')) {
            fetchSpreadsheetData().then(() => this.renderContent());
        } else {
            this.renderContent();
        }
    },

    renderShell: function() {
        // Renderiza Abas
        App.UI.TabNav.render(
            '#dashboard-tabs', 
            this.availableTabs, 
            this.currentTab, 
            (tabId) => {
                this.currentTab = tabId;
                this.renderShell();
                this.renderContent();
            }
        );

        // Renderiza Seletor de Período
        const periodOptions = [
            { value: 'today', label: 'Hoje' },
            { value: '7d', label: '7 Dias' },
            { value: '30d', label: '30 Dias' },
            { value: 'month', label: 'Mês Atual' }
        ];
        
        App.UI.PeriodSelector.render(
            '#dashboard-period-selector', 
            periodOptions, 
            this.currentPeriod, 
            (selectedPeriod) => {
                this.currentPeriod = selectedPeriod;
                this.renderContent();
            }
        );
    },

    renderContent: function() {
        if (this.currentTab === 'operacao') this.renderOperacao();
        if (this.currentTab === 'territorio') this.renderTerritorio();
    },

    // ==========================================
    // ABA: OPERAÇÃO (EVENTOS)
    // ==========================================
    renderOperacao: function() {
        const content = document.getElementById('dashboard-content');
        if (!content) return;

        const dateRange = App.Dashboard.Dados.getDateRange(this.currentPeriod);
        const m = App.Dashboard.Dados.getEventMetrics(dateRange);

        let html = `
            <div class="grid grid-cols-3 gap-2 md:gap-4">
                ${App.UI.StatCard.create({ title: "Eventos", value: m.totalEventos, color: "text-indigo-600" })}
                ${App.UI.StatCard.create({ title: "Pessoal", value: m.totalPessoas, color: "text-emerald-600" })}
                ${App.UI.StatCard.create({ title: "Locais", value: Object.keys(m.porLocal).length, color: "text-sky-600" })}
            </div>
        `;

        if (m.ranking.length > 0) {
            html += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Top ${m.ranking.length} Eventos (Mais Presenças)</h3>
                    <div class="space-y-3">
            `;
            m.ranking.forEach((ev, idx) => {
                let medal = ['🥇', '🥈', '🥉'][idx] || '';
                html += `
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">${medal}</span>
                            <div>
                                <p class="font-bold text-slate-800 text-sm">${ev.nome}</p>
                                <p class="text-xs text-slate-500">${ev.tipo} - ${ev.local} (${ev.date.toLocaleDateString('pt-BR')})</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-extrabold text-slate-800">${ev.ativas}</p>
                            <p class="text-[10px] text-slate-400 uppercase">Presentes</p>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        if (Object.keys(m.porLocal).length > 0) {
            html += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Operação por Local</h3>
                    <div class="space-y-3">
            `;
            for (let local in m.porLocal) {
                let data = m.porLocal[local];
                html += `
                    <div class="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <div class="flex-1">
                            <p class="font-bold text-slate-800 text-sm">${local}</p>
                            <p class="text-xs text-slate-500">${data.count} evento(s) no período</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-extrabold text-indigo-600">${data.pessoas}</p>
                            <p class="text-[10px] text-slate-400 uppercase">Pessoas</p>
                        </div>
                    </div>
                `;
            }
            html += `</div></div>`;
        }

        if (Object.keys(m.porTipo).length > 0) {
            html += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Operação por Tipo</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            `;
            for (let tipo in m.porTipo) {
                let data = m.porTipo[tipo];
                let color = tipo.toLowerCase().startsWith('dev') ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700';
                html += `
                    <div class="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                        <span class="font-bold text-slate-800 text-sm">${tipo}</span>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded-full text-xs font-bold ${color}">${data.count} Eventos</span>
                            <span class="text-sm font-bold text-slate-600">${data.pessoas} Pessoas</span>
                        </div>
                    </div>
                `;
            }
            html += `</div></div>`;
        }

        if (m.totalEventos === 0) {
            html += `<div class="text-center text-slate-400 py-10">Nenhum evento encontrado neste período.</div>`;
        }

        content.innerHTML = html;
    },

    // ==========================================
    // ABA: TERRITÓRIO (MAPA)
    // ==========================================
    renderTerritorio: function() {
        const content = document.getElementById('dashboard-content');
        if (!content) return;

        const dateRange = App.Dashboard.Dados.getDateRange(this.currentPeriod);
        const m = App.Dashboard.Dados.getMapMetrics(dateRange);

        let html = `
            <div class="grid grid-cols-3 gap-2 md:gap-4">
                ${App.UI.StatCard.create({ title: "Total Leads", value: m.totalLeads, color: "text-indigo-600" })}
                ${App.UI.StatCard.create({ title: "Novos Leads", value: m.novosLeads, color: "text-emerald-600" })}
                ${App.UI.StatCard.create({ title: "Regiões", value: Object.keys(m.porRegiao).length, color: "text-sky-600" })}
            </div>
        `;

        if (m.topBairros.length > 0) {
            html += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Top ${m.topBairros.length} Bairros em Crescimento</h3>
                    <div class="space-y-3">
            `;
            m.topBairros.forEach((b, idx) => {
                let medal = ['🥇', '🥈', '🥉', '🏅', '🏅'][idx] || '';
                html += `
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">${medal}</span>
                            <p class="font-bold text-slate-800 text-sm">${b.bairro}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-extrabold text-emerald-600">${b.count}</p>
                            <p class="text-[10px] text-slate-400 uppercase">Novos Leads</p>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        if (Object.keys(m.porRegiao).length > 0) {
            html += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Distribuição por Região</h3>
                    <div class="space-y-3">
            `;
            for (let regiao in m.porRegiao) {
                let count = m.porRegiao[regiao];
                html += `
                    <div class="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <p class="font-bold text-slate-800 text-sm">${regiao}</p>
                        <div class="text-right">
                            <p class="text-xl font-extrabold text-indigo-600">${count}</p>
                            <p class="text-[10px] text-slate-400 uppercase">Novos Leads</p>
                        </div>
                    </div>
                `;
            }
            html += `</div></div>`;
        }

        if (m.totalLeads === 0) {
            html += `<div class="text-center text-slate-400 py-10">Nenhum lead mapeado neste período.</div>`;
        }

        content.innerHTML = html;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('view-dashboard') && !document.getElementById('view-dashboard').classList.contains('hidden')) {
        App.Dashboard.UI.init();
    }
});