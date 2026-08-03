
// ui_componentes.js
window.App = window.App || {};
App.UI = App.UI || {};

// ==========================================
// COMPONENTE: ACCORDION LIST (Sanfona Reutilizável)
// ==========================================
App.UI.AccordionList = {
    // Inicializa o listener global para qualquer sanfona dentro do container
    initGlobalListener: function(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container || container.dataset.accordionInit === 'true') return;
        
        container.dataset.accordionInit = 'true';

        container.addEventListener('click', function(e) {
            // Ignora cliques em links ou botões dentro do header
            if (e.target.closest('a, button')) return;

            const card = e.target.closest('.accordion-card');
            if (!card || card.classList.contains('non-collapsible')) return;

            const content = card.querySelector(':scope > .accordion-content');
            if (!content) return;

            const chevron = card.querySelector(':scope > .accordion-header .chevron-icon');
            
            if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                content.style.maxHeight = '0px';
                if (chevron) chevron.classList.remove('rotate-180');
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                if (chevron) chevron.classList.add('rotate-180');
            }
        });
    },

    // Cria a estrutura HTML de um card sanfona
    createCard: function(data) {
        const isCollapsible = data.isCollapsible !== false;
        const uiColor = data.uiColor || { text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-400" };
        
        return `
            <div class="accordion-card mobile-lead-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ${isCollapsible ? 'cursor-pointer' : 'non-collapsible cursor-default'}" data-region="${data.region || ''}">
                <div class="accordion-header flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl ${uiColor.dot} bg-opacity-10 flex items-center justify-center flex-shrink-0">
                        <div class="w-3 h-3 rounded-full ${uiColor.dot}"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-slate-800 truncate">${data.title}</p>
                        <div class="flex items-center gap-1 text-[10px] font-bold mt-0.5 card-metrics">${data.metrics || ''}</div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="text-2xl font-extrabold ${uiColor.text} leading-none count-number">${data.badge || '0'}</p>
                        <p class="text-[10px] text-slate-400 font-medium mt-1">${data.badgeLabel || 'leads'}</p>
                    </div>
                    ${isCollapsible ? `
                    <svg class="chevron-icon w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                    </svg>` : ''}
                </div>
                <div class="accordion-content w-full text-sm text-slate-600" style="max-height: 0px; overflow: hidden; transition: max-height 0.3s ease-out;"></div>
            </div>
        `;
    }
};