// eventos_crud.js
App.Eventos.CRUD = (function() {
    let presenceList = []; 
    let currentEditingEventId = null;

    function init() {
        if (!App.Core.Security.canCreateEvent()) return;
        
        const monthControls = document.getElementById('month-controls');
        const subheaderContent = document.getElementById('subheader-content');
        
        if (monthControls && !document.getElementById('btn-new-event')) {
            const btn = document.createElement('button');
            btn.id = 'btn-new-event';
            btn.className = 'mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm';
            btn.innerText = '+ Novo Evento';
            btn.onclick = openCreateModal;
            monthControls.appendChild(btn);
        }
        
        if (subheaderContent && !document.getElementById('btn-new-event-sub')) {
            const btn = document.createElement('button');
            btn.id = 'btn-new-event-sub';
            btn.className = 'mt-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm';
            btn.innerText = '+ Novo';
            btn.onclick = openCreateModal;
            subheaderContent.appendChild(btn);
        }
    }

    function openCreateModal() {
        currentEditingEventId = null;
        const today = new Date().toLocaleDateString('pt-BR');
        renderEventModal("Criar Novo Evento", "Preencha os dados", {
            nome: "", data: today, tipo: "Desenvolvimento", bairro: "", descricao: "", rawJson: "[]"
        }, 'Salvar Evento', saveEvent);
    }

    function openEditModal(eventId) {
        currentEditingEventId = eventId;
        const ev = eventosDatabase.find(e => e.idEvento === eventId);
        if (!ev) return;
        
        renderEventModal("Editar Evento", ev.idEvento, {
            nome: ev.nome, data: ev.date.toLocaleDateString('pt-BR'), tipo: ev.tipo, 
            bairro: ev.bairro, descricao: ev.descricao, rawJson: ev.rawJson || "[]"
        }, 'Atualizar Evento', function() { updateEvent(eventId); });
    }

    function renderEventModal(title, subtitle, data, btnText, onClickFunc) {
        const overlay = document.getElementById('modal-contato-overlay');
        document.getElementById('contact-modal-name').innerText = title;
        document.getElementById('contact-modal-bairro').innerText = subtitle;
        document.getElementById('contact-modal-wpp-btn').classList.add('hidden');
        
        const qrSectionHTML = currentEditingEventId ? `
            <div class="border-t border-slate-200 pt-3 mt-3" id="qr-section">
                <h4 class="text-sm font-bold text-slate-700 mb-2">QR Code de Presença</h4>
                <div id="qr-code-display" class="flex flex-col items-center gap-2">
                    <button onclick="App.Eventos.CRUD.generateQR()" class="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Gerar QR Code</button>
                </div>
            </div>
        ` : `
            <div class="border-t border-slate-200 pt-3 mt-3" id="qr-section">
                <h4 class="text-sm font-bold text-slate-700 mb-2">QR Code de Presença</h4>
                <p class="text-xs text-slate-400 italic">Salve o evento primeiro para gerar o QR Code.</p>
            </div>
        `;

        document.getElementById('contact-modal-details').innerHTML = `
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Nome do Evento</label>
                    <input type="text" id="ev-nome" value="${data.nome}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Data (DD/MM/AAAA)</label>
                        <input type="text" id="ev-data" value="${data.data}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                        <select id="ev-tipo" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="Desenvolvimento" ${data.tipo === 'Desenvolvimento' ? 'selected' : ''}>Desenvolvimento</option>
                            <option value="Efetiva" ${data.tipo === 'Efetiva' ? 'selected' : ''}>Efetiva</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Bairro/Local</label>
                    <input type="text" id="ev-bairro" value="${data.bairro}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
                    <textarea id="ev-desc" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">${data.descricao}</textarea>
                </div>
                
                <div id="hier-builder-container"></div>
                
                ${qrSectionHTML}
            </div>
        `;
        
        setupSaveButton(btnText, onClickFunc);
        setupCloseButton();
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        
        App.UI.HierarchyBuilder.init('#hier-builder-container');
        if (data.rawJson && data.rawJson !== "[]") {
            App.UI.HierarchyBuilder.loadJson(data.rawJson);
        }
    }

    async function generateQR() {
        const eventId = currentEditingEventId;
        if (!eventId) {
            alert("Salve o evento antes de gerar o QR Code.");
            return;
        }

        const qrDisplay = document.getElementById('qr-code-display');
        qrDisplay.innerHTML = '<p class="text-xs text-slate-500 animate-pulse">Gerando...</p>';

        const payload = { action: 'generateQRToken', eventId: eventId };
        App.Core.API.postEvent(payload, function(res) {
            if (res.status === 'success') {
                const baseUrl = window.location.origin + window.location.pathname;
                const kioskUrl = baseUrl + '?kiosk=true&event=' + eventId + '&token=' + res.token;
                const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(kioskUrl)}&margin=10&r=${Date.now()}`;
                
                qrDisplay.innerHTML = `
                    <img src="${qrApiUrl}" alt="QR Code" class="w-48 h-48 rounded-xl shadow-md bg-white p-2">
                    <a href="${kioskUrl}" target="_blank" class="mt-2 text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline break-all text-center font-medium w-full">Abrir link de cadastro</a>
                    <button onclick="App.Eventos.CRUD.deactivateQR('${eventId}')" class="mt-2 px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors">Desativar QR Code</button>
                `;
            } else {
                qrDisplay.innerHTML = `<p class="text-xs text-rose-500">${res.message}</p>`;
            }
        });
    }

    function deactivateQR(eventId) {
        if(!confirm("Deseja desativar este QR Code?")) return;
        const qrDisplay = document.getElementById('qr-code-display');
        qrDisplay.innerHTML = '<p class="text-xs text-slate-500 animate-pulse">Desativando...</p>';

        const payload = { action: 'deactivateQRToken', eventId: eventId };
        App.Core.API.postEvent(payload, function(res) {
            if (res.status === 'success') {
                qrDisplay.innerHTML = `
                    <p class="text-xs text-rose-500 font-bold">QR Code Desativado</p>
                    <button onclick="App.Eventos.CRUD.generateQR()" class="mt-2 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Gerar Novo</button>
                `;
            } else {
                qrDisplay.innerHTML = `<p class="text-xs text-rose-500">${res.message}</p>`;
                setTimeout(() => { generateQR(); }, 2000);
            }
        });
    }

    // ==========================================
    // INICIAR ATUAÇÃO (AUTO CHECK-IN ORGANIZADOR)
    // ==========================================
    async function iniciarAtuacao(eventId) {
        const ev = eventosDatabase.find(e => e.idEvento === eventId);
        if (!ev) return;

        const userId = App.Core.Security.getUserId();
        
        // Verifica se o usuário logado está na hierarquia do evento
        let isParticipant = ev.participacoes.some(p => 
            p.coordenadorId === userId || p.supervisorId === userId || p.mobilizadorId === userId
        );

        let mobIdToUse = userId;
        
        // Se for Admin (003/999) testando e não estiver na árvore, pega o primeiro mobilizador da árvore
        if (!isParticipant) {
            let p = ev.participacoes.find(pa => pa.mobilizadorId && pa.mobilizadorId !== "ND");
            if (p) mobIdToUse = p.mobilizadorId;
            else { alert("Nenhum mobilizador neste evento para testes."); return; }
        }

        App.UI.Loader.show();
        const coords = await App.Core.Utils.getLocation();
        
        // 1. Registra o Auto-Check-in do Organizador (ele mesmo como presença)
        const autoCheckinPayload = {
            action: 'updatePresence',
            eventId: eventId,
            mobId: mobIdToUse,
            presence: mobIdToUse, // O próprio organizador é o participante
            userId: userId,
            lat: coords.lat,
            lng: coords.lng
        };

        try {
            await new Promise((resolve, reject) => {
                App.Core.API.postEvent(autoCheckinPayload, function(res) {
                    if (res.status === 'success') resolve(res);
                    else reject(res.message || 'Erro ao registrar atuação.');
                });
            });
            
            App.UI.Loader.hide();
            App.UI.SuccessToast.show(1000);
            
            // 2. Abre diretamente o modal de presença para cadastrar os participantes
            setTimeout(() => {
                openPresenceModal(eventId, mobIdToUse);
            }, 1100);

        } catch (err) {
            App.UI.Loader.hide();
            alert("Erro ao iniciar atuação: " + err);
        }
    }

    // ==========================================
    // PRESENÇA USANDO COMPONENTE REUTILIZÁVEL
    // ==========================================
    function openPresenceModal(eventId, mobId) {
        const ev = eventosDatabase.find(e => e.idEvento === eventId);
        if (!ev) return;
        
        const overlay = document.getElementById('modal-contato-overlay');
        document.getElementById('contact-modal-name').innerText = "Cadastrar Presença";
        document.getElementById('contact-modal-bairro').innerText = ev.nome + " (" + ev.idEvento + ")";
        document.getElementById('contact-modal-wpp-btn').classList.add('hidden');
        
        document.getElementById('contact-modal-details').innerHTML = '<div id="presence-form-container"></div>';
        
        setupCloseButton();
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');

        App.UI.ContactForm.init('#presence-form-container', {
            canEdit: true, // Ignora o bloqueio de RBAC para permitir o fluxo de presença
            saveButtonText: "Confirmar Presença",
            onCancel: function() {
                App.Eventos.CRUD.closeModal();
            },
            onSaveSuccess: async function(contactData) {
                const coords = await App.Core.Utils.getLocation();
                const userId = App.Core.Security.getUserId();

                const payload = {
                    action: 'updatePresence',
                    eventId: eventId,
                    mobId: mobId,
                    presence: contactData.id,
                    userId: userId,
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

                    let evInDb = eventosDatabase.find(e => e.idEvento === eventId);
                    if (evInDb) {
                        let p = evInDb.participacoes.find(pa => pa.mobilizadorId === mobId);
                        if (p) {
                            if (!p.presentesIds.includes(contactData.id)) {
                                p.presentesIds.push(contactData.id);
                                p.qtdPresentes = p.presentesIds.length;
                                evInDb.qtdPresentes = evInDb.participacoes.reduce((acc, curr) => acc + curr.qtdPresentes, 0);
                            }
                        }
                    }

                } catch (err) {
                    alert("Contato salvo, mas erro ao registrar presença: " + err);
                }
            }
        });
    }

    // ==========================================
    // SALVAMENTO DE EVENTOS
    // ==========================================
    function saveEvent() {
        if (!validateEventForm()) return;
        const payload = {
            action: 'createEvent',
            key: App.Core.Security.getAccessKey(),
            eventData: getFormData(),
            hierarquia: App.UI.HierarchyBuilder.getJson()
        };
        submitData(payload);
    }

    function updateEvent(eventId) {
        if (!validateEventForm()) return;
        const payload = {
            action: 'updateEvent',
            key: App.Core.Security.getAccessKey(),
            eventId: eventId,
            eventData: getFormData(),
            hierarquia: App.UI.HierarchyBuilder.getJson()
        };
        submitData(payload);
    }

    function validateEventForm() {
        const nome = document.getElementById('ev-nome').value.trim();
        const data = document.getElementById('ev-data').value.trim();
        const bairro = document.getElementById('ev-bairro').value.trim();
        if (!nome || !data || !bairro) {
            alert("Preencha Nome, Data e Bairro.");
            return false;
        }
        return true;
    }

    function getFormData() {
        return {
            nome: document.getElementById('ev-nome').value.trim(),
            data: document.getElementById('ev-data').value.trim(),
            tipo: document.getElementById('ev-tipo').value,
            bairro: document.getElementById('ev-bairro').value.trim(),
            descricao: document.getElementById('ev-desc').value.trim()
        };
    }

    function submitData(payload) {
        const saveBtn = document.getElementById('btn-save-event');
        saveBtn.innerText = 'Salvando...';
        saveBtn.disabled = true;
        App.UI.Loader.show();

        App.Core.API.postEvent(payload, function(res) {
            App.UI.Loader.hide();
            saveBtn.innerText = 'Salvar Evento';
            saveBtn.disabled = false;
            
            if (res.status === 'success') {
                App.UI.SuccessToast.show(1500);
                closeModal();
                try { localStorage.removeItem(`painel_cache_${currentSession.key}_default_v2`); } catch(e){}
                fetchEventosData(); 
            } else {
                alert("Erro: " + res.message);
            }
        });
    }

    function setupSaveButton(text, onClickFunc) {
        const wppBtnParent = document.getElementById('contact-modal-wpp-btn').parentElement;
        let saveBtn = document.getElementById('btn-save-event');
        if (!saveBtn) {
            saveBtn = document.createElement('button');
            saveBtn.id = 'btn-save-event';
            saveBtn.className = 'w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg mt-4';
            wppBtnParent.appendChild(saveBtn);
        }
        saveBtn.innerText = text;
        saveBtn.onclick = onClickFunc;
    }

    function setupCloseButton() {
        const overlay = document.getElementById('modal-contato-overlay');
        const closeBtn = overlay.querySelector('button[onclick="closeContactModal()"], button[onclick="App.Eventos.CRUD.closeModal()"]');
        if (closeBtn) closeBtn.setAttribute('onclick', 'App.Eventos.CRUD.closeModal()');
    }

    function closeModal() {
        const overlay = document.getElementById('modal-contato-overlay');
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        
        const saveBtn = document.getElementById('btn-save-event');
        if (saveBtn) saveBtn.remove();
        
        const closeBtn = overlay.querySelector('button[onclick="App.Eventos.CRUD.closeModal()"]');
        if(closeBtn) closeBtn.setAttribute('onclick', 'closeContactModal()');
        
        currentEditingEventId = null;
    }

    return {
        init: init,
        openCreateModal: openCreateModal,
        openEditModal: openEditModal,
        openPresenceModal: openPresenceModal,
        generateQR: generateQR,
        deactivateQR: deactivateQR,
        closeModal: closeModal,
        iniciarAtuacao: iniciarAtuacao 
    };
})();

window.initCrud = App.Eventos.CRUD.init;