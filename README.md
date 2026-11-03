# Agenda de Demandas e Clientes

Aplicativo web de agenda (frontend) desenvolvido com **HTML, CSS e JavaScript puro (vanilla)**. Roda diretamente no navegador, sem necessidade de servidor ou build.

## Funcionalidades

### 📋 Demandas (aba Demandas)
- **Cadastro**: Título, Curso, Descrição, Prazo (data/hora) e Nível de Urgência (Baixa, Média, Alta)
- **Prazo padrão**: Ao abrir o formulário, o prazo vem preenchido com `agora + 24 horas`
- **Listagem estilo ClickUp**: Tabela com colunas Status | Tarefa | Curso | Prazo | Urgência | Ações
- **Ordenação**: Não concluídas primeiro → Urgência (Alta → Média → Baixa) → Prazo (mais próximo primeiro)
- **Concluir tarefas**: Checkbox para marcar como concluída
- **Editar / Excluir**: Botões de ação coloridos (✏ editar, 🗑 excluir)
- **Filtros**: Busca por título/descrição, Curso, Urgência, Status, Prazo até
- **Estatísticas**: Pendentes, Vencidas, Urgência Alta, Concluídas

### 👥 Clientes (aba Clientes)
- **Cadastro**: Nome, Contato (WhatsApp/Telefone), Saldo (R$), Conta/Descrição
- **Checklist diário**: 3 itens por cliente — 💬 Comunicação, 💰 Saldo, 🏦 Conta
- **Marcação por data**: Os checks são do dia atual; ao abrir em outro dia, começam vazios
- **Filtros**: Busca por nome/contato/conta, Checklist hoje (pendentes ou todos feitos)
- **Editar / Excluir**: Gerenciamento completo de clientes

### 🎨 Design
- **Estética Notion + ClickUp**: Fundo limpo, tipografia legível, espaçamento generoso, tabela de lista
- **Tema claro/escuro**: Alternância no cabeçalho, salva a preferência no LocalStorage
- **Ícones coloridos**: Editar (azul), Excluir (vermelho), badges de urgência com emoji (🔴 Alta, 🟢 Média, 🔵 Baixa)
- **Responsivo**: Adapta-se a celulares e desktops

### 💾 Armazenamento Local
- Dados de demandas e clientes salvos no `LocalStorage` do navegador
- Persistem após recarregar a página

### 🔔 Notificações (WhatsApp stub)
- Verificação a cada 1 minuto de tarefas pendentes com prazo vencido ou vencendo em menos de 2 horas
- Chama a função assíncrona `enviarWhatsApp(mensagem)` (stub com `console.log`)
- Pronto para integração real com API do WhatsApp ou link `wa.me`

## Como usar

1. Abra o arquivo **`index.html`** em qualquer navegador moderno.
2. Use as abas **Demandas** e **Clientes** para navegar entre os módulos.
3. Clique no ícone de **lua/sol** no cabeçalho para alternar tema claro/escuro.
4. Cadastre demandas e clientes nos respectivos formulários.
5. Abra o console do navegador (F12) para ver as mensagens do stub do WhatsApp.

## Estrutura

- `index.html` — Estrutura da página
- `style.css` — Estilização com tema claro/escuro e design Notion + ClickUp
- `script.js` — Lógica da aplicação, LocalStorage, filtros, estatísticas e timer de notificações
- `README.md` — Este arquivo

## Deploy na Vercel

Projeto 100% estático. Basta conectar o repositório GitHub na Vercel ou fazer upload direto da pasta.