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
// COMPONENTE: CONTACT FORM (Formulário Reutilizável)
// ==========================================
App.UI.ContactForm = {
    container: null,
    onSaveCallback: null,
    canEdit: false,
    userTeam: "",
    funcoesList: [],

    init: function(containerSelector, config) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;
        
        this.onSaveCallback = config.onSaveSuccess || function(){};
        this.funcoesList = config.funcoes || [];
        
        // Ajuste para ler a permissão diretamente do novo RBAC
        this.canEdit = App.Core.Security.canEditContact();

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
                            <input type="tel" id="form-phone" class="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="(21) 99999-9999">
                            <button id="form-clear-btn" onclick="App.UI.ContactForm.clear();" class="hidden w-12 h-12 flex-shrink-0 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center" title="Limpar Campos">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                            </button>
                        </div>
                        <p id="form-phone-feedback" class="text-xs mt-1 hidden"></p>
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
                        <input type="text" id="form-equipe" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${this.userTeam ? 'bg-slate-100 cursor-not-allowed' : ''}" placeholder="Nome da Equipe" value="${this.userTeam}" ${this.userTeam ? 'readonly' : ''}>
                    </div>

                    <input type="hidden" id="form-id" value="">

                    <div class="pt-4">
                        <button id="form-save-btn" onclick="App.UI.ContactForm.save();" class="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-base hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                            <span id="form-save-text">Salvar Contato</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const phoneInput = this.container.querySelector('#form-phone');
        phoneInput.addEventListener('blur', function() {
            App.UI.ContactForm.lookupPhone(this.value);
        });
    },

    lookupPhone: async function(rawPhone) {
        const phone = App.Core.Utils.formatPhone(rawPhone);
        if (!phone || phone.length < 10) return;

        const feedbackEl = this.container.querySelector('#form-phone-feedback');
        const badgeEl = this.container.querySelector('#form-status-badge');
        const saveText = this.container.querySelector('#form-save-text');
        const saveBtn = this.container.querySelector('#form-save-btn');
        const clearBtn = this.container.querySelector('#form-clear-btn');

        feedbackEl.innerText = "Buscando...";
        feedbackEl.className = "text-xs mt-1 text-slate-500";
        feedbackEl.classList.remove('hidden');

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

                clearBtn.classList.remove('hidden');
                clearBtn.classList.add('flex');

                if (this.canEdit) {
                    feedbackEl.innerText = "Contato já existe. Dados carregados para atualização.";
                    feedbackEl.className = "text-xs mt-1 text-sky-600 font-medium";
                    
                    badgeEl.innerText = "Existente";
                    badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700";
                    badgeEl.classList.remove('hidden');
                    
                    saveText.innerText = "Atualizar Contato";
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('opacity-50');
                } else {
                    feedbackEl.innerText = "Contato já cadastrado: " + (res.contact.nome || "Sem nome") + ". Você não tem permissão para alterar.";
                    feedbackEl.className = "text-xs mt-1 text-rose-500 font-medium";
                    
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
                
                feedbackEl.innerText = "Novo contato. Preencha os dados.";
                feedbackEl.className = "text-xs mt-1 text-emerald-600 font-medium";
                
                badgeEl.innerText = "Novo";
                badgeEl.className = "px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700";
                badgeEl.classList.remove('hidden');
                
                saveText.innerText = "Cadastrar Contato";
                saveBtn.disabled = false;
                saveBtn.classList.remove('opacity-50');
                
                clearBtn.classList.remove('hidden');
                clearBtn.classList.add('flex');
            }
        } catch (err) {
            App.UI.Loader.hide();
            feedbackEl.innerText = "Erro ao buscar contato.";
            feedbackEl.className = "text-xs mt-1 text-rose-500 font-medium";
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

        // Etapa 5: Captura GPS e ID do usuário
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

    clear: function(keepPhone = false) {
        const phoneVal = keepPhone ? this.container.querySelector('#form-phone').value : '';
        this.container.querySelector('#form-id').value = "";
        this.container.querySelector('#form-nome').value = "";
        this.container.querySelector('#form-bairro').value = "";
        this.container.querySelector('#form-ref').value = "";
        this.container.querySelector('#form-funcao').value = "";
        
        this.container.querySelector('#form-equipe').value = this.userTeam;
        this.container.querySelector('#form-phone').value = phoneVal;
        
        ['form-nome', 'form-bairro', 'form-ref', 'form-equipe', 'form-funcao'].forEach(id => {
            const el = this.container.querySelector('#' + id);
            if(el) {
                el.disabled = false;
                if(id === 'form-equipe' && this.userTeam) el.readOnly = true;
            }
        });
        
        this.container.querySelector('#form-phone-feedback').classList.add('hidden');
        this.container.querySelector('#form-phone-feedback').innerText = "";
        this.container.querySelector('#form-status-badge').classList.add('hidden');
        
        const clearBtn = this.container.querySelector('#form-clear-btn');
        if(clearBtn) {
            clearBtn.classList.add('hidden');
            clearBtn.classList.remove('flex');
        }
        
        const btn = this.container.querySelector('#form-save-btn');
        if(btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50');
            btn.innerHTML = `<span id="form-save-text">Cadastrar Contato</span>`;
        }
    }
};