// eventos_kiosk.js
window.App = window.App || {};
App.Eventos = App.Eventos || {};

App.Eventos.Kiosk = {
    kioskState: {
        eventId: null,
        token: null,
        eventName: "",
        eventDate: "",
        authorizedMobId: null,
        foundContactId: null
    },

    init: async function(eventId, token) {
        this.kioskState.eventId = eventId;
        this.kioskState.token = token;

        document.getElementById('kiosk-status').innerText = "Validando QR Code...";
        document.getElementById('kiosk-status').className = "p-4 text-center text-sky-500 text-sm font-bold animate-pulse";

        try {
            var validatePayload = {
                action: 'validateKioskAccess',
                eventId: eventId,
                token: token
            };
            
            var isValid = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(validatePayload, function(res) {
                    if (res.status === 'success') resolve(res);
                    else reject(res.message || 'QR Code inválido ou desativado.');
                });
            });

            this.kioskState.eventName = isValid.eventName;
            this.kioskState.eventDate = isValid.eventDate ? new Date(isValid.eventDate).toLocaleDateString('pt-BR') : '';
            
            document.getElementById('kiosk-event-name').innerText = this.kioskState.eventName;
            document.getElementById('kiosk-event-date').innerText = this.kioskState.eventDate;

            this.showLoginScreen();

        } catch (err) {
            document.getElementById('kiosk-status').innerText = err;
            document.getElementById('kiosk-status').className = "p-4 text-center text-rose-500 text-sm font-bold";
            document.getElementById('kiosk-form-wrapper').classList.add('hidden');
        }
    },

    showLoginScreen: function() {
        var wrapper = document.getElementById('kiosk-form-wrapper');
        var phoneArea = document.getElementById('kiosk-phone-input').parentElement;
        phoneArea.style.display = 'none';
        document.getElementById('kiosk-contact-info').classList.add('hidden');
        document.getElementById('kiosk-new-contact-form').classList.add('hidden');
        document.getElementById('kiosk-submit-btn').classList.add('hidden');

        var loginDiv = document.getElementById('mobilizer-login-area');
        if (!loginDiv) {
            loginDiv = document.createElement('div');
            loginDiv.id = 'mobilizer-login-area';
            loginDiv.className = 'mb-6 text-center';
            wrapper.insertBefore(loginDiv, wrapper.firstChild);
        }
        
        loginDiv.innerHTML = `
            <label class="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Liberação do Mobilizador</label>
            <p class="text-sm text-slate-600 mb-4">Digite seu telefone para liberar este terminal:</p>
            <input type="tel" id="mob-login-phone" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" placeholder="(21) 99999-9999">
            <button onclick="App.Eventos.Kiosk.authorizeMobilizer()" class="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform">Liberar Terminal</button>
            <p id="mob-login-error" class="text-rose-500 text-xs mt-2 font-bold hidden"></p>
        `;
        
        document.getElementById('kiosk-status').innerText = "";
        document.getElementById('kiosk-status').className = "p-4 text-center text-slate-500 text-sm";
        
        var self = this;
        document.getElementById('mob-login-phone').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') self.authorizeMobilizer();
        });
    },

    authorizeMobilizer: async function() {
        var phoneInput = document.getElementById('mob-login-phone').value;
        var errorEl = document.getElementById('mob-login-error');
        var btn = document.querySelector('#mobilizer-login-area button');
        
        if (!phoneInput) return;
        
        btn.innerText = "Validando...";
        btn.disabled = true;
        errorEl.classList.add('hidden');

        var payload = {
            action: 'authorizeKioskMobilizer',
            eventId: this.kioskState.eventId,
            token: this.kioskState.token,
            phone: phoneInput
        };

        try {
            var res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Erro ao validar.');
                });
            });

            this.kioskState.authorizedMobId = res.mobId;
            this.showPresenceScreen();

        } catch (err) {
            errorEl.innerText = err;
            errorEl.classList.remove('hidden');
            btn.innerText = "Liberar Terminal";
            btn.disabled = false;
        }
    },

    showPresenceScreen: function() {
        var loginDiv = document.getElementById('mobilizer-login-area');
        if (loginDiv) loginDiv.remove();

        var phoneArea = document.getElementById('kiosk-phone-input').parentElement;
        phoneArea.style.display = 'block';
        
        var welcomeDiv = document.getElementById('mobilizer-welcome');
        if (!welcomeDiv) {
            welcomeDiv = document.createElement('div');
            welcomeDiv.id = 'mobilizer-welcome';
            welcomeDiv.className = 'bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-4 text-center';
            phoneArea.parentElement.insertBefore(welcomeDiv, phoneArea);
        }
        
        welcomeDiv.innerHTML = `
            <p class="text-sm text-emerald-600 font-bold">Terminal Liberado!</p>
            <p class="text-xs text-slate-500">Você pode cadastrar as presenças agora.</p>
        `;

        document.getElementById('kiosk-status').innerText = "";
        document.getElementById('kiosk-phone-input').focus();
        
        this.setupListeners();
    },

    setupListeners: function() {
        var self = this;
        var phoneInput = document.getElementById('kiosk-phone-input');
        
        // Evita adicionar listeners duplicados
        if (phoneInput.dataset.listenerAdded === 'true') return;
        phoneInput.dataset.listenerAdded = 'true';
        
        phoneInput.addEventListener('blur', function() {
            self.lookupContact(this.value);
        });

        document.getElementById('kiosk-submit-btn').addEventListener('click', function() {
            self.submitPresence();
        });
    },

    lookupContact: async function(rawPhone) {
        var formatted = App.Core.Utils.formatPhone(rawPhone);
        if (!formatted) return;

        // Mostra loading na busca
        var contactInfoDiv = document.getElementById('kiosk-contact-info');
        contactInfoDiv.classList.remove('hidden');
        document.getElementById('kiosk-contact-name').innerText = "Buscando...";
        document.getElementById('kiosk-contact-bairro').innerText = "";
        document.getElementById('kiosk-new-contact-form').classList.add('hidden');
        document.getElementById('kiosk-submit-btn').classList.add('hidden');

        var payload = {
            action: 'lookupContactByPhone',
            phone: formatted
        };

        try {
            var res = await new Promise((resolve, reject) => {
                App.Core.API.postEvent(payload, function(data) {
                    if (data.status === 'success') resolve(data);
                    else reject(data.message || 'Erro na busca.');
                });
            });

            if (res.contact) {
                this.kioskState.foundContactId = res.contact.id;
                document.getElementById('kiosk-contact-name').innerText = res.contact.nome;
                document.getElementById('kiosk-contact-bairro').innerText = res.contact.bairro;
                document.getElementById('kiosk-submit-btn').innerText = "Confirmar Presença";
                document.getElementById('kiosk-submit-btn').classList.remove('hidden');
                document.getElementById('kiosk-submit-btn').classList.remove('bg-sky-600');
                document.getElementById('kiosk-submit-btn').classList.add('bg-emerald-500');
            } else {
                this.handleNotFound(formatted);
            }
        } catch (err) {
            document.getElementById('kiosk-contact-name').innerText = "Erro: " + err;
        }
    },

    handleNotFound: function(formatted) {
        this.kioskState.foundContactId = null;
        document.getElementById('kiosk-contact-info').classList.add('hidden');
        document.getElementById('kiosk-new-contact-form').classList.remove('hidden');
        document.getElementById('kiosk-submit-btn').innerText = "Cadastrar e Confirmar";
        document.getElementById('kiosk-submit-btn').classList.remove('hidden');
        document.getElementById('kiosk-submit-btn').classList.remove('bg-emerald-500');
        document.getElementById('kiosk-submit-btn').classList.add('bg-sky-600');
        document.getElementById('kiosk-new-name').focus();
    },

    submitPresence: async function() {
        var btn = document.getElementById('kiosk-submit-btn');
        var statusEl = document.getElementById('kiosk-status');
        btn.disabled = true;
        btn.innerText = "Salvando...";
        statusEl.innerText = "";

        var phone = App.Core.Utils.formatPhone(document.getElementById('kiosk-phone-input').value);
        var finalId = this.kioskState.foundContactId;
        var isNewContact = false;

        try {
            if (!finalId) {
                var nome = document.getElementById('kiosk-new-name').value.trim();
                var bairro = document.getElementById('kiosk-new-bairro').value.trim();
                if (!nome || !bairro || !phone) {
                    throw new Error("Preencha Nome, Bairro e Celular.");
                }

                var createPayload = {
                    action: 'createContact',
                    bairro: bairro,
                    nome: nome,
                    telefone: phone,
                    ref: document.getElementById('kiosk-new-ref').value.trim(),
                    funcao: "MOBILIZADOR(A)",
                    equipe: document.getElementById('kiosk-new-equipe').value.trim()
                };

                var createRes = await new Promise((resolve, reject) => {
                    App.Core.API.postEvent(createPayload, function(res) {
                        if (res.status === 'success') resolve(res);
                        else reject(res.message || 'Erro ao criar contato.');
                    });
                });

                finalId = createRes.newId;
                isNewContact = true;
            }

            var presencePayload = {
                action: 'updatePresence',
                eventId: this.kioskState.eventId,
                mobId: this.kioskState.authorizedMobId, 
                presence: finalId
            };

            await new Promise((resolve, reject) => {
                App.Core.API.postEvent(presencePayload, function(res) {
                    if (res.status === 'success') resolve(res);
                    else reject(res.message || 'Erro ao salvar presença.');
                });
            });

            statusEl.innerText = "Presença registrada com sucesso!";
            statusEl.className = "p-4 text-center text-emerald-500 text-sm font-bold";
            this.resetForm();

        } catch (err) {
            statusEl.innerText = err;
            statusEl.className = "p-4 text-center text-rose-500 text-sm font-bold";
            btn.disabled = false;
            btn.innerText = this.kioskState.foundContactId ? "Confirmar Presença" : "Cadastrar e Confirmar";
        }
    },

    resetForm: function() {
        document.getElementById('kiosk-phone-input').value = '';
        document.getElementById('kiosk-contact-info').classList.add('hidden');
        document.getElementById('kiosk-new-contact-form').classList.add('hidden');
        document.getElementById('kiosk-submit-btn').classList.add('hidden');
        document.getElementById('kiosk-new-name').value = '';
        document.getElementById('kiosk-new-bairro').value = '';
        document.getElementById('kiosk-new-ref').value = '';
        document.getElementById('kiosk-new-equipe').value = '';
        document.getElementById('kiosk-submit-btn').disabled = false;
        document.getElementById('kiosk-phone-input').focus();
    }
};