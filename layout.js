// layout.js
window.App = window.App || {};
App.Layout = App.Layout || {};

// ==========================================
// MÓDULO: SHELL LAYOUT (Barra Inferior e Roteamento)
// ==========================================
App.Layout.Shell = {
    navBar: null,
    
    init: function() {
        this.navBar = document.getElementById('bottom-nav-bar');
        if (!this.navBar) return;
        
        this.renderNav();
        this.attachListeners();
        this.setActive('mapa'); // Sempre inicia no mapa
    },

    renderNav: function() {
        let modulos = currentSession.modulos || [];
        // Admin tem acesso se tiver o módulo 004 (Admin) ou 003 (CRUD de Eventos)
        let isAdmin = modulos.includes(3) || modulos.includes(4);
        
        let html = `
            <style>
                .nav-item.active { color: #4f46e5; font-weight: 800; }
                .nav-item.active svg { stroke-width: 2.5; }
            </style>
        `;

        // Botão Mapa (Módulo 1)
        if (modulos.includes(1)) {
            html += `
                <button data-view="mapa" class="nav-item flex-1 flex flex-col items-center justify-center py-2 text-slate-500 hover:text-indigo-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span class="text-[10px] mt-0.5">Mapa</span>
                </button>
            `;
        }

        // Botão Eventos (Módulo 2 ou 3)
        if (modulos.includes(2) || modulos.includes(3)) {
            html += `
                <button data-view="eventos" class="nav-item flex-1 flex flex-col items-center justify-center py-2 text-slate-500 hover:text-indigo-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span class="text-[10px] mt-0.5">Eventos</span>
                </button>
            `;
        }

        // Botão Admin (Apenas para Admins - Módulo 3 ou 4)
        if (isAdmin) {
            html += `
                <button data-view="admin" class="nav-item flex-1 flex flex-col items-center justify-center py-2 text-slate-500 hover:text-indigo-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    <span class="text-[10px] mt-0.5">Admin</span>
                </button>
            `;
        }

        // Botão Sair (Sempre presente)
        html += `
            <button id="btn-nav-logout" class="flex-1 flex flex-col items-center justify-center py-2 text-slate-500 hover:text-rose-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                <span class="text-[10px] mt-0.5">Sair</span>
            </button>
        `;

        this.navBar.innerHTML = html;
    },

    attachListeners: function() {
        let self = this;
        this.navBar.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', function() {
                let view = this.getAttribute('data-view');
                self.setActive(view);
            });
        });
        
        let logoutBtn = document.getElementById('btn-nav-logout');
        if(logoutBtn) logoutBtn.addEventListener('click', App.Core.Controller.logout);
    },

    setActive: function(view) {
        // Atualiza estilo dos botões
        this.navBar.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.getAttribute('data-view') === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Roteamento de Views
        let viewMapa = document.getElementById('view-mapa');
        let viewEventos = document.getElementById('view-eventos');
        let viewAdmin = document.getElementById('view-admin');
        let titleDesktop = document.getElementById('app-title-desktop');
        let titleMobile = document.getElementById('app-title-mobile');
        
        // Esconde todas por padrão
        viewMapa.classList.add('hidden');
        viewEventos.classList.add('hidden');
        if(viewAdmin) viewAdmin.classList.add('hidden');
        
        // Controle de Visibilidade dos Filtros do Mapa no Header Mobile
        let mobileMapFilters = document.querySelector('.mobile-header-sticky > .grid');
        let mobileTeamWrapper = document.getElementById('mobile-team-wrapper');
        let mobileTotalCount = document.getElementById('mobile-total-count');
        let btnVerContatos = document.getElementById('btn-ver-contatos');
        
        if (view === 'mapa') {
            viewMapa.classList.remove('hidden');
            if (titleDesktop) titleDesktop.innerText = "Mapa de Lideranças";
            if (titleMobile) titleMobile.innerHTML = "Mapa de Lideranças <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if(mobileMapFilters) mobileMapFilters.classList.remove('hidden');
            if(mobileTeamWrapper) mobileTeamWrapper.classList.remove('hidden');
            if(mobileTotalCount) mobileTotalCount.classList.remove('hidden');
            if(btnVerContatos) btnVerContatos.classList.remove('hidden');
            if (typeof applyFilters === 'function') applyFilters();
        } else if (view === 'eventos') {
            viewEventos.classList.remove('hidden');
            if (titleDesktop) titleDesktop.innerText = "Mapa de Eventos";
            if (titleMobile) titleMobile.innerHTML = "Mapa de Eventos <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if(mobileMapFilters) mobileMapFilters.classList.add('hidden');
            if(mobileTeamWrapper) mobileTeamWrapper.classList.add('hidden');
            if(mobileTotalCount) mobileTotalCount.classList.add('hidden');
            if(btnVerContatos) btnVerContatos.classList.add('hidden');
            if (typeof initEventos === 'function') initEventos();
        } else if (view === 'admin') {
            if(viewAdmin) viewAdmin.classList.remove('hidden');
            if (titleDesktop) titleDesktop.innerText = "Painel Administrativo";
            if (titleMobile) titleMobile.innerHTML = "Painel Admin <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";
            if(mobileMapFilters) mobileMapFilters.classList.add('hidden');
            if(mobileTeamWrapper) mobileTeamWrapper.classList.add('hidden');
            if(mobileTotalCount) mobileTotalCount.classList.add('hidden');
            if(btnVerContatos) btnVerContatos.classList.add('hidden');
            if (typeof App.Admin !== 'undefined' && App.Admin.CRUD) {
                App.Admin.CRUD.init();
            }
        }
    }
};