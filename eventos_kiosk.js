// eventos_kiosk.js
window.App = window.App || {};
App.Eventos = App.Eventos || {};

App.Eventos.Kiosk = {
    kioskState: {
        eventId: null,
        token: null,
        mobId: null,
        eventName: null,
        eventDate: null
    },

    init: async function(eventId, token) {
        this.kioskState.eventId = eventId;
        this.kioskState.token = token;

        // [BLOCO A — Item 1.3] Pré-carga de bairros e dicionários em paralelo à validação do token.
        // O modo quiosque pula o initApp, logo em dispositivos sem cache o formulário de
        // participantes abria sem sugestões de bairro, equipes e funções.
        // O carregamento é disparado sem await: o gate de validação do QR Code permanece imediato.
        App.Mapa.Dados.loadBairrosFromCache();      // síncrono: restaura cache local se existir
        App.Mapa.Dados.fetchBairrosFromNetwork();   // async: popula geoDicionario em background
        this.loadKioskDictionaries();               // async: popula window.dictsGlobal em background

        const statusEl = document.getElementById('kiosk-status');
        const wrapperEl = document.getElementById('kiosk-form-wrapper');
        
        statusEl.innerText = "Validando acesso ao evento...";
        statusEl.className = "p-4 text-center text-sky-500 text-sm font-bold animate-pulse";
        wrapperEl.classList.add('hidden');

        try {
            const payload = { action: 'validateKioskAccess', eventId: eventId, token: token };
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'QR Code inválido ou desativado.');
                });
            });

            this.kioskState.eventName = res.eventName;
            this.kioskState.eventDate = res.eventDate ? new Date(res.eventDate).toLocaleDateString('pt-BR') : '';

            document.getElementById('kiosk-event-name').innerText = this.kioskState.eventName;
            document.getElementById('kiosk-event-date').innerText = this.kioskState.eventDate;

            statusEl.innerText = "";
            statusEl.className = "p-4 text-center text-slate-500 text-sm";
            
            this.showMobilizerLogin();

        } catch (err) {
            statusEl.innerText = err;
            statusEl.className = "p-4 text-center text-rose-500 text-sm font-bold";
            document.getElementById('kiosk-event-name').innerText = "Erro de Acesso";
        }
    },

    // [BLOCO A — Item 1.3] Carrega dicionários (equipes, funções, etc.) no modo quiosque.
    // Fallback imediato do cache local + busca fresca em background.
    loadKioskDictionaries: function() {
        if (!window.dictsGlobal) {
            const cachedDicts = localStorage.getItem('dicts_global_cache');
            if (cachedDicts) {
                try { window.dictsGlobal = JSON.parse(cachedDicts); } catch(e) {}
            }
        }
        App.Core.API.postEvent({ action: 'getDictionaries' }, function(res) {
            if (res.status === 'success') {
                window.dictsGlobal = res;
                try { localStorage.setItem('dicts_global_cache', JSON.stringify(res)); } catch(e) {}
            }
        });
    },

    showMobilizerLogin: function() {
        const wrapperEl = document.getElementById('kiosk-form-wrapper');
        wrapperEl.classList.remove('hidden');
        
        wrapperEl.innerHTML = `
            <div class="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-8">
                <h3 class="text-lg font-bold text-slate-800 mb-2 text-center">Identificação do Organizador</h3>
                <p class="text-sm text-slate-500 mb-4 text-center">Digite seu telefone para iniciar a captação de presenças.</p>
                
                <label class="block text-xs font-bold text-slate-500 mb-1">Seu Telefone</label>
                <input type="tel" id="kiosk-mob-phone" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-bold" placeholder="(21) 99999-9999">
                
                <button onclick="App.Eventos.Kiosk.validateMobilizer()" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-4 hover:bg-indigo-700 transition-colors">
                    Iniciar Atuação
                </button>
            </div>
        `;
        document.getElementById('kiosk-mob-phone').focus();
    },

    validateMobilizer: async function() {
        const phoneInput = document.getElementById('kiosk-mob-phone').value;
        const formattedPhone = App.Core.Utils.formatPhone(phoneInput);
        const statusEl = document.getElementById('kiosk-status');

        if (!formattedPhone) return;

        App.UI.Loader.show();
        statusEl.innerText = "Validando organizador...";
        statusEl.className = "p-4 text-center text-sky-500 text-sm font-bold animate-pulse";

        const payload = {
            action: 'authorizeKioskMobilizer',
            eventId: this.kioskState.eventId,
            token: this.kioskState.token,
            phone: formattedPhone
        };

        try {
            const res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Erro ao validar.');
                });
            });

            this.kioskState.mobId = res.mobId;
            
            // Auto-Check-in do Organizador
            await this.autoCheckinMobilizer();

            App.UI.Loader.hide();
            App.UI.SuccessToast.show(1000);

            statusEl.innerText = "";
            statusEl.className = "p-4 text-center text-slate-500 text-sm";
            
            setTimeout(() => {
                this.showParticipantForm();
            }, 1100);

        } catch (err) {
            App.UI.Loader.hide();
            statusEl.innerText = err;
            statusEl.className = "p-4 text-center text-rose-500 text-sm font-bold";
        }
    },

    autoCheckinMobilizer: async function() {
        const coords = await App.Core.Utils.getLocation();
        const payload = {
            action: 'updatePresence',
            eventId: this.kioskState.eventId,
            mobId: this.kioskState.mobId,
            presence: this.kioskState.mobId, // Auto-check-in
            userId: 'KIOSK_MODE', // Identifica origem
            lat: coords.lat,
            lng: coords.lng
        };

        return new Promise((resolve, reject) => {
            App.Core.API.postEvent(payload, function(res) {
                if (res.status === 'success') resolve(res);
                else reject(res.message || 'Erro no auto check-in.');
            });
        });
    },

    showParticipantForm: function() {
        const wrapperEl = document.getElementById('kiosk-form-wrapper');
        wrapperEl.innerHTML = `
            <div class="max-w-md mx-auto mt-4">
                <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-4 text-center">
                    <p class="text-sm font-bold text-emerald-700">Equipamento Liberado para Captação</p>
                    <p class="text-xs text-emerald-600">Organizador ID: ${this.kioskState.mobId}</p>
                </div>
                <div id="kiosk-presence-container"></div>
            </div>
        `;

        // [BLOCO A — Item 1.3] Popula o dropdown de Função com o dicionário carregado
        // (antes o parâmetro era omitido e o select ficava vazio).
        let funcoesArray = [];
        if (window.dictsGlobal && window.dictsGlobal.funcoes_contato) {
            funcoesArray = window.dictsGlobal.funcoes_contato.map(f => f.nome);
        }

        App.UI.ContactForm.init('#kiosk-presence-container', {
            canEdit: true,
            saveButtonText: "Registrar Presença",
            funcoes: funcoesArray,
            onCancel: function() {
                // No kiosk, cancelar limpa o formulário para o próximo participante, não fecha o quiosque
                App.UI.ContactForm.clear();
                document.getElementById('form-phone').focus();
            },
            onSaveSuccess: async function(contactData) {
                const coords = await App.Core.Utils.getLocation();
                const payload = {
                    action: 'updatePresence',
                    eventId: App.Eventos.Kiosk.kioskState.eventId,
                    mobId: App.Eventos.Kiosk.kioskState.mobId,
                    presence: contactData.id,
                    userId: 'KIOSK_MODE',
                    lat: coords.lat,
                    lng: coords.lng
                };

                try {
                    await new Promise((resolve, reject) => {
                        App.Core.API.postEvent(payload, function(res) {
                            if (res.status === 'success') resolve(res);
                            else reject(res.message || 'Erro ao salvar presença.');
                        });
                    });
                } catch (err) {
                    alert("Contato salvo, mas erro ao registrar presença: " + err);
                }
            }
        });
    }
};