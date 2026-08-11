// mapa_ui.js
window.App = window.App || {};
App.Mapa = App.Mapa || {};

var currentRegionFilter = 'all';
var currentFunctionFilter = 'all';
var currentTeamFilter = 'all';
var expandedSubzonas = new Set();

App.Mapa.UI = {
    regionHasSubzonas: function(regionName) { return geoDatabase.some(function(d) { return d.regiao === regionName && d.subzona; }); },

    getSubzonasForRegion: function(regionName, bairrosVisiveis) {
        var grupos = {};
        bairrosVisiveis.forEach(function(b) {
            var sz = b.subzona || 'Demais bairros';
            if (!grupos[sz]) grupos[sz] = { nome: sz, bairros: [], total: 0, semanaAtual: 0, semanaPassada: 0, mesAtual: 0, mesPassado: 0 };
            grupos[sz].bairros.push(b);
            grupos[sz].total += b.totalVisivel || 0;
            grupos[sz].semanaAtual += b.semanaAtual || 0;
            grupos[sz].semanaPassada += b.semanaPassada || 0;
            grupos[sz].mesAtual += b.mesAtual || 0;
            grupos[sz].mesPassado += b.mesPassado || 0;
        });
        Object.values(grupos).forEach(function(g) { g.deltaSemana = g.semanaAtual - g.semanaPassada; g.deltaMes = g.mesAtual - g.mesPassado; });
        return Object.values(grupos).sort(function(a, b) {
            if (a.nome === 'Demais bairros') return 1;
            if (b.nome === 'Demais bairros') return -1;
            return a.nome.localeCompare(b.nome, 'pt-BR');
        });
    },

    getCalloutPath: function(x1, y1, x2, y2) { return "M " + x1 + " " + y1 + " L " + x1 + " " + y2 + " L " + x2 + " " + y2; },

    initMap: function() {
        var container = document.getElementById('map-bounds');
        var svgLayer = document.getElementById('svg-lines-layer');
        container.innerHTML = '';
        svgLayer.innerHTML = '';

        geoDatabase.forEach(function(data) {
            var uiColor = colorsMap[data.regiao] || { text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-400" };
            var strokeColor = svgStrokeColors[data.regiao] || "#64748b";
            var finalTextX = data.textX !== undefined ? data.textX : data.x + 4;
            var finalTextY = data.textY !== undefined ? data.textY : data.y - 8;

            var point = document.createElement('div');
            point.className = "map-point " + uiColor.dot;
            point.style.left = data.x + '%'; point.style.top = data.y + '%';
            point.setAttribute('data-region', data.regiao);
            container.appendChild(point);

            var label = document.createElement('div');
            label.className = "map-label " + uiColor.text;
            label.style.left = finalTextX + '%'; label.style.top = finalTextY + '%';
            label.setAttribute('data-region', data.regiao);
            container.appendChild(label);

            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', App.Mapa.UI.getCalloutPath(data.x, data.y, finalTextX, finalTextY));
            path.setAttribute('stroke', strokeColor);
            path.setAttribute('stroke-width', "0.25");
            path.setAttribute('fill', 'none');
            path.setAttribute('data-region', data.regiao);
            svgLayer.appendChild(path);

            data.domPoint = point; data.domLabel = label; data.domLine = path;
        });
    },

    populateFilters: function() {
        var selectFuncoesMobile = document.getElementById('function-filter');
        var selectFuncoesDesktop = document.getElementById('desktop-function-filter');
        selectFuncoesMobile.innerHTML = '<option value="all">Todas as Funções</option>';
        selectFuncoesDesktop.innerHTML = '<option value="all">Todas</option>';
        allFunctionsList.forEach(function(funcao) {
            var opt1 = document.createElement('option'); opt1.value = funcao; opt1.innerText = funcao; selectFuncoesMobile.appendChild(opt1);
            var opt2 = document.createElement('option'); opt2.value = funcao; opt2.innerText = funcao; selectFuncoesDesktop.appendChild(opt2);
        });

        var selectTeamMobile = document.getElementById('mobile-team-filter');
        var selectTeamDesktop = document.getElementById('desktop-team-filter');
        var wrapperMobile = document.getElementById('mobile-team-wrapper');
        var wrapperDesktop = document.getElementById('desktop-team-wrapper');
        
        selectTeamMobile.innerHTML = '<option value="all">Todas as Equipes</option>';
        selectTeamDesktop.innerHTML = '<option value="all">Todas</option>';
        
        let userTeams = currentSession.teams.filter(t => t !== 'TODAS');
        let showFilters = currentSession.teams.includes("TODAS") || userTeams.length > 1;
        
        if (showFilters) {
            wrapperMobile.classList.remove('hidden'); 
            wrapperDesktop.classList.remove('hidden'); 
            wrapperDesktop.classList.add('flex');

            // Coleta todas as assinaturas de equipe existentes nos dados
            let allSignatures = new Set();
            geoDatabase.forEach(d => d.nomes.forEach(n => {
                if(n.rawEquipe) allSignatures.add(n.rawEquipe);
            }));

            let teamsToAnalyze = currentSession.teams.includes("TODAS") ? Array.from(allTeamsList) : userTeams;

            // Adiciona opções (Total) e (Apenas) para cada equipe individual
            teamsToAnalyze.forEach(team => {
                let optTotalM = document.createElement('option'); optTotalM.value = `total_${team}`; optTotalM.innerText = `${team} (Total)`; selectTeamMobile.appendChild(optTotalM);
                let optTotalD = document.createElement('option'); optTotalD.value = `total_${team}`; optTotalD.innerText = `${team} (Total)`; selectTeamDesktop.appendChild(optTotalD);

                if (allSignatures.has(team)) {
                    let optOnlyM = document.createElement('option'); optOnlyM.value = `only_${team}`; optOnlyM.innerText = `${team} (Apenas)`; selectTeamMobile.appendChild(optOnlyM);
                    let optOnlyD = document.createElement('option'); optOnlyD.value = `only_${team}`; optOnlyD.innerText = `${team} (Apenas)`; selectTeamDesktop.appendChild(optOnlyD);
                }
            });

            // Adiciona opções (Apenas) para as combinações de equipes
            allSignatures.forEach(sig => {
                let sigTeams = sig.split(',').map(s => s.trim());
                if (sigTeams.length > 1) {
                    let hasAccess = currentSession.teams.includes("TODAS") || sigTeams.some(t => userTeams.includes(t));
                    if (hasAccess) {
                        let optOnlyM = document.createElement('option'); optOnlyM.value = `only_${sig}`; optOnlyM.innerText = `${sig} (Apenas)`; selectTeamMobile.appendChild(optOnlyM);
                        let optOnlyD = document.createElement('option'); optOnlyD.value = `only_${sig}`; optOnlyD.innerText = `${sig} (Apenas)`; selectTeamDesktop.appendChild(optOnlyD);
                    }
                }
            });

        } else {
            wrapperMobile.classList.add('hidden'); 
            wrapperDesktop.classList.add('hidden'); 
            wrapperDesktop.classList.remove('flex');
        }
    },

    changeRegionFilter: function(region) {
        currentRegionFilter = region; expandedSubzonas.clear();
        var mobileSelect = document.getElementById('mobile-region-filter'); if(mobileSelect) mobileSelect.value = region;
        var buttons = document.querySelectorAll('#filter-wrapper button');
        buttons.forEach(function(b) { b.className = "px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg md:rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"; });
        var btnMap = { 'all': 'f-all', 'Zona Norte': 'f-zn', 'Zona Oeste': 'f-zo', 'Zona Sudoeste': 'f-zsd', 'Centro': 'f-cc', 'Baixada': 'f-bx', 'Zona Sul': 'f-zs', 'Região Leste': 'f-rl', 'Interior': 'f-int' };
        var activeBtn = document.getElementById(btnMap[region]);
        if(region === 'all') activeBtn.className = "px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg md:rounded-xl bg-slate-900 text-white transition-all shadow-sm";
        else activeBtn.className = "px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg md:rounded-xl " + (colorsMap[region] ? colorsMap[region].dot : 'bg-slate-500') + " text-white transition-all shadow-sm";
        App.Mapa.UI.applyFilters();
        var viewEventos = document.getElementById('view-eventos');
        if (viewEventos && !viewEventos.classList.contains('hidden')) { if (typeof renderEventosView === 'function') renderEventosView(); }
    },

    changeFunctionFilter: function(funcao) { currentFunctionFilter = funcao; App.Mapa.UI.applyFilters(); },
    changeTeamFilter: function(team) {
        currentTeamFilter = team;
        var mobileSelect = document.getElementById('mobile-team-filter'); var desktopSelect = document.getElementById('desktop-team-filter');
        if(mobileSelect) mobileSelect.value = team; if(desktopSelect) desktopSelect.value = team;
        App.Mapa.UI.applyFilters();
    },

    applyFilters: function() {
        var centerTotalCard = document.getElementById('central-total-card');
        var totalVisivelGeral = 0;
        if (currentRegionFilter === 'all') { centerTotalCard.classList.remove('opacity-0', 'scale-90', 'pointer-events-none'); centerTotalCard.classList.add('scale-100', 'opacity-100'); }
        else { centerTotalCard.classList.remove('scale-100', 'opacity-100'); centerTotalCard.classList.add('opacity-0', 'scale-90', 'pointer-events-none'); }

        var todayDate = new Date();
        var currentMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1); currentMonthStart.setHours(0,0,0,0);
        var lastMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1); lastMonthStart.setHours(0,0,0,0);

        let mapLvl = (currentSession && currentSession.funcoes) ? currentSession.funcoes.mapa : '000';
        let isTotal = mapLvl === '999';
        let isCard = mapLvl === '003';
        let isZap = mapLvl === '002';
        let isNome = mapLvl === '001';
        let temAcesso = isTotal || isCard || isZap || isNome;

        geoDatabase.forEach(function(data, dIdx) {
            var nomesFiltradosObj = data.nomes.filter(function(n) {
                var funcaoValida = (currentFunctionFilter === 'all' || n.funcao === currentFunctionFilter);
                
                var equipeValida = true;
                if (currentTeamFilter === 'all') {
                    equipeValida = true;
                } else if (currentTeamFilter.startsWith('total_')) {
                    let team = currentTeamFilter.substring(6);
                    equipeValida = n.equipes.includes(team);
                } else if (currentTeamFilter.startsWith('only_')) {
                    let signature = currentTeamFilter.substring(5);
                    equipeValida = n.rawEquipe === signature;
                }
                
                return funcaoValida && equipeValida;
            });

            var quantidade = nomesFiltradosObj.length;
            var isRegiaoValida = (currentRegionFilter === 'all' || data.regiao === currentRegionFilter);
            var isVisible = quantidade > 0 && isRegiaoValida;

            data.dIdx = dIdx; data.totalVisivel = quantidade; data.nomesFiltrados = nomesFiltradosObj; data.isVisible = isVisible;

            var semanaAtual = 0, semanaPassada = 0, mesAtual = 0, mesPassado = 0;
            if (isVisible) {
                totalVisivelGeral += quantidade;
                nomesFiltradosObj.forEach(function(n) {
                    var leadDate = App.Core.Utils.parseCustomDate(n.data);
                    if (leadDate) {
                        if (leadDate >= currentWeekStart) semanaAtual++;
                        else if (leadDate >= lastWeekStart && leadDate < currentWeekStart) semanaPassada++;
                        if (leadDate >= currentMonthStart) mesAtual++;
                        else if (leadDate >= lastMonthStart && leadDate < currentMonthStart) mesPassado++;
                    }
                });
            }
            data.semanaAtual = semanaAtual; data.semanaPassada = semanaPassada; data.deltaSemana = semanaAtual - semanaPassada;
            data.mesAtual = mesAtual; data.mesPassado = mesPassado; data.deltaMes = mesAtual - mesPassado;

            if (isVisible) {
                data.domLabel.innerHTML = '<span class="text-2xl font-extrabold leading-none tracking-tight">' + quantidade + '</span><span class="text-[9px] font-bold uppercase tracking-wider opacity-80 block mt-0.5">' + data.bairro + '</span>';
                data.domPoint.classList.remove('is-filtered-out'); data.domLabel.classList.remove('is-filtered-out'); data.domLine.style.opacity = '0.7';
            } else {
                data.domPoint.classList.add('is-filtered-out'); data.domLabel.classList.add('is-filtered-out'); data.domLine.style.opacity = '0.05';
            }

            if (data.domMobileCard && isVisible) {
                var trendIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 inline-block mr-1 -mt-0.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>';
                data.domMobileCard.querySelector('.count-number').innerText = quantidade;
                var mobileWeekIndicator = App.Mapa.Mobile.getMobileIndicator(data.deltaSemana, data.semanaAtual);
                var mobileMonthIndicator = App.Mapa.Mobile.getMobileIndicator(data.deltaMes, data.mesAtual);
                var metricsHTML = trendIcon + mobileWeekIndicator + '<span class="text-slate-300 mx-0">/</span>' + mobileMonthIndicator;
                data.domMobileCard.querySelector('.card-metrics').innerHTML = metricsHTML;

                var nomesListaHTML = '';
                if (temAcesso) {
                    nomesListaHTML = nomesFiltradosObj.map(function(n) {
                        var originalIdx = data.nomes.indexOf(n);
                        if (isZap && n.fone) {
                            return '<p class="py-1 border-b border-slate-100 last:border-0"><a href="https://wa.me/55' + n.fone + '" target="_blank" class="text-blue-500 font-medium">' + n.nome + '</a></p>';
                        } else if (isTotal || isCard) {
                            return '<p class="py-1 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2" onclick="App.Mapa.Modal.openContactModal(' + dIdx + ', ' + originalIdx + ')">' + n.nome + '</p>';
                        } else {
                            return '<p class="py-1 border-b border-slate-100 last:border-0">• ' + n.nome + '</p>';
                        }
                    }).join('');
                } else { nomesListaHTML = ''; }

                var contentDiv = data.domMobileCard.querySelector('.accordion-content');
                if (contentDiv) {
                    contentDiv.innerHTML = '<div class="pt-3 mt-3 border-t border-slate-100"><div class="flex flex-col">' + nomesListaHTML + '</div></div>';
                    var accContent = data.domMobileCard.querySelector('.accordion-content');
                    if(accContent) accContent.style.maxHeight = '0px';
                    var chevron = data.domMobileCard.querySelector('.chevron-icon');
                    if(chevron) chevron.classList.remove('rotate-180');
                }
            }
        });

        App.Mapa.Mobile.renderMobileList();
        document.getElementById('txt-total-count').innerText = totalVisivelGeral.toLocaleString('pt-BR');
        document.getElementById('mobile-total-count').innerText = totalVisivelGeral.toLocaleString('pt-BR');
        App.Mapa.Modal.renderDesktopModal();
    },

    toggleKebabMenu: function() { var menu = document.getElementById('kebab-menu'); var overlay = document.getElementById('kebab-overlay'); menu.classList.toggle('hidden'); overlay.classList.toggle('hidden'); },
    togglePasswordVisibility: function() {
        var input = document.getElementById('password-input'); var iconShow = document.getElementById('eye-icon-show'); var iconHide = document.getElementById('eye-icon-hide');
        if (input.type === 'password') { input.type = 'text'; iconShow.classList.add('hidden'); iconHide.classList.remove('hidden'); }
        else { input.type = 'password'; iconShow.classList.remove('hidden'); iconHide.classList.add('hidden'); }
    }
};

window.regionHasSubzonas = App.Mapa.UI.regionHasSubzonas;
window.getSubzonasForRegion = App.Mapa.UI.getSubzonasForRegion;
window.initMap = App.Mapa.UI.initMap;
window.populateFilters = App.Mapa.UI.populateFilters;
window.changeRegionFilter = App.Mapa.UI.changeRegionFilter;
window.changeFunctionFilter = App.Mapa.UI.changeFunctionFilter;
window.changeTeamFilter = App.Mapa.UI.changeTeamFilter;
window.applyFilters = App.Mapa.UI.applyFilters;
window.toggleKebabMenu = App.Mapa.UI.toggleKebabMenu;
window.togglePasswordVisibility = App.Mapa.UI.togglePasswordVisibility;