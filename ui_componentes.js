// ui_componentes.js
window.App = window.App || {};
App.UI = App.UI || {};

// ==========================================
// COMPONENTE: ACCORDION LIST (Sanfona Reutilizável)
// ==========================================
App.UI.AccordionList = {
    initGlobalListener: function(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container || container.dataset.accordionInit === 'true') return;
        
        container.dataset.accordionInit = 'true';

        container.addEventListener('click', function(e) {
            if (e.target.closest('a, button')) return;

            const card = e.target.closest('.accordion-card');
            if (!card || card.classList.contains('non-collapsible')) return;

            const content = card.querySelector(':scope > .accordion-content');
            if (!content) return;

            const chevron = card.querySelector(':scope > .accordion-header .chevron-icon');
            
            if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                content.style.maxHeight = '0px';
                if (chevron) chevron.classList.remove('rotate-180');
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                if (chevron) chevron.classList.add('rotate-180');
            }
        });
    },

    createCard: function(data) {
        const isCollapsible = data.isCollapsible !== false;
        const uiColor = data.uiColor || { text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-400" };
        
        return `
            <div class="accordion-card mobile-lead-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ${isCollapsible ? 'cursor-pointer' : 'non-collapsible cursor-default'}" data-region="${data.region || ''}">
                <div class="accordion-header flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl ${uiColor.dot} bg-opacity-10 flex items-center justify-center flex-shrink-0">
                        <div class="w-3 h-3 rounded-full ${uiColor.dot}"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-slate-800 truncate">${data.title}</p>
                        <div class="flex items-center gap-1 text-[10px] font-bold mt-0.5 card-metrics">${data.metrics || ''}</div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="text-2xl font-extrabold ${uiColor.text} leading-none count-number">${data.badge || '0'}</p>
                        <p class="text-[10px] text-slate-400 font-medium mt-1">${data.badgeLabel || 'leads'}</p>
                    </div>
                    ${isCollapsible ? `
                    <svg class="chevron-icon w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                    </svg>` : ''}
                </div>
                <div class="accordion-content w-full text-sm text-slate-600" style="max-height: 0px; overflow: hidden; transition: max-height 0.3s ease-out;"></div>
            </div>
        `;
    }
};

// ==========================================
// COMPONENTE: LOADER (Spinner Global Reutilizável)
// ==========================================
App.UI.Loader = {
    show: function() {
        let div = document.getElementById('global-loader-overlay');
        if (!div) {
            div = document.createElement('div');
            div.id = 'global-loader-overlay';
            div.className = 'fixed inset-0 z-[9999] bg-slate-900/5 backdrop-blur-md flex items-center justify-center';
            div.innerHTML = `
                <svg class="animate-spin h-32 w-32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3.5"></circle>
                </svg>
            `;
            document.body.appendChild(div);
        }
        div.style.display = 'flex';
    },
    hide: function() {
        let div = document.getElementById('global-loader-overlay');
        if (div) div.style.display = 'none';
    }
};

// ==========================================
// COMPONENTE: SUCCESS TOAST (Check Verde Temporizado Reutilizável)
// ==========================================
App.UI.SuccessToast = {
    show: function(duration = 1500) {
        let div = document.getElementById('global-success-overlay');
        if (!div) {
            div = document.createElement('div');
            div.id = 'global-success-overlay';
            div.className = 'fixed inset-0 z-[9999] bg-slate-900/5 backdrop-blur-md flex items-center justify-center transition-opacity duration-300';
            div.innerHTML = `
                <svg class="h-32 w-32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3.5"></circle>
                    <path d="M8 12.5l2.5 2.5l5-5.5" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            document.body.appendChild(div);
        }
        div.style.opacity = '1';
        div.style.display = 'flex';

        setTimeout(() => {
            div.style.opacity = '0';
            setTimeout(() => { div.style.display = 'none'; }, 300);
        }, duration);
    }
};

// ==========================================
// COMPONENTE: STAT CARD (Card de Métrica Reutilizável)
// ==========================================
App.UI.StatCard = {
    create: function(config) {
        const color = config.color || 'text-indigo-600';
        return `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-full">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">${config.title || 'Métrica'}</p>
                <p class="text-4xl font-extrabold ${color} mt-2">${config.value || 0}</p>
            </div>
        `;
    }
};

// ==========================================
// COMPONENTE: PERIOD SELECTOR (Seletor de Período Reutilizável)
// ==========================================
App.UI.PeriodSelector = {
    render: function(containerSelector, options, currentSelection, onChangeCallback) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        let html = '<div class="flex gap-2 flex-wrap justify-center mb-6">';
        options.forEach(opt => {
            const isActive = opt.value === currentSelection;
            const activeClass = isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
            html += `<button data-period="${opt.value}" class="px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeClass}">${opt.label}</button>`;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
        container.querySelectorAll('button[data-period]').forEach(btn => {
            btn.addEventListener('click', function() {
                container.querySelectorAll('button[data-period]').forEach(b => {
                    b.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
                    b.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
                });
                
                this.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
                this.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');

                onChangeCallback(this.getAttribute('data-period'));
            });
        });
    }
};

// ==========================================
// COMPONENTE: TAB NAV (Navegação por Abas Reutilizável)
// ==========================================
App.UI.TabNav = {
    render: function(containerSelector, tabs, currentTabId, onChangeCallback) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        if (tabs.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="flex border-b border-slate-200 mb-6 overflow-x-auto hide-scrollbar">';
        tabs.forEach(tab => {
            const isActive = tab.id === currentTabId;
            const activeClass = isActive ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300';
            html += `<button data-tab="${tab.id}" class="py-3 px-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeClass}">${tab.label}</button>`;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
        container.querySelectorAll('button[data-tab]').forEach(btn => {
            btn.addEventListener('click', function() {
                onChangeCallback(this.getAttribute('data-tab'));
            });
        });
    }
};

// ==========================================
// COMPONENTE: CONTACT SEARCH (Busca de Contatos Reutilizável com Dropdown)
// ==========================================
App.UI.ContactSearch = {
    container: null,
    onResultCallback: null,
    dropdownVisible: false,
    currentResults: [],
    highlightedIndex: -1,

    init: function(containerSelector, config) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;
        
        this.onResultCallback = config.onResult || function(){};
        // [E2] Reset do estado singleton: o componente agora é instanciado em múltiplos
        // contextos (Admin, Distribuir Material, Tarefa Avulsa, HierarchyBuilder) e o
        // estado de uma instância anterior não deve vazar para a nova.
        this.currentResults = [];
        this.dropdownVisible = false;
        this.highlightedIndex = -1;

        this.container.innerHTML = `
            <div class="relative">
                <div class="flex gap-2">
                    <input type="text" id="cs-input" class="flex-1 min-w-0 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nome ou Telefone...">
                    <button id="cs-btn" onclick="App.UI.ContactSearch.search();" class="w-12 h-12 flex-shrink-0 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center" title="Buscar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </button>
                </div>
                <p id="cs-feedback" class="text-xs mt-1 font-medium hidden"></p>
                <!-- [BLOCO A — Item 1.6] z-[130]: dropdown acima do overlay do modal genérico (z-[120]) -->
                <div id="cs-dropdown" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-[130]"></div>
            </div>
        `;
        
        const input = document.getElementById('cs-input');
        if(input) {
            input.addEventListener('keypress', function(e) { if(e.key === 'Enter') App.UI.ContactSearch.search(); });
            input.addEventListener('keydown', function(e) { App.UI.ContactSearch.handleKeydown(e); });
            let timeout = null;
            input.addEventListener('input', function() {
                clearTimeout(timeout);
                timeout = setTimeout(() => App.UI.ContactSearch.search(true), 400);
            });
        }
    },

    handleKeydown: function(e) {
        if (!this.dropdownVisible) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.currentResults.length - 1);
            this.updateHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
            this.updateHighlight();
        } else if (e.key === 'Enter' && this.highlightedIndex > -1) {
            e.preventDefault();
            this.selectContact(this.highlightedIndex);
        } else if (e.key === 'Escape') {
            this.hideDropdown();
        }
    },

    updateHighlight: function() {
        const items = document.querySelectorAll('#cs-dropdown .cs-item');
        items.forEach((item, idx) => {
            if (idx === this.highlightedIndex) {
                item.classList.add('bg-indigo-50', 'text-indigo-700');
            } else {
                item.classList.remove('bg-indigo-50', 'text-indigo-700');
            }
        });
        const activeItem = items[this.highlightedIndex];
        if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
    },

    search: async function(isTyping = false) {
        const term = document.getElementById('cs-input').value.trim();
        const feedback = document.getElementById('cs-feedback');
        
        if (!term) {
            this.hideDropdown();
            feedback.classList.add('hidden');
            return;
        }
        
        const isPhone = /^\d+$/.test(term.replace(/\s|\(|\)|-/g, ''));
        const type = isPhone ? 'phone' : 'name';
        
        if (!isTyping) {
            feedback.innerText = "Buscando...";
            feedback.className = "text-xs mt-1 text-slate-500 animate-pulse";
            feedback.classList.remove('hidden');
            App.UI.Loader.show();
        }
        
        const payload = { action: 'lookupContact', term: term, type: type };
        try {
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject('Erro');
                });
            });
            
            if (!isTyping) App.UI.Loader.hide();
            
            const contacts = res.contacts || [];
            
            // [FIX T1-b / Item 1.9] Semântica de callbacks:
            // - Digitando (isTyping) com 0 resultados: NÃO dispara callback — evita render
            //   prematuro da área "Cadastrar Novo Contato" com termo parcial.
            // - Múltiplos resultados (digitação OU busca explícita): NÃO dispara callback(null) —
            //   apenas o dropdown; a seleção do contato é que dispara o callback definitivo.
            // - Busca explícita (botão/Enter) com 0 resultados: mantém callback(null) —
            //   o módulo host decide exibir a área de cadastro (comportamento desejado).
            // - Resultado único (digitação ou explícito): mantém callback(c) — auto-carregamento.
            if (contacts.length === 0) {
                this.hideDropdown();
                if (isTyping) {
                    feedback.innerText = "Nenhum contato encontrado para este termo.";
                    feedback.className = "text-xs mt-1 text-slate-400 font-medium";
                    feedback.classList.remove('hidden');
                } else {
                    feedback.innerText = "Nenhum contato encontrado.";
                    feedback.className = "text-xs mt-1 text-rose-500 font-medium";
                    feedback.classList.remove('hidden');
                    this.onResultCallback(null);
                }
            } else if (contacts.length === 1) {
                this.hideDropdown();
                const c = contacts[0];
                feedback.innerText = "Contato encontrado: " + c.nome;
                feedback.className = "text-xs mt-1 text-emerald-600 font-medium";
                feedback.classList.remove('hidden');
                this.onResultCallback(c);
            } else {
                feedback.innerText = contacts.length + " contatos encontrados. Selecione um:";
                feedback.className = "text-xs mt-1 text-slate-500 font-medium";
                feedback.classList.remove('hidden');
                this.showDropdown(contacts);
            }
        } catch(e) {
            if (!isTyping) App.UI.Loader.hide();
            this.hideDropdown();
            feedback.innerText = "Erro na busca.";
            feedback.className = "text-xs mt-1 text-rose-500 font-medium";
        }
    },

    showDropdown: function(contacts) {
        this.currentResults = contacts;
        this.highlightedIndex = -1;
        const dropdown = document.getElementById('cs-dropdown');
        let html = '';
        contacts.forEach((c, idx) => {
            html += `
                <div class="cs-item p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0" onclick="App.UI.ContactSearch.selectContact(${idx})">
                    <p class="text-sm font-bold text-slate-800">${c.nome}</p>
                    <p class="text-xs text-slate-500">${c.bairro || 'Sem bairro'} | Tel: ${c.telefone || 'N/A'}</p>
                </div>
            `;
        });
        dropdown.innerHTML = html;
        dropdown.classList.remove('hidden');
        this.dropdownVisible = true;
    },

    hideDropdown: function() {
        const dropdown = document.getElementById('cs-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
        this.dropdownVisible = false;
        this.highlightedIndex = -1;
    },

    selectContact: function(index) {
        const c = this.currentResults[index];
        if (!c) return;
        
        document.getElementById('cs-input').value = c.nome;
        const feedback = document.getElementById('cs-feedback');
        feedback.innerText = "Contato selecionado: " + c.nome;
        feedback.className = "text-xs mt-1 text-emerald-600 font-medium";
        
        this.hideDropdown();
        this.onResultCallback(c);
    },

    clear: function() {
        if (!this.container) return;
        const input = document.getElementById('cs-input');
        if (input) input.value = '';
        const feedback = document.getElementById('cs-feedback');
        if(feedback) feedback.classList.add('hidden');
        this.hideDropdown();
    },
    
    getInputValue: function() {
        const input = document.getElementById('cs-input');
        return input ? input.value : '';
    }
};

// ==========================================
// COMPONENTE: CONTACT FORM (Formulário Reutilizável)
// [E2/S1-a] Campo único "Telefone ou Nome": aceita termo numérico (telefone,
// fluxo original com estado "Novo") ou textual (nome — carrega contato único,
// múltiplos exigem refinamento, zero resultados orientam a usar telefone).
// ==========================================
App.UI.ContactForm = {
    container: null,
    onSaveCallback: null,
    onCancelCallback: null,
    canEdit: false,
    userTeam: "",
    funcoesList: [],
    saveButtonText: "Salvar Contato",
    lockTeam: true,

    init: function(containerSelector, config) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;
        
        this.onSaveCallback = config.onSaveSuccess || function(){};
        this.onCancelCallback = config.onCancel || null;
        this.funcoesList = config.funcoes || [];
        this.saveButtonText = config.saveButtonText || "Salvar Contato";
        this.canEdit = config.canEdit !== undefined ? config.canEdit : App.Core.Security.canEditContact();
        this.lockTeam = config.lockTeam !== undefined ? config.lockTeam : true;

        if (currentSession && currentSession.teams && this.lockTeam) {
            const validTeams = currentSession.teams.filter(t => t !== 'TODAS');
            if (validTeams.length === 1) {
                this.userTeam = validTeams[0];
            }
        }

        let bairrosOptions = '';
        if (typeof geoDicionario !== 'undefined' && geoDicionario) {
            bairrosOptions = Object.values(geoDicionario).map(b => `<option value="${b.nomeOriginal}">`).join('');
        }

        const funcoesOptions = this.funcoesList.map(f => `<option value="${f}">${f}</option>`).join('');

        let equipesCheckboxesHTML = '<div class="p-2 space-y-1">';
        if (window.dictsGlobal && window.dictsGlobal.equipes) {
            window.dictsGlobal.equipes.forEach(e => {
                equipesCheckboxesHTML += `
                    <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 cursor-pointer rounded-lg transition-colors">
                        <input type="checkbox" value="${e.nome}" class="form-equipe-cb rounded text-indigo-600 focus:ring-indigo-500" onchange="App.UI.ContactForm.updateEquipeSelection()">
                        <span class="text-sm text-slate-700">${e.nome}</span>
                    </label>
                `;
            });
        } else {
            equipesCheckboxesHTML = '<p class="p-3 text-xs text-slate-400">Nenhuma equipe cadastrada.</p>';
        }
        equipesCheckboxesHTML += '</div>';

        this.container.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                    <h3 class="text-lg font-bold text-slate-800">Dados do Contato</h3>
                    <div id="form-status-badge" class="hidden px-3 py-1 rounded-full text-xs font-bold"></div>
                </div>

                <div class="space-y-4">
                    <div>
                        <!-- [E2/S1-a] Campo único: Telefone OU Nome -->
                        <label class="block text-xs font-bold text-slate-500 mb-1">Telefone ou Nome <span class="text-rose-500">*</span></label>
                        <div class="flex gap-2">
                            <input type="text" id="form-phone" class="flex-1 min-w-0 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Telefone (com DDD) ou Nome completo">
                            <button id="form-search-btn" onclick="App.UI.ContactForm.lookupPhone();" class="w-12 h-12 flex-shrink-0 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center" title="Buscar Contato">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </button>
                            <button id="form-clear-btn" onclick="App.UI.ContactForm.clear();" class="hidden w-12 h-12 flex-shrink-0 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center" title="Limpar Campos">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Nome <span class="text-rose-500">*</span></label>
                            <input type="text" id="form-nome" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nome Completo">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Bairro <span class="text-rose-500">*</span></label>
                            <input type="text" id="form-bairro" list="form-bairros-list" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Digite ou selecione">
                            <datalist id="form-bairros-list">${bairrosOptions}</datalist>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Função</label>
                            <select id="form-funcao" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                                <option value="">Selecione...</option>
                                ${funcoesOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Referência</label>
                            <input type="text" id="form-ref" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Referência">
                        </div>
                    </div>

                    <div class="relative">
                        <label class="block text-xs font-bold text-slate-500 mb-1">Equipe</label>
                        <div id="form-equipe-btn" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-left flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-colors ${this.userTeam ? 'bg-slate-100 cursor-not-allowed' : ''}" onclick="App.UI.ContactForm.toggleEquipeDropdown()">
                            <span id="form-equipe-text" class="text-sm text-slate-800 truncate">Selecione...</span>
                            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                        <div id="form-equipe-dropdown" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-20">
                            ${equipesCheckboxesHTML}
                        </div>
                        <input type="hidden" id="form-equipe-hidden" value="">
                    </div>

                    <input type="hidden" id="form-id" value="">

                    <div class="pt-4 flex gap-2">
                        <button id="form-save-btn" onclick="App.UI.ContactForm.save();" class="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-base hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                            <span id="form-save-text">${this.saveButtonText}</span>
                        </button>
                        <button id="form-cancel-btn" onclick="App.UI.ContactForm.cancel();" class="w-24 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-base hover:bg-slate-300 transition-colors shadow-sm">
                            Sair
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.applyTeamLockState();
    },

    toggleEquipeDropdown: function() {
        if (this.userTeam && this.lockTeam) return;
        
        let dd = document.getElementById('form-equipe-dropdown');
        if (!dd) return;

        if (dd.classList.contains('hidden')) {
            dd.classList.remove('hidden');
            let overlay = document.createElement('div');
            overlay.id = 'form-equipe-overlay';
            overlay.className = 'fixed inset-0 z-[15]';
            overlay.onclick = () => { dd.classList.add('hidden'); overlay.remove(); };
            document.body.appendChild(overlay);
            dd.classList.add('z-20');
        } else {
            dd.classList.add('hidden');
            let ov = document.getElementById('form-equipe-overlay');
            if (ov) ov.remove();
        }
    },

    updateEquipeSelection: function() {
        let selected = [];
        this.container.querySelectorAll('.form-equipe-cb:checked').forEach(cb => selected.push(cb.value));
        let hidden = document.getElementById('form-equipe-hidden');
        let text = document.getElementById('form-equipe-text');
        
        hidden.value = selected.join(', ');
        text.innerText = selected.length > 0 ? selected.join(', ') : 'Selecione...';
    },

    applyTeamLockState: function() {
        let btn = document.getElementById('form-equipe-btn');
        let text = document.getElementById('form-equipe-text');
        let hidden = document.getElementById('form-equipe-hidden');
        
        if (this.userTeam && this.lockTeam) {
            hidden.value = this.userTeam;
            text.innerText = this.userTeam;
            
            this.container.querySelectorAll('.form-equipe-cb').forEach(cb => {
                let cbVal = cb.value.toString().toUpperCase().trim();
                let userVal = this.userTeam.toString().toUpperCase().trim();
                
                if (cbVal === userVal) {
                    cb.checked = true;
                    cb.disabled = true;
                    cb.parentElement.classList.add('bg-slate-100', 'cursor-not-allowed');
                } else {
                    cb.checked = false;
                    cb.disabled = true;
                    cb.parentElement.classList.add('hidden');
                }
            });
        } else {
            this.container.querySelectorAll('.form-equipe-cb').forEach(cb => {
                cb.disabled = false;
                cb.parentElement.classList.remove('bg-slate-100', 'cursor-not-allowed', 'hidden');
            });
        }
    },

    // [E2/S1-a] Método unificado: detecta Telefone ou Nome no campo único
    lookupPhone: async function() {
        const rawValue = this.container.querySelector('#form-phone').value.trim();
        if (!rawValue) return;

        const badgeEl = this.container.querySelector('#form-status-badge');
        const saveText = this.container.querySelector('#form-save-text');
        const saveBtn = this.container.querySelector('#form-save-btn');
        const searchBtn = this.container.querySelector('#form-search-btn');
        const clearBtn = this.container.querySelector('#form-clear-btn');
        const phoneInput = this.container.querySelector('#form-phone');

        // [E2/S1-a] Detecção de tipo: termo numérico = Telefone, textual = Nome
        const cleanDigits = rawValue.replace(/\s|\(|\)|-/g, '');
        const isPhone = /^\d+$/.test(cleanDigits);

        const phone = isPhone ? App.Core.Utils.formatPhone(rawValue) : "";
        if (isPhone && (!phone || phone.length < 10)) return;

        searchBtn.classList.add('hidden');
        clearBtn.classList.remove('hidden');

        badgeEl.innerText = "Buscando...";
        badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 animate-pulse";
        badgeEl.classList.remove('hidden');

        App.UI.Loader.show();

        // [E2/S1-a] type: 'phone' ou 'name' conforme o termo digitado
        const payload = isPhone
            ? { action: 'lookupContact', term: phone, type: 'phone' }
            : { action: 'lookupContact', term: rawValue, type: 'name' };

        try {
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject('Erro');
                });
            });

            App.UI.Loader.hide();

            const contacts = res.contacts || [];

            // [E2/S1-a] Nome com múltiplos resultados: não carrega — exige refinamento
            // (o formulário não possui dropdown; listar aqui seria duplicar o ContactSearch)
            if (!isPhone && contacts.length > 1) {
                badgeEl.innerText = contacts.length + " contatos com este nome — refine ou busque por telefone.";
                badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700";
                badgeEl.classList.remove('hidden');
                return;
            }

            // [E2/S1-a] Nome sem resultados: NÃO libera estado "Novo" (campo contém texto,
            // não telefone — salvar corromperia o dado). Orienta o usuário.
            if (!isPhone && contacts.length === 0) {
                badgeEl.innerText = "Nenhum contato com este nome. Para cadastrar novo, informe o telefone.";
                badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600";
                badgeEl.classList.remove('hidden');
                return;
            }

            const contact = contacts.length > 0 ? contacts[0] : null;

            if (contact) {
                this.container.querySelector('#form-id').value = contact.id || "";
                this.container.querySelector('#form-nome').value = contact.nome || "";
                this.container.querySelector('#form-bairro').value = contact.bairro || "";
                this.container.querySelector('#form-ref').value = contact.ref || "";
                
                // [E2/S1-a] Busca por nome: substitui o termo pelo telefone real do contato,
                // garantindo que o salvar grave o telefone (não o termo textual digitado)
                if (!isPhone) {
                    phoneInput.value = contact.telefone || "";
                }
                
                let equipeStr = contact.equipe || this.userTeam || "";
                let teamsArr = equipeStr.split(',').map(t => t.trim().toUpperCase());
                
                this.container.querySelectorAll('.form-equipe-cb').forEach(cb => {
                    let cbVal = cb.value.toString().toUpperCase().trim();
                    cb.checked = teamsArr.includes(cbVal);
                });
                this.updateEquipeSelection();
                
                const funcaoSelect = this.container.querySelector('#form-funcao');
                let funcaoExists = false;
                for(let i=0; i<funcaoSelect.options.length; i++) {
                    if(funcaoSelect.options[i].value === contact.funcao) {
                        funcaoSelect.value = contact.funcao;
                        funcaoExists = true;
                        break;
                    }
                }
                if(!funcaoExists && contact.funcao) {
                    let newOpt = document.createElement('option');
                    newOpt.value = contact.funcao;
                    newOpt.innerText = contact.funcao;
                    funcaoSelect.appendChild(newOpt);
                    funcaoSelect.value = contact.funcao;
                }

                if (this.canEdit) {
                    badgeEl.innerText = "Existente";
                    badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700";
                    badgeEl.classList.remove('hidden');
                    
                    saveText.innerText = this.saveButtonText;
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('opacity-50');
                } else {
                    badgeEl.innerText = "Bloqueado";
                    badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700";
                    badgeEl.classList.remove('hidden');
                    
                    saveText.innerText = "Contato Existente";
                    saveBtn.disabled = true;
                    saveBtn.classList.add('opacity-50');
                    
                    ['form-nome', 'form-bairro', 'form-ref', 'form-funcao'].forEach(id => {
                        const el = this.container.querySelector('#' + id);
                        if(el) el.disabled = true;
                    });
                    this.container.querySelector('#form-equipe-btn').classList.add('opacity-50', 'pointer-events-none');
                }
            } else {
                this.clear(true);
                this.container.querySelector('#form-phone').value = rawValue;
                
                searchBtn.classList.add('hidden');
                clearBtn.classList.remove('hidden');

                badgeEl.innerText = "Novo";
                badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700";
                badgeEl.classList.remove('hidden');
                
                saveText.innerText = this.saveButtonText;
                saveBtn.disabled = false;
                saveBtn.classList.remove('opacity-50');
            }
        } catch (err) {
            App.UI.Loader.hide();
            badgeEl.innerText = "Erro na busca";
            badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700";
        }
    },

    save: async function() {
        const id = this.container.querySelector('#form-id').value;
        const nome = this.container.querySelector('#form-nome').value.trim();
        const bairro = this.container.querySelector('#form-bairro').value.trim();
        const phone = this.container.querySelector('#form-phone').value.trim();
        const ref = this.container.querySelector('#form-ref').value.trim();
        const equipe = this.container.querySelector('#form-equipe-hidden').value.trim();
        const funcao = this.container.querySelector('#form-funcao').value.trim();

        if (!nome || !bairro || !phone) {
            alert("Nome, Bairro e Telefone são obrigatórios.");
            return;
        }

        // [E2/S1-a] Guard de integridade do campo único: o campo Telefone-ou-Nome pode
        // conter um termo textual (busca por nome sem seleção). O telefone gravado precisa
        // ser numérico — bloqueia salvar texto como telefone.
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 8) {
            alert("O campo Telefone/Nome contém um termo inválido. Informe o telefone do contato (com DDD) para salvar.");
            return;
        }

        const btn = this.container.querySelector('#form-save-btn');
        btn.disabled = true;
        btn.classList.add('opacity-50');
        this.container.querySelector('#form-save-text').innerText = "Salvando...";

        App.UI.Loader.show();

        const coords = await App.Core.Utils.getLocation();
        const userId = App.Core.Security.getUserId();

        const payload = {
            action: id ? 'updateContact' : 'createContact',
            id: id,
            nome: nome, bairro: bairro, telefone: phone, ref: ref, equipe: equipe, funcao: funcao,
            lat: coords.lat,
            lng: coords.lng,
            userId: userId
        };

        try {
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Erro ao salvar.');
                });
            });
            
            App.UI.Loader.hide();

            if (!id && res.newId) {
                this.container.querySelector('#form-id').value = res.newId;
            }

            App.UI.SuccessToast.show(1500);

            this.onSaveCallback({ id: this.container.querySelector('#form-id').value, nome, bairro, phone, ref, equipe, funcao });

            setTimeout(() => {
                this.clear();
            }, 1500);

        } catch (err) {
            App.UI.Loader.hide();
            alert("Erro: " + err);
            btn.disabled = false;
            btn.classList.remove('opacity-50');
            this.container.querySelector('#form-save-text').innerText = id ? "Atualizar Contato" : "Cadastrar Contato";
        }
    },

    cancel: function() {
        this.clear();
        if (this.onCancelCallback) this.onCancelCallback();
    },

    clear: function(keepPhone = false) {
        const phoneVal = keepPhone ? this.container.querySelector('#form-phone').value : '';
        this.container.querySelector('#form-id').value = "";
        this.container.querySelector('#form-nome').value = "";
        this.container.querySelector('#form-bairro').value = "";
        this.container.querySelector('#form-ref').value = "";
        this.container.querySelector('#form-funcao').value = "";
        
        this.container.querySelectorAll('.form-equipe-cb').forEach(cb => {
            cb.checked = false;
            cb.disabled = false;
            cb.parentElement.classList.remove('bg-slate-100', 'cursor-not-allowed', 'hidden');
        });
        this.applyTeamLockState();
        
        this.container.querySelector('#form-phone').value = phoneVal;
        
        ['form-nome', 'form-bairro', 'form-ref', 'form-funcao'].forEach(id => {
            const el = this.container.querySelector('#' + id);
            if(el) el.disabled = false;
        });
        
        const eqBtn = this.container.querySelector('#form-equipe-btn');
        if(eqBtn) eqBtn.classList.remove('opacity-50', 'pointer-events-none');
        
        this.container.querySelector('#form-status-badge').classList.add('hidden');
        this.container.querySelector('#form-status-badge').innerText = "";
        
        const searchBtn = this.container.querySelector('#form-search-btn');
        const clearBtn = this.container.querySelector('#form-clear-btn');
        if(searchBtn) searchBtn.classList.remove('hidden');
        if(clearBtn) clearBtn.classList.add('hidden');
        
        const btn = this.container.querySelector('#form-save-btn');
        if(btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50');
            btn.querySelector('#form-save-text').innerText = this.saveButtonText;
        }
    }
};

// ==========================================
// COMPONENTE: HIERARCHY BUILDER (Construtor e Visualizador de Árvore Hierárquica)
// [E2/S3] Refatorado com busca única (App.UI.ContactSearch) + conceito de ALVO DE INSERÇÃO:
// 1. Clicar no "+" de um nó define o alvo ("adicionando sob X", destacado em indigo).
// 2. Sem alvo, o contato é inserido na RAIZ da estrutura.
// 3. Selecionar contato na busca habilita o botão "Adicionar" (com o papel do select).
// API pública preservada: init / getJson / loadJson / renderReadOnlyHtml.
// ==========================================
App.UI.HierarchyBuilder = {
    container: null,
    tree: [],
    selectedContact: null,   // contato selecionado via ContactSearch
    insertionTarget: null,   // node.id do alvo de inserção, ou null (raiz)

    init: function(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.tree = [];
        this.selectedContact = null;
        this.insertionTarget = null;
        this.renderShell();
    },

    // Monta o shell persistente (busca + controles). A árvore é renderizada à parte
    // (renderTree) para não destruir a instância do ContactSearch a cada mudança.
    renderShell: function() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="border-t border-slate-200 pt-3 mt-3">
                <h4 class="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Estrutura Hierárquica</h4>
                <div id="hier-search-container" class="mb-2"></div>
                <div class="flex gap-2 mb-2">
                    <select id="hier-role" class="flex-1 min-w-0 px-2 py-2 border border-slate-300 rounded text-xs bg-white">
                        <option value="Coord. Geral">Coord. Geral</option>
                        <option value="Coord. Área">Coord. Área</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Mobilizador">Mobilizador</option>
                    </select>
                    <button onclick="App.UI.HierarchyBuilder.addSelectedNode()" id="hier-add-btn" class="flex-shrink-0 px-3 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded disabled:opacity-50 transition-colors" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span class="ml-1">Adicionar</span>
                    </button>
                </div>
                <p id="hier-target-info" class="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-2">
                    <span>Inserindo: <span id="hier-target-label" class="text-indigo-600">Raiz da estrutura</span></span>
                    <button id="hier-target-reset" class="hidden text-slate-400 underline hover:text-slate-600" onclick="App.UI.HierarchyBuilder.clearInsertionTarget()">cancelar alvo</button>
                </p>
                <div id="hier-tree-view" class="space-y-2">
                    ${this.renderNodes(this.tree, 0)}
                </div>
            </div>
        `;

        // [E2/S3] Busca por Nome ou Telefone (substitui os inputs de telefone/ID)
        App.UI.ContactSearch.init('#hier-search-container', {
            onResult: (contact) => {
                this.selectedContact = contact;
                const btn = document.getElementById('hier-add-btn');
                if (btn) btn.disabled = !contact;
            }
        });

        const csInput = document.getElementById('cs-input');
        if (csInput) csInput.placeholder = "Buscar contato por Nome ou Telefone...";
    },

    // Renderiza apenas a árvore — preserva a busca e os controles do shell
    renderTree: function() {
        if (!this.container) return;
        const view = this.container.querySelector('#hier-tree-view');
        if (!view) return;
        view.innerHTML = this.renderNodes(this.tree, 0);
        this.updateTargetUI();
    },

    renderNodes: function(nodes, level) {
        let html = '';
        if (!nodes || nodes.length === 0) return html;

        let groups = {};
        nodes.forEach(node => {
            if (!groups[node.tipo]) groups[node.tipo] = [];
            groups[node.tipo].push(node);
        });

        for (let tipo in groups) {
            html += `
                <div style="margin-left: ${level * 20}px;" class="flex flex-col gap-1 mt-2">
                    <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">${tipo}:</span>
                    <div class="flex flex-col gap-2 pl-3 border-l-2 border-slate-200">
            `;
            
            groups[tipo].forEach(node => {
                let name = window.contatosBase && window.contatosBase[node.id] ? window.contatosBase[node.id].nome : node.id;
                // [E2/S3] Nó-alvo destacado (anel indigo) para indicar onde o próximo contato será inserido
                let isTarget = this.insertionTarget === node.id;
                let targetClass = isTarget ? 'ring-2 ring-indigo-400 bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200';
                
                html += `
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2 ${targetClass} p-1.5 rounded border transition-colors">
                            <span class="text-xs font-bold text-slate-800 flex-1 min-w-0 truncate">${name}</span>
                            <button onclick="App.UI.HierarchyBuilder.setInsertionTarget('${node.id}')" class="flex-shrink-0 text-indigo-500 hover:text-indigo-700 transition-colors p-1 rounded hover:bg-indigo-100" title="Adicionar subordinado sob este contato">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <button onclick="App.UI.HierarchyBuilder.removeNode('${node.id}')" class="flex-shrink-0 text-rose-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50" title="Remover">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        ${node.filhos && node.filhos.length > 0 ? this.renderNodes(node.filhos, level + 1) : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        return html;
    },

    // [E2/S3] Define o alvo de inserção e destaca o nó na árvore
    setInsertionTarget: function(nodeId) {
        this.insertionTarget = nodeId;
        this.renderTree();
    },

    // [E2/S3] Volta a inserir na raiz
    clearInsertionTarget: function() {
        this.insertionTarget = null;
        this.renderTree();
    },

    updateTargetUI: function() {
        const label = document.getElementById('hier-target-label');
        const resetBtn = document.getElementById('hier-target-reset');
        if (!label) return;
        if (this.insertionTarget) {
            let name = window.contatosBase && window.contatosBase[this.insertionTarget] ? window.contatosBase[this.insertionTarget].nome : this.insertionTarget;
            label.innerText = 'Sob ' + name;
            if (resetBtn) resetBtn.classList.remove('hidden');
        } else {
            label.innerText = 'Raiz da estrutura';
            if (resetBtn) resetBtn.classList.add('hidden');
        }
    },

    // [E2/S3] Insere o contato selecionado na busca, sob o alvo (ou na raiz)
    addSelectedNode: function() {
        if (!this.selectedContact) return;
        let role = document.getElementById('hier-role') ? document.getElementById('hier-role').value : 'Mobilizador';

        if (this.insertionTarget) {
            let parent = this.findNode(this.tree, this.insertionTarget);
            if (parent) {
                parent.filhos.push({ id: this.selectedContact.id, tipo: role, filhos: [] });
            } else {
                // Alvo não encontrado (nó foi removido): cai para a raiz
                this.tree.push({ id: this.selectedContact.id, tipo: role, filhos: [] });
                this.insertionTarget = null;
            }
        } else {
            this.tree.push({ id: this.selectedContact.id, tipo: role, filhos: [] });
        }

        // Reseta a seleção para a próxima inserção
        this.selectedContact = null;
        App.UI.ContactSearch.clear();
        const btn = document.getElementById('hier-add-btn');
        if (btn) btn.disabled = true;
        this.renderTree();
    },

    removeNode: function(nodeId) {
        let removeRecursive = (nodes) => {
            return nodes.filter(node => {
                if (node.id === nodeId) return false;
                if (node.filhos) node.filhos = removeRecursive(node.filhos);
                return true;
            });
        };
        this.tree = removeRecursive(this.tree);
        // [E2/S3] Se o nó removido era o alvo, volta a inserir na raiz
        if (this.insertionTarget === nodeId) this.insertionTarget = null;
        this.renderTree();
    },

    findNode: function(nodes, id) {
        for (let node of nodes) {
            if (node.id === id) return node;
            if (node.filhos) {
                let found = this.findNode(node.filhos, id);
                if (found) return found;
            }
        }
        return null;
    },

    getJson: function() {
        return JSON.stringify(this.tree);
    },

    loadJson: function(jsonStr) {
        try {
            this.tree = JSON.parse(jsonStr);
        } catch (e) {
            this.tree = [];
        }
        this.renderTree();
    },

    renderReadOnlyHtml: function(jsonStr, presencasMap) {
        let tree = [];
        try {
            tree = JSON.parse(jsonStr);
        } catch (e) {
            tree = [];
        }
        return this.renderReadOnlyNodes(tree, 0, presencasMap);
    },

    renderReadOnlyNodes: function(nodes, level, presencasMap) {
        let html = '';
        if (!nodes || nodes.length === 0) return html;

        let groups = {};
        nodes.forEach(node => {
            if (!groups[node.tipo]) groups[node.tipo] = [];
            groups[node.tipo].push(node);
        });

        for (let tipo in groups) {
            html += `
                <div style="margin-left: ${level * 20}px;" class="flex flex-col gap-1 mt-2">
                    <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">${tipo}:</span>
                    <div class="flex flex-col gap-2 pl-3 border-l-2 border-slate-200">
            `;
            
            groups[tipo].forEach(node => {
                let name = window.contatosBase && window.contatosBase[node.id] ? window.contatosBase[node.id].nome : node.id;
                let presHTML = '';
                let tipoLower = (node.tipo || "").toLowerCase();
                
                if (tipoLower.includes("mob") && presencasMap && presencasMap[node.id]) {
                    let presIds = presencasMap[node.id];
                    let pPresencaHTML = presIds.map(id => {
                        const c = window.contatosBase[id];
                        return c ? `<span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${c.nome}</span>` : '';
                    }).join('');
                    
                    presHTML = `
                        <div class="flex gap-2 mt-1 ml-2 items-start">
                            <span class="font-bold w-20 text-slate-400 text-[10px] mt-0.5">Presentes (${presIds.length}):</span>
                            <div class="flex-1 flex flex-wrap">${pPresencaHTML}</div>
                        </div>
                    `;
                }
                
                html += `
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                            <span class="text-xs font-bold text-slate-800 flex-1 min-w-0 truncate">${name}</span>
                        </div>
                        ${presHTML}
                        ${node.filhos && node.filhos.length > 0 ? this.renderReadOnlyNodes(node.filhos, level + 1, presencasMap) : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        return html;
    }
};