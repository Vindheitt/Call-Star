
const API_URL = 'http://localhost:3001/api';

const TOKEN_KEY = 'callstar_token';

// Получение сохранённого токена
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Сохранение токена
function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Удаление токена
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Универсальная функция запросов
async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Ошибка запроса к серверу');
  }

  return result;
}

// API авторизации
export const authApi = {
  async login(login, password) {
    const result = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });

    if (result.token) {
      saveToken(result.token);
    }

    return result;
  },


  getMe() {
    return request('/auth/me');
  },

  logout() {
    clearToken();
  },
};

// API студентов
export const studentsApi = {
  getAll() {
    return request('/students');
  },

  create(full_name) {
    return request('/students', {
      method: 'POST',
      body: JSON.stringify({ full_name }),
    });
  },

  update(id, full_name) {
    return request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ full_name }),
    });
  },

  delete(id) {
    return request(`/students/${id}`, {
      method: 'DELETE',
    });
  },
};
