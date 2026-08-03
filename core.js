// core.js

// ==========================================
// IDs e Nomes das Planilhas (Centralizado)
// ==========================================
var SHEET_ID = '1VGgM5QNBY0SiN3VuVYdQB78joPz9blvdrdHNQj9v73I'; // Planilha: Pessoal Campanha
var SHEET_NAME = 'Página1'; // Aba de Contatos
var ACESSOS_SHEET_NAME = 'Acessos';
var BAIRROS_SHEET_NAME = 'Bairros';
var CACHE_VERSION = 'v2'; // Usando VAR para garantir escopo global

// Definição do Namespace Global
window.App = window.App || {};
App.Core = App.Core || {};
App.Eventos = App.Eventos || {};
App.Mapa = App.Mapa || {};

var currentSession = null;
var geoDicionario = {}; 

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
        
        if (cleanFone.startsWith('55') && cleanFone.length >= 12) { 
            cleanFone = cleanFone.substring(2);
        }
        
        if (cleanFone.length === 8 || cleanFone.length === 9) {
            cleanFone = '21' + cleanFone;
        }
        
        return cleanFone;
    }
};

// Aliases temporários para compatibilidade com app.js e mapa_dados.js
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
// MÓDULO: SEGURANÇA (App.Core.Security)
// ==========================================
App.Core.Security = {
    canCreateEvent: function() {
        return currentSession && (currentSession.nivel === 'TOTAL' || currentSession.nivel === 'CARD' || currentSession.nivel === 'EDITOR' || (currentSession.modulos && currentSession.modulos.includes(3)));
    },
    getAccessKey: function() {
        return currentSession ? (currentSession.key || 'logado') : null;
    },
    hasModuleAccess: function(modulo) {
        return currentSession && currentSession.modulos && currentSession.modulos.includes(modulo);
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
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify(payload)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) { callback(data); })
        .catch(function(err) { callback({ status: 'error', message: 'Erro de rede ao conectar com o servidor: ' + err.message }); });
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
        
        document.getElementById('app-modal-close-btn').onclick = function() { 
            App.Core.UI.Modal.close(); 
        };
    },

    close: function() {
        var overlay = document.getElementById('app-modal-overlay');
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        document.getElementById('app-modal-actions').innerHTML = '';
    }
};

// ==========================================
// ROTEADOR DE VIEWS (SHELL)
// ==========================================
function toggleView() {
    var viewMapa = document.getElementById('view-mapa');
    var viewEventos = document.getElementById('view-eventos');
    
    var iconAgendaD = document.querySelector('#btn-toggle-view #icon-agenda');
    var iconMapaD = document.querySelector('#btn-toggle-view #icon-mapa');
    var iconAgendaM = document.querySelector('#btn-toggle-view-mobile #icon-agenda');
    var iconMapaM = document.querySelector('#btn-toggle-view-mobile #icon-mapa');
    
    var titleDesktop = document.getElementById('app-title-desktop');
    var titleMobile = document.getElementById('app-title-mobile');
    
    if (!viewMapa.classList.contains('hidden')) {
        viewMapa.classList.add('hidden');
        viewEventos.classList.remove('hidden');
        
        if(iconAgendaD) iconAgendaD.classList.add('hidden');
        if(iconMapaD) iconMapaD.classList.remove('hidden');
        if(iconAgendaM) iconAgendaM.classList.add('hidden');
        if(iconMapaM) iconMapaM.classList.remove('hidden');
        
        if (titleDesktop) titleDesktop.innerText = "Mapa de Eventos";
        if (titleMobile) titleMobile.innerHTML = "Mapa de Eventos <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";

        if (typeof initEventos === 'function') initEventos();
    } else {
        viewEventos.classList.add('hidden');
        viewMapa.classList.remove('hidden');
        
        if(iconAgendaD) iconAgendaD.classList.remove('hidden');
        if(iconMapaD) iconMapaD.classList.add('hidden');
        if(iconAgendaM) iconAgendaM.classList.remove('hidden');
        if(iconMapaM) iconMapaM.classList.add('hidden');

        if (titleDesktop) titleDesktop.innerText = "Mapa de Lideranças";
        if (titleMobile) titleMobile.innerHTML = "Mapa de Lideranças <span class='font-normal text-slate-400 text-lg'>(RJ)</span>";

        if (typeof applyFilters === 'function') applyFilters();
        var mobileStatusEl = document.getElementById('mobile-status-text');
        if (mobileStatusEl && geoDatabase.length > 0) {
            mobileStatusEl.innerText = "Tempo Real";
            mobileStatusEl.className = "text-[10px] font-medium text-emerald-500 mb-3 text-center";
        }
    }
}

// ==========================================
// CONTROLADOR PRINCIPAL (Movido do app.js)
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

    if (isPhone) {
        if (!passInput) {
            errorEl.innerText = "Digite a senha para o telefone informado.";
            errorEl.classList.remove('hidden');
            return;
        }
        try {
            var formattedPhone = App.Core.Utils.formatPhone(mainInput);
            var payload = { action: 'loginUser', phone: formattedPhone, password: passInput };
            var res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Erro ao logar.');
                });
            });
            App.Core.Controller.setupSession(res.session);
        } catch (err) {
            errorEl.innerText = err;
            errorEl.classList.remove('hidden');
        }
    } else {
        try {
            var payload = { action: 'performLogin', key: mainInput };
            var res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Chave inválida.');
                });
            });
            App.Core.Controller.setupSession(res.session);
        } catch (err) {
            errorEl.innerText = err;
            errorEl.classList.remove('hidden');
        }
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
        var cacheSuffix = currentSession.nivel || 'default';
        localStorage.removeItem(`painel_cache_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
        localStorage.removeItem(`painel_funcoes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
        localStorage.removeItem(`painel_equipes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    }
    location.reload();
};

App.Core.Controller.initApp = async function() {
    var statusEl = document.getElementById('status-text');
    var mobileStatusEl = document.getElementById('mobile-status-text');
    if(statusEl) {
        statusEl.innerText = "Carregando dados...";
        statusEl.className = "text-xs font-semibold text-sky-500 mt-1 animate-pulse";
    }
    if(mobileStatusEl) {
        mobileStatusEl.innerText = "Carregando";
        mobileStatusEl.className = "text-[10px] font-medium text-sky-500 animate-pulse";
    }

    var btnVerContatos = document.getElementById('btn-ver-contatos');
    if (btnVerContatos) {
        if (currentSession.nivel === '') btnVerContatos.classList.add('hidden');
        else btnVerContatos.classList.remove('hidden');
    }

    // Inicializa a Barra de Navegação Inferior
    App.Layout.Shell.init();

    var cacheSuffix = currentSession.nivel || 'default';
    var cacheKey = currentSession.key || 'logado';
    
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
        } catch(e) {
            console.error("Erro ao ler cache", e);
        }
    }

    // PRELOAD CONDICIONAL: Busca dados do Mapa e Eventos em paralelo
    let fetchPromises = [
        App.Mapa.Dados.fetchBairrosFromNetwork(),
        App.Mapa.Dados.fetchSpreadsheetData()
    ];

    // Se tiver acesso a Eventos (Módulo 2 ou 3), carrega os dados em segundo plano
    if (currentSession.modulos && (currentSession.modulos.includes(2) || currentSession.modulos.includes(3))) {
        // Tenta carregar do cache primeiro para já deixar pronto
        App.Eventos.Dados.loadFromCache();
        // Adiciona a busca na rede ao array de promessas paralelas
        fetchPromises.push(App.Eventos.Dados.fetchEventosData(true));
    }

    await Promise.all(fetchPromises);
};

// Controle de UI do Olho Mágico
App.Core.UI.togglePasswordVisibility = function() {
    var input = document.getElementById('password-input');
    var iconShow = document.getElementById('eye-icon-show');
    var iconHide = document.getElementById('eye-icon-hide');
    if (input.type === 'password') {
        input.type = 'text';
        iconShow.classList.add('hidden');
        iconHide.classList.remove('hidden');
    } else {
        input.type = 'password';
        iconShow.classList.remove('hidden');
        iconHide.classList.add('hidden');
    }
};

// Aliases globais temporários para o window.onload e HTML
window.performLogin = App.Core.Controller.performLogin;
window.logout = App.Core.Controller.logout;
window.toggleView = toggleView;
window.togglePasswordVisibility = App.Core.UI.togglePasswordVisibility;

window.onload = async function() { 
    // ROTEADOR: Verifica se é Modo Quiosque (QR Code)
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('kiosk') === 'true') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('kiosk-mode-overlay').classList.remove('hidden');
        if (typeof App.Eventos.Kiosk !== 'undefined') {
            App.Eventos.Kiosk.init(urlParams.get('event'), urlParams.get('token'));
        }
        return; 
    }

    // Fluxo Normal
    var savedSession = sessionStorage.getItem('painel_session');
    if (savedSession) {
        currentSession = JSON.parse(savedSession);
        if (currentSession.nivel === undefined && !currentSession.modulos) {
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
        
        keyInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') performLogin();
        });
        
        passInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') performLogin();
        });
        
        keyInput.addEventListener('input', function() {
            var cleanVal = this.value.replace(/\D/g, '');
            var isPhone = cleanVal.length >= 3 && /^\d+$/.test(this.value.trim().replace(/\s|\(|\)|-/g, ''));
            
            if (isPhone) {
                if (passWrapper.classList.contains('hidden')) {
                    passWrapper.classList.remove('hidden');
                }
            } else {
                if (!passWrapper.classList.contains('hidden')) {
                    passWrapper.classList.add('hidden');
                    passInput.value = '';
                    passInput.type = 'password';
                    eyeBtn.classList.add('hidden');
                    document.getElementById('eye-icon-show').classList.remove('hidden');
                    document.getElementById('eye-icon-hide').classList.add('hidden');
                }
            }
        });

        passInput.addEventListener('input', function() {
            if (this.value.length > 0) eyeBtn.classList.remove('hidden');
            else {
                eyeBtn.classList.add('hidden');
                this.type = 'password';
                document.getElementById('eye-icon-show').classList.remove('hidden');
                document.getElementById('eye-icon-hide').classList.add('hidden');
            }
        });
    }
};