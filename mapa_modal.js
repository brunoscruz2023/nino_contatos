// mapa_modal.js
window.App = window.App || {};
App.Mapa = App.Mapa || {};

App.Mapa.Modal = {
    toggleModalNomes: function() {
        const modal = document.getElementById('modal-nomes-overlay');
        const btn = document.getElementById('btn-ver-contatos');
        if(modal) modal.classList.toggle('hidden');
        if(btn) {
            btn.classList.toggle('text-indigo-600');
            btn.classList.toggle('text-slate-400');
        }
    },

    closeContactModal: function() {
        const overlay = document.getElementById('modal-contato-overlay');
        if(overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
    },

    openContactModal: function(dIdx, nIdx) {
        const contato = geoDatabase[dIdx].nomes[nIdx];
        const bairro = geoDatabase[dIdx].bairro;
        
        document.getElementById('contact-modal-name').innerText = contato.nome;
        document.getElementById('contact-modal-bairro').innerText = bairro;
        
        let detailsHTML = '';
        
        let nivel = currentSession.nivel || '';
        let arrNivel = Array.isArray(nivel) ? nivel : [nivel.toString()];
        let isTotal = arrNivel.includes('000') || arrNivel.includes('TOTAL');
        let isCard = arrNivel.includes('003') || arrNivel.includes('CARD');
        let isZap = arrNivel.includes('002') || arrNivel.includes('ZAP');
        
        if ((isCard || isTotal) && contato.ref) {
            detailsHTML += `<div class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500">Referência:</span><span class="text-slate-800 text-right">${contato.ref}</span></div>`;
        }
        
        if (contato.data) {
            const parsedDate = App.Core.Utils.parseCustomDate(contato.data);
            const displayData = parsedDate ? parsedDate.toLocaleDateString('pt-BR') : contato.data;
            detailsHTML += `<div class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500">Data Cadastro:</span><span class="text-slate-800">${displayData}</span></div>`;
        }
        
        if (isTotal && contato.funcao) {
            detailsHTML += `<div class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500">Função:</span><span class="text-slate-800">${contato.funcao}</span></div>`;
        }
        
        document.getElementById('contact-modal-details').innerHTML = detailsHTML;
        
        const wppBtn = document.getElementById('contact-modal-wpp-btn');
        if ((isZap || isTotal || isCard) && contato.fone) {
            wppBtn.href = `https://wa.me/${contato.fone}`;
            wppBtn.classList.remove('hidden');
        } else {
            wppBtn.classList.add('hidden');
        }
        
        const overlay = document.getElementById('modal-contato-overlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    },

    renderDesktopModal: function() {
        const modalContent = document.getElementById('modal-nomes-content');
        const bairrosVisiveis = geoDatabase.filter(d => d.isVisible);

        if (bairrosVisiveis.length === 0) {
            modalContent.innerHTML = `<div class="col-span-full text-center text-slate-400 py-10">Nenhum contato encontrado para os filtros selecionados.</div>`;
            return;
        }

        const useGrouping = currentRegionFilter !== 'all' && regionHasSubzonas(currentRegionFilter);
        let modalHTML = '';

        let nivel = currentSession.nivel || '';
        let arrNivel = Array.isArray(nivel) ? nivel : [nivel.toString()];
        let isTotal = arrNivel.includes('000') || arrNivel.includes('TOTAL');
        let isCard = arrNivel.includes('003') || arrNivel.includes('CARD');
        let isZap = arrNivel.includes('002') || arrNivel.includes('ZAP');
        let isNome = arrNivel.includes('001') || arrNivel.includes('NOME');
        let temAcesso = isTotal || isCard || isZap || isNome;

        const buildBairroCard = (data) => {
            const uiColor = colorsMap[data.regiao] || { text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-400" };
            const semanaArrow = data.deltaSemana > 0 ? '↑' : (data.deltaSemana < 0 ? '↓' : '–');
            const semanaColor = data.deltaSemana > 0 ? 'text-emerald-500' : (data.deltaSemana < 0 ? 'text-rose-500' : 'text-slate-500');
            const mesArrow = data.deltaMes > 0 ? '↑' : (data.deltaMes < 0 ? '↓' : '–');
            const mesColor = data.deltaMes > 0 ? 'text-emerald-500' : (data.deltaMes < 0 ? 'text-rose-500' : 'text-slate-500');

            let nomesModalHTML = '';
            if (temAcesso) {
                nomesModalHTML = data.nomesFiltrados.map((n) => {
                    let originalIdx = data.nomes.indexOf(n);
                    if (isZap && n.fone) {
                        return `<span class="py-1 flex items-center gap-2 border-b border-slate-100 last:border-0"><a href="https://wa.me/${n.fone}" target="_blank" class="text-blue-500 font-medium">${n.nome}</a></span>`;
                    } else if (isTotal || isCard) {
                        return `<span class="py-1 flex items-center gap-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2" onclick="App.Mapa.Modal.openContactModal(${data.dIdx}, ${originalIdx})">${n.nome}</span>`;
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
};

// Aliases globais temporários para compatibilidade com o HTML e app.js legado
window.toggleModalNomes = App.Mapa.Modal.toggleModalNomes;
window.openContactModal = App.Mapa.Modal.openContactModal;
window.closeContactModal = App.Mapa.Modal.closeContactModal;