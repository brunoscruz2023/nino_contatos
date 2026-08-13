// core.js

// ==========================================
// IDs e Nomes das Planilhas (Centralizado)
// ==========================================
var SHEET_ID = '1VGgM5QNBY0SiN3VuVYdQB78joPz9blvdrdHNQj9v73I'; 
var SHEET_NAME = 'Página1'; 
var ACESSOS_SHEET_NAME = 'Acessos';
var BAIRROS_SHEET_NAME = 'Bairros';
var CACHE_VERSION = 'v2';

// Definição do Namespace Global
window.App = window.App || {};
App.Core = App.Core || {};
App.Eventos = App.Eventos || {};
App.Mapa = App.Mapa || {};

var currentSession = null;
var geoDicionario = {}; 
window.dictsGlobal = null;

// ==========================================
// MÓDULO: UTILITÁRIOS (App.Core.Utils)
// ==========================================
App.Core.Utils = {
    fetchJsonp: function(url, callbackName) {
        return new Promise((resolve, reject) => {
            window[callbackName] = function(data) {
                resolve(data);
                delete window[callbackName];
            };
            var script = document.createElement('script');
            script.src = url;
            document.body.appendChild(script);
            script.onerror = function() { reject(new Error('Falha de rede')); };
            setTimeout(function() { reject(new Error('Timeout')); }, 10000);
        });
    },

    parseCustomDate: function(dateInput) {
        if (!dateInput) return null;
        if (dateInput instanceof Date) {
            var d = new Date(dateInput);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        var dateStr = dateInput.toString().trim();
        if (dateStr.startsWith('Date(')) {
            var match = dateStr.match(/Date\((\d+),(\d+),(\d+)/);
            if (match) {
                var d = new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
                d.setHours(0, 0, 0, 0);
                return d;
            }
        }
        var parts = dateStr.split('/');
        if (parts.length === 3) {
            var d = new Date(parts[2], parts[1] - 1, parts[0]);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        var parsed = new Date(dateInput);
        if (!isNaN(parsed.getTime())) {
            parsed.setHours(0, 0, 0, 0);
            return parsed;
        }
        return null;
    },

    formatPhone: function(rawFone) {
        if (!rawFone) return "";
        var cleanFone = rawFone.toString().trim().replace(/\D/g, '');
        if (cleanFone.startsWith('55') && cleanFone.length >= 12) cleanFone = cleanFone.substring(2);
        if (cleanFone.length === 8 || cleanFone.length === 9) cleanFone = '21' + cleanFone;
        return cleanFone;
    },

    getLocation: function() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) return resolve({ lat: '', lng: '' });
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }),
                (err) => resolve({ lat: '', lng: '' }), 
                { timeout: 5000, enableHighAccuracy: true }
            );
        });
    }
};

var fetchJsonp = App.Core.Utils.fetchJsonp;
var parseCustomDate = App.Core.Utils.parseCustomDate;
var formatPhone = App.Core.Utils.formatPhone;

var today = new Date();
var currentWeekStart = new Date(today);
currentWeekStart.setDate(today.getDate() - today.getDay());
currentWeekStart.setHours(0, 0, 0, 0);

var lastWeekStart = new Date(currentWeekStart);
lastWeekStart.setDate(currentWeekStart.getDate() - 7);
lastWeekStart.setHours(0, 0, 0, 0);

// ==========================================
// MÓDULO: SEGURANÇA E RBAC DINÂMICO (App.Core.Security)
// ==========================================
App.Core.Security = {
    getAccessKey: function() {
        return currentSession ? (currentSession.key || 'logado') : null;
    },
    getUserId: function() {
        return currentSession ? currentSession.id : null;
    },
    hasModuleAccess: function(modulo) {
        if (!currentSession || !currentSession.funcoes) return false;
        var mod = modulo ? modulo.toLowerCase() : '';
        var val = currentSession.funcoes[mod];
        return val !== undefined && val !== '000';
    },
    canCreateEvent: function() {
        return this.hasModuleAccess('agenda') && (currentSession.funcoes['agenda'] === '003' || currentSession.funcoes['agenda'] === '999');
    },
    canCheckIn: function() {
        return this.hasModuleAccess('agenda') && ['001', '003', '999'].includes(currentSession.funcoes['agenda']);
    },
    canEditContact: function() {
        return this.hasModuleAccess('cadastro') && (currentSession.funcoes['cadastro'] === '002' || currentSession.funcoes['cadastro'] === '999');
    },
    canManageMaterials: function() {
        return this.hasModuleAccess('materiais') && ['003', '999'].includes(currentSession.funcoes['materiais']);
    },
    canDistributeMaterial: function() {
        return this.hasModuleAccess('materiais') && ['002', '003', '999'].includes(currentSession.funcoes['materiais']);
    }
};

// ==========================================
// MÓDULO: API (App.Core.API)
// ==========================================
App.Core.API = {
    EVENTOS_POST_URL: 'https://script.google.com/macros/s/AKfycbx5KvXsXLw7L8R3ndPDla7Ni4D1w63wcxpCHoQFIvxLhyzvXFQHkuM3jcoOsREMlkP32g/exec',

    postEvent: function(payload, callback) {
        fetch(this.EVENTOS_POST_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) { callback(data); })
        .catch(function(err) { callback({ status: 'error', message: 'Erro de rede: ' + err.message }); });
    }
};

// ==========================================
// MÓDULO: UI GENÉRICA (App.Core.UI)
// ==========================================
App.Core.UI = App.Core.UI || {};

App.Core.UI.Modal = {
    open: function(config) {
        document.getElementById('app-modal-title').innerText = config.title || '';
        document.getElementById('app-modal-subtitle').innerText = config.subtitle || '';
        document.getElementById('app-modal-body').innerHTML = config.body || '';
        var actionsDiv = document.getElementById('app-modal-actions');
        actionsDiv.innerHTML = '';
        if (config.actions && config.actions.length > 0) {
            config.actions.forEach(function(action) {
                var btn = document.createElement('button');
                btn.id = action.id || 'app-modal-action-btn';
                btn.className = action.className || 'w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg';
                btn.innerText = action.text || 'OK';
                btn.onclick = action.onClick;
                actionsDiv.appendChild(btn);
            });
        }
        var overlay = document.getElementById('app-modal-overlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        document.getElementById('app-modal-close-btn').onclick = function() { App.Core.UI.Modal.close(); };
    },
    close: function() {
        var overlay = document.getElementById('app-modal-overlay');
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        document.getElementById('app-modal-actions').innerHTML = '';
    }
};

// Função Reutilizável para alternar visibilidade de campos de senha
App.Core.UI.toggleFieldVisibility = function(inputId, iconShowId, iconHideId) {
    var input = document.getElementById(inputId);
    var iconShow = document.getElementById(iconShowId);
    var iconHide = document.getElementById(iconHideId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (iconShow) iconShow.classList.add('hidden');
        if (iconHide) iconHide.classList.remove('hidden');
    } else {
        input.type = 'password';
        if (iconShow) iconShow.classList.remove('hidden');
        if (iconHide) iconHide.classList.add('hidden');
    }
};

// Modal de Troca de Senha Obrigatória
App.Core.UI.openChangePasswordModal = function(session) {
    App.Core.UI.Modal.open({
        title: "Atualização de Senha",
        subtitle: "Por favor, defina uma nova senha de 6 dígitos para continuar.",
        body: `
            <div class="space-y-3">
                <div class="relative w-full">
                    <input type="password" id="new-pass-1" maxlength="6" class="w-full px-4 py-2.5 pr-12 rounded-xl border border-slate-300 text-center font-bold tracking-widest" placeholder="Nova Senha (6 dígitos)">
                    <button type="button" onclick="App.Core.UI.toggleFieldVisibility('new-pass-1', 'eye-show-1', 'eye-hide-1')" class="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600">
                        <svg id="eye-show-1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        <svg id="eye-hide-1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                    </button>
                </div>
                <div class="relative w-full">
                    <input type="password" id="new-pass-2" maxlength="6" class="w-full px-4 py-2.5 pr-12 rounded-xl border border-slate-300 text-center font-bold tracking-widest" placeholder="Confirmar Nova Senha">
                    <button type="button" onclick="App.Core.UI.toggleFieldVisibility('new-pass-2', 'eye-show-2', 'eye-hide-2')" class="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600">
                        <svg id="eye-show-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        <svg id="eye-hide-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                    </button>
                </div>
            </div>
        `,
        actions: [
            {
                text: "Salvar Nova Senha",
                onClick: function() {
                    var p1 = document.getElementById('new-pass-1').value;
                    var p2 = document.getElementById('new-pass-2').value;
                    
                    // Função auxiliar para limpar campos após erro
                    var clearPassFields = function() {
                        document.getElementById('new-pass-1').value = '';
                        document.getElementById('new-pass-2').value = '';
                        document.getElementById('new-pass-1').focus();
                    };
                    
                    if (!p1 || p1.length !== 6 || !/^\d+$/.test(p1)) {
                        alert("A senha deve ter exatamente 6 dígitos numéricos.");
                        clearPassFields();
                        return;
                    }
                    if (p1 !== p2) {
                        alert("As senhas não conferem.");
                        clearPassFields();
                        return;
                    }
                    if (p1 === "123456") {
                        alert("A nova senha não pode ser igual à senha padrão (123456).");
                        clearPassFields();
                        return;
                    }
                    
                    App.UI.Loader.show();
                    var payload = { action: 'changePassword', userId: session.id, newSenha: p1 };
                    App.Core.API.postEvent(payload, function(res) {
                        App.UI.Loader.hide();
                        if (res.status === 'success') {
                            App.UI.SuccessToast.show(1500);
                            App.Core.UI.Modal.close();
                            session.mustChangePassword = false;
                            App.Core.Controller.setupSession(session);
                        } else {
                            alert("Erro ao atualizar senha: " + res.message);
                            clearPassFields();
                        }
                    });
                },
                className: "w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all mb-2"
            },
            {
                text: "Cancelar (Sair)",
                onClick: function() {
                    App.Core.UI.Modal.close();
                    location.reload();
                },
                className: "w-full bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all"
            }
        ]
    });
};

// ==========================================
// MÓDULO: TASK MANAGER (Motor de Tarefas Unificado)
// ==========================================
App.Core.TaskManager = {
    getPendingEventTasks: function(userId) {
        if (!App.Core.Security.canCheckIn() || !eventosDatabase || eventosDatabase.length === 0) return [];
        
        let tasks = [];
        let today = new Date();
        today.setHours(0, 0, 0, 0);

        eventosDatabase.forEach(ev => {
            let evDate = new Date(ev.date);
            evDate.setHours(0, 0, 0, 0);
            
            if (evDate.getTime() === today.getTime()) {
                let isParticipant = ev.participacoes.some(p => 
                    p.coordenadorId === userId || p.supervisorId === userId || p.mobilizadorId === userId
                );
                if (isParticipant) {
                    tasks.push({
                        id: ev.idEvento,
                        type: 'EVENT_CHECKIN',
                        label: 'Iniciar Atuação no Evento: ' + ev.nome,
                        actionRef: ev.idEvento
                    });
                }
            }
        });
        return tasks;
    },

    getPendingCustomTasks: async function(userId) {
        const TASKS_SHEET_ID = '1MRycZz_03uglcwJqYs_G3Kzc2osx6S_z9zYxGMAzsNM'; 
        const TASKS_SHEET_NAME = 'Tarefas';
        const cb = 'cb_tasks_' + Date.now();
        const url = `https://docs.google.com/spreadsheets/d/${TASKS_SHEET_ID}/gviz/tq?tqx=responseHandler:${cb}&sheet=${encodeURIComponent(TASKS_SHEET_NAME)}`;
        
        try {
            const data = await App.Core.Utils.fetchJsonp(url, cb);
            let tasks = [];
            if (data && data.table && data.table.rows) {
                data.table.rows.forEach(row => {
                    if (!row.c || !row.c[1]) return;
                    let status = row.c[6] && row.c[6].v ? row.c[6].v.toString().trim().toLowerCase() : "";
                    let respId = row.c[2] && row.c[2].v ? row.c[2].v.toString().replace(/'/g, "").trim().toUpperCase() : "";
                    
                    if (status === "pendente" && respId === userId) {
                        let titulo = row.c[3] && row.c[3].v ? row.c[3].v.toString() : "Tarefa sem título";
                        let taskId = row.c[1].v.toString().replace(/'/g, "").trim();
                        tasks.push({ id: taskId, type: 'CUSTOM_TASK', label: 'Tarefa: ' + titulo, actionRef: taskId });
                    }
                });
            }
            return tasks;
        } catch (e) { console.error("Erro ao buscar tarefas avulsas", e); return []; }
    },

    getPendingMaterialTasks: async function(userId) {
        const MAT_SHEET_ID = '1MRycZz_03uglcwJqYs_G3Kzc2osx6S_z9zYxGMAzsNM'; 
        const MAT_SHEET_NAME = 'Materiais_Movimentacao';
        const cb = 'cb_mat_' + Date.now();
        const url = `https://docs.google.com/spreadsheets/d/${MAT_SHEET_ID}/gviz/tq?tqx=responseHandler:${cb}&sheet=${encodeURIComponent(MAT_SHEET_NAME)}`;
        
        try {
            const data = await App.Core.Utils.fetchJsonp(url, cb);
            let tasks = [];
            if (data && data.table && data.table.rows) {
                data.table.rows.forEach(row => {
                    if (!row.c || !row.c[1]) return;
                    let tipo = row.c[2] && row.c[2].v ? row.c[2].v.toString().trim() : "";
                    let status = row.c[8] && row.c[8].v ? row.c[8].v.toString().trim() : "";
                    let receptorId = row.c[5] && row.c[5].v ? row.c[5].v.toString().replace(/'/g, "").trim().toUpperCase() : "";
                    
                    if (tipo === "DISTRIBUICAO" && status === "Pendente_Recebimento" && receptorId === userId) {
                        let item = row.c[3] && row.c[3].v ? row.c[3].v.toString() : "Material";
                        let qtd = row.c[4] && row.c[4].v ? row.c[4].v : 0;
                        let transId = row.c[1].v.toString().replace(/'/g, "").trim();
                        tasks.push({ id: transId, type: 'MATERIAL_RECEIPT', label: `Receber ${qtd}x ${item}`, actionRef: transId });
                    }
                });
            }
            return tasks;
        } catch (e) { console.error("Erro ao buscar tarefas de material", e); return []; }
    },

    promptUserTasks: async function() {
        const userId = App.Core.Security.getUserId();
        if (!userId || userId === 'LEGADO' || userId === 'ADMIN') return;

        let tasks = this.getPendingEventTasks(userId);
        const customTasks = await this.getPendingCustomTasks(userId);
        const materialTasks = await this.getPendingMaterialTasks(userId); 
        
        tasks = tasks.concat(customTasks).concat(materialTasks); 

        if (tasks.length > 0) {
            let bodyHtml = '<div class="space-y-2">';
            tasks.forEach(task => {
                bodyHtml += `<button onclick="App.Core.Router.executeTask('${task.id}', '${task.type}')" class="w-full text-left p-3 bg-slate-50 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors">
                    <span class="block text-sm font-bold text-slate-800">${task.label}</span>
                </button>`;
            });
            bodyHtml += '</div>';

            App.Core.UI.Modal.open({
                title: "Pendências",
                subtitle: "Você tem tarefas, eventos ou materiais aguardando ação.",
                body: bodyHtml,
                actions: [{ text: "Fechar", onClick: App.Core.UI.Modal.close, className: "w-full bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all" }]
            });
        }
    },

    showTaskDetails: function(taskId) {
        App.Core.UI.Modal.open({
            title: "Detalhes da Tarefa",
            subtitle: "ID: " + taskId,
            body: `
                <div class="space-y-3">
                    <p class="text-sm text-slate-600">Descreva abaixo o que foi realizado nesta tarefa:</p>
                    <textarea id="task-relato" rows="4" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Material entregue com sucesso. Pessoa não estava em casa, etc."></textarea>
                </div>
            `,
            actions: [
                {
                    text: "Marcar como Concluída",
                    onClick: async function() {
                        const relato = document.getElementById('task-relato').value.trim();
                        if (!relato) { alert("Por favor, descreva o que foi feito antes de concluir."); return; }

                        App.UI.Loader.show();
                        const coords = await App.Core.Utils.getLocation();
                        const payload = { action: 'completeTask', taskId: taskId, userId: App.Core.Security.getUserId(), relato: relato, lat: coords.lat, lng: coords.lng };
                        App.Core.API.postEvent(payload, function(res) {
                            App.UI.Loader.hide();
                            if (res.status === 'success') {
                                App.UI.SuccessToast.show(1500);
                                App.Core.UI.Modal.close();
                                if (typeof tarefasDatabase !== 'undefined') {
                                    let t = tarefasDatabase.find(t => t.id === taskId);
                                    if (t) { t.status = "Concluído"; if (typeof renderEventosView === 'function') renderEventosView(); }
                                }
                            } else { alert("Erro: " + res.message); }
                        });
                    },
                    className: "w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all mb-2"
                },
                { text: "Cancelar", onClick: App.Core.UI.Modal.close, className: "w-full bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all" }
            ]
        });
    },

    showMaterialReceiptModal: function(transId) {
        App.Core.UI.Modal.open({
            title: "Recebimento de Material",
            subtitle: "Transação: " + transId,
            body: `<p class="text-sm text-slate-600">Confirma o recebimento do material descrito nesta transação?</p>`,
            actions: [
                {
                    text: "Confirmar Recebimento",
                    onClick: async function() {
                        App.UI.Loader.show();
                        const payload = { action: 'confirmMaterialReceipt', transId: transId, userId: App.Core.Security.getUserId() };
                        App.Core.API.postEvent(payload, function(res) {
                            App.UI.Loader.hide();
                            if (res.status === 'success') { App.UI.SuccessToast.show(1500); App.Core.UI.Modal.close(); } 
                            else { alert("Erro: " + res.message); }
                        });
                    },
                    className: "w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all mb-2"
                },
                { text: "Cancelar", onClick: App.Core.UI.Modal.close, className: "w-full bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all" }
            ]
        });
    }
};

// ==========================================
// MÓDULO: ROUTER (Roteador de Ações)
// ==========================================
App.Core.Router = {
    executeTask: function(taskId, taskType) {
        App.Core.UI.Modal.close();
        if (taskType === 'EVENT_CHECKIN') {
            App.Layout.Shell.setActive('eventos');
            setTimeout(() => { if (typeof App.Eventos.CRUD !== 'undefined') App.Eventos.CRUD.iniciarAtuacao(taskId); }, 500);
        } else if (taskType === 'CUSTOM_TASK') {
            App.Core.TaskManager.showTaskDetails(taskId);
        } else if (taskType === 'MATERIAL_RECEIPT') {
            App.Core.TaskManager.showMaterialReceiptModal(taskId);
        }
    }
};

// ==========================================
// CONTROLADOR PRINCIPAL
// ==========================================
App.Core.Controller = App.Core.Controller || {};

App.Core.Controller.performLogin = async function() {
    var mainInput = document.getElementById('key-input').value.trim();
    var passInput = document.getElementById('password-input').value.trim();
    var errorEl = document.getElementById('login-error');
    if (!mainInput) return;
    errorEl.classList.add('hidden');

    var cleanMain = mainInput.replace(/\D/g, '');
    var isPhone = cleanMain.length >= 8 && /^\d+$/.test(cleanMain);

    try {
        var payload = {};
        if (isPhone) {
            if (!passInput) throw "Digite a senha.";
            payload = { action: 'loginUser', phone: App.Core.Utils.formatPhone(mainInput), password: passInput };
        } else {
            payload = { action: 'performLogin', key: mainInput };
        }

        var res = await new Promise((resolve, reject) => {
            App.Core.API.postEvent(payload, function(data) {
                if (data.status === 'success') resolve(data);
                else reject(data.message || 'Erro ao logar.');
            });
        });
        
        // VERIFICAÇÃO DE TROCA DE SENHA OBRIGATÓRIA
        if (res.session.mustChangePassword) {
            App.Core.UI.openChangePasswordModal(res.session);
            return; // Bloqueia a entrada no app
        }
        
        App.Core.Controller.setupSession(res.session);
    } catch (err) {
        errorEl.innerText = err;
        errorEl.classList.remove('hidden');
    }
};

App.Core.Controller.setupSession = function(sessionData) {
    currentSession = sessionData;
    sessionStorage.setItem('painel_session', JSON.stringify(currentSession));
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('key-input').value = '';
    document.getElementById('password-input').value = '';
    document.getElementById('password-wrapper').classList.add('hidden');
    document.getElementById('eye-btn').classList.add('hidden');
    App.Core.Controller.initApp();
};

App.Core.Controller.logout = function() {
    sessionStorage.removeItem('painel_session');
    if (currentSession && currentSession.key) {
        var cacheSuffix = currentSession.funcoes['mapa'] || 'default';
        localStorage.removeItem(`painel_cache_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    }
    location.reload();
};

App.Core.Controller.initApp = async function() {
    var statusEl = document.getElementById('status-text');
    var mobileStatusEl = document.getElementById('mobile-status-text');
    if(statusEl) { statusEl.innerText = "Carregando dados..."; statusEl.className = "text-xs font-semibold text-sky-500 mt-1 animate-pulse"; }
    if(mobileStatusEl) { mobileStatusEl.innerText = "Carregando"; mobileStatusEl.className = "text-[10px] font-medium text-sky-500 animate-pulse"; }

    var btnVerContatos = document.getElementById('btn-ver-contatos');
    if (btnVerContatos) {
        if (!App.Core.Security.hasModuleAccess('mapa')) btnVerContatos.classList.add('hidden');
        else btnVerContatos.classList.remove('hidden');
    }

    App.Layout.Shell.init();

    var cacheKey = currentSession.key || 'logado';
    var cacheSuffix = currentSession.funcoes['mapa'] || 'default';
    var cachedData = localStorage.getItem(`painel_cache_${cacheKey}_${cacheSuffix}_${CACHE_VERSION}`);
    var cachedFuncoes = localStorage.getItem(`painel_funcoes_${cacheKey}_${cacheSuffix}_${CACHE_VERSION}`);
    var cachedEquipes = localStorage.getItem(`painel_equipes_${cacheKey}_${cacheSuffix}_${CACHE_VERSION}`);
    
    App.Mapa.Dados.loadBairrosFromCache();

    if (cachedData && cachedFuncoes && cachedEquipes) {
        try {
            geoDatabase = JSON.parse(cachedData);
            allFunctionsList = new Set(JSON.parse(cachedFuncoes));
            allTeamsList = new Set(JSON.parse(cachedEquipes));
            populateFilters();
            initMap();
            initMobileList(); 
            applyFilters(); 
        } catch(e) { console.error("Erro ao ler cache", e); }
    }

    let fetchPromises = [
        App.Mapa.Dados.fetchBairrosFromNetwork(),
        App.Mapa.Dados.fetchSpreadsheetData()
    ];

    if (App.Core.Security.hasModuleAccess('agenda')) {
        App.Eventos.Dados.loadFromCache();
        fetchPromises.push(App.Eventos.Dados.fetchEventosData(true));
    }

    fetchPromises.push(new Promise((resolve) => {
        App.Core.API.postEvent({ action: 'getDictionaries' }, function(res) {
            if(res.status === 'success') {
                window.dictsGlobal = res;
                localStorage.setItem('dicts_global_cache', JSON.stringify(res));
            }
            resolve();
        });
    }));

    const cachedDicts = localStorage.getItem('dicts_global_cache');
    if(cachedDicts) { try { window.dictsGlobal = JSON.parse(cachedDicts); } catch(e){} }

    await Promise.all(fetchPromises);
    App.Core.TaskManager.promptUserTasks();
};

App.Core.UI.togglePasswordVisibility = function() {
    App.Core.UI.toggleFieldVisibility('password-input', 'eye-icon-show', 'eye-icon-hide');
};

window.performLogin = App.Core.Controller.performLogin;
window.logout = App.Core.Controller.logout;
window.togglePasswordVisibility = App.Core.UI.togglePasswordVisibility;

window.onload = async function() { 
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('kiosk') === 'true') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('kiosk-mode-overlay').classList.remove('hidden');
        if (typeof App.Eventos.Kiosk !== 'undefined') App.Eventos.Kiosk.init(urlParams.get('event'), urlParams.get('token'));
        return; 
    }

    var savedSession = sessionStorage.getItem('painel_session');
    if (savedSession) {
        currentSession = JSON.parse(savedSession);
        if (!currentSession.funcoes) {
            sessionStorage.removeItem('painel_session');
            location.reload();
            return;
        }
        document.getElementById('login-overlay').style.display = 'none';
        await App.Core.Controller.initApp();
    } else {
        var keyInput = document.getElementById('key-input');
        var passWrapper = document.getElementById('password-wrapper');
        var passInput = document.getElementById('password-input');
        var eyeBtn = document.getElementById('eye-btn');
        
        keyInput.focus();
        keyInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') performLogin(); });
        passInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') performLogin(); });
        
        keyInput.addEventListener('input', function() {
            var cleanVal = this.value.replace(/\D/g, '');
            var isPhone = cleanVal.length >= 3 && /^\d+$/.test(this.value.trim().replace(/\s|\(|\)|-/g, ''));
            if (isPhone) { if (passWrapper.classList.contains('hidden')) passWrapper.classList.remove('hidden'); }
            else {
                if (!passWrapper.classList.contains('hidden')) {
                    passWrapper.classList.add('hidden'); passInput.value = ''; passInput.type = 'password'; eyeBtn.classList.add('hidden');
                    document.getElementById('eye-icon-show').classList.remove('hidden'); document.getElementById('eye-icon-hide').classList.add('hidden');
                }
            }
        });

        passInput.addEventListener('input', function() {
            if (this.value.length > 0) eyeBtn.classList.remove('hidden');
            else { eyeBtn.classList.add('hidden'); this.type = 'password'; document.getElementById('eye-icon-show').classList.remove('hidden'); document.getElementById('eye-icon-hide').classList.add('hidden'); }
        });
    }
};