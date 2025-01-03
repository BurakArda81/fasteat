// public/api.js
const BASE_URL = 'http://localhost:5000/api';

const api = {
  async cities(CityID) {
    const response = await fetch(`${BASE_URL}/cities`);
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  },

  async restaurants(RestaurantID) {
    const params = new URLSearchParams();
    if (RestaurantID) params.append('RestaurantID', RestaurantID);
    
    const response = await fetch(`${BASE_URL}/restaurants?${params}`);
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  },

  async orders(filters) {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.month) params.append('month', filters.month);
    if (filters.CityID) params.append('CityID', filters.CityID);
    if (filters.RestaurantID) params.append('RestaurantID', filters.RestaurantID);

    const response = await fetch(`${BASE_URL}/orders?${params}`);
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  },

  async analysis(filters) {
    const params = new URLSearchParams(filters);
    // URL'yi düzelttik
    const response = await fetch(`${BASE_URL}/analysis/dashboard?${params}`);
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  },

  async accountingStats(filters) {
    const params = new URLSearchParams(filters);
    // URL'yi düzelttik
    const response = await fetch(`${BASE_URL}/accounting/current-stats?${params}`);
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  },

   async messages(filters = {}) {
    const params = new URLSearchParams(filters);
    // URL'yi düzelttik
    const response = await fetch(`${BASE_URL}/messages/history?${params}`);
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  },

  async sendMessage(messageData) {
    const response = await fetch(`${BASE_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  },

  async getSettings() {
    const response = await fetch(`${BASE_URL}/settings/get`);
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  },

  async updateSettings(settings) {
    const response = await fetch(`${BASE_URL}/settings/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message);
  }
};

export default api;