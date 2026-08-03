// mapa_mobile.js
window.App = window.App || {};
App.Mapa = App.Mapa || {};

// ==========================================
// MÓDULO: MOBILE DO MAPA (App.Mapa.Mobile)
// ==========================================
App.Mapa.Mobile = {
    getMobileIndicator: function(delta, count) {
        var arrow = '';
        var colorClass = 'text-blue-500';
        
        if (delta > 0) {
            arrow = '↑';
            colorClass = 'text-emerald-500';
        } else if (delta < 0) {
            arrow = '↓';
            colorClass = 'text-rose-500';
        }
        
        var formattedCount = String(count).padStart(2, '0');
        return '<span class="' + colorClass + '">' + (arrow ? arrow + ' ' : '') + formattedCount + '</span>';
    },

    initMobileList: function() {
        var listContainer = document.getElementById('mobile-list-content');
        listContainer.innerHTML = ''; 

        // Inicializa o listener genérico para todas as sanfonas
        App.UI.AccordionList.initGlobalListener('#mobile-list-content');

        let nivel = currentSession.nivel || '';
        let arrNivel = Array.isArray(nivel) ? nivel : [nivel.toString()];
        let isTotal = arrNivel.includes('000') || arrNivel.includes('TOTAL');
        let isCard = arrNivel.includes('003') || arrNivel.includes('CARD');
        let isZap = arrNivel.includes('002') || arrNivel.includes('ZAP');
        let isNome = arrNivel.includes('001') || arrNivel.includes('NOME');
        let temAcesso = isTotal || isCard || isZap || isNome;

        geoDatabase.forEach(function(data) {
            var uiColor = colorsMap[data.regiao] || { text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-400" };
            
            var cardHtml = App.UI.AccordionList.createCard({
                title: data.bairro,
                badge: '0',
                badgeLabel: 'leads',
                uiColor: uiColor,
                isCollapsible: temAcesso
            });
            
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardHtml;
            var cardEl = tempDiv.firstElementChild;
            
            listContainer.appendChild(cardEl);
            data.domMobileCard = cardEl; 
        });
    },

    renderMobileList: function() {
        var listContainer = document.getElementById('mobile-list-content');
        var useGrouping = currentRegionFilter !== 'all' && regionHasSubzonas(currentRegionFilter);

        if (useGrouping) {
            var bairrosVisiveis = geoDatabase.filter(function(d) { return d.isVisible; });
            listContainer.innerHTML = '';

            if (bairrosVisiveis.length === 0) {
                listContainer.innerHTML = '<div class="text-center text-slate-400 py-10 text-sm">Nenhum contato encontrado para os filtros selecionados.</div>';
                return;
            }

            var subzonas = getSubzonasForRegion(currentRegionFilter, bairrosVisiveis);
            var uiColor = colorsMap[currentRegionFilter] || { text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-400" };
            var trendIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 inline-block mr-1 -mt-0.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>';

            subzonas.forEach(function(sz) {
                var isExpanded = expandedSubzonas.has(currentRegionFilter + '::' + sz.nome);
                var weekInd = getMobileIndicator(sz.deltaSemana, sz.semanaAtual);
                var monthInd = getMobileIndicator(sz.deltaMes, sz.mesAtual);
                var safeName = sz.nome.replace(/'/g, "\\'");

                var wrapper = document.createElement('div');
                wrapper.className = 'flex flex-col gap-2.5';
                wrapper.innerHTML = '<div class="mobile-lead-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer" onclick="App.Mapa.Mobile.toggleSubzona(\'' + currentRegionFilter + '\', \'' + safeName + '\')">' +
                    '<div class="flex items-center gap-4">' +
                        '<div class="w-10 h-10 rounded-xl ' + uiColor.dot + ' bg-opacity-10 flex items-center justify-center flex-shrink-0">' +
                            '<div class="w-3 h-3 rounded-full ' + uiColor.dot + '"></div>' +
                        '</div>' +
                        '<div class="flex-1 min-w-0">' +
                            '<p class="text-sm font-bold text-slate-800 truncate">' + sz.nome + '</p>' +
                            '<div class="flex items-center gap-1 text-[10px] font-bold mt-0.5">' + trendIcon + weekInd + '<span class="text-slate-300 mx-0">/</span>' + monthInd + '</div>' +
                        '</div>' +
                        '<div class="text-right flex-shrink-0">' +
                            '<p class="text-2xl font-extrabold ' + uiColor.text + ' leading-none">' + sz.total + '</p>' +
                            '<p class="text-[10px] text-slate-400 font-medium mt-1">leads</p>' +
                        '</div>' +
                        '<svg class="w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0 ' + (isExpanded ? 'rotate-180' : '') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>' +
                    '</div>' +
                '</div>' +
                '<div class="subzona-content flex flex-col gap-2.5 ml-4 pl-3 border-l-2 ' + uiColor.border + ' ' + (isExpanded ? '' : 'hidden') + '"></div>';

                var contentDiv = wrapper.querySelector('.subzona-content');

                sz.bairros.forEach(function(b) {
                    if (b.domMobileCard) {
                        contentDiv.appendChild(b.domMobileCard);
                        b.domMobileCard.classList.remove('is-hidden-mobile');
                        b.domMobileCard.classList.add('subzona-child');
                        b.domMobileCard.classList.remove('bg-white', 'shadow-sm', 'border-slate-100');
                        b.domMobileCard.classList.add('bg-slate-50/60', 'shadow-none', 'border-slate-200/60');
                        var countEl = b.domMobileCard.querySelector('.count-number');
                        if (countEl) {
                            countEl.classList.remove('text-2xl');
                            countEl.classList.add('text-xl');
                        }
                    }
                });

                listContainer.appendChild(wrapper);
            });
        } else {
            listContainer.innerHTML = '';
            geoDatabase.forEach(function(data) {
                if (data.domMobileCard) {
                    listContainer.appendChild(data.domMobileCard);
                    data.domMobileCard.classList.remove('subzona-child');
                    data.domMobileCard.classList.remove('bg-slate-50/60', 'shadow-none', 'border-slate-200/60');
                    data.domMobileCard.classList.add('bg-white', 'shadow-sm', 'border-slate-100');
                    var countEl = data.domMobileCard.querySelector('.count-number');
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
};

// Aliases globais
window.toggleSubzona = App.Mapa.Mobile.toggleSubzona;
window.initMobileList = App.Mapa.Mobile.initMobileList;
window.getMobileIndicator = App.Mapa.Mobile.getMobileIndicator;