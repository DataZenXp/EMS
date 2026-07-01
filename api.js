/* ==========================================================================
   TASKGRID // REST API CLIENT BRIDGE
   CONNECTS NEO-BRUTALIST UI TO NODE.JS / MONGODB BACKEND
   ========================================================================== */

const API_BASE_URL = (window.location.protocol.startsWith('http') && window.location.port !== '3000' && window.location.port !== '5500')
  ? '/api/v1'
  : 'http://localhost:5000/api/v1';

class ApiClient {
  static getToken() {
    return localStorage.getItem('ems_access_token') || null;
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('ems_access_token', token);
    } else {
      localStorage.removeItem('ems_access_token');
    }
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`[API Error (${endpoint})]:`, error.message);
      throw error;
    }
  }

  /* AUTHENTICATION */
  static async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res && res.token) {
      this.setToken(res.token);
    }
    return res.data.user;
  }

  static async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    this.setToken(null);
  }

  static async getMe() {
    const res = await this.request('/auth/me');
    return res.data.user;
  }

  /* TASKS */
  static async getTasks() {
    const res = await this.request('/tasks');
    return res.data.tasks;
  }

  static async createTask(taskData) {
    const res = await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
    return res.data.task;
  }

  static async updateTaskStatus(taskId, status) {
    const res = await this.request(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    return res.data.task;
  }

  static async assignTask(taskId, assignedTo) {
    const res = await this.request(`/tasks/${taskId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assignedTo })
    });
    return res.data.task;
  }

  static async addComment(taskId, message) {
    const res = await this.request(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    return res.data.comment;
  }

  static async deleteTask(taskId) {
    await this.request(`/tasks/${taskId}`, { method: 'DELETE' });
    return true;
  }

  /* DASHBOARD & TEAM OVERVIEW */
  static async getTeamOverview() {
    const res = await this.request('/dashboard/team-overview');
    return res.data.team;
  }

  static async getRecentActivity(limit = 20) {
    const res = await this.request(`/dashboard/recent-activity?limit=${limit}`);
    return res.data.activity;
  }

  static async updateMemberAvailability(identifier, availability) {
    const res = await this.request('/dashboard/member-availability', {
      method: 'PUT',
      body: JSON.stringify({ identifier, availability })
    });
    return res.data?.user;
  }

  /* NOTIFICATIONS */
  static async getNotifications() {
    const res = await this.request('/notifications');
    return res.data.notifications;
  }

  static async markAllNotificationsRead() {
    await this.request('/notifications/read-all', { method: 'PUT' });
    return true;
  }
}

window.ApiClient = ApiClient;
