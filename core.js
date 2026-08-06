// core.js

// ==========================================
// IDs e Nomes das Planilhas (Centralizado)
// ==========================================
var SHEET_ID = '1VGgM5QNBY0SiN3VuVYdQB78joPz9blvdrdHNQj9v73I'; // Planilha: Pessoal Campanha
var SHEET_NAME = 'Página1'; // Aba de Contatos
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
// MÓDULO: SEGURANÇA E RBAC (App.Core.Security)
// ==========================================
App.Core.Security = {
    getAccessKey: function() {
        return currentSession ? (currentSession.key || 'logado') : null;
    },
    getUserId: function() {
        return currentSession ? currentSession.id : null;
    },
    hasModuleAccess: function(modulo) {
        return currentSession && currentSession.funcoes && currentSession.funcoes[modulo] && currentSession.funcoes[modulo] !== '000';
    },
    canCreateEvent: function() {
        return this.hasModuleAccess('agenda') && (currentSession.funcoes.agenda === '003' || currentSession.funcoes.agenda === '999');
    },
    canCheckIn: function() {
        return this.hasModuleAccess('agenda') && ['001', '003', '999'].includes(currentSession.funcoes.agenda);
    },
    canEditContact: function() {
        return this.hasModuleAccess('cadastro') && (currentSession.funcoes.cadastro === '002' || currentSession.funcoes.cadastro === '999');
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
        var cacheSuffix = currentSession.funcoes.mapa || 'default';
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
    var cacheSuffix = currentSession.funcoes.mapa || 'default';
    
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
};

App.Core.UI.togglePasswordVisibility = function() {
    var input = document.getElementById('password-input');
    var iconShow = document.getElementById('eye-icon-show');
    var iconHide = document.getElementById('eye-icon-hide');
    if (input.type === 'password') { input.type = 'text'; iconShow.classList.add('hidden'); iconHide.classList.remove('hidden'); }
    else { input.type = 'password'; iconShow.classList.remove('hidden'); iconHide.classList.add('hidden'); }
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