// admin_crud.js
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.CRUD = {
    state: {
        dictionaries: null,
        foundContact: null
    },

    init: async function() {
        const view = document.getElementById('view-admin');
        if (!view) return;

        view.innerHTML = `
            <div class="max-w-4xl mx-auto p-4 md:p-8 w-full">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-slate-800">Gerenciamento de Acessos</h2>
                    <p class="text-sm text-slate-500 mt-1">Busque um contato pelo telefone para definir ou editar as permissões de acesso.</p>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                    <div class="flex flex-col md:flex-row gap-3 items-end">
                        <div class="flex-1 w-full">
                            <label class="block text-xs font-bold text-slate-500 mb-1">Telefone do Contato</label>
                            <input type="tel" id="admin-phone-search" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="(21) 99999-9999">
                        </div>
                        <button id="admin-btn-search" onclick="App.Admin.CRUD.searchContact()" class="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">Buscar</button>
                    </div>
                </div>

                <!-- BLOCO ISOLADO: GESTÃO DE MATERIAIS -->
                <div id="admin-materials-section" class="hidden bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
                    <h3 class="text-lg font-bold text-slate-700 mb-4">Gestão de Materiais</h3>
                    <div class="flex flex-col md:flex-row gap-2">
                        <button onclick="App.Admin.CRUD.openMaterialEntryModal()" class="flex-1 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 transition-colors shadow-sm">
                            + Entrada de Material
                        </button>
                        <button onclick="App.Admin.CRUD.openMaterialDistributionModal()" class="flex-1 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
                            + Distribuir Material
                        </button>
                    </div>
                </div>

                <div id="admin-result-area" class="hidden"></div>
            </div>
        `;

        if (!this.state.dictionaries) {
            await this.fetchDictionaries();
        }

        if (App.Core.Security.canDistributeMaterial() || App.Core.Security.canManageMaterials()) {
            document.getElementById('admin-materials-section').classList.remove('hidden');
        }
    },

    fetchDictionaries: async function() {
        const payload = { action: 'getDictionaries' };
        try {
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Erro ao carregar dicionários.');
                });
            });
            this.state.dictionaries = res;
        } catch (err) {
            console.error(err);
            alert("Erro ao carregar dicionários de acesso. Verifique o console.");
        }
    },

    searchContact: async function() {
        const phoneInput = document.getElementById('admin-phone-search').value;
        const formattedPhone = App.Core.Utils.formatPhone(phoneInput);
        const resultArea = document.getElementById('admin-result-area');
        if (!formattedPhone) return;

        resultArea.classList.remove('hidden');
        resultArea.innerHTML = ''; 
        App.UI.Loader.show();

        const payload = { action: 'lookupContactByPhone', phone: formattedPhone };
        try {
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Erro na busca.');
                });
            });

            App.UI.Loader.hide();

            if (res.contact) {
                this.state.foundContact = res.contact;
                this.renderAccessForm(res.contact);
            } else {
                this.state.foundContact = null;
                resultArea.innerHTML = `
                    <div class="bg-sky-50 border border-sky-200 p-6 rounded-2xl text-center">
                        <p class="text-sm text-sky-700 font-medium mb-4">Nenhum contato encontrado com este telefone.</p>
                        <button onclick="App.Admin.CRUD.openCreateContactModal('${formattedPhone}')" class="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                            Cadastrar Novo Contato
                        </button>
                    </div>
                `;
            }
        } catch (err) {
            App.UI.Loader.hide();
            resultArea.innerHTML = `<div class="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-600 font-medium text-sm">Erro: ${err}</div>`;
        }
    },

    openCreateContactModal: function(phone) {
        App.Core.UI.Modal.open({
            title: "Cadastrar Novo Contato",
            subtitle: "Preencha os dados para cadastrar e configurar o acesso",
            body: '<div id="admin-create-contact-container"></div>'
        });

        let funcoesArray = [];
        if (window.dictsGlobal && window.dictsGlobal.funcoes_contato) {
            funcoesArray = window.dictsGlobal.funcoes_contato.map(f => f.nome);
        }

        App.UI.ContactForm.init('#admin-create-contact-container', {
            funcoes: funcoesArray,
            canEdit: true,
            saveButtonText: "Cadastrar e Configurar Acesso",
            onCancel: function() {
                App.Core.UI.Modal.close();
            },
            onSaveSuccess: (contactData) => {
                App.Core.UI.Modal.close();
                
                let defaultCodigo = "";
                if (this.state.dictionaries && this.state.dictionaries.modulos) {
                    defaultCodigo = this.state.dictionaries.modulos.map(() => '000').join('');
                }
                
                const newContactMock = {
                    id: contactData.id,
                    nome: contactData.nome,
                    telefone: contactData.phone, 
                    bairro: contactData.bairro,
                    ref: contactData.ref,
                    equipe: contactData.equipe,
                    funcao: contactData.funcao,
                    codigoAcesso: defaultCodigo,
                    hasSenha: false
                };
                
                this.state.foundContact = newContactMock;
                this.renderAccessForm(newContactMock);
            }
        });

        const phoneInput = document.getElementById('form-phone');
        if (phoneInput) {
            phoneInput.value = phone;
            App.UI.ContactForm.lookupPhone();
        }
    },

    renderAccessForm: function(contact) {
        const resultArea = document.getElementById('admin-result-area');
        const dicts = this.state.dictionaries;

        let currentCodes = {};
        if (contact.codigoAcesso && dicts.modulos) {
            let codStr = contact.codigoAcesso;
            dicts.modulos.forEach((mod, index) => {
                currentCodes[mod.nome.toLowerCase()] = codStr.substring(index * 3, (index * 3) + 3) || '000';
            });
        }

        let currentTeamCodes = [];
        if (contact.equipe) {
            let teamNames = contact.equipe.split(',').map(t => t.trim().toUpperCase());
            teamNames.forEach(name => {
                let found = dicts.equipes.find(e => e.nome.toString().toUpperCase().trim() === name);
                if (found) currentTeamCodes.push(found.cod);
            });
        }

        const renderCheckboxes = (items, selectedCodes) => {
            if(!items || items.length === 0) return '<p class="text-xs text-slate-400 italic">Nenhuma equipe cadastrada.</p>';
            return items.map(item => {
                const isChecked = selectedCodes.includes(item.cod) ? 'checked' : '';
                return `
                    <label class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <input type="checkbox" name="equipes" value="${item.cod}" class="rounded text-indigo-600 focus:ring-indigo-500" ${isChecked}>
                        <span class="text-xs font-medium text-slate-700">${item.nome} <span class="text-slate-400">(${item.cod})</span></span>
                    </label>
                `;
            }).join('');
        };

        const renderSelect = (moduleName, options, selectedVal) => {
            if (options.length === 0) options.push({ val: '000', text: 'Sem Acesso' });
            const optsHtml = options.map(opt => {
                const isSelected = opt.val === selectedVal ? 'selected' : '';
                return `<option value="${opt.val}" ${isSelected}>${opt.text}</option>`;
            }).join('');
            
            return `
                <div class="flex flex-col gap-1">
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">${moduleName}</label>
                    <select id="select-${moduleName.toLowerCase()}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        ${optsHtml}
                    </select>
                </div>
            `;
        };

        const modOpts = {};
        if (dicts.modulos && dicts.modulos.length > 0) {
            dicts.modulos.forEach(mod => { modOpts[mod.nome.toLowerCase()] = []; });
        }
        if (dicts.funcoes_modulos && dicts.funcoes_modulos.length > 0) {
            dicts.funcoes_modulos.forEach(item => {
                let modLower = item.modulo.toLowerCase();
                if (modOpts[modLower]) modOpts[modLower].push({ val: item.cod, text: item.nome });
            });
        }

        const senhaPlaceholder = contact.hasSenha ? "Deixe em branco para manter a senha atual" : "Digite a nova senha";
        const senhaAviso = contact.hasSenha ? '<p class="text-xs text-emerald-600 mt-2 font-medium">Este contato já possui senha cadastrada.</p>' : '<p class="text-xs text-slate-400 mt-2">Nenhuma senha cadastrada ainda. É necessário definir uma.</p>';

        let modulosHtml = '<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">';
        if (dicts.modulos && dicts.modulos.length > 0) {
            dicts.modulos.forEach(mod => {
                let modLower = mod.nome.toLowerCase();
                modulosHtml += renderSelect(modLower, modOpts[modLower] || [], currentCodes[modLower] || '000');
            });
        }
        modulosHtml += '</div>';

        resultArea.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex justify-between items-start mb-6 pb-4 border-b border-slate-100">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">${contact.nome}</h3>
                        <p class="text-sm text-slate-500">ID: ${contact.id} | Tel: ${contact.telefone || 'N/A'} | ${contact.bairro}</p>
                    </div>
                    <button onclick="App.Admin.CRUD.saveAccess()" class="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                        Salvar Alterações
                    </button>
                </div>

                <div class="mb-6">
                    <h4 class="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Equipes</h4>
                    <div class="flex flex-col gap-2">
                        ${renderCheckboxes(dicts.equipes, currentTeamCodes)}
                    </div>
                </div>

                ${modulosHtml}

                <div class="mt-6 pt-6 border-t border-slate-100">
                    <label class="block text-sm font-bold text-slate-700 mb-2">Senha de Acesso (6 dígitos)</label>
                    <div class="flex gap-2">
                        <input type="text" id="admin-password-input" maxlength="6" class="w-64 px-4 py-2 border border-slate-300 rounded-xl tracking-widest text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="${senhaPlaceholder}">
                        <button onclick="App.Admin.CRUD.generatePassword()" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors">Gerar Aleatória</button>
                    </div>
                    ${senhaAviso}
                </div>
            </div>
        `;
    },

    generatePassword: function() {
        const input = document.getElementById('admin-password-input');
        const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
        input.value = randomPass;
    },

    saveAccess: async function() {
        if (!this.state.foundContact) return;

        const senha = document.getElementById('admin-password-input').value;
        if (senha && (senha.length !== 6 || !/^\d+$/.test(senha))) {
            alert("A senha deve conter exatamente 6 dígitos numéricos, ou deixe em branco para manter a atual.");
            return;
        }

        let codigoAcesso = "";
        if (this.state.dictionaries.modulos && this.state.dictionaries.modulos.length > 0) {
            this.state.dictionaries.modulos.forEach(mod => {
                let val = document.getElementById(`select-${mod.nome.toLowerCase()}`).value;
                codigoAcesso += val;
            });
        }

        const getCheckedValues = (name) => {
            const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
            return Array.from(checkboxes).map(cb => cb.value);
        };
        const equipesArr = getCheckedValues('equipes');
        const equipesCodigosStr = equipesArr.join('');

        const payload = {
            action: 'saveUserAccess',
            userId: this.state.foundContact.id,
            senha: senha,
            codigoAcesso: codigoAcesso,
            equipes: equipesCodigosStr
        };

        const resultArea = document.getElementById('admin-result-area');
        App.UI.Loader.show();

        try {
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Erro ao salvar.');
                });
            });

            App.UI.Loader.hide();
            App.UI.SuccessToast.show(1500);

            const senhaMsg = senha ? `Nova senha: <span class="font-bold text-slate-900 tracking-widest">${senha}</span>` : 'Senha anterior mantida.';
            
            resultArea.innerHTML = `
                <div class="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
                    <svg class="w-12 h-12 text-emerald-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h3 class="text-lg font-bold text-emerald-700 mb-2">Acesso Atualizado com Sucesso!</h3>
                    <p class="text-sm text-slate-600">${senhaMsg}</p>
                    <p class="text-xs text-slate-400 mt-2">Código de Permissões: ${codigoAcesso}</p>
                    <button onclick="App.Admin.CRUD.init()" class="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">Novo Cadastro</button>
                </div>
            `;
        } catch (err) {
            App.UI.Loader.hide();
            resultArea.innerHTML = `<div class="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-600 font-medium text-sm">Erro ao salvar: ${err}</div>`;
        }
    },

    // ==========================================
    // MÓDULO DE MATERIAIS (UI)
    // ==========================================
    
    // NOVO: Calcula saldos em memória para exibir no dropdown de distribuição
    getStockBalances: function() {
        let balances = {};
        if (typeof materialsDatabase === 'undefined' || !materialsDatabase) return balances;

        materialsDatabase.forEach(mov => {
            if (!balances[mov.item]) balances[mov.item] = 0;
            if (mov.tipoMov === "ENTRADA") {
                balances[mov.item] += mov.quantidade;
            } else if (mov.tipoMov === "DISTRIBUICAO") {
                if (mov.status === "RECEBIDO") {
                    balances[mov.item] -= mov.quantidade;
                } else if (mov.status === "PENDENTE_RECEBIMENTO") {
                    balances[mov.item] -= mov.quantidade;
                }
            } else if (mov.tipoMov === "DEVOLUCAO") {
                balances[mov.item] += mov.quantidade;
            }
        });
        return balances;
    },

    openMaterialEntryModal: function() {
        // Popula o select de itens a partir do dicionário
        let itemsOptions = '<option value="">Selecione um item...</option>';
        if (window.dictsGlobal && window.dictsGlobal.materiais_itens) {
            window.dictsGlobal.materiais_itens.forEach(i => {
                itemsOptions += `<option value="${i.nome}">${i.nome}</option>`;
            });
        }

        App.Core.UI.Modal.open({
            title: "Entrada de Material",
            subtitle: "Registre a entrada de insumos na campanha",
            body: `
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Item</label>
                        <select id="mat-item" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                            ${itemsOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Quantidade</label>
                        <input type="number" id="mat-quantidade" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: 10000">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Origem / Fornecedor</label>
                        <input type="text" id="mat-origem" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Gráfica Central">
                    </div>
                </div>
            `,
            actions: [
                {
                    text: "Registrar Entrada",
                    onClick: async function() {
                        const item = document.getElementById('mat-item').value;
                        const quantidade = document.getElementById('mat-quantidade').value.trim();
                        const origem = document.getElementById('mat-origem').value.trim();

                        if (!item || !quantidade) { alert("Item e Quantidade são obrigatórios."); return; }

                        App.UI.Loader.show();
                        const payload = {
                            action: 'registerMaterialTransaction',
                            tipoMov: 'ENTRADA',
                            item: item,
                            quantidade: parseInt(quantidade),
                            idOrigemDestino: origem,
                            idResponsavel: App.Core.Security.getUserId(),
                            refId: "",
                            status: "Concluído"
                        };

                        App.Core.API.postEvent(payload, function(res) {
                            App.UI.Loader.hide();
                            if (res.status === 'success') { App.UI.SuccessToast.show(1500); App.Core.UI.Modal.close(); } 
                            else { alert("Erro: " + res.message); }
                        });
                    },
                    className: "w-full bg-sky-600 text-white py-2.5 rounded-xl font-bold hover:bg-sky-700 transition-all mb-2"
                },
                { text: "Cancelar", onClick: App.Core.UI.Modal.close, className: "w-full bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all" }
            ]
        });
    },

    openMaterialDistributionModal: function() {
        // Calcula saldos e popula o select com itens disponíveis
        let balances = App.Admin.CRUD.getStockBalances();
        let itemsOptions = '<option value="">Selecione um item...</option>';
        
        if (window.dictsGlobal && window.dictsGlobal.materiais_itens) {
            window.dictsGlobal.materiais_itens.forEach(i => {
                let balance = balances[i.nome] || 0;
                // Só permite selecionar itens com saldo positivo
                if (balance > 0) {
                    itemsOptions += `<option value="${i.nome}">${i.nome} (Disp: ${balance})</option>`;
                }
            });
        }

        if (itemsOptions === '<option value="">Selecione um item...</option>') {
            itemsOptions = '<option value="" disabled>Sem itens em estoque</option>';
        }

        App.Core.UI.Modal.open({
            title: "Distribuir Material",
            subtitle: "Entregue material a um mobilizador",
            body: `
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Telefone do Mobilizador</label>
                        <input type="tel" id="mat-dist-phone" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="(21) 99999-9999" oninput="App.Admin.CRUD.handleMatDistPhoneInput(this.value)" onblur="App.Admin.CRUD.lookupMatDistResp()">
                        <p id="mat-dist-name" class="text-xs mt-1 font-medium"></p>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Item</label>
                        <select id="mat-dist-item" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                            ${itemsOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Quantidade</label>
                        <input type="number" id="mat-dist-quantidade" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: 500">
                    </div>
                </div>
            `,
            actions: [
                {
                    id: 'btn-dist-mat',
                    text: "Distribuir",
                    onClick: async function() {
                        const phone = document.getElementById('mat-dist-phone').value;
                        const item = document.getElementById('mat-dist-item').value;
                        const quantidade = parseInt(document.getElementById('mat-dist-quantidade').value);
                        
                        if (!phone || !item || !quantidade) { alert("Preencha todos os campos."); return; }
                        
                        App.UI.Loader.show();
                        const formattedPhone = App.Core.Utils.formatPhone(phone);
                        const lookupPayload = { action: 'lookupContactByPhone', phone: formattedPhone };
                        try {
                            const lookupRes = await new Promise((resolve, reject) => {
                                App.Core.API.postEvent(lookupPayload, function(data) {
                                    if (data.status === 'success') resolve(data);
                                    else reject('Erro');
                                });
                            });
                            
                            if (!lookupRes.contact) { App.UI.Loader.hide(); alert("Mobilizador não encontrado."); return; }
                            
                            const balance = balances[item] || 0;
                            if (quantidade > balance) { App.UI.Loader.hide(); alert("Saldo insuficiente. Disponível: " + balance + " " + item); return; }
                            
                            const payload = {
                                action: 'distributeMaterial',
                                item: item,
                                quantidade: quantidade,
                                idReceptor: lookupRes.contact.id,
                                idResponsavel: App.Core.Security.getUserId()
                            };
                            
                            App.Core.API.postEvent(payload, function(res) {
                                App.UI.Loader.hide();
                                if (res.status === 'success') { App.UI.SuccessToast.show(1500); App.Core.UI.Modal.close(); } 
                                else { alert("Erro: " + res.message); }
                            });
                            
                        } catch(e) { App.UI.Loader.hide(); alert("Erro ao processar."); }
                    },
                    className: "w-full bg-amber-500 text-white py-2.5 rounded-xl font-bold hover:bg-amber-600 transition-all mb-2 opacity-50 cursor-not-allowed pointer-events-none"
                },
                { text: "Cancelar", onClick: App.Core.UI.Modal.close, className: "w-full bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all" }
            ]
        });
    },

    handleMatDistPhoneInput: function(value) {
        const btnDist = document.getElementById('btn-dist-mat');
        const nameEl = document.getElementById('mat-dist-name');
        if (!value) {
            if(btnDist) { btnDist.disabled = true; btnDist.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
            nameEl.innerText = "";
        }
    },

    lookupMatDistResp: function() {
        const phone = document.getElementById('mat-dist-phone').value;
        const nameEl = document.getElementById('mat-dist-name');
        const btnDist = document.getElementById('btn-dist-mat');
        if (!phone) {
            if(btnDist) { btnDist.disabled = true; btnDist.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
            nameEl.innerText = "";
            return;
        }
        nameEl.innerText = "Buscando...";
        nameEl.className = "text-xs mt-1 text-slate-500 animate-pulse";
        const formattedPhone = App.Core.Utils.formatPhone(phone);
        App.Core.API.postEvent({ action: 'lookupContactByPhone', phone: formattedPhone }, function(res) {
            if (res.status === 'success' && res.contact) {
                nameEl.innerText = "Mobilizador: " + res.contact.nome;
                nameEl.className = "text-xs mt-1 text-emerald-600 font-medium";
                if(btnDist) { btnDist.disabled = false; btnDist.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
            } else {
                nameEl.innerText = "Mobilizador não encontrado.";
                nameEl.className = "text-xs mt-1 text-rose-500 font-medium";
                if(btnDist) { btnDist.disabled = true; btnDist.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
            }
        });
    },

    getMaterialBalance: async function(item) {
        // Mantida para compatibilidade, mas a lógica principal agora usa getStockBalances
        const balances = App.Admin.CRUD.getStockBalances();
        return balances[item] || 0;
    }
};