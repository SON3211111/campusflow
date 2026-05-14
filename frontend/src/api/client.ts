import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

function clearSessionAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  window.location.href = '/login';
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    if (isTokenExpired(token)) {
      clearSessionAndRedirect();
      return Promise.reject(new Error('토큰이 만료되었습니다.'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 백엔드에서 401 응답 시 자동 로그아웃 (로그인/회원가입 요청 제외)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/signup');
    if (error.response?.status === 401 && !isAuthRequest) {
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

export default client;
