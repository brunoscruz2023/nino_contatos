### Arquivo 3: `MANUAL_USUARIO.md`

# Manual de Utilização do Sistema

O sistema é dividido em módulos. O que você vê e pode fazer depende do seu nível de acesso (RBAC).

## 1. Módulo Mapa (Território)
**Objetivo:** Visualizar contatos geograficamente e em lista.
*   **Acesso 001 (Nome):** Vê apenas os bairros e a quantidade de contatos. Não vê nomes.
*   **Acesso 002 (Zap):** Vê a lista de nomes com link direto para WhatsApp.
*   **Acesso 003 (Card):** Vê a lista de nomes, telefones e referências. Pode clicar para editar.
*   **Acesso 999 (Total):** Vê tudo, edita tudo e filtra por qualquer equipe.

## 2. Módulo Agenda (Eventos e Tarefas)
**Objetivo:** Gestão de operação de campo.
*   **Acesso 001 (Atuante):** Vê apenas os eventos onde está escalado. Pode clicar em "Iniciar Atuação" (faz auto-check-in com GPS) e cadastrar presenças. Vê tarefas atribuídas a ele.
*   **Acesso 003 (Supervisor):** Vê todos os eventos. Pode criar Eventos e Tarefas Avulsas (+ Evento / + Tarefa). Escala mobilizadores usando a árvore hierárquica. Pode editar eventos não realizados.
*   **Acesso 999 (Admin):** Faz tudo do supervisor + pode editar eventos passados (Bloqueio Histórico bypass).

## 3. Módulo Cadastro
**Objetivo:** Incluir novos contatos na base.
*   **Acesso 002 (Cadastros):** Pode cadastrar contatos novos. Se o telefone já existir, o sistema bloqueia a edição.
*   **Acesso 999 (Admin):** Pode cadastrar e editar qualquer contato.

## 4. Módulo Admin
**Objetivo:** Configurar usuários e permissões.
*   **Acesso 999 (Total):** Busca contato por telefone, define senha (padrão 123456 para primeiro acesso), define equipes e configura os blocos de acesso (Mapa, Agenda, etc.). Gerencia Entrada e Distribuição de Materiais.

## 5. Módulo Materiais
**Objetivo:** Controle de estoque e logística.
*   **Acesso 001 (Recebedor):** Recebe a pendência no login. Confirma o recebimento do material.
*   **Acesso 002 (Distribuidor):** Entrega material para os mobilizadores, gerando pendência para eles. O sistema bloqueia se não houver saldo.
*   **Acesso 003 (Gestor):** Dá entrada no estoque (compras/almoxarifado).

## 6. Módulo Dashboard
**Objetivo:** Métricas gerenciais.
*   **Acesso 003/999:** Vê métricas de Operação (Eventos de hoje, presenças) e Território (Crescimento de leads). O sistema filtra as métricas para mostrar apenas os dados da árvore subordinada do usuário (ABAC), exceto para o Admin, que vê tudo.

## 7. Segurança (Primeiro Login)
Todo usuário com senha `123456` será bloqueado na tela inicial e obrigado a cadastrar uma nova senha de 6 dígitos. A nova senha não pode ser `123456`.

