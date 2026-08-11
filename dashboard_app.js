// dashboard_app.js
window.App = window.App || {};
App.Dashboard = App.Dashboard || {};

App.Dashboard.Dados = {
    getMetrics: function() {
        let today = new Date();
        today.setHours(0, 0, 0, 0);

        let agendados = 0;
        let totalHoje = 0;
        let totalPessoasAtivas = 0;
        
        let hojePorTipo = {};
        let hojePorLocal = {};
        let ativasPorLocal = {};
        let ativasPorEvento = [];

        if (eventosDatabase && eventosDatabase.length > 0) {
            eventosDatabase.forEach(ev => {
                let evDate = new Date(ev.date);
                evDate.setHours(0, 0, 0, 0);

                if (evDate > today) {
                    agendados++;
                } else if (evDate.getTime() === today.getTime()) {
                    totalHoje++;
                    
                    // Agrupamento por Tipo
                    let tipo = ev.tipo || "Indefinido";
                    if (!hojePorTipo[tipo]) hojePorTipo[tipo] = { count: 0, pessoas: 0 };
                    hojePorTipo[tipo].count++;
                    hojePorTipo[tipo].pessoas += ev.qtdPresentes || 0;
                    
                    // Agrupamento por Local
                    let local = ev.bairro || "Indefinido";
                    if (!hojePorLocal[local]) hojePorLocal[local] = { count: 0, pessoas: 0 };
                    hojePorLocal[local].count++;
                    hojePorLocal[local].pessoas += ev.qtdPresentes || 0;

                    // Pessoas ativas no evento
                    let ativasNoEvento = ev.qtdPresentes || 0;
                    totalPessoasAtivas += ativasNoEvento;
                    
                    ativasPorEvento.push({ 
                        id: ev.idEvento, 
                        nome: ev.nome, 
                        tipo: ev.tipo, 
                        local: ev.bairro, 
                        ativas: ativasNoEvento 
                    });
                }
            });
        }

        return {
            agendados: agendados,
            totalHoje: totalHoje,
            totalPessoasAtivas: totalPessoasAtivas,
            hojePorTipo: hojePorTipo,
            hojePorLocal: hojePorLocal,
            ativasPorEvento: ativasPorEvento
        };
    }
};

App.Dashboard.UI = {
    init: function() {
        const view = document.getElementById('view-dashboard');
        if (!view) return;

        view.innerHTML = `
            <div class="max-w-4xl mx-auto p-4 md:p-8 w-full">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-slate-800">Painel Gerencial</h2>
                    <p class="text-sm text-slate-500 mt-1">Visão geral e em tempo real da operação de hoje.</p>
                </div>

                <div id="dashboard-content" class="space-y-6">
                    <div class="text-center text-slate-500 animate-pulse">Carregando métricas...</div>
                </div>
            </div>
        `;

        // Garante que os dados estejam carregados
        if (!eventosDatabase || eventosDatabase.length === 0) {
            fetchEventosData(false).then(() => {
                this.renderMetrics();
            });
        } else {
            this.renderMetrics();
        }
    },

    renderMetrics: function() {
        const content = document.getElementById('dashboard-content');
        if (!content) return;

        const m = App.Dashboard.Dados.getMetrics();

        const totalLocais = Object.keys(m.hojePorLocal).length;
        const totalTipos = Object.keys(m.hojePorTipo).length;

        // Cards de Totalizadores
        let html = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-wider">Agendados</p>
                    <p class="text-4xl font-extrabold text-indigo-600 mt-2">${m.agendados}</p>
                    <p class="text-xs text-slate-400 mt-1">Eventos futuros</p>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-wider">Acontecendo Hoje</p>
                    <p class="text-4xl font-extrabold text-emerald-600 mt-2">${m.totalHoje}</p>
                    <p class="text-xs text-slate-400 mt-1">Eventos ativos hoje</p>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-wider">Pessoas no Campo</p>
                    <p class="text-4xl font-extrabold text-sky-600 mt-2">${m.totalPessoasAtivas}</p>
                    <p class="text-xs text-slate-400 mt-1">Presenças registradas hoje</p>
                </div>
            </div>
        `;

        // Lista de Eventos Acontecendo Hoje
        if (m.ativasPorEvento.length > 0) {
            html += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Eventos de Hoje</h3>
                    <div class="space-y-3">
            `;
            m.ativasPorEvento.forEach(ev => {
                html += `
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                        <div>
                            <p class="font-bold text-slate-800 text-sm">${ev.nome}</p>
                            <p class="text-xs text-slate-500">${ev.tipo} - ${ev.local}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-extrabold text-slate-800">${ev.ativas}</p>
                            <p class="text-[10px] text-slate-400 uppercase">Ativas</p>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        // Agrupamento por Local
        if (totalLocais > 0) {
            html += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Operação por Local</h3>
                    <div class="space-y-3">
            `;
            for (let local in m.hojePorLocal) {
                let data = m.hojePorLocal[local];
                html += `
                    <div class="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <div class="flex-1">
                            <p class="font-bold text-slate-800 text-sm">${local}</p>
                            <p class="text-xs text-slate-500">${data.count} evento(s) acontecendo</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-extrabold text-indigo-600">${data.pessoas}</p>
                            <p class="text-[10px] text-slate-400 uppercase">Pessoas Ativas</p>
                        </div>
                    </div>
                `;
            }
            html += `</div></div>`;
        }

        // Agrupamento por Tipo
        if (totalTipos > 0) {
            html += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Operação por Tipo</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            `;
            for (let tipo in m.hojePorTipo) {
                let data = m.hojePorTipo[tipo];
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

        // Mensagem se não houver nada hoje
        if (m.totalHoje === 0 && m.agendados === 0) {
            html += `<div class="text-center text-slate-400 py-10">Nenhum evento agendado ou ocorrendo hoje.</div>`;
        }

        content.innerHTML = html;
    }
};

// Inicialização automática se já estiver na tela
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('view-dashboard') && !document.getElementById('view-dashboard').classList.contains('hidden')) {
        App.Dashboard.UI.init();
    }
});