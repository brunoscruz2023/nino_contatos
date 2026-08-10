// cadastro_app.js
window.App = window.App || {};
App.Cadastro = App.Cadastro || {};

App.Cadastro.UI = {
    init: function() {
        const view = document.getElementById('view-cadastro');
        if (!view) return;

        view.innerHTML = `
            <div class="max-w-2xl mx-auto p-4 md:p-8 w-full">
                <div class="mb-6 text-center">
                    <h2 class="text-2xl font-bold text-slate-800">Cadastro de Contatos</h2>
                    <p class="text-sm text-slate-500 mt-1">Insira os dados do novo contato. O sistema avisa se o telefone já existir.</p>
                </div>
                
                <!-- Container onde o componente reutilizável será injetado -->
                <div id="cadastro-form-container"></div>
            </div>
        `;

        // Pega as funções da memória global (carregadas no initApp via getDictionaries)
        let funcoesArray = [];
        if (window.dictsGlobal && window.dictsGlobal.funcoes_contato) {
            funcoesArray = window.dictsGlobal.funcoes_contato.map(f => f.nome);
        }

        // Inicializa o componente de formulário passando o contexto e as funções
        App.UI.ContactForm.init('#cadastro-form-container', {
            funcoes: funcoesArray,
            onCancel: null // No cadastro direto, o botão Sair apenas limpa o formulário
        });
    }
};