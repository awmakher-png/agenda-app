# Agenda de Demandas

Aplicativo web de agenda (frontend) desenvolvido com **HTML, CSS e JavaScript puro (vanilla)**. Roda diretamente no navegador, sem necessidade de servidor ou build.

## Funcionalidades

1. **Cadastro de demandas** — Título, descrição, prazo (data/hora) e nível de urgência (Baixa, Média, Alta).
2. **Listagem e organização** — Tarefas pendentes ordenadas por urgência e prazo. Possibilidade de marcar como concluídas, editar e excluir.
3. **Armazenamento local** — Os dados são salvos no `LocalStorage` do navegador e persistem após recarregar a página.
4. **Notificações** — Verificação automática a cada 1 minuto de tarefas pendentes com prazo vencido ou próximo. Chama a função assíncrona `enviarWhatsApp(mensagem)` (stub pronto para integração real).

## Como usar

1. Abra o arquivo `index.html` em qualquer navegador moderno.
2. Preencha o formulário para adicionar uma demanda.
3. As tarefas aparecem ordenadas automaticamente (urgência alta primeiro, depois prazo mais próximo).
4. Marque o checkbox para concluir uma tarefa.
5. Abra o console do navegador (F12) para ver as mensagens do stub do WhatsApp.

## Estrutura

- `index.html` — Estrutura da página
- `styles.css` — Estilização limpa e responsiva
- `app.js` — Lógica da aplicação, LocalStorage e timer de notificações
- `README.md` — Este arquivo

## Integração do WhatsApp

Edite a função `enviarWhatsApp` em `app.js` para conectar com a API do WhatsApp ou gerar um link `wa.me` quando estiver pronto para o envio real.