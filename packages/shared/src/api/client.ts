import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

let instanceCount = 0;

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private instanceId: number;

  constructor() {
    this.instanceId = ++instanceCount;
    console.log(`ApiClient instance #${this.instanceId} created`);
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      console.log(`ApiClient #${this.instanceId} interceptor - token present:`, !!this.token, 'url:', config.url);
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
        console.log(`ApiClient #${this.instanceId} - Added Authorization header`);
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - could trigger logout
          console.error('Unauthorized request');
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    console.log(`ApiClient #${this.instanceId} setToken called, token:`, token ? token.substring(0, 20) + '...' : 'null');
    this.token = token;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
