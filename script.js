const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const grid = document.querySelector("#items-grid");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const editButton = document.querySelector("#edit-button");
const addDialog = document.querySelector("#add-dialog");
const addForm = document.querySelector("#add-form");
const toast = document.querySelector("#toast");
const sidebar = document.querySelector("#sidebar");
const chatModal = document.querySelector("#chatModal");
const chatMessages = document.querySelector("#chatMessages");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatSend = document.querySelector("#chatSend");
const typingIndicator = document.querySelector("#typingIndicator");
const unreadBadge = document.querySelector("#unreadCount");
const cards = Array.from(grid.querySelectorAll(".item-card")).map((element) => ({
  id: element.dataset.cardId,
  element,
  title: element.querySelector("h3").textContent.trim(),
  location: element.querySelector(".item-location").textContent.trim(),
  category: element.dataset.category,
  status: element.querySelector(".status").textContent.trim(),
  ownerName: element.dataset.ownerName || "Анонимный пользователь",
}));
let activeCard = null;
let activeHistory = [];
let unreadCount = 0;
let pendingReplies = 0;
let toastTimeout;
let itemNumber = 4;

// Ответы сгруппированы по темам, чтобы бот учитывал контекст вопроса.
const botResponses = {
  greetings: {
    keywords: ["привет", "здравствуй", "хай", "добрый", "hello", "hi"],
    answers: [
      "Привет! 👋 Рад, что вы откликнулись. Да, вещь ещё у меня.",
      "Здравствуйте! Да, я нашёл эту вещь и она пока у меня.",
    ],
  },
  where: {
    keywords: ["где", "место", "встрет", "забрать", "отдать", "где встрет"],
    answers: [
      "Можем встретиться в главном корпусе, у ресепшена. Вам удобно?",
      "Обычно я бываю в библиотеке на 2 этаже. Или можем договориться о другом месте.",
    ],
  },
  when: {
    keywords: ["когда", "время", "сегодня", "завтра", "час"],
    answers: [
      "Сегодня я свободен после 15:00. Завтра — в любое время с 10 до 18.",
      "Давайте сегодня? Я могу подождать у главного входа.",
    ],
  },
  description: {
    keywords: ["описан", "как выглядит", "цвет", "признак", "детал", "фото"],
    dynamic: true,
  },
  thanks: {
    keywords: ["спасибо", "благодар", "thanks", "спс"],
    answers: [
      "Не за что! 😊 Рад помочь.",
      "Пожалуйста! Давайте встретимся и я передам вещь.",
    ],
  },
  condition: {
    keywords: ["состоян", "цел", "работ", "поврежд", "сломан"],
    answers: [
      "Вещь в хорошем состоянии, я её бережно хранил.",
      "Всё цело, повреждений не заметил.",
    ],
  },
  returned: {
    keywords: ["вернул", "забрал", "получил", "встретил"],
    answers: ["Вещь уже возвращена владельцу. Спасибо за интерес!"],
  },
  default: {
    answers: [
      "Понял вас. Уточните, пожалуйста, что именно вас интересует?",
      "Хорошо, давайте обсудим детали. Когда вам удобно встретиться?",
      "Принято. Я на связи, пишите!",
    ],
  },
};

function chooseAnswer(answers) {
  return answers[Math.floor(Math.random() * answers.length)];
}

// Имитируем небольшую задержку, пока бот формирует ответ.
async function getBotReply(message, card) {
  const normalizedMessage = message.toLocaleLowerCase("ru");
  const matchedCategory = Object.entries(botResponses).find(([name, response]) =>
    name !== "default" && response.keywords?.some((keyword) => normalizedMessage.includes(keyword)),
  );
  let reply;

  if (matchedCategory?.[0] === "description") {
    reply = `Это ${card.title}. Нашёл в ${card.location}. Категория: ${card.category}. Состояние хорошее.`;
  } else if (matchedCategory?.[0] === "returned" || card.element.querySelector(".status")?.textContent.includes("Возвращено")) {
    reply = botResponses.returned.answers[0];
  } else {
    reply = chooseAnswer((matchedCategory?.[1] || botResponses.default).answers);
  }

  const delay = 800 + Math.floor(Math.random() * 701);
  await new Promise((resolve) => window.setTimeout(resolve, delay));
  return reply;
}

function getCard(cardId) {
  return cards.find((card) => card.id === cardId);
}

function appendChatMessage(message) {
  const bubble = document.createElement("div");
  bubble.className = `chat-message chat-message--${message.sender}`;
  bubble.textContent = message.text;
  chatMessages.append(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveChatHistory(cardId, history) {
  try {
    localStorage.setItem(`chat_card_${cardId}`, JSON.stringify(history));
  } catch {
    showToast("Историю чата не удалось сохранить");
  }
}

function setUnreadCount(count) {
  unreadCount = count;
  unreadBadge.textContent = count > 99 ? "99+" : String(count);
  unreadBadge.hidden = count === 0;
}

function openChat(cardId) {
  const card = getCard(cardId);
  if (!card) return;

  activeCard = card;
  chatMessages.replaceChildren();
  typingIndicator.hidden = true;
  chatSend.disabled = pendingReplies > 0;
  chatInput.value = "";
  setUnreadCount(0);

  try {
    activeHistory = JSON.parse(localStorage.getItem(`chat_card_${card.id}`) || "[]");
    if (!Array.isArray(activeHistory)) activeHistory = [];
  } catch {
    activeHistory = [];
  }

  if (activeHistory.length === 0) {
    const status = card.element.querySelector(".status")?.textContent.trim();
    const greeting = status === "Возвращено"
      ? botResponses.returned.answers[0]
      : `Здравствуйте! Я нашёл вещь «${card.title}» в месте «${card.location}».\nЗадавайте любые вопросы, договоримся о встрече.`;
    activeHistory.push({ sender: "bot", text: greeting });
    saveChatHistory(card.id, activeHistory);
  }

  activeHistory.forEach(appendChatMessage);
  if (!chatModal.open) chatModal.showModal();
  chatInput.focus();
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !activeCard) return;

  const card = activeCard;
  const history = activeHistory;
  const cardId = card.id;
  const userMessage = { sender: "user", text };
  history.push(userMessage);
  appendChatMessage(userMessage);
  chatInput.value = "";
  saveChatHistory(cardId, history);
  typingIndicator.hidden = false;
  pendingReplies += 1;
  chatSend.disabled = true;

  try {
    const reply = await getBotReply(text, card);
    const botMessage = { sender: "bot", text: reply };
    history.push(botMessage);
    saveChatHistory(cardId, history);
    if (activeCard?.id === cardId && chatModal.open) {
      activeHistory = history;
      appendChatMessage(botMessage);
      typingIndicator.hidden = true;
    } else {
      setUnreadCount(unreadCount + 1);
    }
  } finally {
    pendingReplies -= 1;
    chatSend.disabled = pendingReplies > 0;
    if (activeCard?.id === cardId) typingIndicator.hidden = true;
  }
}

function filterItems() {
  const query = searchInput.value.trim().toLocaleLowerCase("ru");
  const category = categoryFilter.value;
  let visibleCount = 0;

  for (const item of grid.querySelectorAll(".item-card")) {
    const matchesText = item.dataset.search.toLocaleLowerCase("ru").includes(query);
    const matchesCategory = category === "all" || item.dataset.category === category;
    const isVisible = matchesText && matchesCategory;
    item.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  }

  resultCount.textContent = visibleCount;
  emptyState.hidden = visibleCount > 0;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

searchInput.addEventListener("input", filterItems);
categoryFilter.addEventListener("change", filterItems);

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "SELECT") {
    event.preventDefault();
    searchInput.focus();
  }
});

editButton.addEventListener("click", () => {
  const isEditing = editButton.getAttribute("aria-pressed") !== "true";
  editButton.setAttribute("aria-pressed", String(isEditing));
  grid.classList.toggle("is-editing", isEditing);
  showToast(isEditing ? "Режим редактирования включён" : "Режим редактирования выключен");
});

grid.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-item");
  if (removeButton) {
    if (grid.classList.contains("is-editing")) {
      const cardElement = removeButton.closest(".item-card");
      const cardIndex = cards.findIndex((card) => card.element === cardElement);
      if (cardIndex !== -1) cards.splice(cardIndex, 1);
      cardElement.remove();
      filterItems();
      showToast("Объявление удалено");
    }
    return;
  }

  const cardElement = event.target.closest(".item-card");
  if (cardElement) openChat(cardElement.dataset.cardId);
});

document.querySelector("#add-button").addEventListener("click", () => addDialog.showModal());
document.querySelector(".dialog-close").addEventListener("click", () => addDialog.close());
addDialog.addEventListener("click", (event) => {
  if (event.target === addDialog) addDialog.close();
});

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(addForm);
  const title = formData.get("title").trim();
  const location = formData.get("location").trim();
  const category = formData.get("category");
  const cardElement = document.createElement("article");
  const cardId = `item-${Date.now()}-${itemNumber + 1}`;
  cardElement.className = "item-card";
  cardElement.dataset.cardId = cardId;
  cardElement.dataset.ownerName = "Анонимный пользователь";
  cardElement.dataset.category = category;
  cardElement.dataset.search = `${title} ${location} ${category}`;

  const image = document.createElement("div");
  image.className = "item-image image-new";
  const icon = document.createElement("i");
  icon.className = "fa-regular fa-image new-image-icon";
  icon.setAttribute("aria-hidden", "true");
  const index = document.createElement("span");
  index.className = "image-index";
  index.textContent = `${String(itemNumber + 1).padStart(2, "0")} / ${String(itemNumber + 1).padStart(2, "0")}`;
  const removeButton = document.createElement("button");
  removeButton.className = "remove-item";
  removeButton.type = "button";
  removeButton.setAttribute("aria-label", "Удалить объявление");
  const removeIcon = document.createElement("i");
  removeIcon.className = "fa-solid fa-trash";
  removeIcon.setAttribute("aria-hidden", "true");
  removeButton.append(removeIcon);
  image.append(icon, index, removeButton);

  const info = document.createElement("div");
  info.className = "item-info";
  const titleRow = document.createElement("div");
  titleRow.className = "item-title-row";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const status = document.createElement("span");
  status.className = "status status-found";
  const statusDot = document.createElement("span");
  status.append(statusDot, document.createTextNode("Найдено"));
  titleRow.append(heading, status);

  const place = document.createElement("p");
  place.className = "item-location";
  const placeIcon = document.createElement("i");
  placeIcon.className = "fa-solid fa-location-dot";
  placeIcon.setAttribute("aria-hidden", "true");
  place.append(placeIcon, document.createTextNode(` ${location}`));

  const meta = document.createElement("div");
  meta.className = "item-meta";
  const tag = document.createElement("span");
  tag.className = "category-tag";
  tag.textContent = category;
  const time = document.createElement("span");
  time.textContent = "Только что";
  meta.append(tag, time);

  const contactButton = document.createElement("button");
  contactButton.className = "contact-button";
  contactButton.type = "button";
  contactButton.setAttribute("aria-label", `Написать владельцу: ${title}`);
  const contactIcon = document.createElement("i");
  contactIcon.className = "fa-regular fa-message";
  contactIcon.setAttribute("aria-hidden", "true");
  contactButton.append(contactIcon, document.createTextNode(" Написать"));

  info.append(titleRow, place, meta, contactButton);
  cardElement.append(image, info);
  cards.push({
    id: cardId,
    element: cardElement,
    title,
    location,
    category,
    status: "Найдено",
    ownerName: "Анонимный пользователь",
  });
  grid.prepend(cardElement);
  itemNumber += 1;
  addForm.reset();
  addDialog.close();
  categoryFilter.value = "all";
  searchInput.value = "";
  filterItems();
  showToast("Находка опубликована");
});

document.querySelector(".menu-action").addEventListener("click", () => sidebar.classList.add("is-open"));
document.querySelector(".sidebar-close").addEventListener("click", () => sidebar.classList.remove("is-open"));
document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.panel === "Чат") {
      const firstCard = grid.querySelector(".item-card");
      if (firstCard) openChat(firstCard.dataset.cardId);
      else showToast("Пока нет объявлений для чата");
      return;
    }
    showToast(`${button.dataset.panel}: скоро здесь`);
  });
});

document.querySelector("#chatClose").addEventListener("click", () => chatModal.close());
chatModal.addEventListener("click", (event) => {
  if (event.target === chatModal) chatModal.close();
});
chatModal.addEventListener("close", () => {
  activeCard = null;
  activeHistory = [];
  typingIndicator.hidden = true;
});
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

// Сообщаем в открытом диалоге, если статус вещи меняется на возвращённый.
const statusObserver = new MutationObserver(() => {
  for (const card of cards) {
    const currentStatus = card.element.querySelector(".status")?.textContent.trim();
    if (!currentStatus || currentStatus === card.status) continue;
    const wasReturned = card.status === "Возвращено";
    card.status = currentStatus;
    if (!wasReturned && currentStatus === "Возвращено" && activeCard?.id === card.id) {
      const message = { sender: "bot", text: botResponses.returned.answers[0] };
      activeHistory.push(message);
      saveChatHistory(card.id, activeHistory);
      if (chatModal.open) appendChatMessage(message);
    }
  }
});
statusObserver.observe(grid, { attributes: true, childList: true, characterData: true, subtree: true });

filterItems();