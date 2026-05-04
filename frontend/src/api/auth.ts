import client from './client';

// 1-1. 회원가입 데이터 타입 정의
interface SignupData {
  email: string;
  password: string;
  name: string;
  role: string;
}

// 1-2. 로그인 데이터 타입 정의
interface LoginData {
  email: string;
  password: string;
}

export const signup = (data: SignupData) => client.post('/auth/signup', data);
export const login = (data: LoginData) => client.post('/auth/login', data);
export const getMyInfo = () => client.get('/users/me');
export const logout = () => client.post('/auth/logout');