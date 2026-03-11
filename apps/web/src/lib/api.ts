import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  AuthUser,
  WardrobeItem,
  CreateWardrobeItemRequest,
  UpdateWardrobeItemRequest,
  Trip,
  CreateTripRequest,
  ApiError,
} from '@outfittr/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ── Core fetch wrapper ───────────────────────────────
class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('outfittr_token', token);
      } else {
        localStorage.removeItem('outfittr_token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('outfittr_token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 204) return undefined as T;

    const data = await res.json();

    if (!res.ok) {
      const error = data as ApiError;
      throw new ApiRequestError(error.message, res.status, error.errors);
    }

    return data as T;
  }

  // ── Auth ─────────────────────────────────────────
  async register(body: RegisterRequest): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setToken(data.token);
    return data;
  }

  async login(body: LoginRequest): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setToken(data.token);
    return data;
  }

  async me(): Promise<AuthUser> {
    return this.request<AuthUser>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // ── Wardrobe ─────────────────────────────────────
  async listWardrobe(): Promise<WardrobeItem[]> {
    return this.request<WardrobeItem[]>('/wardrobe');
  }

  async createWardrobeItem(body: CreateWardrobeItemRequest): Promise<WardrobeItem> {
    return this.request<WardrobeItem>('/wardrobe', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateWardrobeItem(id: string, body: UpdateWardrobeItemRequest): Promise<WardrobeItem> {
    return this.request<WardrobeItem>(`/wardrobe/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteWardrobeItem(id: string): Promise<void> {
    return this.request<void>(`/wardrobe/${id}`, { method: 'DELETE' });
  }

  // ── Trips ────────────────────────────────────────
  async listTrips(): Promise<Trip[]> {
    return this.request<Trip[]>('/trips');
  }

  async createTrip(body: CreateTripRequest): Promise<Trip> {
    return this.request<Trip>('/trips', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getTrip(id: string): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}`);
  }

  async deleteTrip(id: string): Promise<void> {
    return this.request<void>(`/trips/${id}`, { method: 'DELETE' });
  }

  async refreshTripWeather(id: string): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}/refresh-weather`, { method: 'POST' });
  }
}

export class ApiRequestError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
  }
}

export const api = new ApiClient();
