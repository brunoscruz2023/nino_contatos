### Arquivo 2: `CONFIG_E_CODIGOS.md`

# Configurações, Códigos de Acesso e Nomenclaturas

## 1. Sistema RBAC (Controle de Acesso Dinâmico)
O código de acesso é uma string numérica composta por blocos de 3 dígitos. Cada bloco representa um módulo.
*   **Tamanho Atual:** 15 dígitos (5 módulos).
*   **Ordem dos Módulos (Definida na aba `Modulos` da planilha):**
    1.  `Mapa` (Dígitos 1 a 3)
    2.  `Agenda` (Dígitos 4 a 6)
    3.  `Cadastro` (Dígitos 7 a 9)
    4.  `Admin` (Dígitos 10 a 12)
    5.  `Materiais` (Dígitos 13 a 15)

*   **Níveis de Acesso (Padrão por bloco):**
    *   `000`: Sem acesso ao módulo.
    *   `001`: Acesso Básico / Atuante / Recebedor.
    *   `002`: Acesso Intermediário / Distribuidor.
    *   `003`: Acesso Gestor / Supervisor.
    *   `999`: Admin Total.

*   **Exemplo de Código:** `003000000999002`
    *   `Mapa` = `003` (Card - Vê Telefone)
    *   `Agenda` = `000` (Sem acesso)
    *   `Cadastro` = `000` (Sem acesso)
    *   `Admin` = `999` (Admin Total)
    *   `Materiais` = `002` (Distribuidor)

## 2. Estrutura de Planilhas e Nomenclaturas

### Planilha Mestre: "Reuniões"
*   **Aba `Modulos`**: Colunas A (Cod_Modulo), B (Nome_Modulo). Define o tamanho do RBAC.
*   **Aba `Funcoes_Modulos`**: Colunas A (Modulo), B (Código), C (Descrição). Define as opções do Dropdown no Admin.
*   **Aba `Acessos` (Legado)**: Coluna A (Chave_Acesso), B (Equipes_Codigos), C (Nivel_Codigos), D (Modulos_Codigos), E (Codigo_Novo 12 ou 15 dígitos).
*   **Aba `Eventos`**: Colunas A(ID_Evento), B(Nome), C(Data), D(Tipo), E(Bairro), F(Estrutura_JSON), G(Lista_Presenca_Legado), H(Desc), I(Status), J(QR_Token).
*   **Aba `Presencas`**: Colunas A(Timestamp), B(ID_Evento), C(ID_Organizador), D(ID_Participante), E(Lat), F(Lng).
*   **Aba `Tarefas`**: Colunas A(Timestamp), B(ID), C(ID_Responsavel), D(Titulo), E(Descricao), F(Data_Limite), G(Status), H(Relato_Execucao), I(ID_Criador).
*   **Aba `Materiais_Movimentacao`**: Colunas A(Timestamp), B(ID_Transacao), C(Tipo_Mov), D(Item), E(Quantidade), F(ID_Origem_Destino), G(ID_Responsavel), H(Ref_ID), I(Status).
*   **Aba `Logs_Atividades`**: Colunas A(Timestamp), B(Usuario_ID), C(Acao), D(Ref_ID), E(Lat), F(Lng), G(Status).

### Planilha de Contatos: "Pessoal Campanha"
*   Aba `Página1`: Colunas A(Bairro), B(Nome), C(Tel), D(Ref), E(Função), F(Equipe), G(Data), ... Z(ID Base36), AA(Senha_Hash), AB(Codigo_Acesso).

## 3. Constantes Técnicas (Frontend)
*   `SHEET_ID` (Contatos): `1VGgM5QNBY0SiN3VuVYdQB78joPz9blvdrdHNQj9v73I`
*   `EVENTOS_SHEET_ID` (Reuniões): `1MRycZz_03uglcwJqYs_G3Kzc2osx6S_z9zYxGMAzsNM`
*   `EVENTOS_POST_URL` (Apps Script): `https://script.google.com/macros/s/AKfycbx5KvXsXLw7L8R3ndPDla7Ni4D1w63wcxpCHoQFIvxLhyzvXFQHkuM3jcoOsREMlkP32g/exec`
*   `CACHE_VERSION`: `v2`
