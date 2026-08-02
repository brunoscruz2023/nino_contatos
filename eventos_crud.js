// eventos_crud.js
App.Eventos.CRUD = (function() {
    let presenceList = []; 
    let currentEditingEventId = null; // Estado seguro para guardar o ID do evento no modal
    
    // CONFIGURAÇÃO DA URL BASE DO QUIOSQUE
    // Deixe vazio ("") para usar a URL atual (requer que o projeto rode em um servidor http, ex: Live Server).
    // Se for hospedar, coloque o domínio aqui (ex: "https://meupainel.com").
    const APP_BASE_URL = ""; 

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
        currentEditingEventId = null; // Novo evento, não há ID ainda
        const today = new Date().toLocaleDateString('pt-BR');
        renderEventModal("Criar Novo Evento", "Preencha os dados", {
            nome: "", data: today, tipo: "Desenvolvimento", bairro: "", descricao: "",
            coord: "", sup: "", mob: ""
        }, 'Salvar Evento', saveEvent);
    }

    function openEditModal(eventId) {
        currentEditingEventId = eventId; // Guarda o ID no estado do módulo
        const ev = eventosDatabase.find(e => e.idEvento === eventId);
        if (!ev) return;
        const p = ev.participacoes[0] || {};
        renderEventModal("Editar Evento", ev.idEvento, {
            nome: ev.nome, data: ev.date.toLocaleDateString('pt-BR'), tipo: ev.tipo, 
            bairro: ev.bairro, descricao: ev.descricao,
            coord: p.coordenadorId || "", sup: p.supervisorId || "", mob: p.mobilizadorId || ""
        }, 'Atualizar Evento', function() { updateEvent(eventId); });
    }

    function renderEventModal(title, subtitle, data, btnText, onClickFunc) {
        const overlay = document.getElementById('modal-contato-overlay');
        document.getElementById('contact-modal-name').innerText = title;
        document.getElementById('contact-modal-bairro').innerText = subtitle;
        document.getElementById('contact-modal-wpp-btn').classList.add('hidden');
        
        // Se for edição, já prepara a área do QR Code. Se for criação, avisa que precisa salvar antes.
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
                
                <div class="border-t border-slate-200 pt-3 mt-3">
                    <h4 class="text-sm font-bold text-slate-700 mb-2">Organização</h4>
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500">Coord. (Tel)</label>
                            ${renderPhoneInput('coord', data.coord)}
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500">Superv. (Tel)</label>
                            ${renderPhoneInput('sup', data.sup)}
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500">Mobil. (Tel)</label>
                            ${renderPhoneInput('mob', data.mob)}
                        </div>
                    </div>
                </div>
                
                ${qrSectionHTML}
            </div>
        `;
        
        setupSaveButton(btnText, onClickFunc);
        setupCloseButton();
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }

    // ==========================================
    // QR CODE LOGIC
    // ==========================================
    async function generateQR() {
        // Usa a variável de estado em vez de ler do DOM
        const eventId = currentEditingEventId;
        if (!eventId) {
            alert("Salve o evento antes de gerar o QR Code.");
            return;
        }

        const qrDisplay = document.getElementById('qr-code-display');
        qrDisplay.innerHTML = '<p class="text-xs text-slate-500 animate-pulse">Gerando...</p>';

        const payload = {
            action: 'generateQRToken',
            eventId: eventId
        };

        App.Core.API.postEvent(payload, function(res) {
            if (res.status === 'success') {
                // Garante a URL base correta (evita file:/// ao testar localmente)
                let baseUrl = APP_BASE_URL && APP_BASE_URL.trim() !== "" ? APP_BASE_URL : window.location.origin + window.location.pathname;
                
                // Avisa o usuário se estiver rodando localmente (file://)
                if (baseUrl.startsWith('file:///')) {
                    qrDisplay.innerHTML = `
                        <p class="text-xs text-rose-500 font-bold text-center">Atenção: Você está abrindo o sistema direto do computador (file:///).</p>
                        <p class="text-[10px] text-slate-500 mt-1 text-center">O QR Code não funcionará no celular. Use um servidor local (ex: Live Server) ou hospede o sistema.</p>
                    `;
                    return;
                }

                const kioskUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'kiosk=true&event=' + eventId + '&token=' + res.token;
                
                // Usa tamanho 500x500 para garantir a leitura no mobile, anti-cache para evitar imagem branca
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

        const payload = {
            action: 'deactivateQRToken',
            eventId: eventId
        };

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

    function renderPhoneInput(target, preId) {
        let prePhone = "";
        if (preId && contatosBase[preId]) prePhone = contatosBase[preId].telefone;
        
        return `
            <div class="relative">
                <input type="text" class="hier-phone w-full px-2 py-1 border border-slate-300 rounded text-xs" placeholder="Telefone..." value="${prePhone}" onblur="App.Eventos.CRUD.searchHierContact(this, '${target}')">
                <input type="hidden" id="ev-${target}" value="${preId || ''}">
                <div class="text-[9px] text-slate-500 mt-0.5 hier-name"></div>
            </div>
        `;
    }

    function searchHierContact(inputEl, target) {
        let phone = inputEl.value;
        let nameDiv = inputEl.nextElementSibling.nextElementSibling; 
        let hiddenInput = inputEl.nextElementSibling;
        
        if (!phone) {
            hiddenInput.value = '';
            nameDiv.innerText = '';
            return;
        }

        let formatted = App.Core.Utils.formatPhone(phone);
        let foundContact = null;
        for (let id in contatosBase) {
            if (contatosBase[id].telephone === formatted) {
                foundContact = { id: id, ...contatosBase[id] };
                break;
            }
        }

        if (foundContact) {
            hiddenInput.value = foundContact.id;
            nameDiv.innerText = foundContact.nome + ' (' + foundContact.id + ')';
            nameDiv.className = 'text-[9px] text-emerald-500 mt-0.5 hier-name';
        } else {
            hiddenInput.value = '';
            nameDiv.innerText = 'Inexistente';
            nameDiv.className = 'text-[9px] text-rose-500 mt-0.5 hier-name';
        }
    }

    function openPresenceModal(eventId, mobId) {
        const ev = eventosDatabase.find(e => e.idEvento === eventId);
        if (!ev) return;
        presenceList = []; 

        const overlay = document.getElementById('modal-contato-overlay');
        document.getElementById('contact-modal-name').innerText = "Cadastrar Presença";
        document.getElementById('contact-modal-bairro').innerText = ev.nome + " (" + ev.idEvento + ")";
        document.getElementById('contact-modal-wpp-btn').classList.add('hidden');
        
        document.getElementById('contact-modal-details').innerHTML = `
            <div class="space-y-3">
                <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div class="grid grid-cols-2 gap-2 mb-2">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500">Telefone</label>
                            <input type="text" id="pres-phone" class="w-full px-2 py-1 border border-slate-300 rounded text-xs" onblur="App.Eventos.CRUD.lookupPresenceContact()" placeholder="219...">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500">Equipe</label>
                            <input type="text" id="pres-equipe" class="w-full px-2 py-1 border border-slate-300 rounded text-xs">
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="block text-[10px] font-bold text-slate-500">Nome</label>
                        <input type="text" id="pres-nome" class="w-full px-2 py-1 border border-slate-300 rounded text-xs">
                    </div>
                    <div class="grid grid-cols-2 gap-2 mb-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500">Bairro</label>
                            <input type="text" id="pres-bairro" class="w-full px-2 py-1 border border-slate-300 rounded text-xs">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500">Referência</label>
                            <input type="text" id="pres-ref" class="w-full px-2 py-1 border border-slate-300 rounded text-xs">
                        </div>
                    </div>
                    <input type="hidden" id="pres-id" value="">
                    <button id="btn-add-presence" onclick="App.Eventos.CRUD.addPresenceToList()" class="w-full bg-sky-600 text-white py-1.5 text-xs font-bold rounded-lg hover:bg-sky-700 transition-colors">Adicionar à Lista</button>
                </div>
                
                <div id="presence-list-display" class="flex flex-wrap gap-1"></div>
            </div>
        `;
        
        setupSaveButton('Salvar Presença Final', function() { savePresence(eventId, mobId); });
        setupCloseButton();
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }

    function lookupPresenceContact() {
        let phone = document.getElementById('pres-phone').value;
        let formatted = App.Core.Utils.formatPhone(phone);
        
        document.getElementById('pres-id').value = '';
        document.getElementById('pres-nome').value = '';
        document.getElementById('pres-bairro').value = '';
        document.getElementById('pres-ref').value = '';
        document.getElementById('pres-equipe').value = '';
        document.getElementById('pres-equipe').readOnly = false;

        if (!formatted) return;

        let foundContact = null;
        for (let id in contatosBase) {
            if (contatosBase[id].telephone === formatted) {
                foundContact = { id: id, ...contatosBase[id] };
                break;
            }
        }

        if (foundContact) {
            document.getElementById('pres-id').value = foundContact.id;
            document.getElementById('pres-nome').value = foundContact.nome;
            document.getElementById('pres-bairro').value = foundContact.bairro;
            document.getElementById('pres-ref').value = foundContact.ref;
            document.getElementById('pres-equipe').value = foundContact.equipe;
        }
    }

    async function addPresenceToList() {
        let phone = document.getElementById('pres-phone').value.trim();
        let nome = document.getElementById('pres-nome').value.trim();
        let bairro = document.getElementById('pres-bairro').value.trim();
        let ref = document.getElementById('pres-ref').value.trim();
        let equipe = document.getElementById('pres-equipe').value.trim();
        let id = document.getElementById('pres-id').value;

        if (!phone || !nome || !bairro) {
            alert("Preencha Telefone, Nome e Bairro.");
            return;
        }

        const addBtn = document.getElementById('btn-add-presence');
        addBtn.innerText = 'Processando...';
        addBtn.disabled = true;

        let finalId = id;

        try {
            if (id) {
                let originalContact = contatosBase[id];
                let isModified = false;
                if (originalContact) {
                    if (originalContact.nome !== nome || 
                        originalContact.bairro !== bairro || 
                        originalContact.ref !== ref || 
                        originalContact.equipe !== equipe || 
                        originalContact.funcao !== "MOBILIZADOR(A)") {
                        isModified = true;
                    }
                }
                
                if (isModified) {
                    let payload = {
                        action: 'updateContact',
                        key: App.Core.Security.getAccessKey(),
                        id: id,
                        bairro: bairro, nome: nome, telephone: phone, ref: ref,
                        funcao: "MOBILIZADOR(A)", equipe: equipe
                    };
                    await new Promise((resolve, reject) => {
                        App.Core.API.postEvent(payload, function(data) {
                            if (data.status === 'success') resolve(data);
                            else reject(data);
                        });
                    });
                    contatosBase[id] = { nome, bairro, telephone: App.Core.Utils.formatPhone(phone), ref, funcao: "MOBILIZADOR(A)", equipe };
                }
            } else {
                let payload = {
                    action: 'createContact',
                    key: App.Core.Security.getAccessKey(),
                    bairro: bairro, nome: nome, telephone: phone, ref: ref,
                    funcao: "MOBILIZADOR(A)", equipe: equipe
                };
                const res = await new Promise((resolve, reject) => {
                    App.Core.API.postEvent(payload, function(data) {
                        if (data.status === 'success') resolve(data);
                        else reject(data);
                    });
                });
                finalId = res.newId;
                contatosBase[finalId] = { nome, bairro, telephone: App.Core.Utils.formatPhone(phone), ref, funcao: "MOBILIZADOR(A)", equipe };
            }
            
            presenceList.push(finalId);
            const display = document.getElementById('presence-list-display');
            const badge = document.createElement('span');
            badge.className = 'text-xs bg-slate-200 px-2 py-1 rounded flex items-center gap-1';
            badge.innerHTML = `${nome} <svg onclick="this.parentElement.remove()" class="w-3 h-3 cursor-pointer text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
            badge.dataset.id = finalId;
            display.appendChild(badge);

            document.getElementById('pres-phone').value = '';
            document.getElementById('pres-nome').value = '';
            document.getElementById('pres-bairro').value = '';
            document.getElementById('pres-ref').value = '';
            document.getElementById('pres-equipe').value = '';
            document.getElementById('pres-id').value = '';
            document.getElementById('pres-phone').focus();

        } catch (err) {
            alert("Erro ao salvar contato: " + (err.message || "Falha na rede."));
        } finally {
            addBtn.innerText = 'Adicionar à Lista';
            addBtn.disabled = false;
        }
    }

    function savePresence(eventId, mobId) {
        let ids = [];
        document.querySelectorAll('#presence-list-display span').forEach(span => {
            ids.push(span.dataset.id);
        });

        const payload = {
            action: 'updatePresence',
            key: App.Core.Security.getAccessKey(),
            eventId: eventId,
            mobId: mobId,
            presence: ids.join(', ')
        };
        
        const saveBtn = document.getElementById('btn-save-event');
        saveBtn.innerText = 'Salvando...';
        saveBtn.disabled = true;

        App.Core.API.postEvent(payload, function(res) {
            saveBtn.innerText = 'Salvar Presença';
            saveBtn.disabled = false;
            
            if (res.status === 'success') {
                closeModal();
                try { localStorage.removeItem(`painel_cache_${currentSession.key}_default_v2`); } catch(e){}
                fetchEventosData(); 
            } else {
                alert("Erro: " + res.message);
            }
        });
    }

    function saveEvent() {
        if (!validateEventForm()) return;
        const payload = {
            action: 'createEvent',
            key: App.Core.Security.getAccessKey(),
            eventData: getFormData(),
            hierarquia: getHierarquiaData()
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
            hierarquia: getHierarquiaData()
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
            description: document.getElementById('ev-desc').value.trim()
        };
    }

    function getHierarquiaData() {
        return {
            coordId: document.getElementById('ev-coord') ? document.getElementById('ev-coord').value.trim() : "",
            supId: document.getElementById('ev-sup') ? document.getElementById('ev-sup').value.trim() : "",
            mobId: document.getElementById('ev-mob') ? document.getElementById('ev-mob').value.trim() : ""
        };
    }

    function submitData(payload) {
        const saveBtn = document.getElementById('btn-save-event');
        saveBtn.innerText = 'Salvando...';
        saveBtn.disabled = true;

        App.Core.API.postEvent(payload, function(res) {
            saveBtn.innerText = 'Salvar Evento';
            saveBtn.disabled = false;
            
            if (res.status === 'success') {
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
        
        currentEditingEventId = null; // Limpa o estado ao fechar
    }

    return {
        init: init,
        openCreateModal: openCreateModal,
        openEditModal: openEditModal,
        openPresenceModal: openPresenceModal,
        searchHierContact: searchHierContact,
        lookupPresenceContact: lookupPresenceContact,
        addPresenceToList: addPresenceToList,
        generateQR: generateQR,
        deactivateQR: deactivateQR,
        closeModal: closeModal
    };
})();

window.initCrud = App.Eventos.CRUD.init;