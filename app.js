const PRODUCTS_KEY = 'dev_products_v1';
const USERS_KEY = 'dev_users_v1';
const SESSION_KEY = 'dev_session_v1';

const ADMIN_CREDENTIALS = {
  userId: 'ADMIN',
  fullName: 'Administrador Master',
  company: 'MASTER',
  password: 'Str@12348',
  role: 'admin',
};

const authCard = document.getElementById('auth-card');
const appShell = document.getElementById('app-shell');
const authMessage = document.getElementById('auth-message');
const sessionInfo = document.getElementById('session-info');
const logoutBtn = document.getElementById('logout-btn');

const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const recoverForm = document.getElementById('recover-form');

const loginUserIdInput = document.getElementById('login-user-id');
const loginPasswordInput = document.getElementById('login-password');
const registerUserIdInput = document.getElementById('register-user-id');
const registerFullNameInput = document.getElementById('register-full-name');
const registerCompanyInput = document.getElementById('register-company');
const registerPasswordInput = document.getElementById('register-password');
const recoverUserIdInput = document.getElementById('recover-user-id');
const recoverFullNameInput = document.getElementById('recover-full-name');
const recoverNewPasswordInput = document.getElementById('recover-new-password');

const form = document.getElementById('product-form');
const codeInput = document.getElementById('code');
const descriptionInput = document.getElementById('description');
const ncmInput = document.getElementById('ncm');
const targetInput = document.getElementById('target');
const clientInput = document.getElementById('client');
const priceInput = document.getElementById('price');
const imagesInput = document.getElementById('images');
const imagePreview = document.getElementById('image-preview');
const productsBody = document.getElementById('products-body');
const searchInput = document.getElementById('search');
const exportClientSelect = document.getElementById('export-client');
const exportXmlBtn = document.getElementById('export-xml-btn');
const formTitle = document.getElementById('form-title');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

let users = loadUsers();
let products = loadProducts();
let currentUser = loadSession();
let editingId = null;
let stagedImages = [];

bootstrap();

function bootstrap() {
  ensureAdminUser();
  bindAuthEvents();
  bindProductEvents();
  updateScreenBySession();
  renderProducts();
  renderExportClients();
  clearForm();
}

function bindAuthEvents() {
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => showAuthTab(button.dataset.tab));
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userId = loginUserIdInput.value.trim().toUpperCase();
    const password = loginPasswordInput.value;

    const found = users.find((user) => user.userId.toUpperCase() === userId && user.password === password);
    if (!found) {
      setAuthMessage('Usuário ou senha inválidos.', true);
      return;
    }

    currentUser = found;
    persistSession();
    loginForm.reset();
    setAuthMessage('Acesso liberado.', false);
    updateScreenBySession();
    clearForm();
  });

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const userId = registerUserIdInput.value.trim();
    const fullName = registerFullNameInput.value.trim();
    const company = registerCompanyInput.value.trim();
    const password = registerPasswordInput.value;

    if (!userId || !fullName || !company || !password) {
      setAuthMessage('Preencha todos os campos para criar usuário.', true);
      return;
    }

    if (!isStrongPassword(password)) {
      setAuthMessage('Senha inválida. Verifique os critérios mínimos.', true);
      return;
    }

    const exists = users.some((user) => user.userId.toUpperCase() === userId.toUpperCase());
    if (exists) {
      setAuthMessage('Já existe usuário com este ID.', true);
      return;
    }

    users.push({
      userId,
      fullName,
      company,
      password,
      role: 'user',
    });

    persistUsers();
    registerForm.reset();
    setAuthMessage('Usuário criado com sucesso. Faça login.', false);
    showAuthTab('login');
  });

  recoverForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const userId = recoverUserIdInput.value.trim();
    const fullName = recoverFullNameInput.value.trim();
    const newPassword = recoverNewPasswordInput.value;

    if (!isStrongPassword(newPassword)) {
      setAuthMessage('Nova senha inválida. Verifique os critérios mínimos.', true);
      return;
    }

    const index = users.findIndex(
      (user) => user.userId.toUpperCase() === userId.toUpperCase() && user.fullName.toUpperCase() === fullName.toUpperCase()
    );

    if (index < 0) {
      setAuthMessage('Usuário não encontrado para recuperação.', true);
      return;
    }

    users[index].password = newPassword;
    persistUsers();
    recoverForm.reset();
    setAuthMessage('Senha atualizada com sucesso. Faça login.', false);
    showAuthTab('login');
  });

  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    persistSession();
    updateScreenBySession();
    showAuthTab('login');
  });
}

function bindProductEvents() {
  imagesInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 3) {
      alert('É permitido inserir no máximo 3 imagens.');
      imagesInput.value = '';
      return;
    }

    if (!files.length) {
      stagedImages = [];
      imagePreview.innerHTML = '';
      return;
    }

    stagedImages = await filesToDataUrls(files);
    renderPreview(stagedImages);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!currentUser) {
      alert('Você precisa estar logado para cadastrar produtos.');
      return;
    }

    const payload = {
      description: descriptionInput.value.trim(),
      ncm: ncmInput.value.trim(),
      target: targetInput.value.trim(),
      client: clientInput.value.trim(),
      price: Number(priceInput.value),
    };

    if (!payload.description || !payload.ncm || !payload.target || !payload.client || Number.isNaN(payload.price)) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    if (editingId) {
      products = products.map((p) =>
        p.id === editingId
          ? {
              ...p,
              ...payload,
              images: stagedImages.length ? stagedImages : p.images,
            }
          : p
      );
    } else {
      if (!stagedImages.length) {
        alert('Insira ao menos 1 imagem do produto.');
        return;
      }

      const seq = Number(codeInput.dataset.seq);
      products.push({
        id: crypto.randomUUID(),
        seq,
        code: codeInput.value,
        ...payload,
        images: stagedImages,
      });
    }

    persistProducts();
    renderProducts();
    renderExportClients();
    clearForm();
  });

  cancelBtn.addEventListener('click', clearForm);
  searchInput.addEventListener('input', renderProducts);

  exportXmlBtn.addEventListener('click', () => {
    const selectedClient = exportClientSelect.value;
    if (!selectedClient) {
      alert('Selecione um cliente para exportar o XML.');
      return;
    }

    downloadXml(selectedClient);
  });
}

function showAuthTab(tabName) {
  const forms = {
    login: loginForm,
    register: registerForm,
    recover: recoverForm,
  };

  Object.entries(forms).forEach(([name, element]) => {
    element.hidden = name !== tabName;
  });

  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
}

function updateScreenBySession() {
  if (currentUser) {
    authCard.hidden = true;
    appShell.hidden = false;
    sessionInfo.textContent = `Usuário: ${currentUser.fullName} (${currentUser.userId}) | Empresa/Cliente padrão: ${currentUser.company}`;
    applyUserClientDefault();
    return;
  }

  authCard.hidden = false;
  appShell.hidden = true;
  sessionInfo.textContent = '';
}

function applyUserClientDefault() {
  if (!currentUser) return;

  if (currentUser.role === 'admin') {
    clientInput.readOnly = false;
    clientInput.placeholder = 'Informe o cliente';
    if (!clientInput.value) clientInput.value = '';
  } else {
    clientInput.value = currentUser.company;
    clientInput.readOnly = true;
    clientInput.placeholder = '';
  }
}

function setAuthMessage(message, isError) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#b91c1c' : '#15803d';
}

function isStrongPassword(password) {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  return hasMinLength && hasUppercase && hasLetter && hasNumber && hasSpecial;
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function persistUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function ensureAdminUser() {
  const adminIndex = users.findIndex((user) => user.userId.toUpperCase() === ADMIN_CREDENTIALS.userId);
  if (adminIndex >= 0) {
    users[adminIndex] = { ...users[adminIndex], ...ADMIN_CREDENTIALS };
  } else {
    users.push({ ...ADMIN_CREDENTIALS });
  }
  persistUsers();
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function persistSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
}

function loadProducts() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
  } catch {
    return [];
  }
}

function persistProducts() {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function nextCode() {
  const max = products.reduce((acc, p) => Math.max(acc, p.seq || 0), 0);
  const seq = max + 1;
  return {
    seq,
    code: `PROD-${String(seq).padStart(4, '0')}`,
  };
}

function clearForm() {
  editingId = null;
  stagedImages = [];
  const next = nextCode();

  form.reset();
  codeInput.value = next.code;
  codeInput.dataset.seq = String(next.seq);
  imagePreview.innerHTML = '';
  formTitle.textContent = 'Novo Produto';
  saveBtn.textContent = 'Salvar';
  cancelBtn.hidden = true;
  applyUserClientDefault();
}

function renderExportClients() {
  const clients = [...new Set(products.map((p) => p.client).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );

  exportClientSelect.innerHTML = '';
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = 'Selecione cliente para exportar';
  exportClientSelect.appendChild(placeholderOption);

  clients.forEach((client) => {
    const option = document.createElement('option');
    option.value = client;
    option.textContent = client;
    exportClientSelect.appendChild(option);
  });

  exportXmlBtn.disabled = !clients.length;
}

function renderProducts() {
  const term = searchInput.value.trim().toLowerCase();
  const filtered = products.filter((p) => {
    const haystack = `${p.code} ${p.description} ${p.ncm} ${p.target} ${p.client || ''}`.toLowerCase();
    return haystack.includes(term);
  });

  if (!filtered.length) {
    productsBody.innerHTML = '<tr><td colspan="8" class="empty">Nenhum produto encontrado.</td></tr>';
    return;
  }

  productsBody.innerHTML = filtered
    .map(
      (p) => `
      <tr>
        <td>${p.code}</td>
        <td>${p.description}</td>
        <td>${p.ncm}</td>
        <td>${p.target}</td>
        <td>${p.client || '-'}</td>
        <td>${Number(p.price).toFixed(2)}</td>
        <td>
          <div class="image-list">
            ${p.images.map((img) => `<img src="${img}" alt="Imagem ${p.code}"/>`).join('') || '-'}
          </div>
        </td>
        <td>
          <button type="button" onclick="startEdit('${p.id}')">Editar</button>
        </td>
      </tr>`
    )
    .join('');
}

function renderPreview(images) {
  imagePreview.innerHTML = images.map((img) => `<img src="${img}" alt="Pré-visualização"/>`).join('');
}

function filesToDataUrls(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildProductsXml(client, clientProducts) {
  const productsXml = clientProducts
    .map(
      (p) => `    <produto>\n      <codigo>${escapeXml(p.code)}</codigo>\n      <descricao>${escapeXml(p.description)}</descricao>\n      <ncm>${escapeXml(p.ncm)}</ncm>\n      <target>${escapeXml(p.target)}</target>\n      <cliente>${escapeXml(p.client)}</cliente>\n      <precoDesenvolvido>${Number(p.price).toFixed(2)}</precoDesenvolvido>\n      <imagens>\n${p.images
        .map((img) => `        <imagem>${escapeXml(img)}</imagem>`)
        .join('\n')}\n      </imagens>\n    </produto>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<produtos cliente="${escapeXml(client)}">\n${productsXml}\n</produtos>`;
}

function downloadXml(client) {
  const filtered = products.filter((p) => p.client === client);
  if (!filtered.length) {
    alert('Nenhum produto encontrado para o cliente selecionado.');
    return;
  }

  const xmlContent = buildProductsXml(client, filtered);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = client.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '');

  link.href = url;
  link.download = `produtos-${safeName || 'cliente'}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

window.startEdit = function startEdit(id) {
  if (!currentUser) return;

  const product = products.find((p) => p.id === id);
  if (!product) return;

  editingId = id;
  codeInput.value = product.code;
  codeInput.dataset.seq = String(product.seq);
  descriptionInput.value = product.description;
  ncmInput.value = product.ncm;
  targetInput.value = product.target;
  clientInput.value = product.client || '';
  priceInput.value = product.price;
  stagedImages = [];
  imagesInput.value = '';
  renderPreview(product.images);

  if (currentUser.role !== 'admin') {
    clientInput.value = currentUser.company;
    clientInput.readOnly = true;
  }

  formTitle.textContent = `Editando ${product.code}`;
  saveBtn.textContent = 'Atualizar';
  cancelBtn.hidden = false;
};
