
```markdown
# SDD - Arquitetura e Especificação Técnica
**Projeto:** Painel Geográfico e de Eventos
**Versão:** 11.0 (Registro de Bugs, Decisões de Produto e Roadmap de Correções)
**Última Atualização:** [Data de Hoje]

## 1. Visão Geral da Arquitetura
O sistema é um Web App single-page construído em Vanilla JS, HTML e Tailwind CSS (via CDN). Sem frameworks de frontend. Utiliza o Google Sheets como banco de dados relacional e o Google Apps Script como backend serverless. Hospedado na Vercel.

*   **Leitura de Dados (GET):** Realizada via API nativa do Google Sheets (`gviz/tq`) com callback JSONP. O tempo limite (timeout) do `fetchJsonp` no frontend é de 20 segundos.
*   **Escrita de Dados (POST):** Realizada via requisições `fetch` (POST) para um Web App do Google Apps Script. Utiliza `mode: 'cors'` e `Content-Type: text/plain;charset=utf-8` para bypass de pre-flight CORS.
*   **Integridade de Texto:** O backend utiliza a função auxiliar `txt()` (prefixo de apóstrofo) para forçar a gravação de códigos numéricos como texto puro. O frontend utiliza a função `cleanStr()` para remover este prefixo.
*   **Modularização Frontend:** Padrão Namespace (`App.Object`). O roteamento de telas é gerenciado pelo módulo de Layout (Bottom Nav).

### 1.2. Princípios de Arquitetura e Reusabilidade (Regras de Ouro)
1.  **Modularização:** Todo código deve respeitar o padrão Namespace.
2.  **Reusabilidade:** Verificar a existência de funções em `App.Core.Utils` ou componentes no `ui_componentes.js` antes de criar novo código.
3.  **Parametrização:** Componentes devem aceitar configurações via objetos.
4.  **Isolamento de Impacto:** Garantir que o código seja aditivo ou isolado, sem quebrar a produção.

## 2. Estrutura de Módulos e Namespaces

### 2.1. Core (`core.js`)
*   `App.Core.Security`: **RBAC Dinâmico (18 dígitos)**. A função `hasModuleAccess(modulo)` busca a chave em minúsculas. Trata `undefined` como bloqueio.
    *   *RBAC Desamarrado:* As funções `canManageMaterials()` e `canDistributeMaterial()` verificam apenas `hasModuleAccess('materiais')`.
*   `App.Core.TaskManager`: Motor unificado de tarefas. Além de Eventos e Tarefas, gera a pendência `MAT_RETURN` se o usuário tiver materiais devolvíveis em memória. Possui o modal exclusivo `showMaterialReturnModal` para devolução ao estoque.
*   `App.Core.UI.openChangePasswordModal`: Modal para troca de senha obrigatória (bloqueia `123456`).

### 2.2. Componentes de UI (`ui_componentes.js`)
*   `App.UI.AccordionList`: Sanfona reutilizável.
*   `App.UI.ContactForm`: Formulário parametrizado com Multi-Select de Equipes.
*   `App.UI.HierarchyBuilder`: Construtor e visualizador de árvore (JSON). Inclui `renderReadOnlyHtml`/`renderReadOnlyNodes` para visualização somente-leitura com presenças por mobilizador.
*   `App.UI.StatCard` / `App.UI.PeriodSelector` / `App.UI.TabNav`: Componentes do Dashboard.
*   `App.UI.ContactSearch`: Componente de busca reutilizável. Detecta Nome ou Telefone, dropdown flutuante para múltiplos resultados, navegação por teclado.

### 2.3. Layout (`layout.js`)
*   `App.Layout.Shell`: Barra de Navegação Inferior dinâmica.
*   **FAB Desativado:** Oculto permanentemente (medida emergencial documentada).
*   **Menu Inferior Inteligente:** Regra de Redundância (Admin oculta Cadastro e Materiais), Matriz de Prioridade (Dashboard > Admin > Agenda > Mapa), limite de 4 itens + logout.

### 2.4. Eventos, Tarefas e Materiais (`eventos_*.js`)
*   `App.Eventos.Dados`: Busca eventos, contatos (aba `Base_Contatos`), presenças, tarefas e materiais em paralelo.
*   `App.Eventos.UI` (implementado como funções globais — débito técnico P4.1): Agenda Unificada.
*   `App.Eventos.Kiosk`: Quiosque QR Code com Auto-check-in.

### 2.5. Dashboard (`dashboard_app.js`)
*   `App.Dashboard.Dados`: Agregação em memória. `getLogisticsMetrics()` calcula `estoqueAtual` somando Devoluções.
*   `App.Dashboard.UI`: Abas condicionais por RBAC (Operação/Agenda, Território/Mapa, Logística/Materiais).

### 2.6. Admin (`admin_crud.js`) e Cadastro (`cadastro_app.js`)
*   `App.Admin.CRUD`: Abas internas (`App.UI.TabNav`): Aba Acessos (busca `App.UI.ContactSearch` + RBAC) e Aba Materiais (Entrada/Distribuição, visível apenas com acesso a `materiais`).

## 3. Modelo de Dados (Google Sheets)

### 3.1. Planilha "Pessoal Campanha" (Contatos)
*   **Colunas:** A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe), G(Data), Z(ID), AA(Senha), AB(Codigo_Acesso). IDs com prefixo de apóstrofo.

### 3.2. Planilha "Reuniões"
*   **Aba `Modulos`:** Define o RBAC (6 linhas/18 dígitos).
*   **Aba `Materiais_Itens`:** A(Cod_Item), B(Nome_Item). Dicionário de padronização.
*   **Aba `Materiais_Movimentacao`:** A(Timestamp retroativo), B(ID_Transacao), C(Tipo_Mov), D(Item), E(Quantidade), F(ID_Origem_Destino), G(ID_Responsavel), H(Ref_ID), I(Status).
*   **Aba `Base_Contatos`:** Espelho de contatos usado para login e lookup (colunas idênticas à Pessoal Campanha).

## 4. Lógicas de Negócio Cruciais

1.  **Auto-Correção de Schema:** `normalizeAccessCode` adiciona `000` aos códigos legados e persiste na base.
2.  **Motor Unificado de Tarefas:** `TaskManager` unifica pendências de Eventos, Tarefas, Recebimento e Devolução de Materiais.
3.  **Logística de Materiais (Funil de Auditoria):** Datas retroativas, itens padronizados via dicionário, Devolução como pendência isolada (`showMaterialReturnModal`) com limite de quantidade em posse.
4.  **Dashboard Modular com ABAC:** Abas condicionais por RBAC. **[D1]** Filtro de dados da aba Operação deve equivaler ao ABAC da Agenda (correção agendada — ver 7.3, item 2.9).

## 5. Estrutura de Arquivos Atuais

### Frontend (Vercel / Dev)
*   `index.html`, `core.js`, `ui_componentes.js`, `layout.js`
*   `mapa_dados.js`, `mapa_ui.js`, `mapa_mobile.js`, `mapa_modal.js`
*   `eventos_dados.js`, `eventos_app.js`, `eventos_crud.js`, `eventos_kiosk.js`
*   `admin_crud.js`, `cadastro_app.js`
*   `dashboard_app.js`

### Backend (Google Apps Script)
*   `Code.gs` (Cache de dicionários `dicts_acessos_v10`, TTL 6h)

## 6. Status do Roadmap e Transições

### Concluído:
*   Etapas 1 a 9 (Kiosk, Login, UI/UX, Admin, Cadastro, Refatoração de Eventos, Motor de Tarefas, Dashboard ABAC, Módulo de Materiais completo).
*   RBAC Dinâmico (18 dígitos) desamarrado para Materiais.
*   Refatoração do Admin em Abas, `App.UI.ContactSearch`, Menu Inferior Inteligente sem FAB.

### Próximos Passos
1.  **BLOQUEADO — Etapa 10 (Botão de Ajuda In-App):** somente após conclusão das prioridades de correção definidas na seção 7 (P1 a P5).

---

## 7. Registro de Bugs, Decisões de Produto e Roadmap de Correções (NOVO)

> Origem: auditoria técnica completa de todos os 19 arquivos do sistema (documentação, frontend e backend), conduzida nas visões de Gerente de Produto (PM), Analista Sênior (AS) e Desenvolvedor (DV).

### 7.1. Metodologia de Priorização
Ordem de atendimento: **P1 Funcionamento de Campo** (impacto imediato na operação) → **P2 Lógica e Integridade de Dados** → **P3 Segurança** (decisão D2) → **P4 Débitos Técnicos** → **P5 Documentação** (decisão explícita: por último) → **Etapa 10 e novas implementações** (bloqueadas até conclusão de P1–P5).

### 7.2. Decisões de Produto Registradas

| ID | Decisão | Status |
|---|---|---|
| D1 | Dashboard deve ter acesso às informações equivalente aos ABAC dos módulos correspondentes. Abas condicionais já implementadas; filtro de dados da Aba Operação deve equiparar-se à Agenda (`001` filtra por participação; `002+` vê tudo). | ✅ Decidido — escopo definido (~8 linhas em `dashboard_app.js`) |
| D2 | Segurança (validação de autorização no Apps Script) endereçada após correções de lógica. Justificativa: uso restrito e não comercial. | ✅ Decidido |
| D3 | Nível `001` do Mapa não visualizar nomes de contatos. | 🔵 Em Análise — Opção A (bloqueio de UI, ~12 linhas) vs. Opção B (bloqueio total: query sem coluna B, ~20 linhas, privacidade completa). Recomendação técnica: **Opção B**. |
| D4 | Estratégia de execução das correções. | 🔵 Em Análise — Recomendação: 3 blocos (A: itens frontend isolados 1.2/1.3/1.4/1.6; B: cache bump 1.5; C: backend 1.1 com teste em ambiente espelho). |

### 7.3. Tabela Consolidada de Correções

Legenda de status: ⬜ Pendente | 🔵 Em Análise/Decisão | ✅ Decidido (aguardando janela)

#### P1 — Funcionamento de Campo (crítico, impacto imediato em operação)

| # | Item | Visão | Arquivo(s) | Esforço | Risco | Status |
|---|---|---|---|---|---|---|
| 1.1 | **Bug: Criação de Tarefa Avulsa quebrada** — action `lookupContactByPhone` inexistente no backend; payload (`phone`) e retorno (`res.contact` singular) divergem do contrato real (`lookupContact` com `term`/`type`, retorna `contacts` array) | DV | `eventos_crud.js` + `Code.gs` | Médio | Alto | ⬜ Bloco C |
| 1.2 | **Bug: `setActive('materiais')` sem view própria** — tela preta para perfis com `Materiais ≠ 000` e `Admin = 000` | PM/AS | `layout.js` | Baixo | Baixo | ⬜ Bloco A |
| 1.3 | **Bug: Kiosk cold start** — sem `dictsGlobal`/`geoDicionario`/`funcoesList` (datalist vazio, sem equipes, sem funções) | PM | `eventos_kiosk.js` | Baixo | Baixo | ⬜ Bloco A |
| 1.4 | **Bug: Navegação entre meses pula fevereiro** — `setMonth` em dias 29–31 desloca o mês | DV | `eventos_app.js` | Baixo | Baixo | ⬜ Bloco A |
| 1.5 | **Cache bump `_v1` → `CACHE_VERSION`** — invalida caches obsoletos de eventos/tarefas/materiais | AS | `eventos_dados.js` | Baixo | Médio (re-fetch global) | ⬜ Bloco B |
| 1.6 | **Bug: z-index do `ContactSearch` em modal** — dropdown (z-30) atrás do overlay (z-120) em "Distribuir Material" | DV | `ui_componentes.js` | Baixo | Baixo | ⬜ Bloco A |
| 1.7 | **Discrepância nível `001` Mapa vs. Manual** — código exibe nomes; manual diz "sem nomes" | PM | `mapa_dados/ui/modal/mobile.js` | Baixo | Baixo | 🔵 D3 (Opção A/B) |

#### P2 — Correções de Lógica e Integridade de Dados

| # | Item | Visão | Arquivo(s) | Esforço | Risco | Status |
|---|---|---|---|---|---|---|
| 2.1 | `updatePresence` sem dedup — race condition duplica presenças | DV | `Code.gs` | Médio | Médio | ⬜ |
| 2.2 | `iniciarAtuacao` registra presença invisível para coordenador/supervisor (árvore só exibe presenças de mobilizadores) | AS | `eventos_crud.js` | Médio | Baixo | ⬜ |
| 2.3 | Dashboard Logística soma quantidades de itens distintos (folhetos + camisetas = agregado sem significado) | PM/AS | `dashboard_app.js` | Médio | Baixo | ⬜ |
| 2.4 | `updateEvent` reescreve aba inteira (`clearContents` + `setValues`) — performance e reordenação | AS/DV | `Code.gs` | Médio | Médio | ⬜ |
| 2.5 | `timestamp` de materiais vira string ISO após cache (`JSON.parse` não restaura `Date`) | DV | `eventos_dados.js` | Baixo | Médio | ⬜ |
| 2.6 | Frontend não valida "123456" em `saveAccess` (SDD exige validação dupla) | PM/DV | `admin_crud.js` | Baixo | Nenhum | ⬜ |
| 2.7 | Inconsistência de case em status de materiais (backend mixed case; dois caminhos frontend verificam diferentemente) | DV | `Code.gs` + `core.js` | Baixo | Baixo | ⬜ |
| 2.8 | `fetchJsonp` não remove script/callback em timeout — vazamento | DV | `core.js` | Baixo | Baixo | ⬜ |
| 2.9 | **Equiparar `getVisibleEvents` (Dashboard) ao ABAC da Agenda** — conforme Decisão D1 | AS | `dashboard_app.js` | Baixo (~8 linhas) | Baixo | ✅ D1 |
| 2.10 | `submitData` invalida cache do Mapa em vez do cache de Eventos | DV | `eventos_crud.js` | Baixo | Baixo | ⬜ |
| 2.11 | StatCards da Logística são totais acumulados, mas ranking é filtrado por período — inconsistência semântica | DV | `dashboard_app.js` | Médio | Baixo | ⬜ |

#### P3 — Segurança (após P2, conforme Decisão D2)

| # | Item | Visão | Arquivo(s) | Esforço | Risco | Status |
|---|---|---|---|---|---|---|
| 3.1 | Apps Script sem validação de autorização — qualquer portador da URL pode invocar actions sensíveis (`saveUserAccess`, etc.) | PM | `Code.gs` | Alto | Alto | ⬜ Adiado (D2) |
| 3.2 | Login por chave legado sem senha | PM | `Code.gs` | Decisão | Médio | ⬜ Adiado (D2) |
| 3.3 | IDs sequenciais previsíveis (`EVT-0001`, `TASK-0001`, `MAT-0001`) | DV | `Code.gs` | Médio | Baixo | ⬜ Adiado (D2) |

#### P4 — Débitos Técnicos (manutenibilidade)

| # | Item | Visão | Arquivo(s) | Esforço | Risco | Status |
|---|---|---|---|---|---|---|
| 4.1 | Migrar `eventos_app.js` para namespace `App.Eventos.UI` (violação do SDD 1.2 — funções e estado globais) | AS | `eventos_app.js` | Médio | Médio | ⬜ |
| 4.2 | Migrar `App.Core.API.postEvent` para Promise (elimina ~10 wrappers) | DV | `core.js` | Médio | Médio | ⬜ |
| 4.3 | Refactor `updateEvent` para atualizar linha específica | DV | `Code.gs` | Médio | Médio | ⬜ (relacionado 2.4) |
| 4.4 | Duplicação: cálculo de tendência em 3 lugares — extrair helper | AS | `mapa_ui.js`/`mapa_mobile.js`/`mapa_modal.js` | Médio | Baixo | ⬜ |
| 4.5 | Duplicação: lógica RBAC de renderização entre `applyFilters` e `renderDesktopModal` | AS | `mapa_ui.js`/`mapa_modal.js` | Médio | Baixo | ⬜ |
| 4.6 | Duplicação: `trendIcon` SVG inline — extrair para `ICONS` | DV | `mapa_ui.js`/`mapa_mobile.js` | Baixo | Baixo | ⬜ |
| 4.7 | `togglePasswordVisibility` duplicada (`core.js` vs `mapa_ui.js`) | DV | `mapa_ui.js` | Baixo | Baixo | ⬜ |
| 4.8 | Monkey-patch `window.initEventos` no `index.html` — acoplamento frágil | DV | `index.html` | Médio | Médio | ⬜ |
| 4.9 | Remoção de código morto (6 ocorrências): `handleTaskPhoneInput`, `toggleKebabMenu`, `presenceList`, `handleEventCardClick`+`setEventFab`/`resetFab`, `fetchTimeout`, `DOMContentLoaded` redundante no Dashboard | DV | `eventos_crud.js`, `mapa_ui.js`, `mapa_dados.js`, `eventos_app.js`/`layout.js`, `dashboard_app.js` | Baixo | Nenhum | ⬜ |
| 4.10 | `getMaterialBalance` async desnecessário | DV | `admin_crud.js` | Baixo | Nenhum | ⬜ |
| 4.11 | `admin_crud.js` duplica busca de dicionários (usar `window.dictsGlobal`) | DV | `admin_crud.js` | Baixo | Baixo | ⬜ |
| 4.12 | `expandedSubzonas` global cross-file | DV | `mapa_ui.js`/`mapa_mobile.js` | Baixo | Baixo | ⬜ |
| 4.13 | Dependência de globais entre módulos (`geoDatabase`, `currentSession`, etc.) — centralizar em `App.State` | DV | Múltiplos | Alto | Alto | ⬜ |
| 4.14 | `ContactSearch` vs `ContactForm.lookupPhone` divergem em múltiplos resultados | AS | `ui_componentes.js` | Médio | Baixo | ⬜ |
| 4.15 | `lookupContact` limitado a 10 resultados | DV | `Code.gs` | Baixo | Nenhum | ⬜ |
| 4.16 | `getDictionaries` silencioso se aba renomeada | DV | `Code.gs` | Baixo | Nenhum | ⬜ |
| 4.17 | Variáveis globais com `var` no topo dos arquivos (viram propriedades de `window`) | AS | Múltiplos | Alto | Alto | ⬜ |
| 4.18 | Handlers `onclick` inline no HTML divergem do Namespace | DV | `index.html` | Alto | Alto | ⬜ |

#### P5 — Documentação (última, conforme decisão explícita)

| # | Item | Visão | Arquivo(s) | Esforço | Status |
|---|---|---|---|---|---|
| 5.1 | Atualizar `MANUAL_USUARIO.md` (FAB oculto, Admin em abas, Devolução, dicionário de itens, datas retroativas, comportamento do `001` conforme D3) | PM | `MANUAL_USUARIO.md` | Médio | ⬜ |
| 5.2 | Atualizar `CONFIG_E_CODIGOS.md` (aba `Base_Contatos`, estrutura da aba `Bairros` — 7 colunas) | AS | `CONFIG_E_CODIGOS.md` | Baixo | ⬜ |
| 5.3 | Revisão final das seções 1–6 deste SDD após conclusão das correções (refletir mudanças de código) | AS | `SDD_01` | Médio | ⬜ |

### 7.4. Regra de Bloqueio
A **Etapa 10 (Botão de Ajuda In-App)** e quaisquer novas implementações só serão iniciadas após a conclusão de P1 a P5.

### 7.5. Estratégia de Execução (Pendente de Decisão — D4)
Recomendação técnica: execução em **3 blocos**:
*   **Bloco A** — 1.2 + 1.3 + 1.4 + 1.6 (frontend, arquivos independentes, deploy único).
*   **Bloco B** — 1.5 (cache bump, efeito sistêmico isolado).
*   **Bloco C** — 1.1 (backend, teste em ambiente espelho antes de promover).
Cada bloco terá Procedimento de Teste estruturado antes do avanço ao seguinte.
```

---

## Pendências de Decisão (Resumo)

| # | O que falta decidir | Impacto |
|---|---|---|
| 1 | **Estratégia de execução da P1** — autorizar blocos A/B/C, um-a-um, ou outro formato | Define o início da codificação |
| 2 | **D3 — Opção A ou B para o item 1.7** (001 sem nomes) | Recomendo Opção B (privacidade real, custo marginal de ~8 linhas) |
| 3 | Confirmar se a decisão D4 incluirá o 1.7 na P1 (se decidido antes) ou se ele desce para P2 | Ordem da tabela |
