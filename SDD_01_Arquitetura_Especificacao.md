### Arquivo: `SDD_01_Arquitetura_E_Especificacao.md`

```markdown
# SDD - Arquitetura e Especificação Técnica
**Projeto:** Painel Geográfico e de Eventos
**Versão:** 1.9 (Sincronizado com o estado atual do código - Pós Otimização de Performance)
**Última Atualização:** [Data de Hoje]

## 1. Visão Geral da Arquitetura
O sistema é um Web App single-page construído em Vanilla JS, HTML e Tailwind CSS (via CDN). Sem frameworks de frontend. Utiliza o Google Sheets como banco de dados relacional e o Google Apps Script como backend serverless. Hospedado na Vercel.

*   **Leitura de Dados (GET):** Realizada via API nativa do Google Sheets (`gviz/tq`) com callback JSONP.
*   **Escrita de Dados (POST):** Realizada via requisições `fetch` (POST) para um Web App do Google Apps Script. Utiliza `Content-Type: text/plain;charset=utf-8` para bypass de pre-flight CORS.
*   **Modularização Frontend:** Padrão Namespace (`App.Object`). O roteamento de telas é gerenciado pelo módulo de Layout (Bottom Nav).
*   **Componentização de UI:** Elementos visuais reutilizáveis isolados no `ui_componentes.js`.
*   **Concorrência Backend:** Uso de `LockService.getScriptLock()` no `Code.gs`.

## 2. Estrutura de Módulos e Namespaces

### 2.1. Core (`core.js`)
*   `App.Core.Utils`: Funções base (`fetchJsonp`, `parseCustomDate`, `formatPhone`).
*   `App.Core.Security`: RBAC e validação de sessão.
*   `App.Core.API`: Camada de comunicação com o Apps Script (`postEvent`).
*   `App.Core.UI.Modal`: Wrapper genérico para modais.
*   `App.Core.Controller`: Orquestrador de inicialização, login híbrido e **Preload Condicional** de dados.

### 2.2. Componentes de UI (`ui_componentes.js`)
*   `App.UI.AccordionList`: Componente de lista sanitária (accordion) reutilizável. Gerencia a criação do HTML do card e o comportamento de abrir/fechar via *Event Delegation* global. Utilizado no Mapa e nos Eventos.

### 2.3. Layout (`layout.js`)
*   `App.Layout.Shell`: Módulo responsável pela Barra de Navegação Inferior (Bottom Nav) e pelo FAB (Floating Action Button) central.

### 2.4. Mapa (`mapa_dados.js`, `mapa_ui.js`, `mapa_mobile.js`, `mapa_modal.js`)
*   `App.Mapa.Dados`: Busca bairros e contatos. Usa `UPPER(F)` na query para garantir case-insensitivity nos filtros de equipe.

### 2.5. Eventos e Agenda (`eventos_dados.js`, `eventos_app.js`, `eventos_crud.js`, `eventos_kiosk.js`)
*   `App.Eventos.Dados`: Busca eventos e base de contatos, agrupa eventos 1:N. Possui função `loadFromCache` para renderização instantânea.

### 2.6. Admin (`admin_crud.js`)
*   `App.Admin.CRUD`: Módulo de gerenciamento de acessos.

## 3. Modelo de Dados (Google Sheets)

### 3.1. Planilha "Pessoal Campanha" (Contatos - Origem)
*   **Colunas:** A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe), G(Data), Z(ID Base36), AA(Senha_Hash), AB(Codigo_Acesso).

### 3.2. Planilha "Reuniões" (Eventos, Acessos e Dicionários)
*   **Aba `Eventos`:** A(ID_Evento), B(Nome), C(Data), D(Tipo), E(Bairro), F(Coord), G(Sup), H(Mob), I(Lista_Presença), J(Desc), K(Status), L(QR_Token).
*   **Aba `Acessos`:** A(Chave_Acesso), B(Equipes_Codigos), C(Nivel_Codigos), D(Modulos_Codigos).
*   **Abas Dicionário (`Equipes`, `Niveis`, `Modulos`):** Tabelas de 2 colunas (Código 3 dígitos, Nome).
*   **Aba `Base_Contatos` (Oculta):** Importa tudo via IMPORTRANGE.

## 4. Lógicas de Negócio e Performance Cruciais

1.  **Autenticação Híbrida:** Tela de login com detecção dinâmica (Telefone exige senha, Chave não).
2.  **RBAC de Mapa (Níveis):** `001` (Nome), `002` (ZAP - link direto), `003` (Card - modal com detalhes), `000` (Total - modal com função).
3.  **Cache de Dicionários (Backend):** A função `getDictionaries` no `Code.gs` utiliza `CacheService.getScriptCache()` para armazenar as tabelas de Equipes, Níveis e Módulos por 6 horas, reduzindo o tempo de processamento do login.
4.  **Preload Condicional e Cache Local (Frontend):**
    *   Após o login, o `initApp()` verifica as permissões do usuário.
    *   Utiliza `Promise.all` para buscar em paralelo: Bairros, Contatos do Mapa e (se tiver permissão) Eventos.
    *   Todos os dados salvos no `localStorage`.
    *   Em recarregamentos (F5) ou futuros logins, o sistema lê o `localStorage` e desenha as telas instantaneamente, buscando atualizações em segundo plano.
5.  **Padrão Visual Unificado:** Mapa e Eventos utilizam o mesmo componente de Sanfona (`App.UI.AccordionList`).

## 5. Status do Roadmap

### Etapa Kiosk (Concluída)
### Etapa 2: Novo Fluxo de Login (Concluída)
### Etapa UI/UX: Bottom Navigation, FAB e Componentização (Concluída)
### Etapa 4: CRUD Administrativo (Concluída)
### Etapa de Otimização: Preload Condicional e Caching (Concluída)

### Etapa 3: Aplicação das Regras de Hierarquia (Próximo Passo)
**Objetivo:** Levar a validação de segurança para o painel administrativo de eventos.
**Requisitos Técnicos:**
1.  Os usuários usarão o login via Telefone+Senha, portanto o `currentSession.id` conterá o `ID_Contato` real.
2.  Validar no frontend (`eventos_app.js` / `eventos_crud.js`) e backend (`Code.gs`) se o `ID_Contato` logado está nas colunas Coord, Sup ou Mob do evento alvo. Se não estiver, bloqueia botões de editar/cadastrar presença.

### Etapa 5: Cadastro de Contatos (Pendente)
### Etapa 6: Follow-up de Tarefas (Pendente)
### Etapa 7: Bloqueio Histórico (Pendente)
```
