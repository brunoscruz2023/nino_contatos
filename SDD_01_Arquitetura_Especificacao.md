### `SDD_01_Arquitetura_Especificacao.md` (Atualizado v4.0)
```markdown
# SDD - Arquitetura e Especificação Técnica
**Projeto:** Painel Geográfico e de Eventos
**Versão:** 4.0 (Modelo Normalizado, Hierarquia JSON e Preparação para Dashboard)
**Última Atualização:** [Data de Hoje]

## 1. Visão Geral da Arquitetura
O sistema é um Web App single-page construído em Vanilla JS, HTML e Tailwind CSS (via CDN). Sem frameworks de frontend. Utiliza o Google Sheets como banco de dados relacional e o Google Apps Script como backend serverless. Hospedado na Vercel.

*   **Leitura de Dados (GET):** Realizada via API nativa do Google Sheets (`gviz/tq`) com callback JSONP. O Mapa lê a planilha de Contatos diretamente. A Agenda lê as abas `Eventos`, `Base_Contatos` e `Presencas` em paralelo.
*   **Escrita de Dados (POST):** Realizada via requisições `fetch` (POST) para um Web App do Google Apps Script. Utiliza `Content-Type: text/plain;charset=utf-8` para bypass de pre-flight CORS.
*   **Integridade de Texto:** O backend utiliza a função auxiliar `txt()` (prefixo de apóstrofo) para forçar a gravação de códigos numéricos como texto puro. O frontend utiliza a função `cleanStr()` para remover este prefixo durante a leitura via API.
*   **Modularização Frontend:** Padrão Namespace (`App.Object`). O roteamento de telas é gerenciado pelo módulo de Layout (Bottom Nav).
*   **Componentização de UI:** Elementos visuais reutilizáveis isolados no `ui_componentes.js`.
*   **Concorrência Backend:** Uso de `LockService.getScriptLock()` no `Code.gs`.

## 2. Estrutura de Módulos e Namespaces

### 2.1. Core (`core.js`)
*   `App.Core.Utils`: Funções base (`fetchJsonp`, `parseCustomDate`, `formatPhone`, `getLocation`).
*   `App.Core.Security`: RBAC granular. Métodos como `canCreateEvent()`, `canCheckIn()`, `hasModuleAccess()`, `canEditContact()`. Lê a string de 12 dígitos (`currentSession.funcoes`).
*   `App.Core.API`: Camada de comunicação com o Apps Script (`postEvent`).
*   `App.Core.UI.Modal`: Wrapper genérico para modais.
*   `App.Core.Controller`: Orquestrador de inicialização, login híbrido e **Preload Condicional** de dados.

### 2.2. Componentes de UI (`ui_componentes.js`)
*   `App.UI.AccordionList`: Componente de lista sanitária (accordion) reutilizável. Utilizado no Mapa e nos Eventos.
*   `App.UI.Loader` / `App.UI.SuccessToast`: Overlays globais de carregamento e sucesso.
*   `App.UI.ContactForm`: Formulário reutilizável. Auto-preenche equipe, busca CEP/GPS, valida duplicidade. Usado no Cadastro Direto e na Presença de Eventos.
*   `App.UI.HierarchyBuilder`: **Novo Componente**. Construtor visual de árvore hierárquica. Permite adicionar Coordenador Geral > Área > Supervisor > Mobilizador. Exporta e importa dados via JSON (`getJson` / `loadJson`). Utilizado na criação/edição de Eventos.

### 2.3. Layout (`layout.js`)
*   `App.Layout.Shell`: Módulo responsável pela Barra de Navegação Inferior (Bottom Nav) dinâmica (oculta o botão do módulo ativo) e pelo FAB central.

### 2.4. Mapa (`mapa_dados.js`, `mapa_ui.js`, `mapa_mobile.js`, `mapa_modal.js`)
*   `App.Mapa.Dados`: Busca bairros e contatos. Usa `UPPER(F)` na query para garantir case-insensitivity nos filtros de equipe. Lê permissões diretamente de `currentSession.funcoes.mapa`.
*   `App.Mapa.UI`: Renderiza pontos no SVG, gerencia filtros. Injeta a lista de nomes corretamente dentro da estrutura do componente `AccordionList`.

### 2.5. Eventos e Agenda (`eventos_dados.js`, `eventos_app.js`, `eventos_crud.js`, `eventos_kiosk.js`)
*   `App.Eventos.Dados`: Busca eventos, base de contatos e presenças em paralelo. O modelo de dados de eventos foi **normalizado** (1 linha por evento). A hierarquia é lida de um JSON na Coluna F, "achatada" em memória pela função recursiva `extractParticipacoes`. As presenças são agrupadas a partir da aba `Presencas`.
*   **ABAC Aplicado:** A Agenda filtra os eventos exibidos. Se a função for `001` (Atuante), mostra apenas eventos onde o `currentSession.id` está na hierarquia.
*   `App.Eventos.CRUD`: Módulo de gerenciamento de eventos. Utiliza o `App.UI.HierarchyBuilder` para montar a árvore de organizadores. Gera QR Code e gerencia presenças logadas.
*   `App.Eventos.Kiosk`: Fluxo de quiosque de check-in via QR Code. (PENDÊNCIA: Fluxo de auto-check-in do organizador ainda não implementado neste módulo).

### 2.6. Admin (`admin_crud.js`)
*   `App.Admin.CRUD`: Módulo de gerenciamento de acessos. Monta os seletores de permissão dinamicamente a partir da aba `Funcoes_Modulos`. Traduz os nomes de equipes salvas no contato para códigos ao marcar as checkboxes.

### 2.7. Cadastro Direto (`cadastro_app.js`)
*   `App.Cadastro.UI`: Módulo isolado para usuários com permissão de cadastro. Instancia o `App.UI.ContactForm`.

## 3. Modelo de Dados (Google Sheets)

### 3.1. Planilha "Pessoal Campanha" (Contatos - Origem)
*   **Colunas:** A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe - *Nomes traduzidos pelo backend*), G(Data), Z(ID Base36), AA(Senha_Hash), AB(Codigo_Acesso 12 dígitos). Todos os IDs e Códigos são gravados com prefixo de apóstrofo para evitar conversão numérica.

### 3.2. Planilha "Reuniões" (Eventos, Acessos, Presenças e Dicionários)
*   **Aba `Eventos`:** A(ID_Evento), B(Nome), C(Data), D(Tipo), E(Bairro), F(Estrutura_JSON), G(Lista_Presenca - *Legado/Vazio*), H(Desc), I(Status), J(QR_Token).
    *   *Estrutura_JSON:* String JSON contendo a árvore hierárquica completa do evento (Coordenadores > Supervisores > Mobilizadores com seus respectivos IDs da Base de Contatos).
*   **Aba `Presencas` (Nova):** A(Timestamp), B(ID_Evento), C(ID_Organizador), D(ID_Participante), E(Lat), F(Long). Registra 1 linha por presença confirmada (Quiosque ou Painel).
*   **Aba `Acessos` (Legado):** A(Chave_Acesso), B(Equipes_Codigos), C(Nivel_Codigos), D(Modulos_Codigos), E(Codigo_Novo 12 dígitos).
*   **Abas Dicionário:** `Equipes` (Código, Nome), `Niveis`, `Modulos`, `Funcoes` (Funções de Contato), `Funcoes_Modulos` (Modulo, Código, Descrição).
*   **Aba `Logs_Atividades`:** Timestamp, Usuario_ID, Acao, Ref_ID, Lat, Long, Status.
*   **Aba `Base_Contatos` (Oculta):** Importa tudo via IMPORTRANGE.

## 4. Lógicas de Negócio e Performance Cruciais

1.  **Autenticação Híbrida:** Tela de login com detecção dinâmica (Telefone exige senha, Chave não).
2.  **RBAC Granular (String de 12 dígitos):** Formato `[Mapa 3][Agenda 3][Cadastro 3][Admin 3]` (ex: `003003002000`). Hardcode do `codei9` removido; agora lê a coluna E da aba `Acessos`.
3.  **Fallback de Permissões (Legado):** Se a coluna E estiver vazia na aba `Acessos`, o backend traduz as colunas C e D (níveis e módulos antigos) para o novo formato de 12 dígitos em memória.
4.  **Opção B (Tradução de Equipes):** O Admin marca equipes por **código**. O `saveUserAccess` traduz para **nomes** e salva na coluna F do contato. O login lê os nomes da coluna F e envia para a sessão. O Mapa filtra por nomes.
5.  **Cache de Dicionários (Backend):** A função `getDictionaries` utiliza `CacheService.getScriptCache()` por 6 horas.
6.  **Preload Condicional e Cache Local (Frontend):** `Promise.all` busca Bairros, Contatos, Eventos, Presenças e Dicionários em paralelo. Dados salvos no `localStorage` para renderização instantânea (F5).
7.  **Rastreamento de Atividade:** Criação de contato e check-in geram log com Timestamp, ID, Ação, Ref e GPS.
8.  **Normalização de Dados de Evento:** O evento é salvo em 1 linha. A hierarquia é um JSON. As presenças são logadas separadamente. Isso elimina a duplicação de dados e prepara o sistema para agregações rápidas no Dashboard.

## 5. Estrutura de Arquivos Atuais

### Frontend (Vercel / Dev)
*   `index.html`, `core.js`, `ui_componentes.js`, `layout.js`
*   `mapa_dados.js`, `mapa_ui.js`, `mapa_mobile.js`, `mapa_modal.js`
*   `eventos_dados.js`, `eventos_app.js`, `eventos_crud.js`, `eventos_kiosk.js`
*   `admin_crud.js`, `cadastro_app.js`

### Backend (Google Apps Script)
*   `Code.gs`

## 6. Status do Roadmap e Transições

### Concluído:
*   Etapa Kiosk (Quiosque QR Code) - *Parcial: Falta Auto-check-in Organizador*
*   Etapa 2: Novo Fluxo de Login (Híbrido)
*   Etapa UI/UX: Bottom Navigation, FAB e Componentização
*   Etapa 4: CRUD Administrativo (Granular e Dinâmico)
*   Etapa 5: Cadastro de Contatos (Direto e em Eventos)
*   Otimização: Preload Condicional e Caching
*   Etapa 3: ABAC na Agenda (Filtro de Eventos por Usuário)
*   Rastreamento: GPS e Logs de Atividade
*   Transição de Equipes (Opção B): Backend traduz códigos para nomes.
*   Limpeza de Código: Remoção de Hardcode e fallback legado.
*   **Etapa 6 (Parcial): Refatoração Estrutural de Eventos.** Backend normalizado (JSON + Aba Presenças), Frontend lendo e desenhando a árvore na UI e no Card.

### Próximos Passos (Sequência Definida)
1.  **Finalizar Etapa 6 (Kiosk/Auto-Check-in):** Ajustar `eventos_kiosk.js` para chamar `authorizeKioskMobilizer` no init (pedindo o telefone do organizador) e fazer o auto-check-in do organizador antes de registrar participantes.
2.  **Ajuste Fino de Presença:** No `eventos_app.js`, o botão "Cadastrar Presença" deve passar o ID do mobilizador logado (ou selecionado) em vez de pegar sempre o primeiro da lista.
3.  **Deploy e Teste de Campo:** Publicação da versão atualizada e validação em ambiente real.
4.  **Limpeza Estrutural (Opção A):** Com o frontend novo estabilizado em produção, migrar a coluna F para **códigos**. Ajustar leituras diretas (`gviz/tq`) para traduzir códigos em memória. Aumento de performance e integridade referencial.

### Pendentes (Após Teste de Campo)
*   Etapa 7: Follow-up de Tarefas (Agenda compartilhada).
*   Etapa 8: Bloqueio Histórico (Edição de eventos passados).
*   Etapa 9: Dashboard de Lideranças (Consumo direto da aba `Presencas` e `Logs_Atividades`).
```
