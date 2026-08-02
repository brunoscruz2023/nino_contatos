// eventos_app.js
let currentCalendarDate = new Date();
let currentViewMode = 'month'; // 'month', 'week', 'day'
let activeWeekStartDate = null;
let activeDayDate = null;
let eventosInicializado = false;

function initEventos() {
    if (eventosInicializado) return;
    
    const container = document.getElementById('view-eventos');
    container.innerHTML = `
        <div class="max-w-6xl mx-auto p-4 md:p-6 w-full">
            
            <!-- Sub-cabeçalho dinâmico (Semanal/Diária) -->
            <div id="eventos-subheader" class="hidden sticky top-0 bg-white/95 backdrop-blur-md py-2 border-b border-slate-200 z-40 mb-4 rounded-b-xl shadow-sm flex items-center justify-start gap-1 px-1">
                <div id="subheader-content" class="flex flex-col items-center w-full gap-1"></div>
            </div>

            <!-- Cabeçalho do Calendário Mensal -->
            <div id="month-controls" class="flex flex-col items-center mb-4 gap-2 bg-white/95 backdrop-blur-md py-2 border-b border-slate-200 z-40 rounded-b-xl shadow-sm sticky top-0">
                <div class="flex gap-4 items-center">
                    <button onclick="navigate(-1)" class="p-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors">‹</button>
                    <span id="cal-period-label" class="font-bold text-lg w-48 text-center capitalize text-slate-800"></span>
                    <button onclick="navigate(1)" class="p-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors">›</button>
                </div>
                <div id="month-totals" class="text-xs font-bold text-slate-600"></div>
            </div>

            <div id="calendar-content-area"></div>
        </div>
    `;
    
    eventosInicializado = true;
    
    if (eventosDatabase.length === 0) {
        fetchEventosData();
    } else {
        renderEventosView();
    }
}

function navigate(delta) {
    if (currentViewMode === 'month') {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    } else if (currentViewMode === 'week') {
        activeWeekStartDate.setDate(activeWeekStartDate.getDate() + (delta * 7));
    } else if (currentViewMode === 'day') {
        activeDayDate.setDate(activeDayDate.getDate() + delta);
    }
    renderEventosView();
}

function setViewMode(mode) {
    currentViewMode = mode;
    if (mode === 'month') {
        activeWeekStartDate = null;
        activeDayDate = null;
    }
    renderEventosView();
}

function setWeekView(weekStartDateStr) {
    currentViewMode = 'week';
    activeWeekStartDate = new Date(weekStartDateStr);
    activeWeekStartDate.setHours(0,0,0,0);
    renderEventosView();
}

function setDayView(dayTimestamp) {
    currentViewMode = 'day';
    activeDayDate = new Date(dayTimestamp);
    activeDayDate.setHours(0,0,0,0);
    renderEventosView();
}

function getFilteredEventos() {
    if (currentRegionFilter === 'all') return eventosDatabase;
    
    return eventosDatabase.filter(ev => {
        if (!ev.bairro) return false;
        let bairroInfo = geoDicionario[ev.bairro.toLowerCase()];
        return bairroInfo && bairroInfo.regiao === currentRegionFilter;
    });
}

function getTotalsForPeriod(startDate, endDate) {
    let totalEventos = 0;
    let totalPessoas = 0;
    let sDate = new Date(startDate); sDate.setHours(0,0,0,0);
    let eDate = new Date(endDate); eDate.setHours(23,59,59,999);
    
    let filteredEvents = getFilteredEventos();
    filteredEvents.forEach(ev => {
        if (ev.date >= sDate && ev.date <= eDate) {
            totalEventos++;
            totalPessoas += ev.qtdPresentes;
        }
    });
    return { totalEventos, totalPessoas };
}

function updateEventosHeaderTotals(totals) {
    let totalsText = `${totals.totalEventos} Eventos | ${totals.totalPessoas} Pessoas`;
    
    const monthTotalsEl = document.getElementById('month-totals');
    if (monthTotalsEl) monthTotalsEl.innerText = totalsText;
    
    const subheaderTotalsEl = document.getElementById('subheader-totals');
    if (subheaderTotalsEl) subheaderTotalsEl.innerText = totalsText;

    const mobileCount = document.getElementById('mobile-total-count');
    const mobileStatus = document.getElementById('mobile-status-text');
    
    if (mobileCount) mobileCount.innerText = totals.totalEventos;
    if (mobileStatus) {
        mobileStatus.innerText = `${totals.totalPessoas} presentes`;
        mobileStatus.className = "text-[10px] font-medium text-emerald-500 mb-3 text-center";
    }
}

function renderEventosView() {
    const contentArea = document.getElementById('calendar-content-area');
    const monthControls = document.getElementById('month-controls');
    const subheader = document.getElementById('eventos-subheader');
    const subheaderContent = document.getElementById('subheader-content');
    
    let html = '';
    let filteredEvents = getFilteredEventos();
    let startDate, endDate, title;

    if (currentViewMode === 'month') {
        subheader.classList.add('hidden');
        monthControls.classList.remove('hidden');
        
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        document.getElementById('cal-period-label').innerText = currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let weekStartDate = new Date(year, month, 1);
        weekStartDate.setDate(weekStartDate.getDate() - firstDay);
        
        let totalDaysToRender = Math.ceil((firstDay + daysInMonth) / 7) * 7;

        html += `<div class="flex gap-1 mb-1 mt-2">`;
        html += `<div class="w-5 md:w-6 flex-shrink-0"></div>`;
        html += `<div class="grid grid-cols-7 flex-1 gap-1 md:gap-2">`;
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        days.forEach(d => html += `<div class="text-center font-bold text-xs text-slate-400 pb-1">${d}</div>`);
        html += `</div></div>`;

        let currentLoopDate = new Date(weekStartDate);
        let daysProcessed = 0;
        
        while (daysProcessed < totalDaysToRender) {
            let weekStartLoop = new Date(currentLoopDate);
            html += `<div class="flex gap-1 mb-1 md:mb-2">`;
            html += `<div class="w-5 md:w-6 flex-shrink-0 flex items-center justify-center">`;
            html += renderWeekButton(weekStartLoop);
            html += `</div>`;
            html += `<div class="grid grid-cols-7 flex-1 gap-1 md:gap-2">`;
            
            for (let i = 0; i < 7; i++) {
                let loopDate = new Date(currentLoopDate);
                let isCurrentMonth = loopDate.getMonth() === month;
                
                if (isCurrentMonth) {
                    const dayEvents = filteredEvents.filter(e => e.date.getTime() === loopDate.getTime());
                    let eventMarkers = '';
                    if (dayEvents.length > 0) {
                        dayEvents.forEach(ev => {
                            const color = ev.tipo.toLowerCase().startsWith('dev') ? 'bg-sky-500' : 'bg-emerald-500';
                            eventMarkers += `<div class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${color} mx-auto mt-0.5"></div>`;
                        });
                    }
                    const isToday = new Date().toDateString() === loopDate.toDateString();
                    html += `
                        <div onclick="setDayView(${loopDate.getTime()})" class="bg-white border ${isToday ? 'border-indigo-500' : 'border-slate-100'} rounded-lg p-1 md:p-2 min-h-[36px] md:min-h-[90px] cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center">
                            <span class="text-[9px] md:text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-700'}">${loopDate.getDate()}</span>
                            <div class="flex-1 flex flex-col justify-center items-center">${eventMarkers}</div>
                        </div>
                    `;
                } else {
                    html += `<div class="bg-slate-50 rounded-lg min-h-[36px] md:min-h-[90px]"></div>`;
                }
                currentLoopDate.setDate(currentLoopDate.getDate() + 1);
                daysProcessed++;
            }
            html += `</div></div>`;
        }

        html += `
            <div class="flex justify-end gap-4 mt-6 text-xs font-semibold text-slate-600">
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-sky-500"></span> Desenvolvimento</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-emerald-500"></span> Efetiva</span>
            </div>
        `;

    } else {
        subheader.classList.remove('hidden');
        monthControls.classList.add('hidden');

        if (currentViewMode === 'week') {
            startDate = new Date(activeWeekStartDate);
            endDate = new Date(activeWeekStartDate);
            endDate.setDate(endDate.getDate() + 6);
            
            let startStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            let endStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            startStr = startStr.charAt(0).toUpperCase() + startStr.slice(1);
            endStr = endStr.charAt(0).toUpperCase() + endStr.slice(1);
            title = `${startStr} - ${endStr}`;
        } else {
            startDate = new Date(activeDayDate);
            endDate = new Date(activeDayDate);
            title = startDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            title = title.charAt(0).toUpperCase() + title.slice(1);
        }

        const calIcon = `
            <button onclick="setViewMode('month')" class="flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Voltar para o Calendário">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="md:w-5 md:h-5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </button>
        `;

        subheaderContent.innerHTML = `
            <div class="flex items-center justify-start w-full gap-1">
                <div class="w-5 md:w-6 flex-shrink-0 flex items-center justify-center">${calIcon}</div>
                <div class="flex-1 flex items-center justify-center gap-2">
                    <button onclick="navigate(-1)" class="p-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors">‹</button>
                    <span class="font-bold text-sm md:text-lg text-slate-800 capitalize text-center">${title}</span>
                    <button onclick="navigate(1)" class="p-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors">›</button>
                </div>
            </div>
            <div id="subheader-totals" class="text-xs font-bold text-slate-600 mt-1"></div>
        `;

        html += `<div class="space-y-4 mt-4">`;

        let loopDate = new Date(startDate);
        while (loopDate <= endDate) {
            const dayEvents = filteredEvents.filter(e => e.date.getTime() === loopDate.getTime());
            
            if (currentViewMode === 'week') {
                const isToday = new Date().toDateString() === loopDate.toDateString();
                html += `<div class="mb-4">
                            <h4 onclick="setDayView(${loopDate.getTime()})" class="font-bold text-slate-700 mb-2 cursor-pointer hover:text-indigo-600 capitalize ${isToday ? 'text-indigo-600' : ''}">
                                ${loopDate.toLocaleDateString('pt-BR', { weekday: 'long' })}, ${loopDate.getDate()}
                            </h4>`;
            } else {
                html += `<div>`;
            }

            if (dayEvents.length > 0) {
                html += `<div class="space-y-3">`;
                dayEvents.forEach(ev => {
                    html += renderEventCard(ev);
                });
                html += `</div>`;
            } else if (currentViewMode === 'day') {
                html += `<p class="text-slate-400 text-sm text-center py-8">Nenhum evento agendado para este dia.</p>`;
            }
            
            html += `</div>`;
            loopDate.setDate(loopDate.getDate() + 1);
        }
        html += `</div>`;
    }

    contentArea.innerHTML = html;

    let totals = getTotalsForPeriod(startDate, endDate);
    updateEventosHeaderTotals(totals);
}

function renderWeekButton(weekStartDate) {
    return `
        <div onclick="setWeekView('${weekStartDate.toISOString()}')" class="flex items-center justify-center cursor-pointer h-full text-slate-400 hover:text-indigo-600 transition-colors" title="Ver esta semana">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="md:w-5 md:h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
        </div>
    `;
}

function renderEventCard(ev) {
    const isDev = ev.tipo.toLowerCase().startsWith('dev');
    const typeColor = isDev ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700';
    
    // Agrupa participações para exibição
    let hierarquiaHTML = '';
    if (ev.participacoes && ev.participacoes.length > 0) {
        hierarquiaHTML = '<div class="border-t border-slate-100 pt-3 mb-3 space-y-2">';
        
        let tree = {};
        ev.participacoes.forEach(p => {
            let cId = p.coordenadorId || "ND";
            let sId = p.supervisorId || "ND";
            let mId = p.mobilizadorId || "ND";

            if (!tree[cId]) tree[cId] = {};
            if (!tree[cId][sId]) tree[cId][sId] = {};
            if (!tree[cId][sId][mId]) {
                tree[cId][sId][mId] = { qtdPresentes: 0, presentesIds: [] };
            }
            tree[cId][sId][mId].qtdPresentes += p.qtdPresentes;
            tree[cId][sId][mId].presentesIds = tree[cId][sId][mId].presentesIds.concat(p.presentesIds);
        });

        for (let cId in tree) {
            let coordNome = cId === "ND" ? "Não definido" : (contatosBase[cId] ? contatosBase[cId].nome : cId);
            hierarquiaHTML += `
                <div class="border-l-2 border-indigo-300 pl-3">
                    <div class="flex gap-2 text-xs">
                        <span class="font-bold w-24 text-slate-400">Coordenador:</span>
                        <span class="font-medium text-slate-700">${coordNome}</span>
                    </div>
            `;

            for (let sId in tree[cId]) {
                let supNome = sId === "ND" ? "Não definido" : (contatosBase[sId] ? contatosBase[sId].nome : sId);
                hierarquiaHTML += `
                    <div class="mt-2 border-l-2 border-sky-300 pl-3">
                        <div class="flex gap-2 text-xs">
                            <span class="font-bold w-24 text-slate-400">Supervisor:</span>
                            <span class="font-medium text-slate-700">${supNome}</span>
                        </div>
                `;

                for (let mId in tree[cId][sId]) {
                    let mobNome = mId === "ND" ? "Não definido" : (contatosBase[mId] ? contatosBase[mId].nome : mId);
                    let mobData = tree[cId][sId][mId];
                    
                    let pPresencaHTML = mobData.presentesIds.map(id => {
                        const c = contatosBase[id];
                        return c ? `<span class="text-xs bg-slate-100 px-2 py-1 rounded mr-1 mb-1 inline-block">${c.nome}</span>` : '';
                    }).join('');

                    hierarquiaHTML += `
                        <div class="mt-2 border-l-2 border-emerald-300 pl-3">
                            <div class="flex gap-2 text-xs">
                                <span class="font-bold w-24 text-slate-400">Mobilizador:</span>
                                <span class="font-medium text-slate-700">${mobNome}</span>
                            </div>
                            ${pPresencaHTML ? `
                            <div class="flex gap-2 mt-1">
                                <span class="font-bold w-24 text-slate-400 text-xs">Presentes (${mobData.qtdPresentes}):</span>
                                <div class="flex-1 flex flex-wrap">${pPresencaHTML}</div>
                            </div>` : ''}
                        </div>
                    `;
                }
                hierarquiaHTML += `</div>`; 
            }
            hierarquiaHTML += `</div>`; 
        }
        hierarquiaHTML += '</div>';
    }
    
    // Botões de Ação (CRUD)
    let actionButtons = '';
    if (App.Core.Security.canCreateEvent()) {
        actionButtons = `
            <div class="flex gap-2 mt-4 border-t border-slate-100 pt-3">
                <button onclick="App.Eventos.CRUD.openEditModal('${ev.idEvento}')" class="flex-1 px-3 py-1.5 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">Editar Evento</button>
                <button onclick="App.Eventos.CRUD.openPresenceModal('${ev.idEvento}', '${ev.participacoes[0].mobilizadorId || ''}')" class="flex-1 px-3 py-1.5 text-xs font-bold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors">Cadastrar Presença</button>
            </div>
        `;
    }
    
    return `
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-bold text-slate-800">${ev.nome}</h4>
                <span class="text-xs font-bold px-2 py-1 rounded-full ${typeColor}">${ev.tipo}</span>
            </div>
            <p class="text-xs text-slate-500 mb-3"><strong>Local:</strong> ${ev.bairro} | <strong>Total Presentes:</strong> ${ev.qtdPresentes}</p>
            
            ${hierarquiaHTML}
            
            ${ev.descricao ? `<p class="text-xs text-slate-500 mt-3 italic border-t border-slate-100 pt-3">"${ev.descricao}"</p>` : ''}
            
            ${actionButtons}
        </div>
    `;
}