const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function messageGreetings() {
  const greeting = getGreeting();

  const messageText = `${greeting}, em que posso te ajudar? 🤔 
Sobre qual assunto deseja falar? Digite a opção desejada:
  1 - Leilao
  2 - Site
  3 - Telefone para contato
  4 - Falar com representante
  5 - Sair do chat`;

  return messageText;
}

const client = new Client({
  authStrategy: new LocalAuth(),
});

let representant = {
  number: "",
  name: "",
};

let conversations = {};

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
  const representativeNumber = client.info.wid.user;
  const representativePushName = client.info.pushname;
  representant.name = representativePushName;
  representant.number = representativeNumber;

  console.log("Representante conectado: ", representants);
});

// Steps -> "main_menu" & "leilao_menu" & "feedback"

async function handleMessage(message) {
  const message_receive = message.body;
  const userId = message.from;

  const chat = await message.getChat();

  if (chat.isGroup) {
    console.log("Mensagem de grupo ignorada.");
    return;
  }

  let conversation = conversations[userId];

  // Se não existe conversa
  if (!conversation) {
    conversation = {
      is_started: true,
      talked_to_representative: false,
      step: "main_menu",
      invalidTries: 0,  // Para contar tentativas inválidas
    };

    conversations[userId] = conversation;

    // Enviar mensagem de boas-vindas
    const message = messageGreetings();
    client.sendMessage(userId, message);
    return;
  }

  if (message_receive === '/quit') {
    if (conversation?.talked_to_representative === true && conversation.step !== 'feedback') {
      conversation.talked_to_representative = false;  // Reiniciar o status após entrar no feedback
      conversation.step = 'feedback';
      console.log('Step atualizado para feedback');

      const feedbackRequest = `Como foi sua experiência conosco?
Sua opinião é muito importante para nós! Por favor, avalie nosso atendimento atribuindo uma nota de 1 a 10, sendo:\n
1 a 3 - Ruim\n4 a 7 - Mediana\n8 a 10 - Ótima.`;
      client.sendMessage(userId, feedbackRequest);
      return;
    }

    exit(userId); // Se já deu feedback ou não falou com representante, sair
    return;
  }

  // Retornar e não faz nada
  if (conversation?.talked_to_representative) return;

  switch(conversation.step) {
    case 'main_menu':
      mainMenu(message_receive, userId);
      return;
    case 'leilao_menu':
      leilaoMenu(message_receive, userId);
      return;
    case 'feedback':
      feedbackMenu(message_receive, userId);
      return;
  }
}

// Leilão
async function auction(userId) {
  // Atualizar o step
  conversations[userId].step = "leilao_menu";

  const messageText = `Ficamos alegres em te receber em nosso leilão 😊, selecione as opções que mais te atendem: 
  1 - Numero de parcelas
  2 - Formas de pagamento
  3 - Local do leilao
  4 - Falar com representante sobre o leilao
  5 - Voltar 🔽`;

  // Enviar mensagem
  client.sendMessage(userId, messageText);
}

// Site
async function site(userId) {
  const message = 'leilao.com.br';
  client.sendMessage(userId, message);
}

// Telefone para contato
async function contactPhone(userId) {
  const message = 'Você pode ligar para nosso atendimento através do número: (11) 1234-5678 📞';
  client.sendMessage(userId, message);
}

// Falar com representante
async function talkToRepresentative(userId) {
  conversations[userId].talked_to_representative = true;

  const message = `Olá! Sou ${representant.name}. Como posso te ajudar hoje? 
Quando terminar, por favor, digite /quit para encerrar a conversa.👋`;
  client.sendMessage(userId, message);
}

function endChat(userId) {
  conversations[userId] = null;
  client.sendMessage(userId, "Obrigado por falar conosco. Até mais! 😊");
}

// Sair do chat
async function exit(userId) {
  const conversation = conversations[userId];

  if (conversation?.talked_to_representative) {
    conversations[userId].step = 'feedback';
    client.sendMessage(userId, "Poderia nos avaliar? Escolha uma nota de 1 a 10, sendo 1 a 3 - Ruim, 4 a 7 - Mediana, 8 a 10 - Ótima.");
    return;
  }

  // Encerrar a conversa
  endChat(userId);
}

const mainMenuOptions = {
  1: auction,
  2: site,
  3: contactPhone,
  4: talkToRepresentative,
  5: exit,
};

function mainMenu(user_message, userId) {
  const option = Number(user_message);

  // Pegar a ação
  const action = mainMenuOptions[option];

  // Verificar se a opção é válida
  if (!action) {
    return client.sendMessage(
      userId,
      "Opção inválida. Por favor, digite uma opção válida."
    );
  }

  // Executar a ação
  action(userId);
}

// TODO: Create functions for leilaoMenu
function mainMenuBack(userId) {
  // Atualizar o step
  conversations[userId].step = "main_menu";

  const message = messageGreetings();
  client.sendMessage(userId, message);
}

async function parcelas(userId) {
  const message = 'Parcelamos em até 12 vezes. 💳';
  client.sendMessage(userId, message);
}

async function formasPay(userId) {
  const message = 'Aceitamos pagamentos via cartão de crédito 💳, débito 💳 e pix 🔄.';
  client.sendMessage(userId, message);
}

async function local(userId) {
  const message = 'O leilão ocorre em São Paulo, Rua Exemplo, nº 123.📍';
  client.sendMessage(userId, message);
}

const leilaoMenuOptions = {
  1: parcelas,
  2: formasPay,
  3: local,
  4: talkToRepresentative,
  5: mainMenuBack,
};

function leilaoMenu(user_message, userId) {
  const option = Number(user_message);

  // Pegar a ação
  const action = leilaoMenuOptions[option];

  // Verificar se a opção é válida
  if (!action) {
    return client.sendMessage(
      userId,
      "Opção inválida. Por favor, digite uma opção válida."
    );
  }

  // Executar a ação
  action(userId);
}

// Feedback options
async function Ruim(userId) {
  console.log('Entrou na função RUIM');
  const message = 'Sentimos muito por não atender suas expectativas. Estamos comprometidos a melhorar! 🫤';
  client.sendMessage(userId, message);
  endChat(userId);
}

async function Mediana(userId) {
  console.log('Entrou na função Mediana');
  const message = 'Agradecemos seu feedback! Ficamos contentes, mas sabemos que ainda temos espaço para melhorar. 😊';
  client.sendMessage(userId, message);
  endChat(userId);
}

async function Bom(userId) {
  console.log('Entrou na função BOM');
  const message = 'Que bom saber que teve uma boa experiência conosco! Agradecemos seu feedback!😄🙏';
  client.sendMessage(userId, message);
  endChat(userId);
}

const feedBackOptions = {
  1: Ruim,
  2: Ruim,
  3: Ruim,
  4: Mediana,
  5: Mediana,
  6: Mediana,
  7: Mediana,
  8: Bom,
  9: Bom,
  10: Bom,
};

function feedbackMenu(user_message, userId) {
  const option = Number(user_message);

  const action = feedBackOptions[option]; 

  if (!action) { 
    let invalidTries = conversations[userId].invalidTries || 0;
    conversations[userId].invalidTries = ++invalidTries;

    if (invalidTries >= 3) {
      client.sendMessage(
        userId,
        'Opções inválidas consecutivas. Retornando ao menu principal.'
      );
      mainMenuBack(userId);
    } else {
      client.sendMessage(
        userId,
        'Opção inválida. Por favor, digite uma opção válida.'
      );
    }
    return;
  }

  // Resetar contador de tentativas inválidas ao receber uma opção válida
  conversations[userId].invalidTries = 0;
  action(userId);
}

client.on("message", handleMessage);

client.initialize();
