### Arquivo 4: `HELP_RAPIDO.md` (Estrutura para o App)

# Ajuda Rápida (In-App)

### Mapa
- **O que faz:** Mostra os contatos por bairro.
- **Como usar:** Clique no bairro no mapa ou na lista para expandir. Use os filtros no topo para isolar equipes.
*(Visível se: hasModuleAccess('mapa'))*

### Agenda
- **O que faz:** Seus eventos e tarefas do dia.
- **Como usar:** Clique no dia para ver os detalhes. Se for um evento, clique em "Iniciar Atuação" para registrar sua presença e abrir a lista de check-in. Tarefas avulsas podem ser concluídas direto no card.
*(Visível se: hasModuleAccess('agenda'))*

### Cadastro
- **O que faz:** Adiciona novos leads à base.
- **Como usar:** Digite o telefone. Se for novo, preencha os dados. Se já existir, os dados carregarão para atualização.
*(Visível se: hasModuleAccess('cadastro'))*

### Admin
- **O que faz:** Gerencia acessos e materiais.
- **Como usar:** Busque pelo telefone. Defina as permissões marcando as caixas. Use "Gerar Aleatória" para criar senhas iniciais (use 123456 para forçar troca no primeiro login).
*(Visível se: hasModuleAccess('admin'))*

### Materiais
- **O que faz:** Controle de estoque de campanha.
- **Como usar:** Quando receber material, ele aparece como pendência. Clique e confirme o recebimento. O saldo é bloqueado se não houver estoque.
*(Visível se: hasModuleAccess('materiais'))*

### Dashboard
- **O que faz:** Métricas em tempo real.
- **Como usar:** Alterne entre as abas (Operação/Território). Use os botões de período (Hoje, 7 dias) para mudar a análise.
*(Visível se: hasModuleAccess('dashboard'))*