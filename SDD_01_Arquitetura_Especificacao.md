### Arquivo 1: `SDD_01_Arquitetura_Especificacao.md`

# SDD - Arquitetura e Especificação Técnica
**Projeto:** Painel Geográfico e de Eventos
**Versão:** 7.0 (RBAC Dinâmico, Auto-Correção de Schema, Logística de Materiais e Segurança de Senha)
**Última Atualização:** [Data de Hoje]

## 1. Visão Geral da Arquitetura
O sistema é um Web App single-page construído em Vanilla JS, HTML e Tailwind CSS (via CDN). Sem frameworks de frontend. Utiliza o Google Sheets como banco de dados relacional e o Google Apps Script como backend serverless. Hospedado na Vercel.

*   **Leitura de Dados (GET):** Realizada via API nativa do Google Sheets (`gviz/tq`) com callback JSONP. O Mapa lê a planilha de Contatos. A Agenda lê as abas `Eventos`, `Base_Contatos`, `Presencas` e `Tarefas`. O Dashboard consome os dados já em memória.
*   **Escrita de Dados (POST):** Realizada via requisições `fetch` (POST) para um Web App do Google Apps Script. Utiliza `mode: 'cors'` e `Content-Type: text/plain;charset=utf-8` para bypass de pre-flight CORS.
*   **Integridade de Texto:** O backend utiliza a função auxiliar `txt()` (prefixo de apóstrofo) para forçar a gravação de códigos numéricos como texto puro. O frontend utiliza a função `cleanStr()` para remover este prefixo durante a leitura via API.
*   **Modularização Frontend:** Padrão Namespace (`App.Object`). O roteamento de telas é gerenciado pelo módulo de Layout (Bottom Nav).
*   **Componentização de UI:** Elementos visuais reutilizáveis isolados no `ui_componentes.js` (Sanfonas, Loaders, Formulários, Construtor de Hierarquia, Tabs, Cards de Métrica, Modais).
*   **Concorrência Backend:** Uso de `LockService.getScriptLock()` no `Code.gs`.

### 1.2. Princípios de Arquitetura e Reusabilidade (Regras de Ouro)
1.  **Modularização:** Todo código deve respeitar o padrão Namespace. Nenhum código solto no escopo global.
2.  **Reusabilidade:** Antes de criar uma nova lógica ou elemento visual, verificar se já existe uma função no `App.Core.Utils`, `App.Core.Security` ou um componente no `ui_componentes.js` que resolva o problema.
3.  **Parametrização:** Componentes devem aceitar configurações via objetos, permitindo que o mesmo componente se comporte de forma diferente dependendo do contexto.
4.  **Isolamento de Impacto:** Ao corrigir ou criar uma feature, garantir que o código seja aditivo ou isolado, sem quebrar o funcionamento dos módulos já em produção.

## 2. Estrutura de Módulos e Namespaces

### 2.1. Core (`core.js`)
*   `App.Core.Utils`: Funções base (`fetchJsonp`, `parseCustomDate`, `formatPhone`, `getLocation`).
*   `App.Core.Security`: **RBAC Dinâmico**. A função `hasModuleAccess(modulo)` busca a chave em minúsculas no objeto `funcoes` da sessão. Trata `undefined` como bloqueio. Métodos: `canCreateEvent()`, `canCheckIn()`, `canManageMaterials()`, `canDistributeMaterial()`.
*   `App.Core.API`: Camada de comunicação com o Apps Script (`postEvent`).
*   `App.Core.UI.Modal`: Wrapper genérico para modais.
*   `App.Core.UI.toggleFieldVisibility`: Função reutilizável para alternar visibilidade de campos de senha (ícone de olho).
*   `App.Core.UI.openChangePasswordModal`: Modal isolado para troca de senha obrigatória no primeiro login.
*   `App.Core.Controller`: Orquestrador de inicialização, login híbrido, **Preload Condicional** de dados e verificação de senha padrão (`123456`).
*   **`App.Core.TaskManager`:** Motor unificado de tarefas. Escaneia `eventosDatabase` (Macro-tarefas), a aba `Tarefas` (Micro-tarefas) e a aba `Materiais_Movimentacao` (Recebimento de Materiais). Exibe pendências em um modal no login.
*   **`App.Core.Router`:** Roteador de ações. Direciona o usuário para a tela correta ao clicar numa pendência (Eventos, Tarefas ou Materiais).

### 2.2. Componentes de UI (`ui_componentes.js`)
*   `App.UI.AccordionList`: Sanfona reutilizável (Mapa, Eventos, Tarefas).
*   `App.UI.Loader` / `App.UI.SuccessToast`: Overlays globais.
*   `App.UI.ContactForm`: Formulário parametrizado (Cadastro, Presença, Quiosque).
*   `App.UI.HierarchyBuilder`: Construtor e visualizador de árvore (JSON).
*   `App.UI.StatCard` / `App.UI.PeriodSelector` / `App.UI.TabNav`: Componentes do Dashboard.

### 2.3. Layout (`layout.js`)
*   `App.Layout.Shell`: Barra de Navegação Inferior dinâmica. Distribuição balanceada dos botões. FAB vira Logout se o usuário tiver apenas 1 módulo acessível.

### 2.4. Mapa (`mapa_*.js`)
*   `App.Mapa.Dados`: Busca contatos usando `LIKE` para suportar múltiplas equipes na mesma célula.
*   `App.Mapa.UI`: Renderiza pontos no SVG. Filtros de equipe avançados (Total vs. Apenas).

### 2.5. Eventos, Tarefas e Agenda (`eventos_*.js`)
*   `App.Eventos.Dados`: Busca eventos, base de contatos, presenças e tarefas avulsas em paralelo. Normaliza eventos (1 linha, JSON hierárquico).
*   `App.Eventos.UI` (`eventos_app.js`): **Agenda Unificada.** Renderiza cards de Eventos e Tarefas no mesmo calendário.
*   `App.Eventos.CRUD`: Gerenciamento de eventos. Auto-Check-in do organizador. Botão de criação de Tarefas e Eventos. Bloqueio histórico.
*   `App.Eventos.Kiosk`: Quiosque QR Code. Auto-check-in e captação de presença.

### 2.6. Dashboard (`dashboard_app.js`)
*   `App.Dashboard.Dados`: Agregação em memória com Filtro ABAC.
*   `App.Dashboard.UI`: Interface modular com Abas. Aba Operação (Eventos) e Aba Território (Mapa). Seletor de período histórico.

### 2.7. Admin (`admin_crud.js`) e Cadastro (`cadastro_app.js`)
*   `App.Admin.CRUD`: Gerenciamento de acessos. **Geração dinâmica de seletores de permissão** com base na aba `Modulos`. Bloco isolado para Gestão de Materiais (Entrada e Distribuição).
*   `App.Cadastro.UI`: Cadastro direto usando `App.UI.ContactForm`.

## 3. Modelo de Dados (Google Sheets)

### 3.1. Planilha "Pessoal Campanha" (Contatos)
*   **Colunas:** A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe), G(Data), Z(ID Base36), AA(Senha_Hash), AB(Codigo_Acesso). IDs e Códigos gravados com prefixo de apóstrofo.

### 3.2. Planilha "Reuniões"
*   **Aba `Modulos`:** Define a estrutura do RBAC. O número de linhas dita o tamanho do código de acesso (atualmente 5 módulos = 15 dígitos).
*   **Aba `Eventos`:** A(ID), B(Nome), C(Data), D(Tipo), E(Bairro), F(Estrutura_JSON), G(Lista_Legado), H(Desc), I(Status), J(QR_Token).
*   **Aba `Presencas`:** A(Timestamp), B(ID_Evento), C(ID_Organizador), D(ID_Participante), E(Lat), F(Lng).
*   **Aba `Tarefas`:** A(Timestamp), B(ID), C(ID_Responsavel), D(Titulo), E(Descricao), F(Data_Limite), G(Status), H(Relato_Execucao), I(ID_Criador).
*   **Aba `Materiais_Movimentacao`:** A(Timestamp), B(ID_Transacao), C(Tipo_Mov [ENTRADA, DISTRIBUICAO, DEVOLUCAO]), D(Item), E(Quantidade), F(ID_Origem_Destino), G(ID_Responsavel), H(Ref_ID), I(Status [Concluído, Pendente_Recebimento, Recebido]).
*   **Aba `Logs_Atividades`:** Timestamp, Usuario_ID, Acao, Ref_ID, Lat, Long, Status.
*   **Aba `Base_Contatos` (Oculta):** Importa tudo via IMPORTRANGE.

## 4. Lógicas de Negócio e Performance Cruciais

1.  **RBAC Dinâmico (Schema-Driven) & Auto-Correção:** O `Code.gs` lê a aba `Modulos` para definir o tamanho esperado do código de acesso. Se um usuário legado logar com 12 dígitos, a função `normalizeAccessCode` adiciona `000` para os novos módulos e salva na base. As chaves do objeto de permissões são sempre geradas em minúsculas.
2.  **Segurança de Senha (First Login):** Se a hash da senha do usuário corresponder à hash de `123456`, o backend retorna `mustChangePassword: true`. O frontend bloqueia a entrada no app e abre o modal de troca de senha. A nova senha não pode ser `123456` (validado no frontend e backend).
3.  **Motor Unificado de Tarefas:** O `TaskManager` unifica a visão de pendências do usuário (Eventos, Tarefas, Materiais). O `Router` direciona a execução. A Agenda renderiza ambos.
4.  **Logística de Materiais (Funil):** Entrada (Admin) -> Estoque -> Distribuição (Supervisor) gera pendência no Mobilizador -> Recebimento (Mobilizador) baixa a pendência. O Dashboard calculará o saldo em memória.
5.  **Dashboard Modular com ABAC:** O Dashboard filtra o JSON hierárquico para coordenadores.
6.  **Integridade de Texto:** `txt()` no backend, `cleanStr()` no frontend.

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
*   Etapa 9 (Sprint 1 e 2): Dashboard de Lideranças com Filtro ABAC, Abas Modulares.
*   Etapa 7 (Fases 1 a 3): Motor de Tarefas, Agenda Unificada e Tarefas Avulsas.
*   Bloqueio Histórico de Eventos.
*   RBAC Dinâmico (15 dígitos) com Auto-Correção de Schema.
*   Segurança de Senha (Troca obrigatória no primeiro login).
*   Etapa 8 (Fases 1 e 2): Módulo de Controle de Materiais (Entrada, Distribuição como Tarefa, Confirmação de Recebimento).

### Próximos Passos (Sequência Definida)
1.  **Etapa 8 (Fase 3): Dashboard de Logística:** Adicionar aba de Logística no Dashboard lendo a aba `Materiais_Movimentacao` (Estoque Atual, Trânsito, Receptores).
2.  **Etapa 8 (Fase 4): Devolução de Materiais:** Permitir que o mobilizador informe sobras de material ao concluir tarefa, atualizando o estoque.
