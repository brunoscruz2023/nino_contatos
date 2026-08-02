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
        return currentSession && (currentSession.nivel === 'TOTAL' || currentSession.nivel === 'CARD' || currentSession.nivel === 'EDITOR');
    },
    getAccessKey: function() {
        return currentSession ? currentSession.key : null;
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
        // Usando text/plain para bypass de pre-flight CORS do Google Apps Script
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
    var keyInput = document.getElementById('key-input');
    var errorEl = document.getElementById('login-error');
    var key = keyInput.value;
    
    if (!key) return;
    errorEl.classList.add('hidden');

    try {
        var url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:cb_acessos&sheet=${encodeURIComponent(ACESSOS_SHEET_NAME)}`;
        var data = await App.Core.Utils.fetchJsonp(url, 'cb_acessos');
        
        var foundTeams = null;
        var foundNivel = "";
        var foundModulos = [];
        
        if (data && data.table && data.table.rows) {
            data.table.rows.forEach(function(row) {
                if (row.c[0] && row.c[0].v) {
                    if (row.c[0].v === key) { 
                        foundTeams = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "";
                        foundNivel = row.c[2] && row.c[2].v ? row.c[2].v.toString().trim().toUpperCase() : "";
                        var modulosStr = row.c[3] && row.c[3].v ? row.c[3].v.toString() : "1";
                        foundModulos = modulosStr.split(',').map(function(m) { return parseInt(m.trim()); }).filter(function(m) { return !isNaN(m); });
                    }
                }
            });
        }

        if (foundTeams !== null) {
            var teamsArray = foundTeams.toUpperCase().split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });
            if (teamsArray.length === 0) teamsArray = ["TODAS"]; 
            
            currentSession = { key: key, teams: teamsArray, nivel: foundNivel, modulos: foundModulos };
            sessionStorage.setItem('painel_session', JSON.stringify(currentSession));
            
            document.getElementById('login-overlay').style.display = 'none';
            keyInput.value = '';
            App.Core.Controller.initApp();
        } else {
            errorEl.innerText = "Chave inválida. Tente novamente.";
            errorEl.classList.remove('hidden');
        }
    } catch (e) {
        errorEl.innerText = "Erro de conexão. Verifique sua internet e tente novamente.";
        errorEl.classList.remove('hidden');
    }
};

App.Core.Controller.logout = function() {
    sessionStorage.removeItem('painel_session');
    if (currentSession) {
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

    var btnToggleDesktop = document.getElementById('btn-toggle-view');
    var btnToggleMobile = document.getElementById('btn-toggle-view-mobile');
    var hasEventosAccess = currentSession.modulos && (currentSession.modulos.includes(2) || currentSession.modulos.includes(3));
    if (btnToggleDesktop) btnToggleDesktop.classList.toggle('hidden', !hasEventosAccess);
    if (btnToggleMobile) btnToggleMobile.classList.toggle('hidden', !hasEventosAccess);

    var cacheSuffix = currentSession.nivel || 'default';
    var cachedData = localStorage.getItem(`painel_cache_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    var cachedFuncoes = localStorage.getItem(`painel_funcoes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    var cachedEquipes = localStorage.getItem(`painel_equipes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    
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

    await App.Mapa.Dados.fetchBairrosFromNetwork();
    App.Mapa.Dados.fetchSpreadsheetData(); 
};

// Aliases globais temporários para o window.onload e HTML
window.performLogin = App.Core.Controller.performLogin;
window.logout = App.Core.Controller.logout;
window.toggleView = toggleView;

window.onload = async function() { 
    // ROTEADOR: Verifica se é Modo Quiosque (QR Code)
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('kiosk') === 'true') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('kiosk-mode-overlay').classList.remove('hidden');
        if (typeof App.Eventos.Kiosk !== 'undefined') {
            App.Eventos.Kiosk.init(urlParams.get('event'), urlParams.get('token'));
        }
        return; // Para a execução aqui, não carrega o painel
    }

    // Fluxo Normal
    var savedSession = sessionStorage.getItem('painel_session');
    if (savedSession) {
        currentSession = JSON.parse(savedSession);
        if (currentSession.nivel === undefined) {
            sessionStorage.removeItem('painel_session');
            location.reload();
            return;
        }
        document.getElementById('login-overlay').style.display = 'none';
        await App.Core.Controller.initApp();
    } else {
        var keyInput = document.getElementById('key-input');
        var eyeBtn = document.getElementById('eye-btn');
        
        keyInput.focus();
        keyInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') performLogin();
        });
        
        keyInput.addEventListener('input', function() {
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