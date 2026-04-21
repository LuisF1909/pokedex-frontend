import { defineStore } from 'pinia';
import api from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: null,
        isAuthenticated: false
    }),
    actions: {
        async login(email, password) {
            try {
                const response = await api.post('/auth/login', { email, password });
                this.token = response.data.token;
                this.user = response.data.user;
                this.isAuthenticated = true;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                // Conectar socket apenas inicia sesión para poder recibir retos
                connectSocket();
                return true;
            } catch (error) {
                console.error('Login failed:', error);
                throw error.response?.data?.error || 'Login failed';
            }
        },
        async register(email, password) {
            try {
                const response = await api.post('/auth/register', { email, password });
                return response.data;
            } catch (error) {
                console.error('Register failed:', error);
                throw error.response?.data?.error || 'Register failed';
            }
        },
        logout() {
            this.user = null;
            this.token = null;
            this.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            disconnectSocket();
        },
        checkAuth() {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            if (token && user) {
                this.token = token;
                this.user = JSON.parse(user);
                this.isAuthenticated = true;
                // Reconectar socket tras recargar la página
                connectSocket();
            }
        }
    }
});
