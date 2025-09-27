class ApiClient {
  async request(url: string, options: RequestInit = {}) {
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async get(endpoint: string, base: string, options: RequestInit = {}) {
    return this.request(base + endpoint, { ...options, method: "GET" });
  }

  async post(
    endpoint: string,
    data: any,
    base: string,
    options: RequestInit = {}
  ) {
    return this.request(base + endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
