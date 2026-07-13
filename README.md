# 🗺️ Painel Geográfico Dinâmico - RJ

O **Mapa de Lideranças** é um painel analítico interativo (Dashboard) construído em HTML, CSS e JavaScript puro (Vanilla JS). Ele consome dados diretamente de uma planilha do Google Sheets e os apresenta em um mapa estilizado da cidade do Rio de Janeiro, permitindo a visualização da distribuição geográfica de contatos/lideranças por bairros e regiões.

O projeto foi desenhado com foco em alta performance, experiência do usuário (UX) em Desktop e Mobile, e resiliência de dados (funcionamento offline).

---

## ✨ Funcionalidades Principais

### 1. Visualização de Dados Geográficos
* **Mapa Teia (Desktop):** Exibe os bairros como pontos conectados por linhas a um card central de "Volume Amostral" com efeito de vidro (Glassmorfismo).
* **Lista de Cards (Mobile):** No celular, o mapa é substituído por uma lista de cards otimizada para toque, onde cada bairro pode ser expandido para revelar os nomes dos contatos.

### 2. Filtros Dinâmicos Combinados
* **Por Região:** Filtra rapidamente entre Zona Norte, Zona Oeste, Zona Sudoeste, Centro, Baixada e Zona Sul.
* **Por Função:** Um menu dropdown gerado dinamicamente que isola contatos de acordo com a função específica registrada na planilha.
* *Regra do Zero:* Bairros que não possuem contatos para o filtro selecionado desaparecem do mapa automaticamente.

### 3. Detalhamento de Contatos
* **Desktop:** Um ícone minimalista no cabeçalho abre um Modal elegante que ocupa a área do mapa, listando todos os nomes dos contatos agrupados por bairro.
* **Mobile:** Cada card possui um *chevron* (setinha) que, ao ser clicado, abre um *accordion* (sanfona) listando os nomes daquele bairro específico.

### 4. Resiliência e Robustez (Modo Offline)
* **Cache de Segurança (Local Storage):** Assim que os dados são carregados com sucesso, eles são salvos no navegador. Se o Google Sheets sair do ar ou o usuário ficar sem internet, o painel continua funcionando com os últimos dados salvos.
* **Indicadores de Status:** Mostra "Tempo Real" (Online), "Sincronizando" (Carregando) ou "Modo Offline" (Cache) discreto na tela.
* **Tratamento de Erros:** Se a conexão falhar e não houver cache, o usuário é avisado em vez de ver a tela travada.

---

## 🛠️ Tecnologias Utilizadas

* **HTML5 & CSS3:** Estruturação e estilização, incluindo *Media Queries* avançadas para a adaptação Mobile.
* **Tailwind CSS (via CDN):** Framework de utilitários para estilização rápida e consistente.
* **JavaScript (Vanilla):** Manipulação direta do DOM para garantir alta performance nos filtros e renderização sem recarregar a página.
* **Google Sheets API (gviz/tq):** Integração via JSONP para leitura de planilhas em tempo real sem necessidade de backend.
* **Web APIs:** `localStorage` para persistência de dados offline.

---

## ⚙️ Como Funciona (Arquitetura)

O projeto roda inteiramente no Frontend (Client-Side). Ao abrir a página:

1. **Inicialização com Cache:** O JavaScript verifica se existem dados salvos no `localStorage`. Se sim, o mapa é desenhado instantaneamente.
2. **Fetch de Dados:** É criada uma tag `<script>` dinâmica que faz uma requisição ao Google Sheets via endpoint `gviz/tq`.
3. **Processamento (JSONP):** A função `processarRetornoPlanilha` recebe o JSON bruto, itera sobre as linhas, agrupa os dados por bairro e função, e extrai os nomes dos contatos.
4. **Renderização:** Os pontos e linhas são desenhados no DOM. O novo estado é salvo no cache.
5. **Filtros:** Ao clicar em um filtro, o JavaScript não refaz o download dos dados. Ele apenas manipula as classes CSS (escondendo ou mostrando elementos) e atualiza os números, garantindo fluidez total.

### Estrutura da Planilha Esperada
O código está configurado para ler as seguintes colunas da planilha:
* **Coluna A (Índice 0):** Nome do Bairro.
* **Coluna B (Índice 1):** Nome do Contato.
* **Coluna E (Índice 4):** Função do Contato.

*(Caso precise alterar as colunas, modifique os índices `row.c[X]` na função `processarRetornoPlanilha` no arquivo HTML).*

---

## 🚀 Como Executar e Publicar

### Rodando Localmente
Não há necessidade de servidores complexos. Basta fazer o download do arquivo `.html` e abri-lo diretamente no navegador.

### Deploy na Vercel (Recomendado)
Para disponibilizar o painel online com certificado SSL (HTTPS) e CDN global:

1. Crie um repositório no **GitHub** e faça o upload do arquivo HTML (ex: `index.html`).
2. Acesse [vercel.com](https://vercel.com/) e faça login com sua conta GitHub.
3. Clique em **Add New Project** e importe o repositório criado.
4. A Vercel detectará automaticamente as configurações. Clique em **Deploy**.
5. Em segundos, o painel estará no ar. Toda vez que você atualizar o código no GitHub, a Vercel publicará a nova versão automaticamente.

---

## 🔧 Manutenção e Customização

Todo o código está contido em um único arquivo HTML para facilidade de transporte. 

* **Adicionar novos bairros:** Edite o objeto `geoDicionario` dentro da tag `<script>`. Adicione o nome do bairro e suas coordenadas `x` e `y` (em porcentagem) e a região correspondente.
* **Mudar as cores das regiões:** Edite o objeto `colorsMap` (para as classes do Tailwind) e `svgStrokeColors` (para as cores das linhas do SVG).
* **Trocar a planilha:** Altere as constantes `SHEET_ID` e `SHEET_NAME` no início do script. Lembre-se de deixar a planilha com permissão de visualização "Qualquer pessoa com o link".

---
Desenvolvido com foco em performance e experiência do usuário.
```

***

Esse `README.md` vai deixar seu repositório no GitHub com uma cara de projeto muito profissional. Se precisar de mais alguma coisa, é só falar!
