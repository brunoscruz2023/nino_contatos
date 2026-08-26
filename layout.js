// layout.js
window.App = window.App || {};
App.Layout = App.Layout || {};

const ICONS = {
    mapa: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    eventos: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    admin: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    cadastro: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path> <circle cx="8.5" cy="7" r="4"></circle> <line x1="20" y1="8" x2="20" y2="14"></line> <line x1="23" y1="11" x2="17" y2="11"></line></svg>',
    dashboard: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
    materiais: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    sair: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    checkin: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>'
};

// ==========================================
// MÓDULO: SHELL LAYOUT (Barra Inferior Dinâmica)
// ==========================================
App.Layout.Shell = {
    navBar: null,
    fabBtn: null,
    activeView: null,
    
    init: function() {
        this.navBar = document.getElementById('bottom-nav-bar');
        this.fabBtn = document.getElementById('fab-btn');
        if (!this.navBar || !this.fabBtn) return;
        
        // Garante que o container do Dashboard exista no DOM
        if (!document.getElementById('view-dashboard')) {
            const canvasContainer = document.querySelector('.canvas-container');
            const newView = document.createElement('div');
            newView.id = 'view-dashboard';
            newView.className = 'hidden flex-1 bg-slate-50 overflow-auto';
            canvasContainer.insertBefore(newView, document.getElementById('bottom-nav-bar'));
        }
        
        this.navBar.classList.remove('hidden');
        
        // Decide a view inicial baseada nas permissões
        let firstView = 'mapa';
        if (!App.Core.Security.hasModuleAccess('mapa')) {
            if (this.canViewDashboard()) firstView = 'dashboard';
            else if (App.Core.Security.hasModuleAccess('agenda')) firstView = 'eventos';
            else if (App.Core.Security.hasModuleAccess('cadastro')) firstView = 'cadastro';
            else if (App.Core.Security.hasModuleAccess('admin')) firstView = 'admin';
            else if (App.Core.Security.hasModuleAccess('materiais')) firstView = 'materiais'; // Adicionado
        }
        
        this.setActive(firstView);
    },

    canViewDashboard: function() {
        return App.Core.Security.hasModuleAccess('dashboard');
    },

    renderNav: function() {
        let navLeft = document.getElementById('nav-left');
        let navRight = document.getElementById('nav-right');
        let fabContainer = document.getElementById('fab-container');
        
        navLeft.innerHTML = '';
        navRight.innerHTML = '';

        // OCULTA O FAB E SEU CONTAINER (Medida Emergencial)
        if (fabContainer) fabContainer.style.display = 'none';
        if (this.fabBtn) this.fabBtn.style.display = 'none';

        let availableMods = [];
        
        if (this.canViewDashboard()) availableMods.push('dashboard');
        if (App.Core.Security.hasModuleAccess('admin')) availableMods.push('admin');
        if (App.Core.Security.hasModuleAccess('agenda')) availableMods.push('eventos');
        if (App.Core.Security.hasModuleAccess('mapa')) availableMods.push('mapa');
        if (App.Core.Security.hasModuleAccess('cadastro')) availableMods.push('cadastro');
        if (App.Core.Security.hasModuleAccess('materiais')) availableMods.push('materiais'); // Adicionado

        // 1. REGRA DE REDUNDÂNCIA: Se tem Admin, não mostra Cadastro E Materiais no menu inferior
        if (availableMods.includes('admin')) {
            availableMods = availableMods.filter(m => m !== 'cadastro' && m !== 'materiais');
        }

        // 2. REGRA DE TELA ATIVA: Remove o módulo que está aberto no momento
        availableMods = availableMods.filter(m => m !== this.activeView);

        // 3. MATRIZ DE PRIORIDADE: Ordena por importância gerencial
        const priorityMatrix = ['dashboard', 'admin', 'eventos', 'mapa', 'cadastro', 'materiais'];
        availableMods.sort((a, b) => {
            return priorityMatrix.indexOf(a) - priorityMatrix.indexOf(b);
        });

        // 4. APLICA O LIMITE: Pega os 4 primeiros da lista ordenada
        let otherMods = availableMods.slice(0, 4);
        
        // Adiciona o logout sempre no final da lista
        otherMods.push('logout');
        
        // 5. DISTRIBUIÇÃO: Todos os itens vão para a esquerda, que ocupa 100% da largura
        otherMods.forEach(mod => navLeft.appendChild(this.createNavBtn(mod)));
        
        // Ajuste de CSS para a barra inferior sem o FAB
        navLeft.style.width = '100%';
        navLeft.style.justifyContent = 'space-around'; // Espaça os ícones igualmente
        navRight.style.display = 'none'; // Esconde o lado direito pois não há FAB
    },

    createNavBtn: function(view) {
        let btn = document.createElement('button');
        btn.className = 'nav-item flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors h-full';
        btn.addEventListener('click', () => {
            if (view === 'logout') App.Core.Controller.logout();
            else this.setActive(view);
        });

        let icon = '';
        let label = '';
        if (view === 'mapa') { icon = ICONS.mapa; label = 'Mapa'; }
        else if (view === 'eventos') { icon = ICONS.eventos; label = 'Agenda'; }
        else if (view === 'cadastro') { icon = ICONS.cadastro; label = 'Cadastro'; }
        else if (view === 'admin') { icon = ICONS.admin; label = 'Admin'; }
        else if (view === 'dashboard') { icon = ICONS.dashboard; label = 'Painel'; }
        else if (view === 'materiais') { icon = ICONS.materiais; label = 'Estoque'; } // Adicionado
        else if (view === 'logout') { icon = ICONS.sair; label = 'Sair'; btn.classList.add('hover:text-rose-600'); }

        btn.innerHTML = icon + `<span class="text-[10px] mt-0.5">${label}</span>`;
        return btn;
    },

    setActive: function(view) {
        this.activeView = view;

        // Esconde todas as views
        document.getElementById('view-mapa').classList.add('hidden');
        document.getElementById('view-eventos').classList.add('hidden');
        document.getElementById('view-admin').classList.add('hidden');
        document.getElementById('view-cadastro').classList.add('hidden');
        if(document.getElementById('view-dashboard')) document.getElementById('view-dashboard').classList.add('hidden');
        
        // Controle de Filtros do Mapa (some em outras telas)
        let mobileMapFilters = document.querySelector('.mobile-header-sticky > .grid');
        let mobileTeamWrapper = document.getElementById('mobile-team-wrapper');
        let mobileTotalCount = document.getElementById('mobile-total-count');
        let btnVerContatos = document.getElementById('btn-ver-contatos');
        
        if(mobileMapFilters) mobileMapFilters.classList.add('hidden');
        if(mobileTeamWrapper) mobileTeamWrapper.classList.add('hidden');
        if(mobileTotalCount) mobileTotalCount.classList.add('hidden');
        if(btnVerContatos) btnVerContatos.classList.add('hidden');

        // Exibe a view selecionada
        if (view === 'mapa') {
            document.getElementById('view-mapa').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Mapa de Lideranças <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if(mobileMapFilters) mobileMapFilters.classList.remove('hidden');
            if(mobileTeamWrapper) mobileTeamWrapper.classList.remove('hidden');
            if(mobileTotalCount) mobileTotalCount.classList.remove('hidden');
            if(btnVerContatos) btnVerContatos.classList.remove('hidden');
            if (typeof applyFilters === 'function') applyFilters();
        } 
        else if (view === 'eventos') {
            document.getElementById('view-eventos').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Mapa de Eventos <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if (typeof initEventos === 'function') initEventos();
        } 
        else if (view === 'admin') {
            document.getElementById('view-admin').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Painel Admin <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if (typeof App.Admin !== 'undefined' && App.Admin.CRUD) App.Admin.CRUD.init();
        } 
        else if (view === 'cadastro') {
            document.getElementById('view-cadastro').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Cadastro <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if (typeof App.Cadastro !== 'undefined' && App.Cadastro.UI) App.Cadastro.UI.init();
        }
        else if (view === 'dashboard') {
            document.getElementById('view-dashboard').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Dashboard <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if (typeof App.Dashboard !== 'undefined' && App.Dashboard.UI) App.Dashboard.UI.init();
        }
        // No caso de 'materiais', não há view própria ainda, cai no Admin. Mas mantemos a lógica.

        // Re-renderiza a barra para ocultar o botão ativo e ajustar o FAB
        this.renderNav();
    },

    setEventFab: function(evId, mobId) {
        // FAB desativado
        this.setFab(ICONS.checkin, () => {
            if (typeof App.Eventos.CRUD !== 'undefined') {
                App.Eventos.CRUD.openPresenceModal(evId, mobId);
            }
        });
    },

    resetFab: function() {
        // FAB desativado
        this.setFab(ICONS.plus, null, false, true);
    },

    setFab: function(iconHtml, onClickCallback, isLogout = false, isDisabled = false) {
        // Medida emergencial: Força o FAB a ficar oculto
        this.fabBtn.style.display = 'none';
        let fabContainer = document.getElementById('fab-container');
        if (fabContainer) fabContainer.style.display = 'none';
    }
};