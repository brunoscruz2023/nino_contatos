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

                <div id="admin-result-area" class="hidden"></div>
            </div>
        `;

        if (!this.state.dictionaries) {
            await this.fetchDictionaries();
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
                resultArea.innerHTML = `<div class="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-600 font-medium text-sm">Nenhum contato encontrado com este telefone. Cadastre-o primeiro no mapa ou eventos.</div>`;
            }
        } catch (err) {
            App.UI.Loader.hide();
            resultArea.innerHTML = `<div class="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-600 font-medium text-sm">Erro: ${err}</div>`;
        }
    },

    renderAccessForm: function(contact) {
        const resultArea = document.getElementById('admin-result-area');
        const dicts = this.state.dictionaries;

        let currentCodes = { mapa: '000', agenda: '000', cadastro: '000', admin: '000' };
        if (contact.codigoAcesso && contact.codigoAcesso.length === 12) {
            currentCodes.mapa = contact.codigoAcesso.substring(0, 3);
            currentCodes.agenda = contact.codigoAcesso.substring(3, 6);
            currentCodes.cadastro = contact.codigoAcesso.substring(6, 9);
            currentCodes.admin = contact.codigoAcesso.substring(9, 12);
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

        const modOpts = { Mapa: [], Agenda: [], Cadastro: [], Admin: [] };
        if (dicts.funcoes_modulos && dicts.funcoes_modulos.length > 0) {
            dicts.funcoes_modulos.forEach(item => {
                if (modOpts[item.modulo]) {
                    modOpts[item.modulo].push({ val: item.cod, text: item.nome });
                }
            });
        }

        const renderSelect = (moduleName, options, selectedVal) => {
            if (options.length === 0) {
                options.push({ val: '000', text: 'Sem Acesso' });
            }
            
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

        const senhaPlaceholder = contact.hasSenha ? "Deixe em branco para manter a senha atual" : "Digite a nova senha";
        const senhaAviso = contact.hasSenha ? '<p class="text-xs text-emerald-600 mt-2 font-medium">Este contato já possui senha cadastrada.</p>' : '<p class="text-xs text-slate-400 mt-2">Nenhuma senha cadastrada ainda. É necessário definir uma.</p>';

        resultArea.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex justify-between items-start mb-6 pb-4 border-b border-slate-100">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">${contact.nome}</h3>
                        <p class="text-sm text-slate-500">ID: ${contact.id} | ${contact.bairro}</p>
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

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    ${renderSelect('Mapa', modOpts.Mapa, currentCodes.mapa)}
                    ${renderSelect('Agenda', modOpts.Agenda, currentCodes.agenda)}
                    ${renderSelect('Cadastro', modOpts.Cadastro, currentCodes.cadastro)}
                    ${renderSelect('Admin', modOpts.Admin, currentCodes.admin)}
                </div>

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

        const valMapa = document.getElementById('select-mapa').value;
        const valAgenda = document.getElementById('select-agenda').value;
        const valCadastro = document.getElementById('select-cadastro').value;
        const valAdmin = document.getElementById('select-admin').value;

        const codigoAcesso = valMapa + valAgenda + valCadastro + valAdmin;

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
    }
};