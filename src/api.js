
const API_URL = 'http://localhost:3001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Ошибка запроса к серверу');
  }

  return result;
}

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
