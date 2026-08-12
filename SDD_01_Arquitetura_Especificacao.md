### Arquivo: `SDD_01_Arquitetura_Especificacao.md` (Versão 6.0)

```markdown
# SDD - Arquitetura e Especificação Técnica
**Projeto:** Painel Geográfico e de Eventos
**Versão:** 6.0 (Agenda Unificada, Motor de Tarefas e Princípios de Reusabilidade)
**Última Atualização:** [Data de Hoje]

## 1. Visão Geral da Arquitetura
O sistema é um Web App single-page construído em Vanilla JS, HTML e Tailwind CSS (via CDN). Sem frameworks de frontend. Utiliza o Google Sheets como banco de dados relacional e o Google Apps Script como backend serverless. Hospedado na Vercel.

*   **Leitura de Dados (GET):** Realizada via API nativa do Google Sheets (`gviz/tq`) com callback JSONP. O Mapa lê a planilha de Contatos diretamente. A Agenda lê as abas `Eventos`, `Base_Contatos`, `Presencas` e `Tarefas` em paralelo. O Dashboard consome os dados já em memória.
*   **Escrita de Dados (POST):** Realizada via requisições `fetch` (POST) para um Web App do Google Apps Script. Utiliza `mode: 'cors'` e `Content-Type: text/plain;charset=utf-8` para bypass de pre-flight CORS.
*   **Integridade de Texto:** O backend utiliza a função auxiliar `txt()` (prefixo de apóstrofo) para forçar a gravação de códigos numéricos como texto puro. O frontend utiliza a função `cleanStr()` para remover este prefixo durante a leitura via API.
*   **Modularização Frontend:** Padrão Namespace (`App.Object`). O roteamento de telas é gerenciado pelo módulo de Layout (Bottom Nav).
*   **Componentização de UI:** Elementos visuais reutilizáveis isolados no `ui_componentes.js` (Sanfonas, Loaders, Formulários, Construtor de Hierarquia, Tabs, Cards de Métrica).
*   **Concorrência Backend:** Uso de `LockService.getScriptLock()` no `Code.gs`.

### 1.2. Princípios de Arquitetura e Reusabilidade (Regras de Ouro)
Para garantir a escalabilidade sem dívida técnica, o desenvolvimento segue rigorosamente os seguintes princípios:
1.  **Modularização:** Todo código deve respeitar o padrão Namespace. Nenhum código solto no escopo global.
2.  **Reusabilidade:** Antes de criar uma nova lógica ou elemento visual, verificar se já existe uma função no `App.Core.Utils`, `App.Core.Security` ou um componente no `ui_componentes.js` que resolva o problema.
3.  **Parametrização:** Componentes devem aceitar configurações via objetos (ex: `canEdit`, `saveButtonText`), permitindo que o mesmo componente se comporte de forma diferente dependendo do contexto.
4.  **Isolamento de Impacto:** Ao corrigir ou criar uma feature, garantir que o código seja aditivo ou isolado, sem quebrar o funcionamento dos módulos já em produção.

## 2. Estrutura de Módulos e Namespaces

### 2.1. Core (`core.js`)
*   `App.Core.Utils`: Funções base (`fetchJsonp`, `parseCustomDate`, `formatPhone`, `getLocation`).
*   `App.Core.Security`: RBAC granular. Métodos como `canCreateEvent()`, `canCheckIn()`, `hasModuleAccess()`, `canEditContact()`. Lê a string de 12 dígitos (`currentSession.funcoes`).
*   `App.Core.API`: Camada de comunicação com o Apps Script (`postEvent`).
*   `App.Core.UI.Modal`: Wrapper genérico para modais.
*   `App.Core.Controller`: Orquestrador de inicialização, login híbrido e **Preload Condicional** de dados.
*   **`App.Core.TaskManager` (NOVO):** Motor unificado de tarefas. Escaneia `eventosDatabase` (Macro-tarefas) e a aba `Tarefas` (Micro-tarefas). Exibe pendências em um modal no login.
*   **`App.Core.Router` (NOVO):** Roteador de ações. Direciona o usuário para a tela correta ao clicar numa pendência (ex: ir para Agenda e abrir check-in, ou abrir modal de relato de tarefa).

### 2.2. Componentes de UI (`ui_componentes.js`)
*   `App.UI.AccordionList`: Componente de lista sanitária (accordion) reutilizável. Utilizado no Mapa, Eventos e Tarefas.
*   `App.UI.Loader` / `App.UI.SuccessToast`: Overlays globais de carregamento e sucesso.
*   `App.UI.ContactForm`: Formulário reutilizável. Auto-preenche equipe, busca CEP/GPS, valida duplicidade. **Parametrizado:** Aceita `canEdit` (ignora RBAC para fluxo de presença), `saveButtonText` e `onCancel` (para botão Sair). Usado no Cadastro Direto, Presença de Eventos e Quiosque.
*   `App.UI.HierarchyBuilder`: Construtor visual de árvore hierárquica (Coordenador > Supervisor > Mobilizador). **Possui modo de visualização:** `renderReadOnlyHtml()` para desenhar a árvore sem botões de edição no card do evento e no futuro Dashboard de Equipes.
*   `App.UI.StatCard`: Card padronizado de métrica numérica para o Dashboard.
*   `App.UI.PeriodSelector`: Grupo de botões (pílulas) para seleção de período (Hoje, 7 dias, 30 dias, Mês).
*   `App.UI.TabNav`: Navegação por abas reutilizável, usada para dividir os subconjuntos do Dashboard.

### 2.3. Layout (`layout.js`)
*   `App.Layout.Shell`: Módulo responsável pela Barra de Navegação Inferior (Bottom Nav) dinâmica e pelo FAB central.
*   **Hierarquia de Prioridade:** Limita a exibição a 3 módulos + Logout para não estourar o layout mobile. Se o usuário tiver acesso ao Dashboard, este tem prioridade. O FAB central vira Logout se o usuário tiver apenas 1 módulo acessível.

### 2.4. Mapa (`mapa_dados.js`, `mapa_ui.js`, `mapa_mobile.js`, `mapa_modal.js`)
*   `App.Mapa.Dados`: Busca bairros e contatos. Usa `UPPER(F) LIKE '%TEAM%'` na query para suportar múltiplas equipes na mesma célula (ex: "CARLOS, VERONICA").
*   `App.Mapa.UI`: Renderiza pontos no SVG, gerencia filtros.
*   **Filtros de Equipe Avançados:** O dropdown de equipes gera opções dinâmicas: `Total` (soma de todas as aparições da equipe) e `Apenas` (assinatura exata da célula).

### 2.5. Eventos, Tarefas e Agenda (`eventos_dados.js`, `eventos_app.js`, `eventos_crud.js`, `eventos_kiosk.js`)
*   `App.Eventos.Dados`: Busca eventos, base de contatos, presenças e tarefas avulsas em paralelo. O modelo de dados de eventos foi **normalizado** (1 linha por evento). A hierarquia é lida de um JSON na Coluna F, "achatada" em memória.
*   `App.Eventos.UI` (`eventos_app.js`): **Agenda Unificada.** Renderiza cards de Eventos e cards de Tarefas Avulsas no mesmo calendário. Permite concluir tarefas direto no card, com atualização de UI em tempo real.
*   `App.Eventos.CRUD`: Módulo de gerenciamento. Utiliza o `HierarchyBuilder`. Possui **Auto-Check-in Organizacional:** Ao clicar em "Iniciar Atuação", registra a presença do próprio organizador e abre direto o formulário de participantes.
*   `App.Eventos.Kiosk`: Fluxo de quiosque via QR Code. Valida o token do evento, pede o telefone do organizador, valida contra o JSON da hierarquia (`authorizeKioskMobilizer`), faz o auto-check-in e libera a tela de captação usando o `App.UI.ContactForm`.
*   **Bloqueio Histórico:** Botões de "Editar" e "Iniciar Atuação" são ocultados se a data do evento for anterior a hoje (exceto para Admins `999`).

### 2.6. Dashboard (`dashboard_app.js`)
*   `App.Dashboard.Dados`: Camada de agregação em memória. Lê `eventosDatabase` e `geoDatabase`. Aplica filtro ABAC (se não for Admin, soma apenas os eventos onde o usuário está na hierarquia).
*   `App.Dashboard.UI`: Interface modular com Abas (`App.UI.TabNav`). 
    *   **Aba Operação:** Métricas de Eventos (Total, Pessoas Ativas, Locais, Top 3 Eventos, Agrupamento por Tipo/Local).
    *   **Aba Território:** Métricas do Mapa (Total Leads, Novos Leads no período, Top 5 Bairros em Crescimento, Distribuição por Região).
    *   Aceita Seletor de Período Histórico (`App.UI.PeriodSelector`).

### 2.7. Admin (`admin_crud.js`) e Cadastro (`cadastro_app.js`)
*   `App.Admin.CRUD`: Módulo de gerenciamento de acessos. Monta seletores dinamicamente. Traduz nomes de equipes para códigos. Possui botão temporário para atribuição de Tarefas Avulsas.
*   `App.Cadastro.UI`: Módulo isolado para cadastro direto. Instancia o `App.UI.ContactForm`.

## 3. Modelo de Dados (Google Sheets)

### 3.1. Planilha "Pessoal Campanha" (Contatos - Origem)
*   **Colunas:** A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe - *Nomes separados por vírgula se múltipla*), G(Data), Z(ID Base36), AA(Senha_Hash), AB(Codigo_Acesso 12 dígitos). IDs e Códigos gravados com prefixo de apóstrofo.

### 3.2. Planilha "Reuniões" (Eventos, Acessos, Presenças, Tarefas e Dicionários)
*   **Aba `Eventos`:** A(ID_Evento), B(Nome), C(Data), D(Tipo), E(Bairro), F(Estrutura_JSON), G(Lista_Presenca - *Legado*), H(Desc), I(Status), J(QR_Token).
*   **Aba `Presencas`:** A(Timestamp), B(ID_Evento), C(ID_Organizador), D(ID_Participante), E(Lat), F(Long).
*   **Aba `Tarefas` (NOVO):** A(Timestamp), B(ID), C(ID_Responsavel), D(Titulo), E(Descricao), F(Data_Limite), G(Status), H(Relato_Execucao).
*   **Aba `Logs_Atividades`:** Timestamp, Usuario_ID, Acao, Ref_ID, Lat, Long, Status.
*   **Aba `Base_Contatos` (Oculta):** Importa tudo via IMPORTRANGE.

## 4. Lógicas de Negócio e Performance Cruciais

1.  **Motor Unificado de Tarefas e Roteamento:** O `TaskManager` unifica a visão de pendências do usuário (check-ins de eventos e micro-tarefas). O `Router` direciona a execução. A Agenda renderiza ambos no mesmo calendário, permitindo conclusão direta no card com atualização em tempo real.
2.  **Filtro de Múltiplas Equipes:** O sistema suporta contatos com "Equipe A, Equipe B". A busca no Sheets usa `LIKE`, e o filtro em memória usa `.includes()` para a visão "Total" e `===` para a visão "Apenas".
3.  **Dashboard Modular com ABAC:** O Dashboard não mostra dados globais para coordenadores. Ele filtra o JSON hierárquico de cada evento para somar apenas os nós subordinados ao usuário logado.
4.  **Preload Condicional e Cache Local (Frontend):** `Promise.all` busca dados em paralelo. Dados salvos no `localStorage`.
5.  **Integridade de Texto:** Uso de `txt()` no backend e `cleanStr()` no frontend para evitar conversões numéricas indesejadas pelo Google Sheets.

## 5. Estrutura de Arquivos Atuais

### Frontend (Vercel / Dev)
*   `index.html`, `core.js`, `ui_componentes.js`, `layout.js`
*   `mapa_dados.js`, `mapa_ui.js`, `mapa_mobile.js`, `mapa_modal.js`
*   `eventos_dados.js`, `eventos_app.js`, `eventos_crud.js`, `eventos_kiosk.js`
*   `admin_crud.js`, `cadastro_app.js`
*   `dashboard_app.js`

### Backend (Google Apps Script)
*   `Code.gs`

## 6. Status do Roadmap e Transições

### Concluído:
*   Etapa Kiosk (Quiosque QR Code) com Auto-Check-in do Organizador.
*   Etapa 2: Novo Fluxo de Login (Híbrido).
*   Etapa UI/UX: Bottom Navigation, FAB e Componentização Avançada (Tabs, StatCards, Forms parametrizados).
*   Etapa 4: CRUD Administrativo (Granular e Dinâmico).
*   Etapa 5: Cadastro de Contatos (Direto e em Eventos).
*   Otimização: Preload Condicional e Caching.
*   Etapa 3: ABAC na Agenda (Filtro de Eventos por Usuário).
*   Rastreamento: GPS e Logs de Atividade.
*   Transição de Equipes (Opção B): Backend traduz códigos para nomes. Frontend lê múltiplas equipes por célula.
*   Limpeza de Código: Remoção de Hardcode e fallback legado.
*   Etapa 6: Refatoração Estrutural de Eventos (JSON + Aba Presenças).
*   Etapa 9 (Sprint 1 e 2): Dashboard de Lideranças com Filtro ABAC, Abas Modulares (Operação/Território) e Seletor de Período.
*   Etapa 7 (Fases 1 e 2): Motor de Tarefas, Agenda Unificada e Tarefas Avulsas com Relato de Execução.
*   Bloqueio Histórico de Eventos.

### Próximos Passos (Sequência Definida)
1.  **Etapa 7 (Fase 3): Refinamento de Tarefas:** Mover criação de tarefas do Admin para um botão direto na Agenda. Exibir responsável no card.
2.  **Etapa 8: Módulo de Controle de Materiais:** Criar fluxo de solicitação e baixa de materiais. Logar na aba `Materiais_Movimentacao` para alimentar o cálculo de ROI no Dashboard.
3.  **Dashboard de Composição (Futuro):** Cruzar dados de Presenças (Eventos) com Distribuição de Materiais e Crescimento de Leads (Mapa) em uma view unificada.

### Pendências (Baixa Prioridade)
*   Limpeza Estrutural (Opção A): Migrar a coluna F de Contatos para códigos e traduzir em memória no frontend.
```