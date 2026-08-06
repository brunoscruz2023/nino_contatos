// eventos_kiosk.js
window.App = window.App || {};
App.Eventos = App.Eventos || {};

App.Eventos.Kiosk = {
    kioskState: {
        eventId: null,
        token: null,
        targetMobId: null,
        contatosBase: {},
        foundContactId: null
    },

    init: async function(eventId, token) {
        this.kioskState.eventId = eventId;
        this.kioskState.token = token;

        document.getElementById('kiosk-status').innerText = "Validando acesso...";
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

            this.kioskState.targetMobId = isValid.targetMobId;
            document.getElementById('kiosk-event-name').innerText = isValid.eventName;
            document.getElementById('kiosk-event-date').innerText = isValid.eventDate ? new Date(isValid.eventDate).toLocaleDateString('pt-BR') : '';

            document.getElementById('kiosk-status').innerText = "Carregando base de contatos...";
            await this.fetchContatosBase();

            this.setupListeners();

            document.getElementById('kiosk-status').innerText = "";
            document.getElementById('kiosk-status').className = "p-4 text-center text-slate-500 text-sm";
            document.getElementById('kiosk-phone-input').focus();

        } catch (err) {
            document.getElementById('kiosk-status').innerText = err;
            document.getElementById('kiosk-status').className = "p-4 text-center text-rose-500 text-sm font-bold";
            document.getElementById('kiosk-form-wrapper').classList.add('hidden');
        }
    },

    fetchContatosBase: async function() {
        var url = `https://docs.google.com/spreadsheets/d/1MRycZz_03uglcwJqYs_G3Kzc2osx6S_z9zYxGMAzsNM/gviz/tq?tqx=responseHandler:cb_kiosk_base&sheet=Base_Contatos`;
        var data = await App.Core.Utils.fetchJsonp(url, 'cb_kiosk_base');
        
        this.kioskState.contatosBase = {};
        if (data && data.table && data.table.rows) {
            data.table.rows.forEach(row => {
                if (row.c[2] && row.c[2].v) {
                    var fone = App.Core.Utils.formatPhone(row.c[2].v);
                    var id = row.c[25] && row.c[25].v ? row.c[25].v.toString().trim().toUpperCase() : "";
                    if (id) {
                        this.kioskState.contatosBase[fone] = {
                            id: id,
                            nome: row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "",
                            bairro: row.c[0] && row.c[0].v ? row.c[0].v.toString().trim() : "",
                            ref: row.c[3] && row.c[3].v ? row.c[3].v.toString().trim() : "",
                            equipe: row.c[5] && row.c[5].v ? row.c[5].v.toString().trim() : ""
                        };
                    }
                }
            });
        }
    },

    setupListeners: function() {
        var self = this;
        var phoneInput = document.getElementById('kiosk-phone-input');
        
        phoneInput.addEventListener('blur', function() {
            self.lookupContact(this.value);
        });

        document.getElementById('kiosk-submit-btn').addEventListener('click', function() {
            self.submitPresence();
        });
    },

    lookupContact: function(rawPhone) {
        var formatted = App.Core.Utils.formatPhone(rawPhone);
        if (!formatted) return;

        var contact = this.kioskState.contatosBase[formatted];
        
        if (contact) {
            this.kioskState.foundContactId = contact.id;
            document.getElementById('kiosk-contact-info').classList.remove('hidden');
            document.getElementById('kiosk-contact-name').innerText = contact.nome;
            document.getElementById('kiosk-contact-bairro').innerText = contact.bairro;
            document.getElementById('kiosk-new-contact-form').classList.add('hidden');
            document.getElementById('kiosk-submit-btn').innerText = "Confirmar Presença";
            document.getElementById('kiosk-submit-btn').classList.remove('hidden');
            document.getElementById('kiosk-submit-btn').classList.remove('bg-sky-600');
            document.getElementById('kiosk-submit-btn').classList.add('bg-emerald-500');
        } else {
            this.kioskState.foundContactId = null;
            document.getElementById('kiosk-contact-info').classList.add('hidden');
            document.getElementById('kiosk-new-contact-form').classList.remove('hidden');
            document.getElementById('kiosk-submit-btn').innerText = "Cadastrar e Confirmar";
            document.getElementById('kiosk-submit-btn').classList.remove('hidden');
            document.getElementById('kiosk-submit-btn').classList.remove('bg-emerald-500');
            document.getElementById('kiosk-submit-btn').classList.add('bg-sky-600');
            document.getElementById('kiosk-new-name').focus();
        }
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
                    key: 'kiosk_test', 
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
                key: 'kiosk_test',
                eventId: this.kioskState.eventId,
                mobId: this.kioskState.targetMobId,
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