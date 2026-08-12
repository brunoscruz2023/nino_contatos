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
// COMPONENTE: CONTACT FORM (Formulário Reutilizável)
// ==========================================
App.UI.ContactForm = {
    container: null,
    onSaveCallback: null,
    onCancelCallback: null,
    canEdit: false,
    userTeam: "",
    funcoesList: [],
    saveButtonText: "Salvar Contato",

    init: function(containerSelector, config) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;
        
        this.onSaveCallback = config.onSaveSuccess || function(){};
        this.onCancelCallback = config.onCancel || null;
        this.funcoesList = config.funcoes || [];
        this.saveButtonText = config.saveButtonText || "Salvar Contato";
        this.canEdit = config.canEdit !== undefined ? config.canEdit : App.Core.Security.canEditContact();

        if (currentSession && currentSession.teams) {
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

        let equipesOptions = '<option value="">Selecione...</option>';
        if (window.dictsGlobal && window.dictsGlobal.equipes) {
            window.dictsGlobal.equipes.forEach(e => {
                equipesOptions += `<option value="${e.nome}" ${this.userTeam === e.nome ? 'selected' : ''}>${e.nome}</option>`;
            });
        }

        this.container.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                    <h3 class="text-lg font-bold text-slate-800">Dados do Contato</h3>
                    <div id="form-status-badge" class="hidden px-3 py-1 rounded-full text-xs font-bold"></div>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Telefone <span class="text-rose-500">*</span></label>
                        <div class="flex gap-2">
                            <input type="tel" id="form-phone" class="flex-1 min-w-0 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="(21) 99999-9999">
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

                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Equipe</label>
                        <select id="form-equipe" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${this.userTeam ? 'bg-slate-100 cursor-not-allowed' : ''}" ${this.userTeam ? 'disabled' : ''}>
                            ${equipesOptions}
                        </select>
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
    },

    lookupPhone: async function() {
        const rawPhone = this.container.querySelector('#form-phone').value;
        const phone = App.Core.Utils.formatPhone(rawPhone);
        if (!phone || phone.length < 10) return;

        const badgeEl = this.container.querySelector('#form-status-badge');
        const saveText = this.container.querySelector('#form-save-text');
        const saveBtn = this.container.querySelector('#form-save-btn');
        const searchBtn = this.container.querySelector('#form-search-btn');
        const clearBtn = this.container.querySelector('#form-clear-btn');

        searchBtn.classList.add('hidden');
        clearBtn.classList.remove('hidden');

        badgeEl.innerText = "Buscando...";
        badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 animate-pulse";
        badgeEl.classList.remove('hidden');

        App.UI.Loader.show();

        const payload = { action: 'lookupContactByPhone', phone: phone };
        try {
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject('Erro');
                });
            });

            App.UI.Loader.hide();

            if (res.contact) {
                this.container.querySelector('#form-id').value = res.contact.id || "";
                this.container.querySelector('#form-nome').value = res.contact.nome || "";
                this.container.querySelector('#form-bairro').value = res.contact.bairro || "";
                this.container.querySelector('#form-ref').value = res.contact.ref || "";
                this.container.querySelector('#form-equipe').value = res.contact.equipe || this.userTeam;
                
                const funcaoSelect = this.container.querySelector('#form-funcao');
                let funcaoExists = false;
                for(let i=0; i<funcaoSelect.options.length; i++) {
                    if(funcaoSelect.options[i].value === res.contact.funcao) {
                        funcaoSelect.value = res.contact.funcao;
                        funcaoExists = true;
                        break;
                    }
                }
                if(!funcaoExists && res.contact.funcao) {
                    let newOpt = document.createElement('option');
                    newOpt.value = res.contact.funcao;
                    newOpt.innerText = res.contact.funcao;
                    funcaoSelect.appendChild(newOpt);
                    funcaoSelect.value = res.contact.funcao;
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
                    
                    ['form-nome', 'form-bairro', 'form-ref', 'form-equipe', 'form-funcao'].forEach(id => {
                        const el = this.container.querySelector('#' + id);
                        if(el) el.disabled = true;
                    });
                }
            } else {
                this.clear(true);
                this.container.querySelector('#form-phone').value = rawPhone;
                
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
        const equipe = this.container.querySelector('#form-equipe').value.trim();
        const funcao = this.container.querySelector('#form-funcao').value.trim();

        if (!nome || !bairro || !phone) {
            alert("Nome, Bairro e Telefone são obrigatórios.");
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
        
        this.container.querySelector('#form-equipe').value = this.userTeam || "";
        this.container.querySelector('#form-phone').value = phoneVal;
        
        ['form-nome', 'form-bairro', 'form-ref', 'form-equipe', 'form-funcao'].forEach(id => {
            const el = this.container.querySelector('#' + id);
            if(el) {
                el.disabled = false;
                if(id === 'form-equipe' && this.userTeam) el.disabled = true;
            }
        });
        
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
// ==========================================
App.UI.HierarchyBuilder = {
    container: null,
    tree: [],
    tempContact: null,
    tempChild: { parentId: null, contact: null },

    init: function(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.tree = [];
        this.tempContact = null;
        this.tempChild = { parentId: null, contact: null };
        this.render();
    },

    render: function() {
        if (!this.container) return;
        let html = `
            <div class="border-t border-slate-200 pt-3 mt-3">
                <h4 class="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Estrutura Hierárquica</h4>
                <div class="flex gap-2 mb-3">
                    <input type="text" id="hier-search" class="flex-1 min-w-0 px-2 py-1.5 border border-slate-300 rounded text-xs transition-colors" placeholder="Telefone ou ID (raiz)..." oninput="this.classList.remove('border-emerald-500','bg-emerald-50','border-rose-300','bg-rose-50'); App.UI.HierarchyBuilder.handleSearch(this.value, 'root')">
                    <select id="hier-role" class="px-2 py-1 border border-slate-300 rounded text-xs bg-white flex-shrink-0">
                        <option value="Coord. Geral">Coord. Geral</option>
                        <option value="Coord. Área">Coord. Área</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Mobilizador">Mobilizador</option>
                    </select>
                    <button onclick="App.UI.HierarchyBuilder.addRootNode()" id="hier-add-btn" class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded disabled:opacity-50 transition-colors" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
                <div id="hier-tree-view" class="space-y-2">
                    ${this.renderNodes(this.tree, 0)}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
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
                
                html += `
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                            <span class="text-xs font-bold text-slate-800 flex-1 min-w-0 truncate">${name}</span>
                            <button onclick="App.UI.HierarchyBuilder.openAddChild('${node.id}')" class="flex-shrink-0 text-indigo-500 hover:text-indigo-700 transition-colors p-1 rounded hover:bg-indigo-50" title="Adicionar Subordinado">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <button onclick="App.UI.HierarchyBuilder.removeNode('${node.id}')" class="flex-shrink-0 text-rose-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50" title="Remover">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div id="child-form-${node.id}" class="hidden flex gap-1 mt-1 mb-2 p-2 bg-slate-100 rounded">
                            <input type="text" id="child-input-${node.id}" class="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-xs transition-colors" placeholder="Telefone ou ID..." oninput="this.classList.remove('border-emerald-500','bg-emerald-50','border-rose-300','bg-rose-50'); App.UI.HierarchyBuilder.handleSearch(this.value, 'child', '${node.id}')">
                            <select id="child-role-${node.id}" class="px-2 py-1 border border-slate-300 rounded text-xs bg-white flex-shrink-0">
                                <option value="Coord. Área">Coord. Área</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Mobilizador">Mobilizador</option>
                            </select>
                            <button onclick="App.UI.HierarchyBuilder.addChildNode('${node.id}')" id="child-add-${node.id}" class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded disabled:opacity-50 transition-colors" disabled>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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

    handleSearch: function(query, type, parentId = null) {
        let formattedPhone = App.Core.Utils.formatPhone(query);
        let queryUpper = query.trim().toUpperCase();
        let btnId = type === 'root' ? 'hier-add-btn' : `child-add-${parentId}`;
        let inputId = type === 'root' ? 'hier-search' : `child-input-${parentId}`;
        let btn = document.getElementById(btnId);
        let inputEl = document.getElementById(inputId);
        
        if (!query) {
            if (type === 'root') this.tempContact = null;
            else this.tempChild = { parentId, contact: null };
            if(btn) btn.disabled = true;
            if(inputEl) inputEl.classList.remove('border-emerald-500', 'bg-emerald-50', 'border-rose-300', 'bg-rose-50');
            return;
        }

        let found = null;
        for (let id in window.contatosBase) {
            if (window.contatosBase[id].telefone === formattedPhone || id === queryUpper) {
                found = { id: id, ...window.contatosBase[id] };
                break;
            }
        }

        if (found) {
            if (type === 'root') this.tempContact = found;
            else this.tempChild = { parentId, contact: found };
            if(btn) btn.disabled = false;
            if(inputEl) {
                inputEl.classList.remove('border-rose-300', 'bg-rose-50');
                inputEl.classList.add('border-emerald-500', 'bg-emerald-50');
            }
        } else {
            if (type === 'root') this.tempContact = null;
            else this.tempChild = { parentId, contact: null };
            if(btn) btn.disabled = true;
            if(inputEl) {
                inputEl.classList.remove('border-emerald-500', 'bg-emerald-50');
                inputEl.classList.add('border-rose-300', 'bg-rose-50');
            }
        }
    },

    addRootNode: function() {
        if (!this.tempContact) return;
        let role = document.getElementById('hier-role').value;
        this.tree.push({ id: this.tempContact.id, tipo: role, filhos: [] });
        this.tempContact = null;
        this.render();
    },

    openAddChild: function(parentId) {
        document.querySelectorAll('[id^="child-form-"]').forEach(div => div.classList.add('hidden'));
        let form = document.getElementById(`child-form-${parentId}`);
        if (form) {
            form.classList.remove('hidden');
            form.querySelector('input').focus();
        }
    },

    addChildNode: function(parentId) {
        if (!this.tempChild || !this.tempChild.contact) return;
        let role = document.getElementById(`child-role-${parentId}`).value;
        let parent = this.findNode(this.tree, parentId);
        if (parent) {
            parent.filhos.push({ id: this.tempChild.contact.id, tipo: role, filhos: [] });
        }
        this.tempChild = { parentId: null, contact: null };
        this.render();
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
        this.render();
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
        this.render();
    },

    // ==========================================
    // MÉTODO DE VISUALIZAÇÃO (Somente Leitura)
    // ==========================================
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