### Arquivo: `SDD_01_Arquitetura_E_Especificacao.md`

```markdown
# SDD - Arquitetura e Especificação Técnica
**Projeto:** Painel Geográfico e de Eventos
**Versão:** 1.5 (Sincronizado com o estado atual do código - Pós Implementação CRUD Admin)
**Última Atualização:** [Data de Hoje]

## 1. Visão Geral da Arquitetura
O sistema é um Web App single-page construído em Vanilla JS, HTML e Tailwind CSS (via CDN). Sem frameworks de frontend. Utiliza o Google Sheets como banco de dados relacional e o Google Apps Script como backend serverless. Hospedado na Vercel.

*   **Leitura de Dados (GET):** Realizada via API nativa do Google Sheets (`gviz/tq`) com callback JSONP. No backend (Apps Script), leituras de contatos usam a aba `Base_Contatos` (espelho local via IMPORTRANGE) para performance.
*   **Escrita de Dados (POST):** Realizada via requisições `fetch` (POST) para um Web App do Google Apps Script. Utiliza `Content-Type: text/plain;charset=utf-8` para bypass de pre-flight CORS. Escritas em contatos usam `SpreadsheetApp.openById()` para gravar direto na planilha original ("Pessoal Campanha").
*   **Modularização Frontend:** Padrão Namespace (`App.Object`). O roteamento de telas é gerenciado pelo módulo de Layout (Bottom Nav).
*   **Concorrência Backend:** Uso de `LockService.getScriptLock()` no `Code.gs`.

## 2. Estrutura de Módulos e Namespaces

### 2.1. Core (`core.js`)
*   `App.Core.Utils`: Funções base (`fetchJsonp`, `parseCustomDate`, `formatPhone`).
*   `App.Core.Security`: RBAC e validação de sessão.
*   `App.Core.API`: Camada de comunicação com o Apps Script (`postEvent`).
*   `App.Core.UI.Modal`: Wrapper genérico para modais.
*   `App.Core.Controller`: Orquestrador de inicialização e login híbrido (`performLogin`).

### 2.2. Layout (`layout.js`)
*   `App.Layout.Shell`: Módulo responsável pela Barra de Navegação Inferior (Bottom Nav). Gerencia a renderização dos botões dinamicamente (baseado no RBAC), controla o estado ativo e alterna a visibilidade das divs `#view-mapa`, `#view-eventos` e `#view-admin`.

### 2.3. Mapa (`mapa_dados.js`, `mapa_ui.js`, `mapa_mobile.js`, `mapa_modal.js`)
*   `App.Mapa.Dados`: Busca bairros e contatos. Usa `UPPER(F)` na query para garantir case-insensitivity nos filtros de equipe.
*   `App.Mapa.UI`, `App.Mapa.Mobile`, `App.Mapa.Modal`: Renderização, filtros, e modais. Bloqueio de sanfona se não houver acesso aos nomes.

### 2.4. Eventos (`eventos_dados.js`, `eventos_app.js`, `eventos_crud.js`, `eventos_kiosk.js`)
*   `App.Eventos.Dados`: Busca eventos e base de contatos, agrupa eventos 1:N.
*   `App.Eventos.CRUD`: Modais de criação/edição, fluxo de presença e QR Code.
*   `App.Eventos.Kiosk`: Interface de quiosque para autodeserviço via QR Code.

### 2.5. Admin (`admin_crud.js` - NOVO)
*   `App.Admin.CRUD`: Módulo de gerenciamento de acessos. Busca contato por telefone, carrega dicionários (Equipes, Níveis, Módulos) via checkboxes, gera senha aleatória de 6 dígitos e envia para o backend criptografar (Hash SHA-256) e salvar na planilha original.

## 3. Modelo de Dados (Google Sheets)

### 3.1. Planilha "Pessoal Campanha" (Contatos - Origem)
*   **Colunas:** A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe), G(Data), Z(ID Base36), AA(Senha_Hash), AB(Codigo_Acesso).

### 3.2. Planilha "Reuniões" (Eventos, Acessos e Dicionários)
*   **Aba `Eventos`:** A(ID_Evento), B(Nome), C(Data), D(Tipo), E(Bairro), F(Coord), G(Sup), H(Mob), I(Lista_Presença), J(Desc), K(Status), L(QR_Token).
*   **Aba `Acessos`:** A(Chave_Acesso), B(Equipes_Codigos), C(Nivel_Codigos), D(Modulos_Codigos).
*   **Abas Dicionário (`Equipes`, `Niveis`, `Modulos`):** Tabelas de 2 colunas (Código 3 dígitos, Nome).
*   **Aba `Base_Contatos` (Oculta):** Importa tudo via IMPORTRANGE.

## 4. Lógicas de Negócio Cruciais

1.  **Autenticação Híbrida:** Tela de login com detecção dinâmica (Telefone exige senha, Chave não).
2.  **RBAC de Mapa (Níveis):** `001` (Nome), `002` (ZAP - link direto), `003` (Card - modal com detalhes), `000` (Total - modal com função).
3.  **Provisionamento de Acessos:** O Admin cria o `Codigo_Acesso` (ex: `001,001,001004`) que é salvo em texto plano. A senha é hasheada (SHA-256) no backend antes de salvar.
4.  **Roteamento via Bottom Nav:** A barra inferior exibe Mapa, Eventos, Admin (se módulo 3 ou 4) e Sair.

## 5. Status do Roadmap

### Etapa Kiosk (Concluída)
### Etapa 2: Novo Fluxo de Login (Concluída)
### Etapa UI/UX: Bottom Navigation (Concluída)
### Etapa 4: CRUD Administrativo (Concluída)

### Etapa 3: Aplicação das Regras de Hierarquia (Próximo Passo)
**Objetivo:** Levar a validação de segurança para o painel administrativo de eventos.
**Requisitos Técnicos:**
1.  Com a Etapa 4 pronta, os usuários usarão o login via Telefone+Senha, portanto o `currentSession.id` conterá o `ID_Contato` real.
2.  Validar no frontend (`eventos_app.js` / `eventos_crud.js`) e backend (`Code.gs`) se o `ID_Contato` logado está nas colunas Coord, Sup ou Mob do evento alvo. Se não estiver, bloqueia botões de editar/cadastrar presença.

### Etapa 5: Bloqueio Histórico (Pendente)
**Objetivo:** Impedir a edição de eventos passados baseado na coluna K(Status) e na Data.
```
