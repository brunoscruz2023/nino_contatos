Aqui está o arquivo **`SDD_01_Arquitetura_Especificacao.md`** atualizado na íntegra para a Versão 9.0. 

Conforme solicitado, a Seção 4 (Lógicas de Negócio e Performance Cruciais) foi amplamente detalhada, sem resumos, explicando a fundo como cada regra de negócio opera no aplicativo, incluindo as novas adições de Logística, Menu Inteligente e FAB Contextual.

### Arquivo: `SDD_01_Arquitetura_Especificacao.md`

```markdown
# SDD - Arquitetura e Especificação Técnica
**Projeto:** Painel Geográfico e de Eventos
**Versão:** 9.0 (Dashboard de Logística, Menu Inteligente, RBAC 18 dígitos)
**Última Atualização:** [Data de Hoje]

## 1. Visão Geral da Arquitetura
O sistema é um Web App single-page construído em Vanilla JS, HTML e Tailwind CSS (via CDN). Sem frameworks de frontend. Utiliza o Google Sheets como banco de dados relacional e o Google Apps Script como backend serverless. Hospedado na Vercel.

*   **Leitura de Dados (GET):** Realizada via API nativa do Google Sheets (`gviz/tq`) com callback JSONP. O tempo limite (timeout) do `fetchJsonp` no frontend é de 20 segundos para evitar queda em buscas paralelas de múltiplas abas.
*   **Escrita de Dados (POST):** Realizada via requisições `fetch` (POST) para um Web App do Google Apps Script. Utiliza `mode: 'cors'` e `Content-Type: text/plain;charset=utf-8` para bypass de pre-flight CORS.
*   **Integridade de Texto:** O backend utiliza a função auxiliar `txt()` (prefixo de apóstrofo) para forçar a gravação de códigos numéricos como texto puro. O frontend utiliza a função `cleanStr()` para remover este prefixo.
*   **Modularização Frontend:** Padrão Namespace (`App.Object`). O roteamento de telas é gerenciado pelo módulo de Layout (Bottom Nav).

### 1.2. Princípios de Arquitetura e Reusabilidade (Regras de Ouro)
1.  **Modularização:** Todo código deve respeitar o padrão Namespace. Nenhum código solto no escopo global.
2.  **Reusabilidade:** Verificar a existência de funções em `App.Core.Utils` ou componentes no `ui_componentes.js` antes de criar novo código.
3.  **Parametrização:** Componentes devem aceitar configurações via objetos (ex: `canEdit`, `lockTeam`).
4.  **Isolamento de Impacto:** Garantir que o código seja aditivo ou isolado, sem quebrar a produção.

## 2. Estrutura de Módulos e Namespaces

### 2.1. Core (`core.js`)
*   `App.Core.Utils`: Funções base (`fetchJsonp`, `parseCustomDate`, `formatPhone`, `getLocation`).
*   `App.Core.Security`: **RBAC Dinâmico (18 dígitos)**. A função `hasModuleAccess(modulo)` busca a chave em minúsculas no objeto `funcoes`. Trata `undefined` como bloqueio. Métodos: `canCreateEvent()`, `canCheckIn()`, `canManageMaterials()`, `canDistributeMaterial()`.
*   `App.Core.API`: Camada de comunicação com o Apps Script (`postEvent`).
*   `App.Core.UI.Modal`: Wrapper genérico para modais.
*   `App.Core.UI.toggleFieldVisibility`: Função reutilizável para alternar visibilidade de campos de senha.
*   `App.Core.UI.openChangePasswordModal`: Modal para troca de senha obrigatória (bloqueia `123456`).
*   `App.Core.Controller`: Orquestrador de inicialização, login híbrido, **Preload Condicional** de dados e verificação de senha padrão.
*   **`App.Core.TaskManager`:** Motor unificado de tarefas. Escaneia `eventosDatabase` (Macro-tarefas), a aba `Tarefas` (Micro-tarefas) e a aba `Materiais_Movimentacao` (Recebimento de Materiais). Exibe pendências em um modal no login.
*   **`App.Core.Router`:** Roteador de ações. Direciona o usuário para a tela correta ao clicar numa pendência (Eventos, Tarefas ou Materiais).

### 2.2. Componentes de UI (`ui_componentes.js`)
*   `App.UI.AccordionList`: Sanfona reutilizável.
*   `App.UI.Loader` / `App.UI.SuccessToast`: Overlays globais.
*   `App.UI.ContactForm`: Formulário parametrizado. **Possui Multi-Select Customizado para Equipes** (permite seleção múltipla sem usar `<select multiple>` nativo, mantendo o layout e a lógica de travamento `lockTeam`).
*   `App.UI.HierarchyBuilder`: Construtor e visualizador de árvore (JSON).
*   `App.UI.StatCard` / `App.UI.PeriodSelector` / `App.UI.TabNav`: Componentes do Dashboard. O `PeriodSelector` possui ativação visual dinâmica via classes CSS sem redesenhar o HTML.

### 2.3. Layout (`layout.js`)
*   `App.Layout.Shell`: Barra de Navegação Inferior dinâmica.
*   **Matriz de Prioridade no `renderNav`:** O menu aplica regras inteligentes: remove o módulo da tela ativa, remove `Cadastro` se o usuário tiver `Admin` (redundância), ordena por prioridade gerencial (Dashboard > Admin > Agenda > Mapa) e depois aplica o limite de 3 espaços.
*   **FAB Contextual:** O FAB está sempre visível. Na tela de Eventos, se o mobilizador expandir um card de evento, o FAB muda para um ícone de Check-in e atua naquele evento específico. Se nenhum card estiver aberto, o FAB fica visível mas neutro (cinza/desabilitado).
*   **Bloqueio Histórico Flexível:** O botão de check-in no card e o FAB contextual permitem cadastrar presenças em eventos passados (retroativos).

### 2.4. Eventos, Tarefas e Materiais (`eventos_*.js`)
*   `App.Eventos.Dados`: Busca eventos, base de contatos, presenças, tarefas e **materiais** em paralelo. O `materialsDatabase` é populado em memória e salvo no cache para alimentar o Dashboard.
*   `App.Eventos.UI` (`eventos_app.js`): Agenda Unificada. Renderiza cards de Eventos e Tarefas no mesmo calendário. Ao expandir um card, aciona o FAB Contextual.
*   `App.Eventos.CRUD`: Gerenciamento de eventos. Auto-Check-in do organizador. Botão de criação de Tarefas. Distribuição de Materiais.
*   `App.Eventos.Kiosk`: Quiosque QR Code. Auto-check-in e captação de presença.

### 2.5. Dashboard (`dashboard_app.js`)
*   `App.Dashboard.Dados`: Agregação em memória com Filtro ABAC. Inclui `getLogisticsMetrics()` que calcula Estoque Atual, Em Trânsito e Ranking de Receptores lendo o `materialsDatabase`.
*   `App.Dashboard.UI`: Interface modular com Abas. **Aba Logística (NOVO):** Exibe métricas de estoque e ranking de distribuição, visível apenas para usuários com acesso a `materiais`.

### 2.6. Admin (`admin_crud.js`) e Cadastro (`cadastro_app.js`)
*   `App.Admin.CRUD`: Gerenciamento de acessos. **Geração dinâmica de seletores** com base na aba `Modulos`. Se o telefone buscado não existir, oferece o fluxo de "Cadastrar Novo Contato" embutido. Usuários Admin não veem o botão de "Cadastro" no menu inferior.

## 3. Modelo de Dados (Google Sheets)

### 3.1. Planilha "Pessoal Campanha" (Contatos)
*   **Colunas:** A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe - *Nomes separados por vírgula*), G(Data), Z(ID Base36), AA(Senha_Hash), AB(Codigo_Acesso 18 dígitos). IDs e Códigos gravados com prefixo de apóstrofo.

### 3.2. Planilha "Reuniões"
*   **Aba `Modulos`:** Define o RBAC. Atualmente com 6 linhas (18 dígitos): Mapa, Agenda, Cadastro, Admin, Materiais, Dashboard.
*   **Aba `Funcoes_Modulos`:** Define as opções de nível (000 a 999) para cada módulo.
*   **Aba `Eventos`:** A(ID), B(Nome), C(Data), D(Tipo), E(Bairro), F(Estrutura_JSON), G(Lista_Legado), H(Desc), I(Status), J(QR_Token).
*   **Aba `Presencas`:** A(Timestamp), B(ID_Evento), C(ID_Organizador), D(ID_Participante), E(Lat), F(Lng).
*   **Aba `Tarefas`:** A(Timestamp), B(ID), C(ID_Responsavel), D(Titulo), E(Descricao), F(Data_Limite), G(Status), H(Relato_Execucao), I(ID_Criador).
*   **Aba `Materiais_Movimentacao`:** A(Timestamp), B(ID_Transacao), C(Tipo_Mov [ENTRADA, DISTRIBUICAO, DEVOLUCAO]), D(Item), E(Quantidade), F(ID_Origem_Destino), G(ID_Responsavel), H(Ref_ID), I(Status [Concluído, Pendente_Recebimento, Recebido]).
*   **Aba `Logs_Atividades`:** Timestamp, Usuario_ID, Acao, Ref_ID, Lat, Lng, Status.

## 4. Lógicas de Negócio e Performance Cruciais

1.  **RBAC Dinâmico (Schema-Driven) & Auto-Correção de Código:** O sistema de permissões não é fixo no código. O `Code.gs` lê a aba `Modulos` da planilha para definir quantos módulos existem e qual o tamanho esperado da string de acesso (atualmente 6 módulos = 18 dígitos). Se um usuário legado logar com um código de 12 ou 15 dígitos, a função utilitária `normalizeAccessCode` detecta a diferença de tamanho, adiciona os blocos `000` correspondentes aos novos módulos no final da string, e salva o código atualizado de volta na `Base_Contatos`. Além disso, a função `parseCodigoAcesso` sempre converte os nomes dos módulos para minúsculas ao montar o objeto de permissões da sessão, garantindo compatibilidade com as verificações do frontend.
2.  **Segurança de Senha (First Login & Default Password):** Se a hash da senha do usuário, validada no momento do login, corresponder exatamente à hash da string `123456`, o backend retorna um flag `mustChangePassword: true` junto com a sessão. O frontend (`App.Core.Controller.performLogin`) intercepta essa flag e bloqueia completamente a entrada no aplicativo. Em vez de carregar a tela principal, ele abre o `App.Core.UI.openChangePasswordModal`, exigindo que o usuário cadastre uma nova senha de 6 dígitos. Essa nova senha é validada tanto no frontend quanto no backend (função `changePassword` no `Code.gs`) para garantir que não seja `123456`. A alteração só é concluída após o salvamento no banco de dados, garantindo que o usuário não fique preso no loop de senha padrão.
3.  **Motor Unificado de Tarefas e Roteamento Direto:** O `App.Core.TaskManager` centraliza todas as pendências do usuário logado em um único modal que aparece automaticamente após o carregamento dos dados. Ele escaneia três fontes distintas em memória: (a) Eventos de hoje onde o usuário está na hierarquia (Macro-tarefas), (b) Tarefas avulsas na aba `Tarefas` onde ele é o responsável (Micro-tarefas), e (c) Distribuições na aba `Materiais_Movimentacao` com status `Pendente_Recebimento` onde ele é o receptor. Ao clicar em uma pendência, o `App.Core.Router` direciona a execução: se for Evento, navega para a Agenda e aciona o Auto-Check-in; se for Tarefa, abre o modal de relato; se for Material, abre o modal de confirmação de recebimento.
4.  **Logística de Materiais (Funil de Auditoria):** O fluxo de materiais segue um funil estrito para garantir rastreabilidade. (1) O Admin/Gestor registra uma `ENTRADA` no estoque; (2) O Distribuidor/Supervisor registra uma `DISTRIBUICAO`, e o sistema cria uma pendência no mobilizador; (3) O mobilizador confirma o `Recebimento`, baixando a pendência. O Dashboard de Logística lê esses dados em memória e calcula: Estoque Atual (Entradas - Recebido - Pendente), Em Trânsito (Pendente) e Distribuído (Recebido). O ranking de receptores cruza os IDs dos contatos para listar quem mais recebeu materiais no período.
5.  **Menu Inferior Inteligente e FAB Contextual:** Para evitar estouro de layout no mobile e redundâncias, o `renderNav` no `layout.js` aplica uma matriz de prioridade. Se o usuário tiver acesso a `Admin`, o botão de `Cadastro` é removido do menu inferior, pois o fluxo já está embutido no Admin. O módulo da tela ativa no momento também é removido da barra. Os módulos restantes são ordenados por prioridade gerencial (Dashboard > Admin > Agenda > Mapa) e o limite de 3 botões é aplicado. O FAB (Floating Action Button) também possui inteligência: na Agenda, se um card de evento for expandido, o FAB muda de ícone para Check-in e passa a atuar naquele evento específico. Se nenhum card estiver aberto, o FAB fica visível mas neutro/desabilitado.
6.  **Dashboard Modular com ABAC (Attribute-Based Access Control):** O Dashboard não mostra dados globais para coordenadores de área. A função `getVisibleEvents` no `dashboard_app.js` verifica se o usuário não é Admin (999). Se não for, ele percorre o `Estrutura_JSON` de cada evento e filtra apenas aqueles onde o `currentSession.id` do usuário aparece na árvore (como Coordenador, Supervisor ou Mobilizador). Isso garante que o gestor veja apenas as métricas reais da sua sub-árvore de comando.
7.  **Integridade de Texto (Google Sheets Bypass):** Como o Google Sheets frequentemente converte strings numéricas (como IDs de contatos ou códigos de acesso) para números, removendo zeros à esquerda, o sistema utiliza o bypass do apóstrofo. No backend (`Code.gs`), a função `txt(val)` prefixa qualquer string com uma aspa simples (`'`). O Sheets entende isso como formatação de texto puro. No frontend, quando os dados são lidos via `gviz/tq`, a função `cleanStr(val)` remove esses apóstrofos em tempo de execução, garantindo a integridade dos dados sem sujar a visualização do usuário.
8.  **Preload Condicional e Cache Local:** Para garantir que o app abra instantaneamente (F5), os dados são pré-carregados. O `App.Core.Controller.initApp` utiliza `Promise.all` para buscar em paralelo Bairros, Contatos, Eventos, Tarefas e Materiais. Assim que retornam, os dados são salvos no `localStorage`. Na próxima vez que o usuário loga, o app renderiza todo o mapa e agenda lendo do cache local, e em seguida atualiza os dados em background. O `fetchJsonp` possui timeout de 20s para evitar aborto de leitura em conexões lentas de campo.

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
*   Etapas 1 a 5 (Kiosk, Login, UI/UX, Admin, Cadastro).
*   Etapa 6: Refatoração Estrutural de Eventos (JSON + Presencas).
*   Etapa 9: Dashboard de Lideranças com Filtro ABAC, Abas Modulares (Operação, Território, Logística).
*   Etapa 7: Motor de Tarefas, Agenda Unificada e Tarefas Avulsas.
*   Etapa 8 (Fases 1 e 2): Módulo de Controle de Materiais (Entrada, Distribuição como Tarefa, Confirmação de Recebimento).
*   RBAC Dinâmico (18 dígitos) com Auto-Correção de Schema.
*   Segurança de Senha (Troca obrigatória no primeiro login).
*   Menu Inferior Inteligente e FAB Contextual.

### Próximos Passos (Sequência Definida)
1.  **Etapa 8 (Fase 4): Devolução de Materiais:** Permitir que o mobilizador informe sobras de material ao concluir tarefa, atualizando o estoque.
```