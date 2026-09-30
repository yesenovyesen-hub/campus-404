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
let toastTimeout;
let itemNumber = 4;

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
  if (!removeButton || !grid.classList.contains("is-editing")) return;
  removeButton.closest(".item-card").remove();
  filterItems();
  showToast("Объявление удалено");
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
  const card = document.createElement("article");
  card.className = "item-card";
  card.dataset.category = category;
  card.dataset.search = `${title} ${location} ${category}`;

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
  info.append(titleRow, place, meta);
  card.append(image, info);
  grid.prepend(card);
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
  button.addEventListener("click", () => showToast(`${button.dataset.panel}: скоро здесь`));
});

filterItems();