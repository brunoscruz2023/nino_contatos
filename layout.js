// layout.js
window.App = window.App || {};
App.Layout = App.Layout || {};

// Ícones SVG reutilizáveis
const ICONS = {
    mapa: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    eventos: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    admin: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    sair: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    cadastro: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path> <circle cx="8.5" cy="7" r="4"></circle> <line x1="20" y1="8" x2="20" y2="14"></line> <line x1="23" y1="11" x2="17" y2="11"></line></svg>'
};

// ==========================================
// MÓDULO: SHELL LAYOUT (Barra Inferior e FAB)
// ==========================================
App.Layout.Shell = {
    navBar: null,
    fabBtn: null,
    activeModulesCount: 0,
    
    init: function() {
        this.navBar = document.getElementById('bottom-nav-bar');
        this.fabBtn = document.getElementById('fab-btn');
        if (!this.navBar || !this.fabBtn) return;
        
        this.navBar.classList.remove('hidden');
        
        let modulos = currentSession.modulos || [];
        this.activeModulesCount = modulos.length;
        
        this.renderNav();
        this.attachListeners();
        
        // Decide a view inicial
        let firstView = 'mapa';
        if (!modulos.includes(1) && modulos.includes(2)) firstView = 'eventos';
        else if (!modulos.includes(1) && !modulos.includes(2) && (modulos.includes(3) || modulos.includes(4))) firstView = 'admin';
        else if (modulos.includes(5) && !modulos.includes(1) && !modulos.includes(2)) firstView = 'cadastro';
        
        this.setActive(firstView);
    },

    renderNav: function() {
        let modulos = currentSession.modulos || [];
        let isAdmin = modulos.includes(3) || modulos.includes(4);
        let navLeft = document.getElementById('nav-left');
        let navRight = document.getElementById('nav-right');
        
        navLeft.innerHTML = '';
        navRight.innerHTML = '';

        // Se tiver mais de 1 módulo, distribui (max 2 esquerda, max 2 direita)
        if (this.activeModulesCount > 1) {
            // Lado Esquerdo (Máx 2)
            if (modulos.includes(1)) {
                navLeft.innerHTML += `<button data-view="mapa" class="nav-item flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">${ICONS.mapa}<span class="text-[10px] mt-0.5">Mapa</span></button>`;
            }
            if (modulos.includes(2) || modulos.includes(3)) {
                navLeft.innerHTML += `<button data-view="eventos" class="nav-item flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">${ICONS.eventos}<span class="text-[10px] mt-0.5">Eventos</span></button>`;
            }
            
            // Lado Direito (Máx 2)
            if (modulos.includes(5)) {
                navRight.innerHTML += `<button data-view="cadastro" class="nav-item flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">${ICONS.cadastro}<span class="text-[10px] mt-0.5">Cadastro</span></button>`;
            }
            if (isAdmin) {
                navRight.innerHTML += `<button data-view="admin" class="nav-item flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">${ICONS.admin}<span class="text-[10px] mt-0.5">Admin</span></button>`;
            }
            // Logout sempre por último na direita
            navRight.innerHTML += `<button data-view="logout" class="nav-item flex flex-col items-center justify-center text-slate-500 hover:text-rose-600 transition-colors">${ICONS.sair}<span class="text-[10px] mt-0.5">Sair</span></button>`;
        }
    },

    attachListeners: function() {
        let self = this;
        this.navBar.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', function() {
                let view = this.getAttribute('data-view');
                if (view === 'logout') {
                    App.Core.Controller.logout();
                } else {
                    self.setActive(view);
                }
            });
        });
    },

    setActive: function(view) {
        // Atualiza estilo dos botões laterais
        this.navBar.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.getAttribute('data-view') === view) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Esconde todas as views
        document.getElementById('view-mapa').classList.add('hidden');
        document.getElementById('view-eventos').classList.add('hidden');
        document.getElementById('view-admin').classList.add('hidden');
        document.getElementById('view-cadastro').classList.add('hidden');
        
        // Controle de Filtros do Mapa (some em outras telas)
        let mobileMapFilters = document.querySelector('.mobile-header-sticky > .grid');
        let mobileTeamWrapper = document.getElementById('mobile-team-wrapper');
        let mobileTotalCount = document.getElementById('mobile-total-count');
        let btnVerContatos = document.getElementById('btn-ver-contatos');
        
        if(mobileMapFilters) mobileMapFilters.classList.add('hidden');
        if(mobileTeamWrapper) mobileTeamWrapper.classList.add('hidden');
        if(mobileTotalCount) mobileTotalCount.classList.add('hidden');
        if(btnVerContatos) btnVerContatos.classList.add('hidden');

        // Exibe a view selecionada e atualiza FAB/Título
        if (view === 'mapa') {
            document.getElementById('view-mapa').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Mapa de Lideranças <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if(mobileMapFilters) mobileMapFilters.classList.remove('hidden');
            if(mobileTeamWrapper) mobileTeamWrapper.classList.remove('hidden');
            if(mobileTotalCount) mobileTotalCount.classList.remove('hidden');
            if(btnVerContatos) btnVerContatos.classList.remove('hidden');
            if (typeof applyFilters === 'function') applyFilters();
            
            this.setFab(ICONS.search, () => { if(typeof toggleModalNomes === 'function') toggleModalNomes(); });
        } else if (view === 'eventos') {
            document.getElementById('view-eventos').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Mapa de Eventos <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if (typeof initEventos === 'function') initEventos();
            
            this.setFab(ICONS.plus, () => { if(typeof App.Eventos.CRUD !== 'undefined') App.Eventos.CRUD.openCreateModal(); });
        } else if (view === 'admin') {
            document.getElementById('view-admin').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Painel Admin <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if (typeof App.Admin !== 'undefined' && App.Admin.CRUD) App.Admin.CRUD.init();
            
            this.setFab(ICONS.search, () => { let i = document.getElementById('admin-phone-search'); if(i) i.focus(); });
        } else if (view === 'cadastro') {
            document.getElementById('view-cadastro').classList.remove('hidden');
            document.getElementById('app-title-mobile').innerHTML = "Cadastro <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if (typeof App.Cadastro !== 'undefined' && App.Cadastro.UI) App.Cadastro.UI.init();
            
            this.setFab(ICONS.plus, () => { if(typeof App.UI.ContactForm !== 'undefined') App.UI.ContactForm.clear(); });
        }
        
        // Lógica de módulo único: FAB vira Logout
        if (this.activeModulesCount <= 1) {
            this.setFab(ICONS.sair, App.Core.Controller.logout, true);
        }
    },

    setFab: function(iconHtml, onClickCallback, isLogout = false) {
        this.fabBtn.innerHTML = iconHtml;
        this.fabBtn.onclick = onClickCallback;
        
        if(isLogout) this.fabBtn.classList.add('logout');
        else this.fabBtn.classList.remove('logout');
    }
};