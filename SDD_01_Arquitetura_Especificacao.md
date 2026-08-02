### Arquivo: `SDD_01_Arquitetura_E_Especificacao.md`

```markdown
# SDD - Arquitetura e Especificação Técnica
**Projeto:** Painel Geográfico e de Eventos
**Versão:** 1.1 (Sincronizado com o estado atual do código - Pós Deploy Vercel)
**Última Atualização:** [Data de Hoje]

## 1. Visão Geral da Arquitetura
O sistema é um Web App single-page construído em Vanilla JS, HTML e Tailwind CSS (via CDN). Sem frameworks de frontend. Utiliza o Google Sheets como banco de dados relacional e o Google Apps Script como backend serverless. Hospedado na Vercel.

*   **Leitura de Dados (GET):** Realizada via API nativa do Google Sheets (`gviz/tq`) com callback JSONP.
*   **Escrita de Dados (POST):** Realizada via requisições `fetch` (POST) para um Web App do Google Apps Script. Utiliza `Content-Type: text/plain;charset=utf-8` para bypass de pre-flight CORS.
*   **Modularização Frontend:** Padrão Namespace (`App.Object`) para isolamento de escopo. Métodos legados ainda expostos na `window` para compatibilidade com eventos `onclick` no HTML.
*   **Concorrência Backend:** Uso de `LockService.getScriptLock()` no `Code.gs`.

## 2. Estrutura de Módulos e Namespaces

### 2.1. Core (`core.js`)
*   `App.Core.Utils`: Funções base (`fetchJsonp`, `parseCustomDate`, `formatPhone`).
*   `App.Core.Security`: RBAC e validação de sessão.
*   `App.Core.API`: Camada de comunicação com o Apps Script (`postEvent`).
*   `App.Core.UI.Modal`: Wrapper genérico para modais.
*   `App.Core.Controller`: Orquestrador de inicialização, login (`performLogin`), logout e roteamento de telas (`toggleView`).

### 2.2. Mapa (`mapa_dados.js`, `mapa_ui.js`, `mapa_mobile.js`, `mapa_modal.js`)
*   `App.Mapa.Dados`: Busca bairros e contatos, gerencia cache no `localStorage`.
*   `App.Mapa.UI`: Renderiza pontos no SVG, gerencia filtros e regras de visibilidade desktop.
*   `App.Mapa.Mobile`: Renderiza a lista de contatos e agrupamentos de subzonas para mobile.
*   `App.Mapa.Modal`: Gerencia o modal de listagem geral de contatos e o modal de detalhes individuais.

### 2.3. Eventos (`eventos_dados.js`, `eventos_app.js`, `eventos_crud.js`, `eventos_kiosk.js`)
*   `App.Eventos.Dados`: Busca eventos e base de contatos, agrupa eventos 1:N e calcula a "Lógica de Bolha".
*   *Legacy Global (`eventos_app.js`)*: Renderiza o calendário (Mês/Semana/Dia) e os cards de eventos.
*   `App.Eventos.CRUD`: Modais de criação/edição de eventos, fluxo de presença manual e geração de QR Code. Possui estado interno `currentEditingEventId` para garantir URLs de QR Code corretas.
*   `App.Eventos.Kiosk`: Interface de quiosque para autodeserviço de presença via QR Code. Possui fluxo de login validado.

## 3. Modelo de Dados (Google Sheets)

### 3.1. Planilha "Pessoal Campanha" (Contatos)
*   **ID Planilha:** `1VGgM5QNBY0SiN3VuVYdQB78joPz9blvdrdHNQj9v73I`
*   **Aba:** `Página1`
*   **Colunas:** A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe), G(Data), Z(ID 4 chars Base36 gerado no backend).

### 3.2. Planilha "Reuniões" (Eventos)
*   **ID Planilha:** `1MRycZz_03uglcwJqYs_G3Kzc2osx6S_z9zYxGMAzsNM`
*   **Aba:** `Eventos`
*   **Colunas:** A(ID_Evento), B(Nome), C(Data), D(Tipo), E(Bairro), F(Coord), G(Sup), H(Mob), I(Lista_Presença - Append sem duplicidade), J(Desc), K(Status), L(QR_Token).

### 3.3. Apps Script (Backend - `Code.gs`)
*   **Endpoints (Actions):**
    *   `createEvent`, `updateEvent`
    *   `updatePresence`: Faz *append* (acumular IDs) sem sobrescrever.
    *   `createContact`, `updateContact`
    *   `generateQRToken` / `deactivateQRToken`
    *   `validateKioskAccess`: Valida o token e retorna dados do evento.
    *   `authorizeKioskMobilizer`: **(NOVO)** Valida se o telefone digitado pertence a um mobilizador do evento.
    *   `lookupContactByPhone`: **(NOVO)** Busca contato por telefone para o quiosque, eliminando download da planilha inteira.

## 4. Lógicas de Negócio Cruciais (Atualizadas)

1.  **Segurança do Quiosque (Kiosk Login):** O fluxo de autoatendimento foi substituído por um terminal validado. O mobilizador escaneia o QR Code e digita seu telefone. O backend valida o telefone contra a lista de mobilizadores daquele evento. Se válido, o terminal é liberado para cadastro atrelado àquele `mobId` específico.
2.  **Performance do Quiosque:** A busca de contatos no quiosque agora é server-side via `lookupContactByPhone`, reduzindo drasticamente o tempo de carregamento inicial no celular.
3.  **Geração de QR Code:** A URL do QR Code utiliza `window.location.origin`, capturando automaticamente o domínio da Vercel em produção.
4.  **RBAC (Acessos):** A aba `Acessos` define a visibilidade (1=Mapa, 2=Eventos, 3=CRUD). Usuário `codei9` tem bypass.
5.  **Lógica de Bolha (Métricas):** Ao agregar eventos, a presença sobre na hierarquia (Coord > Sup > Mob) sem duplicar a contagem do evento pai.
6.  **Normalização de Telefones:** Remoção do código `55`. Se faltar DDD (8 ou 9 dígitos), assume `21`.

## 5. Status do Roadmap

### Etapa Kiosk (Concluída)
*   **Sobrescrita de Presenças:** Resolvido. O backend agora lê a célula e faz append.
*   **Seleção de Mobilizadores:** Resolvido. Implementado login por telefone validado no backend.
*   **Performance e URL:** Resolvido. Busca server-side e deploy na Vercel.

### Etapa 3: Delegação de Presença e Segurança (Pendente)
**Objetivo:** Levar a validação de segurança do quiosque para o painel administrativo.
**Requisitos Técnicos:**
1.  **Identificação do Usuário Logado:** O `currentSession` precisará carregar o `ID 4 chars` do usuário.
2.  **Validação no Frontend:** Em `App.Eventos.CRUD.openPresenceModal` e `openEditModal`, verificar se o ID do usuário logado está contido nas chaves `coord`, `sup` ou `mob` do evento alvo.
3.  **Validação no Backend:** As funções `updatePresence` e `updateEvent` devem rejeitar a requisição se o solicitante não for o responsável.

### Etapa 4: Bloqueio Histórico (Pendente)
**Objetivo:** Impedir a edição de eventos passados.
**Requisitos Técnicos:**
1.  **Leitura de Status:** O campo `K(Status)` deve ser lido e carregado no `eventosDatabase`.
2.  **Bloqueio Temporal:** Se a data do evento for anterior ao dia atual, a UI desabilita botões de editar/cadastrar.
3.  **Segurança Backend:** O `Code.gs` rejeita escritas em eventos com data passada ou status fechado.
```

