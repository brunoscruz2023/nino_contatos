let currentRegionFilter = 'all';
let currentFunctionFilter = 'all';
let currentTeamFilter = 'all';

// Estado do accordion de subzonas (UX: tap to expand/collapse, aninhado com accordion de bairro).
// Set de chaves "regiao::subzona" que estao expandidas no momento. Resetado em changeRegionFilter.
let expandedSubzonas = new Set();

// Verifica se uma regiao tem pelo menos um bairro com subzona cadastrada.
function regionHasSubzonas(regionName) {
    return geoDatabase.some(d => d.regiao === regionName && d.subzona);
}

// Agrupa bairros visiveis de uma regiao por subzona. Retorna array ordenado:
//   [{ nome, bairros: [bairroObj, ...], total, semanaAtual, semanaPassada, deltaSemana, mesAtual, mesPassado, deltaMes }, ...]
// Bairros sem subzona caem no grupo "Demais bairros" (so e incluido se houver pelo menos 1).
// Calcula metricas agregadas (semana/mes) somando as dos bairros pertencentes.
function getSubzonasForRegion(regionName, bairrosVisiveis) {
    const grupos = {};
    bairrosVisiveis.forEach(b => {
        const sz = b.subzona || 'Demais bairros';
        if (!grupos[sz]) grupos[sz] = { nome: sz, bairros: [], total: 0, semanaAtual: 0, semanaPassada: 0, mesAtual: 0, mesPassado: 0 };
        grupos[sz].bairros.push(b);
        grupos[sz].total += b.totalVisivel || 0;
        grupos[sz].semanaAtual += b.semanaAtual || 0;
        grupos[sz].semanaPassada += b.semanaPassada || 0;
        grupos[sz].mesAtual += b.mesAtual || 0;
        grupos[sz].mesPassado += b.mesPassado || 0;
    });
    Object.values(grupos).forEach(g => {
        g.deltaSemana = g.semanaAtual - g.semanaPassada;
        g.deltaMes = g.mesAtual - g.mesPassado;
    });
    // Ordena: subzonas nomeadas primeiro (alfabetica), "Demais bairros" por ultimo
    return Object.values(grupos).sort((a, b) => {
        if (a.nome === 'Demais bairros') return 1;
        if (b.nome === 'Demais bairros') return -1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
    });
}

// Toggle do accordion de subzona. State e resetado ao trocar de regiao (changeRegionFilter).
function toggleSubzona(regionName, subzonaName) {
    const key = `${regionName}::${subzonaName}`;
    if (expandedSubzonas.has(key)) {
        expandedSubzonas.delete(key);
    } else {
        expandedSubzonas.add(key);
    }
    applyFilters();
}
window.toggleSubzona = toggleSubzona;

function toggleKebabMenu() {
    const menu = document.getElementById('kebab-menu');
    const overlay = document.getElementById('kebab-overlay');
    menu.classList.toggle('hidden');
    overlay.classList.toggle('hidden');
}

function togglePasswordVisibility() {
    const input = document.getElementById('key-input');
    const iconShow = document.getElementById('eye-icon-show');
    const iconHide = document.getElementById('eye-icon-hide');
    if (input.type === 'password') {
        input.type = 'text';
        iconShow.classList.add('hidden');
        iconHide.classList.remove('hidden');
    } else {
        input.type = 'password';
        iconShow.classList.remove('hidden');
        iconHide.classList.add('hidden');
    }
}

async function performLogin() {
    const keyInput = document.getElementById('key-input');
    const errorEl = document.getElementById('login-error');
    const key = keyInput.value;
    
    if (!key) return;
    errorEl.classList.add('hidden');

    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:cb_acessos&sheet=${encodeURIComponent(ACESSOS_SHEET_NAME)}`;
        const data = await fetchJsonp(url, 'cb_acessos');
        
        let foundTeams = null;
        let foundNivel = "";
        
        if (data && data.table && data.table.rows) {
            data.table.rows.forEach(row => {
                if (row.c[0] && row.c[0].v) {
                    if (row.c[0].v === key) { 
                        foundTeams = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "";
                        foundNivel = row.c[2] && row.c[2].v ? row.c[2].v.toString().trim().toUpperCase() : "";
                    }
                }
            });
        }

        if (foundTeams !== null) {
            let teamsArray = foundTeams.toUpperCase().split(',').map(t => t.trim()).filter(t => t.length > 0);
            if (teamsArray.length === 0) teamsArray = ["TODAS"]; 
            
            currentSession = { key: key, teams: teamsArray, nivel: foundNivel };
            sessionStorage.setItem('painel_session', JSON.stringify(currentSession));
            
            document.getElementById('login-overlay').style.display = 'none';
            keyInput.value = '';
            
            initApp();
        } else {
            errorEl.innerText = "Chave inválida. Tente novamente.";
            errorEl.classList.remove('hidden');
        }
    } catch (e) {
        errorEl.innerText = "Erro de conexão. Verifique sua internet e tente novamente.";
        errorEl.classList.remove('hidden');
    }
}

function logout() {
    sessionStorage.removeItem('painel_session');
    if (currentSession) {
        const cacheSuffix = currentSession.nivel || 'default';
        localStorage.removeItem(`painel_cache_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
        localStorage.removeItem(`painel_funcoes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
        localStorage.removeItem(`painel_equipes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    }
    location.reload();
}

function handleFetchError() {
    clearTimeout(fetchTimeout);
    const statusEl = document.getElementById('status-text');
    const mobileStatusEl = document.getElementById('mobile-status-text');
    
    if (geoDatabase.length > 0) {
        if(statusEl) {
            statusEl.innerText = "Modo Offline (Cache)";
            statusEl.className = "text-xs font-semibold text-rose-500 mt-1";
        }
        if(mobileStatusEl) {
            mobileStatusEl.innerText = "Offline";
            mobileStatusEl.className = "text-[10px] font-medium text-rose-500";
        }
    } else {
        if(statusEl) {
            statusEl.innerText = "Erro ao carregar dados";
            statusEl.className = "text-xs font-semibold text-rose-500 mt-1";
        }
        if(mobileStatusEl) {
            mobileStatusEl.innerText = "Erro";
            mobileStatusEl.className = "text-[10px] font-medium text-rose-500";
        }
    }
}

function populateFilters() {
    const selectFuncoesMobile = document.getElementById('function-filter');
    const selectFuncoesDesktop = document.getElementById('desktop-function-filter');
    
    selectFuncoesMobile.innerHTML = '<option value="all">Todas as Funções</option>';
    selectFuncoesDesktop.innerHTML = '<option value="all">Todas</option>';

    allFunctionsList.forEach(funcao => {
        let opt1 = document.createElement('option');
        opt1.value = funcao;
        opt1.innerText = funcao;
        selectFuncoesMobile.appendChild(opt1);
        
        let opt2 = document.createElement('option');
        opt2.value = funcao;
        opt2.innerText = funcao;
        selectFuncoesDesktop.appendChild(opt2);
    });

    const selectTeamMobile = document.getElementById('mobile-team-filter');
    const selectTeamDesktop = document.getElementById('desktop-team-filter');
    const wrapperMobile = document.getElementById('mobile-team-wrapper');
    const wrapperDesktop = document.getElementById('desktop-team-wrapper');
    
    selectTeamMobile.innerHTML = '<option value="all">Todas as Equipes</option>';
    selectTeamDesktop.innerHTML = '<option value="all">Todas</option>';
    
    if (currentSession && currentSession.teams.includes("TODAS")) {
        wrapperMobile.classList.remove('hidden');
        wrapperDesktop.classList.remove('hidden');
        wrapperDesktop.classList.add('flex');
        
        allTeamsList.forEach(team => {
            let opt1 = document.createElement('option');
            opt1.value = team;
            opt1.innerText = team;
            selectTeamMobile.appendChild(opt1);
            
            let opt2 = document.createElement('option');
            opt2.value = team;
            opt2.innerText = team;
            selectTeamDesktop.appendChild(opt2);
        });
    } else {
        wrapperMobile.classList.add('hidden');
        wrapperDesktop.classList.add('hidden');
        wrapperDesktop.classList.remove('flex');
    }
}

function getCalloutPath(x1, y1, x2, y2) {
    return `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
}

function initMap() {
    const container = document.getElementById('map-bounds');
    const svgLayer = document.getElementById('svg-lines-layer');
    container.innerHTML = '';
    svgLayer.innerHTML = '';

    geoDatabase.forEach((data) => {
        const uiColor = colorsMap[data.regiao];
        const strokeColor = svgStrokeColors[data.regiao];
        const finalTextX = data.textX !== undefined ? data.textX : data.x + 4;
        const finalTextY = data.textY !== undefined ? data.textY : data.y - 8;

        const point = document.createElement('div');
        point.className = `map-point ${uiColor.dot}`;
        point.style.left = `${data.x}%`;
        point.style.top = `${data.y}%`;
        point.setAttribute('data-region', data.regiao);
        container.appendChild(point);

        const label = document.createElement('div');
        label.className = `map-label ${uiColor.text}`;
        label.style.left = `${finalTextX}%`;
        label.style.top = `${finalTextY}%`;
        label.setAttribute('data-region', data.regiao);
        container.appendChild(label);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', getCalloutPath(data.x, data.y, finalTextX, finalTextY));
        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', "0.25");
        path.setAttribute('fill', 'none');
        path.setAttribute('data-region', data.regiao);
        svgLayer.appendChild(path);

        data.domPoint = point;
        data.domLabel = label;
        data.domLine = path;
    });
}

function initMobileList() {
    const listContainer = document.getElementById('mobile-list-content');
    listContainer.innerHTML = ''; 

    geoDatabase.forEach(data => {
        const uiColor = colorsMap[data.regiao];
        const card = document.createElement('div');
        card.className = 'mobile-lead-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm';
        card.setAttribute('data-region', data.regiao);
        
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl ${uiColor.dot} bg-opacity-10 flex items-center justify-center flex-shrink-0">
                    <div class="w-3 h-3 rounded-full ${uiColor.dot}"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-slate-800 truncate">${data.bairro}</p>
                    <div class="flex items-center gap-1 text-[10px] font-bold mt-0.5 card-metrics"></div>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-2xl font-extrabold ${uiColor.text} leading-none count-number">0</p>
                    <p class="text-[10px] text-slate-400 font-medium mt-1">leads</p>
                </div>
                <svg class="chevron-icon w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                </svg>
            </div>
            <div class="accordion-content w-full text-sm text-slate-600"></div>
        `;
        
        card.addEventListener('click', function() {
            if (currentSession.nivel === '') return; 
            const content = this.querySelector('.accordion-content');
            const chevron = this.querySelector('.chevron-icon');
            if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                content.style.maxHeight = '0px';
                chevron.classList.remove('rotate-180');
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                chevron.classList.add('rotate-180');
            }
        });

        if (currentSession.nivel === '') {
            card.querySelector('.chevron-icon').classList.add('hidden');
        }

        listContainer.appendChild(card);
        data.domMobileCard = card; 
    });
}

function changeRegionFilter(region) {
    currentRegionFilter = region;
    // Reset do estado de subzonas expandidas ao trocar de contexto de regiao.
    expandedSubzonas.clear();
    
    const mobileSelect = document.getElementById('mobile-region-filter');
    if(mobileSelect) mobileSelect.value = region;
    
    const buttons = document.querySelectorAll('#filter-wrapper button');
    buttons.forEach(b => b.className = "px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg md:rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all");
    
    const btnMap = { 'all': 'f-all', 'Zona Norte': 'f-zn', 'Zona Oeste': 'f-zo', 'Zona Sudoeste': 'f-zsd', 'Centro': 'f-cc', 'Baixada': 'f-bx', 'Zona Sul': 'f-zs', 'Região Leste': 'f-rl', 'Interior': 'f-int' };
    const activeBtn = document.getElementById(btnMap[region]);
    if(region === 'all') activeBtn.className = "px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg md:rounded-xl bg-slate-900 text-white transition-all shadow-sm";
    else activeBtn.className = `px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg md:rounded-xl ${colorsMap[region].dot} text-white transition-all shadow-sm`;

    applyFilters();
}

function changeFunctionFilter(funcao) {
    currentFunctionFilter = funcao;
    applyFilters();
}

function changeTeamFilter(team) {
    currentTeamFilter = team;
    
    const mobileSelect = document.getElementById('mobile-team-filter');
    const desktopSelect = document.getElementById('desktop-team-filter');
    if(mobileSelect) mobileSelect.value = team;
    if(desktopSelect) desktopSelect.value = team;
    
    applyFilters();
}

function toggleModalNomes() {
    const modal = document.getElementById('modal-nomes-overlay');
    const btn = document.getElementById('btn-ver-contatos');
    modal.classList.toggle('hidden');
    btn.classList.toggle('text-indigo-600');
    btn.classList.toggle('text-slate-400');
}

function closeContactModal() {
    document.getElementById('modal-contato-overlay').classList.add('hidden');
    document.getElementById('modal-contato-overlay').classList.remove('flex');
}
window.closeContactModal = closeContactModal;

function openContactModal(dIdx, nIdx) {
    const contato = geoDatabase[dIdx].nomes[nIdx];
    const bairro = geoDatabase[dIdx].bairro;
    
    document.getElementById('contact-modal-name').innerText = contato.nome;
    document.getElementById('contact-modal-bairro').innerText = bairro;
    
    let detailsHTML = '';
    
    if ((currentSession.nivel === 'CARD' || currentSession.nivel === 'TOTAL') && contato.ref) {
        detailsHTML += `<div class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500">Referência:</span><span class="text-slate-800 text-right">${contato.ref}</span></div>`;
    }
    
    if (contato.data) {
        const parsedDate = parseCustomDate(contato.data);
        const displayData = parsedDate ? parsedDate.toLocaleDateString('pt-BR') : contato.data;
        detailsHTML += `<div class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500">Data Cadastro:</span><span class="text-slate-800">${displayData}</span></div>`;
    }
    
    if (currentSession.nivel === 'TOTAL' && contato.funcao) {
        detailsHTML += `<div class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500">Função:</span><span class="text-slate-800">${contato.funcao}</span></div>`;
    }
    
    document.getElementById('contact-modal-details').innerHTML = detailsHTML;
    
    const wppBtn = document.getElementById('contact-modal-wpp-btn');
    if (currentSession.nivel === 'TOTAL' && contato.fone) {
        wppBtn.href = `https://wa.me/${contato.fone}`;
        wppBtn.classList.remove('hidden');
    } else {
        wppBtn.classList.add('hidden');
    }
    
    const overlay = document.getElementById('modal-contato-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}
window.openContactModal = openContactModal;

function getMobileIndicator(delta, count) {
    let arrow = '';
    let colorClass = 'text-blue-500';
    
    if (delta > 0) {
        arrow = '↑';
        colorClass = 'text-emerald-500';
    } else if (delta < 0) {
        arrow = '↓';
        colorClass = 'text-rose-500';
    }
    
    const formattedCount = String(count).padStart(2, '0');
    return `<span class="${colorClass}">${arrow ? arrow + ' ' : ''}${formattedCount}</span>`;
}

function applyFilters() {
    const centerTotalCard = document.getElementById('central-total-card');
    let totalVisivelGeral = 0;

    if (currentRegionFilter === 'all') {
        centerTotalCard.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
        centerTotalCard.classList.add('scale-100', 'opacity-100');
    } else {
        centerTotalCard.classList.remove('scale-100', 'opacity-100');
        centerTotalCard.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
    }

    const todayDate = new Date();
    const currentMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    currentMonthStart.setHours(0,0,0,0);
    const lastMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
    lastMonthStart.setHours(0,0,0,0);

    // FASE 1: computar dados por bairro + atualizar mapa + atualizar conteudo do mobile card
    // Armazena computed data no proprio objeto `data` para uso posterior (renderMobileList, renderDesktopModal).
    geoDatabase.forEach((data, dIdx) => {
        let nomesFiltradosObj = data.nomes.filter(n => {
            let funcaoValida = (currentFunctionFilter === 'all' || n.funcao === currentFunctionFilter);
            let equipeValida = (currentTeamFilter === 'all' || n.equipe === currentTeamFilter);
            return funcaoValida && equipeValida;
        });

        let quantidade = nomesFiltradosObj.length;
        let isRegiaoValida = (currentRegionFilter === 'all' || data.regiao === currentRegionFilter);
        const isVisible = quantidade > 0 && isRegiaoValida;

        // Store computed data
        data.dIdx = dIdx;
        data.totalVisivel = quantidade;
        data.nomesFiltrados = nomesFiltradosObj;
        data.isVisible = isVisible;

        let semanaAtual = 0, semanaPassada = 0, mesAtual = 0, mesPassado = 0;
        if (isVisible) {
            totalVisivelGeral += quantidade;
            nomesFiltradosObj.forEach(n => {
                const leadDate = parseCustomDate(n.data);
                if (leadDate) {
                    if (leadDate >= currentWeekStart) semanaAtual++;
                    else if (leadDate >= lastWeekStart && leadDate < currentWeekStart) semanaPassada++;
                    if (leadDate >= currentMonthStart) mesAtual++;
                    else if (leadDate >= lastMonthStart && leadDate < currentMonthStart) mesPassado++;
                }
            });
        }
        data.semanaAtual = semanaAtual;
        data.semanaPassada = semanaPassada;
        data.deltaSemana = semanaAtual - semanaPassada;
        data.mesAtual = mesAtual;
        data.mesPassado = mesPassado;
        data.deltaMes = mesAtual - mesPassado;

        // Update map label/point/line
        if (isVisible) {
            data.domLabel.innerHTML = `
                <span class="text-2xl font-extrabold leading-none tracking-tight">${quantidade}</span>
                <span class="text-[9px] font-bold uppercase tracking-wider opacity-80 block mt-0.5">${data.bairro}</span>
            `;
            data.domPoint.classList.remove('is-filtered-out');
            data.domLabel.classList.remove('is-filtered-out');
            data.domLine.style.opacity = '0.7';
        } else {
            data.domPoint.classList.add('is-filtered-out');
            data.domLabel.classList.add('is-filtered-out');
            data.domLine.style.opacity = '0.05';
        }

        // Update mobile card content (somente para cards visiveis - matching existing behavior)
        if (data.domMobileCard && isVisible) {
            const trendIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 inline-block mr-1 -mt-0.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`;

            data.domMobileCard.querySelector('.count-number').innerText = quantidade;

            let mobileWeekIndicator = getMobileIndicator(data.deltaSemana, data.semanaAtual);
            let mobileMonthIndicator = getMobileIndicator(data.deltaMes, data.mesAtual);
            let metricsHTML = `${trendIcon}${mobileWeekIndicator}<span class="text-slate-300 mx-0">/</span>${mobileMonthIndicator}`;
            data.domMobileCard.querySelector('.card-metrics').innerHTML = metricsHTML;

            let nomesListaHTML = '';
            if (currentSession.nivel !== '') {
                nomesListaHTML = nomesFiltradosObj.map((n) => {
                    let originalIdx = data.nomes.indexOf(n);
                    if (currentSession.nivel === 'ZAP' && n.fone) {
                        return `<p class="py-1 border-b border-slate-100 last:border-0"><a href="https://wa.me/${n.fone}" target="_blank" class="text-blue-500 font-medium">${n.nome}</a></p>`;
                    } else if (currentSession.nivel === 'TOTAL' || currentSession.nivel === 'CARD') {
                        return `<p class="py-1 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2" onclick="openContactModal(${dIdx}, ${originalIdx})">${n.nome}</p>`;
                    } else {
                        return `<p class="py-1 border-b border-slate-100 last:border-0">• ${n.nome}</p>`;
                    }
                }).join('');
            } else {
                nomesListaHTML = `<p class="py-2 text-center text-slate-400 text-xs">Acesso restrito aos nomes.</p>`;
            }

            let contentDiv = data.domMobileCard.querySelector('.accordion-content');
            contentDiv.innerHTML = `<div class="pt-3 mt-3 border-t border-slate-100"><div class="flex flex-col">${nomesListaHTML}</div></div>`;

            // Reset bairro accordion state (existing behavior)
            contentDiv.style.maxHeight = '0px';
            data.domMobileCard.querySelector('.chevron-icon').classList.remove('rotate-180');
        }
    });

    // FASE 2: renderizar mobile list (linear ou agrupado por subzona)
    renderMobileList();

    // FASE 3: atualizar totais
    document.getElementById('txt-total-count').innerText = totalVisivelGeral.toLocaleString('pt-BR');
    document.getElementById('mobile-total-count').innerText = totalVisivelGeral.toLocaleString('pt-BR');

    // FASE 4: renderizar desktop modal (com agrupamento por subzona quando aplicavel)
    renderDesktopModal();
}

// ==========================================
// RENDER MOBILE LIST
// ==========================================
// Modo linear (currentRegionFilter === 'all' OU regiao sem subzonas):
//   bairros diretamente no container, visibilidade via is-hidden-mobile.
// Modo agrupado (regiao com subzonas):
//   bairros movidos para dentro de wrappers de subzona (accordion aninhado).
// Bairro cards sao movidos (appendChild), nao recriados - preserva event listeners e estado do accordion.
function renderMobileList() {
    const listContainer = document.getElementById('mobile-list-content');
    const useGrouping = currentRegionFilter !== 'all' && regionHasSubzonas(currentRegionFilter);

    if (useGrouping) {
        const bairrosVisiveis = geoDatabase.filter(d => d.isVisible);

        // Limpar container (remove subzona wrappers antigos; bairro cards serao re-anexados abaixo)
        listContainer.innerHTML = '';

        if (bairrosVisiveis.length === 0) {
            listContainer.innerHTML = `<div class="text-center text-slate-400 py-10 text-sm">Nenhum contato encontrado para os filtros selecionados.</div>`;
            return;
        }

        const subzonas = getSubzonasForRegion(currentRegionFilter, bairrosVisiveis);
        const uiColor = colorsMap[currentRegionFilter];
        const trendIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 inline-block mr-1 -mt-0.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`;

        subzonas.forEach(sz => {
            const isExpanded = expandedSubzonas.has(`${currentRegionFilter}::${sz.nome}`);
            const weekInd = getMobileIndicator(sz.deltaSemana, sz.semanaAtual);
            const monthInd = getMobileIndicator(sz.deltaMes, sz.mesAtual);
            const safeName = sz.nome.replace(/'/g, "\\'");

            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col gap-2.5';
            wrapper.innerHTML = `
                <div class="mobile-lead-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer"
                     onclick="toggleSubzona('${currentRegionFilter}', '${safeName}')">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl ${uiColor.dot} bg-opacity-10 flex items-center justify-center flex-shrink-0">
                            <div class="w-3 h-3 rounded-full ${uiColor.dot}"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-bold text-slate-800 truncate">${sz.nome}</p>
                            <div class="flex items-center gap-1 text-[10px] font-bold mt-0.5">
                                ${trendIcon}${weekInd}<span class="text-slate-300 mx-0">/</span>${monthInd}
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-2xl font-extrabold ${uiColor.text} leading-none">${sz.total}</p>
                            <p class="text-[10px] text-slate-400 font-medium mt-1">leads</p>
                        </div>
                        <svg class="w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
                <div class="subzona-content flex flex-col gap-2.5 ml-4 pl-3 border-l-2 ${uiColor.border} ${isExpanded ? '' : 'hidden'}"></div>
            `;

            const contentDiv = wrapper.querySelector('.subzona-content');

            // Mover bairro cards (ja criados e atualizados na FASE 1) para dentro do wrapper.
            // appendChild preserva event listeners e estado interno do DOM.
            // REFORCO VISUAL 1+2: indentacao lateral (border-l-2 colorida) no container + card
            // do bairro mais "leve" (fundo claro, sem sombra, borda suave, numero menor) para
            // indicar hierarquia subnivel vs card-pai da subzona.
            sz.bairros.forEach(b => {
                if (b.domMobileCard) {
                    contentDiv.appendChild(b.domMobileCard);
                    b.domMobileCard.classList.remove('is-hidden-mobile');
                    b.domMobileCard.classList.add('subzona-child');
                    b.domMobileCard.classList.remove('bg-white', 'shadow-sm', 'border-slate-100');
                    b.domMobileCard.classList.add('bg-slate-50/60', 'shadow-none', 'border-slate-200/60');
                    const countEl = b.domMobileCard.querySelector('.count-number');
                    if (countEl) {
                        countEl.classList.remove('text-2xl');
                        countEl.classList.add('text-xl');
                    }
                }
            });

            listContainer.appendChild(wrapper);
        });
    } else {
        // Modo linear: limpar container (remove subzona wrappers de render anterior) e re-anexar bairro cards
        listContainer.innerHTML = '';
        geoDatabase.forEach(data => {
            if (data.domMobileCard) {
                listContainer.appendChild(data.domMobileCard);
                // REVERTER REFORCO VISUAL 1+2: remover estilo "leve" aplicado no modo agrupado,
                // restaurando visual original do card (bg-white, sombra, borda cheia, numero grande).
                data.domMobileCard.classList.remove('subzona-child');
                data.domMobileCard.classList.remove('bg-slate-50/60', 'shadow-none', 'border-slate-200/60');
                data.domMobileCard.classList.add('bg-white', 'shadow-sm', 'border-slate-100');
                const countEl = data.domMobileCard.querySelector('.count-number');
                if (countEl) {
                    countEl.classList.remove('text-xl');
                    countEl.classList.add('text-2xl');
                }
                if (data.isVisible) {
                    data.domMobileCard.classList.remove('is-hidden-mobile');
                } else {
                    data.domMobileCard.classList.add('is-hidden-mobile');
                }
            }
        });
    }
}

// ==========================================
// RENDER DESKTOP MODAL (Contatos Mapeados)
// ==========================================
// Quando a regiao ativa tem subzonas, agrupa cards por subzona (com header de secao).
// Caso contrario, grid linear de cards (comportamento original).
function renderDesktopModal() {
    const modalContent = document.getElementById('modal-nomes-content');
    const bairrosVisiveis = geoDatabase.filter(d => d.isVisible);

    if (bairrosVisiveis.length === 0) {
        modalContent.innerHTML = `<div class="col-span-full text-center text-slate-400 py-10">Nenhum contato encontrado para os filtros selecionados.</div>`;
        return;
    }

    const useGrouping = currentRegionFilter !== 'all' && regionHasSubzonas(currentRegionFilter);
    let modalHTML = '';

    // Helper: build single bairro card HTML (identico ao comportamento original)
    const buildBairroCard = (data) => {
        const uiColor = colorsMap[data.regiao];
        const semanaArrow = data.deltaSemana > 0 ? '↑' : (data.deltaSemana < 0 ? '↓' : '–');
        const semanaColor = data.deltaSemana > 0 ? 'text-emerald-500' : (data.deltaSemana < 0 ? 'text-rose-500' : 'text-slate-500');
        const mesArrow = data.deltaMes > 0 ? '↑' : (data.deltaMes < 0 ? '↓' : '–');
        const mesColor = data.deltaMes > 0 ? 'text-emerald-500' : (data.deltaMes < 0 ? 'text-rose-500' : 'text-slate-500');

        let nomesModalHTML = '';
        if (currentSession.nivel !== '') {
            nomesModalHTML = data.nomesFiltrados.map((n) => {
                let originalIdx = data.nomes.indexOf(n);
                if (currentSession.nivel === 'ZAP' && n.fone) {
                    return `<span class="py-1 flex items-center gap-2 border-b border-slate-100 last:border-0"><a href="https://wa.me/${n.fone}" target="_blank" class="text-blue-500 font-medium">${n.nome}</a></span>`;
                } else if (currentSession.nivel === 'TOTAL' || currentSession.nivel === 'CARD') {
                    return `<span class="py-1 flex items-center gap-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2" onclick="openContactModal(${data.dIdx}, ${originalIdx})">${n.nome}</span>`;
                } else {
                    return `<span class="py-1 flex items-center gap-2 border-b border-slate-100 last:border-0">• ${n.nome}</span>`;
                }
            }).join('');
        } else {
            nomesModalHTML = `<div class="text-center text-slate-400 py-6 text-sm">Acesso aos nomes restrito para esta equipe.</div>`;
        }

        return `
            <div class="bg-white/70 p-4 rounded-xl border border-slate-200/80">
                <h3 class="font-bold text-slate-800 mb-3 flex items-center justify-between">
                    <span>${data.bairro}</span>
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full ${uiColor.dot} bg-opacity-10 ${uiColor.text}">${data.totalVisivel}</span>
                </h3>
                <div class="flex gap-4 text-xs font-bold mb-3">
                    <span class="${semanaColor}">${semanaArrow} Semana: ${data.semanaAtual}</span>
                    <span class="${mesColor}">${mesArrow} Mês: ${data.mesAtual}</span>
                </div>
                <div class="flex flex-col text-sm text-slate-600 max-h-40 overflow-y-auto pr-1">
                    ${nomesModalHTML}
                </div>
            </div>
        `;
    };

    if (useGrouping) {
        const subzonas = getSubzonasForRegion(currentRegionFilter, bairrosVisiveis);
        subzonas.forEach(sz => {
            const semanaArrow = sz.deltaSemana > 0 ? '↑' : (sz.deltaSemana < 0 ? '↓' : '–');
            const semanaColor = sz.deltaSemana > 0 ? 'text-emerald-500' : (sz.deltaSemana < 0 ? 'text-rose-500' : 'text-slate-500');
            const mesArrow = sz.deltaMes > 0 ? '↑' : (sz.deltaMes < 0 ? '↓' : '–');
            const mesColor = sz.deltaMes > 0 ? 'text-emerald-500' : (sz.deltaMes < 0 ? 'text-rose-500' : 'text-slate-500');

            modalHTML += `
                <div class="col-span-full mt-4 mb-1 first:mt-0">
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-200">
                        ${sz.nome}
                        <span class="text-slate-700 normal-case font-bold">${sz.total} leads</span>
                        <span class="${semanaColor} ml-auto">${semanaArrow} Sem: ${sz.semanaAtual}</span>
                        <span class="${mesColor}">${mesArrow} Mês: ${sz.mesAtual}</span>
                    </h3>
                </div>
            `;
            sz.bairros.forEach(data => {
                modalHTML += buildBairroCard(data);
            });
        });
    } else {
        bairrosVisiveis.forEach(data => {
            modalHTML += buildBairroCard(data);
        });
    }

    modalContent.innerHTML = modalHTML;
}

async function initApp() {
    const statusEl = document.getElementById('status-text');
    const mobileStatusEl = document.getElementById('mobile-status-text');
    if(statusEl) {
        statusEl.innerText = "Carregando dados...";
        statusEl.className = "text-xs font-semibold text-sky-500 mt-1 animate-pulse";
    }
    if(mobileStatusEl) {
        mobileStatusEl.innerText = "Carregando";
        mobileStatusEl.className = "text-[10px] font-medium text-sky-500 animate-pulse";
    }

    const btnVerContatos = document.getElementById('btn-ver-contatos');
    if (btnVerContatos) {
        if (currentSession.nivel === '') {
            btnVerContatos.classList.add('hidden');
        } else {
            btnVerContatos.classList.remove('hidden');
        }
    }

    const cacheSuffix = currentSession.nivel || 'default';
    const cachedData = localStorage.getItem(`painel_cache_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    const cachedFuncoes = localStorage.getItem(`painel_funcoes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    const cachedEquipes = localStorage.getItem(`painel_equipes_${currentSession.key}_${cacheSuffix}_${CACHE_VERSION}`);
    
    // 1. Carrega bairros do cache instantaneamente
    loadBairrosFromCache();

    // 2. Desenha a tela inicial com cache (se existir)
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

    // 3. Busca bairros atualizados na nuvem
    await fetchBairrosFromNetwork();

    // 4. Busca contatos atualizados na nuvem
    fetchSpreadsheetData(); 
}

window.onload = async () => { 
    const savedSession = sessionStorage.getItem('painel_session');
    if (savedSession) {
        currentSession = JSON.parse(savedSession);
        if (currentSession.nivel === undefined) {
            sessionStorage.removeItem('painel_session');
            location.reload();
            return;
        }
        document.getElementById('login-overlay').style.display = 'none';
        await initApp();
    } else {
        const keyInput = document.getElementById('key-input');
        const eyeBtn = document.getElementById('eye-btn');
        
        keyInput.focus();
        keyInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performLogin();
            }
        });
        
        keyInput.addEventListener('input', function() {
            if (this.value.length > 0) {
                eyeBtn.classList.remove('hidden');
            } else {
                eyeBtn.classList.add('hidden');
                this.type = 'password';
                document.getElementById('eye-icon-show').classList.remove('hidden');
                document.getElementById('eye-icon-hide').classList.add('hidden');
            }
        });
    }
};
