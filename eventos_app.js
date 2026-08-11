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
    
    App.UI.AccordionList.initGlobalListener('#calendar-content-area');
    eventosInicializado = true;
    
    renderEventosView();
    
    if (eventosDatabase.length === 0) {
        fetchEventosData(false);
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

// ETAPA 4: Filtro ABAC aplicado
function getFilteredEventos() {
    let filtered = eventosDatabase;

    // Se for Atuante (001) e tiver um ID real, filtra apenas os eventos onde participa
    if (currentSession && currentSession.funcoes && currentSession.funcoes.agenda === '001' && currentSession.id && currentSession.id !== 'LEGADO' && currentSession.id !== 'ADMIN') {
        const userId = currentSession.id;
        filtered = filtered.filter(ev => {
            if (!ev.participacoes || ev.participacoes.length === 0) return false;
            return ev.participacoes.some(p => p.coordenadorId === userId || p.supervisorId === userId || p.mobilizadorId === userId);
        });
    }

    // Filtro de Região (Mapa)
    if (currentRegionFilter !== 'all') {
        filtered = filtered.filter(ev => {
            if (!ev.bairro) return false;
            let bairroInfo = geoDicionario[ev.bairro.toLowerCase()];
            return bairroInfo && bairroInfo.regiao === currentRegionFilter;
        });
    }
    
    return filtered;
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
    if (!contentArea) return;

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
    const uiColor = isDev 
        ? { text: "text-sky-600", dot: "bg-sky-500", border: "border-sky-400" } 
        : { text: "text-emerald-600", dot: "bg-emerald-500", border: "border-emerald-400" };
    
    // Constrói o mapa de presenças a partir do array achatado para passar ao renderizador
    let presencasMap = {};
    if (ev.participacoes && ev.participacoes.length > 0) {
        ev.participacoes.forEach(p => {
            if (p.mobilizadorId && p.mobilizadorId !== "ND") {
                presencasMap[p.mobilizadorId] = p.presentesIds;
            }
        });
    }

    // Utiliza o novo método de visualização do componente reutilizável
    let hierarquiaHTML = '';
    if (ev.rawJson && ev.rawJson !== "[]") {
        hierarquiaHTML = `<div class="border-t border-slate-100 pt-3 mb-3 space-y-2">` + 
                         App.UI.HierarchyBuilder.renderReadOnlyHtml(ev.rawJson, presencasMap) + 
                         `</div>`;
    }
    
    // ETAPA 5: Bloqueio Histórico (Não permite editar/check-in em eventos passados, exceto Admin)
    let evDate = new Date(ev.date);
    evDate.setHours(0, 0, 0, 0);
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let isPast = evDate < today;
    let isAdmin = currentSession && currentSession.funcoes && currentSession.funcoes.admin === '999';

    let canEdit = (!isPast || isAdmin) ? App.Core.Security.canCreateEvent() : false;
    let canCheckin = (!isPast || isAdmin) ? App.Core.Security.canCheckIn() : false;
    
    let actionButtons = '';
    if (canEdit || canCheckin) {
        let btnsHTML = '';
        if (canEdit) {
            btnsHTML += `<button onclick="event.stopPropagation(); App.Eventos.CRUD.openEditModal('${ev.idEvento}')" class="flex-1 px-3 py-1.5 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">Editar Evento</button>`;
        }
        if (canCheckin) {
            btnsHTML += `<button onclick="event.stopPropagation(); App.Eventos.CRUD.iniciarAtuacao('${ev.idEvento}')" class="flex-1 px-3 py-1.5 text-xs font-bold text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors">Iniciar Atuação</button>`;
            
            // Proteção: Pega o primeiro mobilizador válido se existir
            let firstMobId = '';
            if (ev.participacoes && ev.participacoes.length > 0) {
                let p = ev.participacoes.find(pa => pa.mobilizadorId && pa.mobilizadorId !== "ND");
                if (p) firstMobId = p.mobilizadorId;
            }
            btnsHTML += `<button onclick="event.stopPropagation(); App.Eventos.CRUD.openPresenceModal('${ev.idEvento}', '${firstMobId}')" class="flex-1 px-3 py-1.5 text-xs font-bold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors">Cadastrar Presença</button>`;
        }
        actionButtons = `<div class="flex gap-2 mt-4 border-t border-slate-100 pt-3 flex-wrap">${btnsHTML}</div>`;
    }
    
    return `
        <div class="accordion-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer">
            <div class="accordion-header flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl ${uiColor.dot} bg-opacity-10 flex items-center justify-center flex-shrink-0">
                    <div class="w-3 h-3 rounded-full ${uiColor.dot}"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-slate-800 truncate">${ev.nome}</p>
                    <div class="flex items-center gap-1 text-[10px] font-bold mt-0.5 card-metrics">
                        <span class="text-slate-500">${ev.bairro}</span>
                        <span class="text-slate-300 mx-0">/</span>
                        <span class="text-slate-500">${ev.date.toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-2xl font-extrabold ${uiColor.text} leading-none count-number">${ev.qtdPresentes}</p>
                    <p class="text-[10px] text-slate-400 font-medium mt-1">Presentes</p>
                </div>
                <svg class="chevron-icon w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                </svg>
            </div>
            <div class="accordion-content w-full text-sm text-slate-600" style="max-height: 0px; overflow: hidden; transition: max-height 0.3s ease-out;">
                <div class="pt-3 mt-3 border-t border-slate-100">
                    <div class="flex flex-col gap-4">
                        ${hierarquiaHTML}
                        ${ev.descricao ? `<p class="text-xs text-slate-500 italic">"${ev.descricao}"</p>` : ''}
                        ${actionButtons}
                    </div>
                </div>
            </div>
        </div>
    `;
}