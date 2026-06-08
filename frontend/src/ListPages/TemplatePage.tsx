import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutDashboard, Search, Settings, UsersRound } from "lucide-react";
import Header from "../components/Header";
import JoinModal from "../components/JoinModal";
import client from "../api/client";
import "./WorkspaceList.css";
import "./TemplatePage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
  starred?: boolean;
}

const TEMPLATES = [
  { id: 1,  name: "초원",            category: "풍경",   bg: "linear-gradient(180deg,#56aee2 0%,#7ecb8f 55%,#2d8a3e 100%)" },
  { id: 2,  name: "밤 하늘",         category: "풍경",   bg: "linear-gradient(180deg,#04041a 0%,#0d1240 55%,#1a1060 100%)" },
  { id: 3,  name: "오로라",          category: "풍경",   bg: "linear-gradient(135deg,#071526 0%,#0e4060 40%,#0d9e8a 100%)" },
  { id: 4,  name: "핑크 그라데이션", category: "디자인", bg: "linear-gradient(135deg,#e879f9 0%,#a855f7 50%,#818cf8 100%)" },
  { id: 5,  name: "벚꽃 산책",       category: "인기",   bg: "linear-gradient(135deg,#f9a8d4 0%,#fbcfe8 45%,#93c5fd 100%)" },
  { id: 6,  name: "레몬 소다",       category: "디자인", bg: "linear-gradient(135deg,#fde68a 0%,#fbbf24 42%,#6ee7b7 100%)" },
  { id: 7,  name: "라벤더 노트",     category: "인기",   bg: "linear-gradient(135deg,#c4b5fd 0%,#a78bfa 50%,#818cf8 100%)" },
  { id: 8,  name: "복숭아 아이스티", category: "디자인", bg: "linear-gradient(135deg,#fdba74 0%,#fb7185 50%,#f0abfc 100%)" },
  { id: 9,  name: "바다 유리",       category: "풍경",   bg: "linear-gradient(135deg,#7dd3fc 0%,#22d3ee 45%,#14b8a6 100%)" },
  { id: 10, name: "캠퍼스 블루",     category: "인기",   bg: "linear-gradient(135deg,#93c5fd 0%,#3b82f6 48%,#4f46e5 100%)" },
  { id: 11, name: "민트 초코",       category: "디자인", bg: "linear-gradient(135deg,#5eead4 0%,#2dd4bf 48%,#334155 100%)" },
  { id: 12, name: "노을",            category: "풍경",   bg: "linear-gradient(135deg,#f97316 0%,#ec4899 50%,#7c3aed 100%)" },
  { id: 13, name: "구름 라떼",       category: "풍경",   bg: "linear-gradient(135deg,#7dd3fc 0%,#94a3b8 52%,#64748b 100%)" },
  { id: 14, name: "딸기 우유",       category: "인기",   bg: "linear-gradient(135deg,#fda4af 0%,#fb7185 50%,#f43f5e 100%)" },
  { id: 15, name: "말차 크림",       category: "디자인", bg: "linear-gradient(135deg,#bef264 0%,#84cc16 48%,#4d7c0f 100%)" },
  { id: 16, name: "보라빛 새벽",     category: "풍경",   bg: "linear-gradient(135deg,#1e1b4b 0%,#6d28d9 48%,#a78bfa 100%)" },
  { id: 17, name: "코튼 캔디",       category: "인기",   bg: "linear-gradient(135deg,#7dd3fc 0%,#d8b4fe 50%,#fbcfe8 100%)" },
  { id: 18, name: "오렌지 팝",       category: "디자인", bg: "linear-gradient(135deg,#fb923c 0%,#ef4444 48%,#dc2626 100%)" },
  { id: 19, name: "도서관 우드",     category: "마케팅", bg: "linear-gradient(135deg,#c49a6c 0%,#92400e 50%,#5c2d0a 100%)" },
  { id: 20, name: "새벽 공부",       category: "마케팅", bg: "linear-gradient(135deg,#0f172a 0%,#1d4ed8 50%,#0ea5e9 100%)" },
  { id: 21, name: "포레스트",        category: "풍경",   bg: "linear-gradient(135deg,#14532d 0%,#16a34a 50%,#4ade80 100%)" },
  { id: 22, name: "자몽 에이드",     category: "디자인", bg: "linear-gradient(135deg,#fb7185 0%,#f43f5e 48%,#ea580c 100%)" },
  { id: 23, name: "은하수",          category: "풍경",   bg: "linear-gradient(135deg,#0f172a 0%,#312e81 45%,#7e22ce 100%)" },
  { id: 24, name: "화이트 모카",     category: "마케팅", bg: "linear-gradient(135deg,#d6b48a 0%,#a87d52 50%,#78523a 100%)" },
  { id: 25, name: "체리 콜라",       category: "디자인", bg: "linear-gradient(135deg,#881337 0%,#e11d48 50%,#fb7185 100%)" },
  { id: 26, name: "블루베리 요거트", category: "인기",   bg: "linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#4f46e5 100%)" },
  { id: 27, name: "비 오는 날",      category: "풍경",   bg: "linear-gradient(135deg,#1e293b 0%,#475569 50%,#94a3b8 100%)" },
  { id: 28, name: "라임 스파클",     category: "디자인", bg: "linear-gradient(135deg,#a3e635 0%,#65a30d 50%,#166534 100%)" },
  { id: 29, name: "플럼 와인",       category: "마케팅", bg: "linear-gradient(135deg,#4c1d95 0%,#7e22ce 50%,#db2777 100%)" },
  { id: 30, name: "살구빛 오후",     category: "인기",   bg: "linear-gradient(135deg,#fdba74 0%,#fb923c 50%,#f43f5e 100%)" },

  // 파스텔 카테고리 — 중간 채도 유지, 흰색과 확실히 구분되게
  { id: 31, name: "아기 블루",       category: "파스텔", bg: "linear-gradient(135deg,#bfdbfe 0%,#93c5fd 50%,#bae6fd 100%)" },
  { id: 32, name: "연보라 안개",     category: "파스텔", bg: "linear-gradient(135deg,#ddd6fe 0%,#c4b5fd 50%,#e9d5ff 100%)" },
  { id: 33, name: "쑥 라떼",         category: "파스텔", bg: "linear-gradient(135deg,#a7f3d0 0%,#6ee7b7 50%,#a7f3d0 100%)" },
  { id: 34, name: "샌드 베이지",     category: "파스텔", bg: "linear-gradient(135deg,#fde68a 0%,#fcd34d 50%,#fed7aa 100%)" },
  { id: 35, name: "코랄 블러쉬",     category: "파스텔", bg: "linear-gradient(135deg,#fda4af 0%,#fecdd3 50%,#fee2e2 100%)" },
  { id: 36, name: "카모마일",        category: "파스텔", bg: "linear-gradient(135deg,#fde68a 0%,#fef08a 50%,#d9f99d 100%)" },
  { id: 37, name: "실크 로즈",       category: "파스텔", bg: "linear-gradient(135deg,#fbcfe8 0%,#f9a8d4 50%,#fce7f3 100%)" },
  { id: 38, name: "파우더 민트",     category: "파스텔", bg: "linear-gradient(135deg,#a7f3d0 0%,#6ee7b7 45%,#bae6fd 100%)" },
  { id: 39, name: "버터 크림",       category: "파스텔", bg: "linear-gradient(135deg,#fde68a 0%,#fcd34d 50%,#fed7aa 100%)" },
  { id: 40, name: "모브 핑크",       category: "파스텔", bg: "linear-gradient(135deg,#ddd6fe 0%,#c4b5fd 46%,#fbcfe8 100%)" },
  { id: 41, name: "소프트 피치",     category: "파스텔", bg: "linear-gradient(135deg,#fed7aa 0%,#fdba74 50%,#fda4af 100%)" },
  { id: 42, name: "블루밍 라일락",   category: "파스텔", bg: "linear-gradient(135deg,#bae6fd 0%,#93c5fd 43%,#ddd6fe 100%)" },
  { id: 43, name: "밀크티",          category: "파스텔", bg: "linear-gradient(135deg,#d4a96a 0%,#c49060 50%,#b07d52 100%)" },
  { id: 44, name: "수채화 하늘",     category: "파스텔", bg: "linear-gradient(135deg,#7dd3fc 0%,#67e8f9 43%,#c7d2fe 100%)" },
  { id: 45, name: "봄 안개",         category: "파스텔", bg: "linear-gradient(135deg,#f9a8d4 0%,#e879f9 43%,#c084fc 100%)" },

  // 패턴 카테고리 — 선/점 색상 더 진하게, 크기 키움
  { id: 46, name: "줄 공책",         category: "패턴", bg: "repeating-linear-gradient(transparent,transparent 23px,#60a5fa 23px,#60a5fa 25px) #fefce8" },
  { id: 47, name: "도트 노트",       category: "패턴", bg: "radial-gradient(circle,#64748b 2.5px,transparent 2.5px) 0 0/22px 22px #f1f5f9" },
  { id: 48, name: "방안지",          category: "패턴", bg: "repeating-linear-gradient(0deg,transparent,transparent 28px,#60a5fa 28px,#60a5fa 30px),repeating-linear-gradient(90deg,transparent,transparent 28px,#60a5fa 28px,#60a5fa 30px) #f0f9ff" },
  { id: 49, name: "핑크 도트",       category: "패턴", bg: "radial-gradient(circle,#f472b6 2.5px,transparent 2.5px) 0 0/22px 22px #fdf2f8" },
  { id: 50, name: "대각 줄무늬",     category: "패턴", bg: "repeating-linear-gradient(45deg,transparent,transparent 7px,#94a3b8 7px,#94a3b8 9px) #f1f5f9" },
  { id: 51, name: "체크무늬",        category: "패턴", bg: "repeating-conic-gradient(#cbd5e1 0% 25%,#f8fafc 0% 50%) 0 0/28px 28px" },
  { id: 52, name: "크로스해치",      category: "패턴", bg: "repeating-linear-gradient(45deg,transparent,transparent 5px,#a78bfa 5px,#a78bfa 7px),repeating-linear-gradient(-45deg,transparent,transparent 5px,#a78bfa 5px,#a78bfa 7px) #f5f3ff" },
  { id: 53, name: "민트 도트",       category: "패턴", bg: "radial-gradient(circle,#10b981 2.5px,transparent 2.5px) 0 0/22px 22px #ecfdf5" },
  { id: 54, name: "세로 줄",         category: "패턴", bg: "repeating-linear-gradient(90deg,transparent,transparent 13px,#a78bfa 13px,#a78bfa 15px) #f5f3ff" },
  { id: 55, name: "오프셋 도트",     category: "패턴", bg: "radial-gradient(circle,#f59e0b 2.5px,transparent 2.5px) 0 0/20px 20px,radial-gradient(circle,#f59e0b 2.5px,transparent 2.5px) 10px 10px/20px 20px #fffbeb" },
  { id: 56, name: "빨간 공책",       category: "패턴", bg: "repeating-linear-gradient(transparent,transparent 23px,#f87171 23px,#f87171 25px) #fff5f5" },
  { id: 57, name: "모눈 민트",       category: "패턴", bg: "repeating-linear-gradient(0deg,transparent,transparent 18px,#34d399 18px,#34d399 20px),repeating-linear-gradient(90deg,transparent,transparent 18px,#34d399 18px,#34d399 20px) #ecfdf5" },

  // 새 풍경 배경
  { id: 58, name: "사막 황혼",       category: "풍경", bg: "linear-gradient(180deg,#ff7043 0%,#e64a19 35%,#bf360c 62%,#7b1f0e 100%)" },
  { id: 59, name: "황금 들판",       category: "풍경", bg: "linear-gradient(180deg,#81d4fa 0%,#29b6f6 28%,#fdd835 52%,#f57f17 66%,#388e3c 80%,#1b5e20 100%)" },
  { id: 60, name: "알프스 빙하",     category: "풍경", bg: "linear-gradient(180deg,#b3e5fc 0%,#81d4fa 22%,#eceff1 42%,#e0e0e0 55%,#a5d6a7 72%,#388e3c 100%)" },
  { id: 61, name: "가을 단풍",       category: "풍경", bg: "linear-gradient(135deg,#bf360c 0%,#e64a19 22%,#f57c00 45%,#ffa000 68%,#fdd835 100%)" },
  { id: 62, name: "열대 해변",       category: "풍경", bg: "linear-gradient(180deg,#00b0ff 0%,#0091ea 28%,#80d8ff 44%,#fff176 52%,#ffe082 60%,#69f0ae 72%,#00897b 100%)" },
  { id: 63, name: "설산",            category: "풍경", bg: "linear-gradient(180deg,#e3f2fd 0%,#bbdefb 18%,#90caf9 38%,#78909c 55%,#546e7a 72%,#37474f 100%)" },

  // 동물 패턴 — 더 선명하게
  { id: 64, name: "얼룩말",          category: "동물", bg: "repeating-linear-gradient(105deg,#111 0px,#111 16px,#efefef 16px,#efefef 32px)" },
  { id: 65, name: "호랑이",          category: "동물", bg: "repeating-linear-gradient(88deg,#ea8a00 0,#ea8a00 12px,#5a1a00 12px,#5a1a00 19px,#ea8a00 19px,#ea8a00 29px,#5a1a00 29px,#5a1a00 35px)" },
  { id: 66, name: "치타",            category: "동물", bg: "radial-gradient(ellipse 8px 10px at 12% 18%,#4a1c00 88%,transparent 100%),radial-gradient(ellipse 10px 7px at 32% 68%,#4a1c00 88%,transparent 100%),radial-gradient(ellipse 7px 9px at 55% 12%,#4a1c00 88%,transparent 100%),radial-gradient(ellipse 9px 10px at 72% 48%,#4a1c00 88%,transparent 100%),radial-gradient(ellipse 7px 8px at 88% 78%,#4a1c00 88%,transparent 100%),radial-gradient(ellipse 8px 7px at 22% 82%,#4a1c00 88%,transparent 100%),radial-gradient(ellipse 9px 7px at 46% 38%,#4a1c00 88%,transparent 100%),radial-gradient(ellipse 7px 10px at 92% 22%,#4a1c00 88%,transparent 100%) #d97706" },
  { id: 67, name: "달마시안",        category: "동물", bg: "radial-gradient(ellipse 22px 15px at 14% 22%,#111 95%,transparent 100%),radial-gradient(ellipse 15px 22px at 40% 72%,#111 95%,transparent 100%),radial-gradient(ellipse 25px 17px at 65% 18%,#111 95%,transparent 100%),radial-gradient(ellipse 17px 25px at 82% 62%,#111 95%,transparent 100%),radial-gradient(ellipse 20px 13px at 50% 88%,#111 95%,transparent 100%),radial-gradient(ellipse 13px 18px at 6% 68%,#111 95%,transparent 100%),radial-gradient(ellipse 17px 15px at 93% 14%,#111 95%,transparent 100%) #f5f5f5" },
  { id: 68, name: "뱀 비늘",         category: "동물", bg: "repeating-linear-gradient(60deg,transparent,transparent 8px,rgba(0,0,0,0.3) 8px,rgba(0,0,0,0.3) 10px),repeating-linear-gradient(-60deg,transparent,transparent 8px,rgba(0,0,0,0.3) 8px,rgba(0,0,0,0.3) 10px) #1a4d35" },
  { id: 69, name: "기린",            category: "동물", bg: "repeating-linear-gradient(0deg,transparent,transparent 18px,#7c3000 18px,#7c3000 21px),repeating-linear-gradient(60deg,transparent,transparent 18px,#7c3000 18px,#7c3000 21px),repeating-linear-gradient(120deg,transparent,transparent 18px,#7c3000 18px,#7c3000 21px) #f5d78e" },
  { id: 70, name: "소 무늬",         category: "동물", bg: "radial-gradient(ellipse 26px 18px at 18% 28%,#111 95%,transparent 100%),radial-gradient(ellipse 18px 26px at 48% 74%,#111 95%,transparent 100%),radial-gradient(ellipse 28px 17px at 76% 22%,#111 95%,transparent 100%),radial-gradient(ellipse 20px 28px at 90% 68%,#111 95%,transparent 100%),radial-gradient(ellipse 22px 16px at 36% 90%,#111 95%,transparent 100%) #f0f0f0" },
  { id: 71, name: "공작",            category: "동물", bg: "repeating-radial-gradient(circle at 0 0,transparent 8px,#0369a1 8px,#0369a1 10px,transparent 10px),repeating-radial-gradient(circle at 15px 15px,transparent 8px,#0369a1 8px,#0369a1 10px,transparent 10px) #cffafe" },
  { id: 72, name: "표범 핑크",       category: "동물", bg: "radial-gradient(ellipse 8px 10px at 10% 20%,#831843 88%,transparent 100%),radial-gradient(ellipse 10px 8px at 33% 65%,#831843 88%,transparent 100%),radial-gradient(ellipse 7px 9px at 58% 15%,#831843 88%,transparent 100%),radial-gradient(ellipse 9px 10px at 74% 50%,#831843 88%,transparent 100%),radial-gradient(ellipse 8px 7px at 88% 80%,#831843 88%,transparent 100%),radial-gradient(ellipse 7px 9px at 20% 85%,#831843 88%,transparent 100%),radial-gradient(ellipse 9px 7px at 45% 40%,#831843 88%,transparent 100%) #fba8c8" },

  // 공책 패턴 — 선 두께·색상 개선
  { id: 73, name: "클래식 공책",     category: "공책", bg: "repeating-linear-gradient(transparent,transparent 23px,#60a5fa 23px,#60a5fa 25px) #fffdf7" },
  { id: 74, name: "빨간 줄 공책",   category: "공책", bg: "repeating-linear-gradient(transparent,transparent 23px,#f87171 23px,#f87171 25px) #fff8f8" },
  { id: 75, name: "그린 공책",       category: "공책", bg: "repeating-linear-gradient(transparent,transparent 23px,#34d399 23px,#34d399 25px) #f0fdf4" },
  { id: 76, name: "모눈 공책",       category: "공책", bg: "repeating-linear-gradient(0deg,transparent,transparent 18px,#60a5fa 18px,#60a5fa 20px),repeating-linear-gradient(90deg,transparent,transparent 18px,#60a5fa 18px,#60a5fa 20px) #f0f9ff" },
  { id: 77, name: "핑크 공책",       category: "공책", bg: "repeating-linear-gradient(transparent,transparent 23px,#f472b6 23px,#f472b6 25px) #fdf2f8" },
  { id: 78, name: "라벤더 공책",     category: "공책", bg: "repeating-linear-gradient(transparent,transparent 23px,#a78bfa 23px,#a78bfa 25px) #f5f3ff" },
  { id: 79, name: "옐로우 공책",     category: "공책", bg: "repeating-linear-gradient(transparent,transparent 23px,#f59e0b 23px,#f59e0b 25px) #fffbeb" },
  { id: 80, name: "두꺼운 줄",       category: "공책", bg: "repeating-linear-gradient(transparent,transparent 27px,#64748b 27px,#64748b 30px) #f8fafc" },
  { id: 81, name: "대학 노트",       category: "공책", bg: "repeating-linear-gradient(transparent,transparent 23px,#60a5fa 23px,#60a5fa 25px),linear-gradient(90deg,#f87171 0px,#f87171 3px,transparent 3px) #fffdf7" },
  { id: 82, name: "미로 방안지",     category: "공책", bg: "repeating-linear-gradient(0deg,transparent,transparent 8px,#9ca3af 8px,#9ca3af 9px,transparent 9px,transparent 17px,#6b7280 17px,#6b7280 19px),repeating-linear-gradient(90deg,transparent,transparent 8px,#9ca3af 8px,#9ca3af 9px,transparent 9px,transparent 17px,#6b7280 17px,#6b7280 19px) #f9fafb" },

  // 우주 카테고리
  { id: 83, name: "별밭",           category: "우주", bg: "radial-gradient(circle,#ffffffdd 1.5px,transparent 1.5px) 0 0/28px 28px,radial-gradient(circle,#aaaaff99 1px,transparent 1px) 14px 14px/22px 22px,radial-gradient(circle,#ffffff66 1px,transparent 1px) 7px 20px/18px 18px #030418" },
  { id: 84, name: "성운",           category: "우주", bg: "radial-gradient(ellipse 60% 50% at 25% 40%,rgba(124,58,237,0.75) 0%,transparent 60%),radial-gradient(ellipse 55% 60% at 75% 60%,rgba(29,78,216,0.7) 0%,transparent 60%),radial-gradient(ellipse 40% 45% at 55% 18%,rgba(190,24,93,0.65) 0%,transparent 55%) #050518" },
  { id: 85, name: "딥 스페이스",    category: "우주", bg: "radial-gradient(ellipse 80% 60% at 50% 50%,#0f0c3a 0%,#050312 100%)" },
  { id: 86, name: "화성",           category: "우주", bg: "linear-gradient(180deg,#1a0a00 0%,#5c1a00 28%,#c2410c 52%,#ea580c 72%,#fed7aa 100%)" },
  { id: 87, name: "코스믹 오로라",  category: "우주", bg: "linear-gradient(180deg,#020c1a 0%,#0d1f3c 30%,#0a4a3a 55%,#0d6b50 75%,#64d9b5 100%)" },
  { id: 88, name: "은하 코어",      category: "우주", bg: "radial-gradient(ellipse 40% 60% at 50% 50%,#fbbf24 0%,#f97316 15%,#7c3aed 40%,#1e0a4e 65%,#050315 100%)" },
  { id: 89, name: "우주 먼지",      category: "우주", bg: "radial-gradient(ellipse 70% 40% at 30% 30%,rgba(56,189,248,0.4) 0%,transparent 60%),radial-gradient(ellipse 50% 60% at 70% 70%,rgba(168,85,247,0.4) 0%,transparent 60%),radial-gradient(circle,#ffffffcc 1px,transparent 1px) 0 0/30px 30px,radial-gradient(circle,#ffffff66 1px,transparent 1px) 15px 15px/25px 25px #060215" },

  // 초원 확장 (풍경)
  { id: 90, name: "봄 초원",        category: "풍경", bg: "linear-gradient(180deg,#87ceeb 0%,#b8e4f7 22%,#d4f0a0 45%,#78c850 68%,#3d8a30 100%)" },
  { id: 91, name: "안개 초원",      category: "풍경", bg: "linear-gradient(180deg,#e8f0e8 0%,#c8d8c8 30%,#a0c0a0 52%,#508050 72%,#2d5a2d 100%)" },
  { id: 92, name: "달빛 초원",      category: "풍경", bg: "linear-gradient(180deg,#080e1c 0%,#1a2744 28%,#2a3a5a 48%,#2a5530 65%,#163820 100%)" },
  { id: 93, name: "여름 들판",      category: "풍경", bg: "linear-gradient(180deg,#38b6e8 0%,#7dd8f0 18%,#fef9c3 42%,#90d840 60%,#3a8a18 80%,#1e5010 100%)" },
  { id: 94, name: "초원 노을",      category: "풍경", bg: "linear-gradient(180deg,#ff8c42 0%,#ff6b6b 25%,#c4546e 45%,#6b4a7a 60%,#2d5a30 75%,#163820 100%)" },

  // 산리오 카테고리 — 캐릭터 대표 색상·형태를 CSS 패턴으로 표현
  { id: 95, name: "핑크 리본",      category: "팝 무드", bg: "radial-gradient(circle 10px at 30% 50%,#ffb3d1 0%,#ff8ab5 60%,transparent 100%) 0 0/44px 36px,radial-gradient(circle 10px at 70% 50%,#ffb3d1 0%,#ff8ab5 60%,transparent 100%) 0 0/44px 36px,radial-gradient(circle 4px at 50% 52%,#e91e8c 0%,transparent 100%) 0 0/44px 36px #ffe4f0" },
  { id: 96, name: "퍼플 나이트",    category: "팝 무드", bg: "radial-gradient(ellipse 11px 9px at 50% 38%,#5b21b6 0%,transparent 100%) 0 0/30px 30px,radial-gradient(circle 2.5px at 43% 62%,#f0abfc 0%,transparent 100%) 0 0/30px 30px,radial-gradient(circle 2.5px at 57% 62%,#f0abfc 0%,transparent 100%) 0 0/30px 30px #09000f" },
  { id: 97, name: "솜구름",         category: "팝 무드", bg: "radial-gradient(circle 14px at 20% 52%,rgba(255,255,255,0.95) 0%,transparent 70%) 0 0/72px 54px,radial-gradient(circle 10px at 36% 42%,rgba(255,255,255,0.95) 0%,transparent 70%) 0 0/72px 54px,radial-gradient(circle 10px at 50% 52%,rgba(255,255,255,0.95) 0%,transparent 70%) 0 0/72px 54px #bfdbfe" },
  { id: 98, name: "레드 리본",      category: "팝 무드", bg: "radial-gradient(circle 9px at 34% 52%,#ef4444 0%,transparent 100%) 0 0/44px 36px,radial-gradient(circle 9px at 66% 52%,#ef4444 0%,transparent 100%) 0 0/44px 36px,radial-gradient(circle 3.5px at 50% 54%,#dc2626 0%,transparent 100%) 0 0/44px 36px #fff5f5" },
  { id: 99, name: "황금 베레모",    category: "팝 무드", bg: "radial-gradient(circle 14px at 50% 46%,#fbbf24 0%,#f59e0b 80%,transparent 100%) 0 0/46px 46px,radial-gradient(circle 7px at 50% 36%,#92400e 0%,transparent 100%) 0 0/46px 46px #fffbeb" },
  { id: 100, name: "별빛 가루",     category: "팝 무드", bg: "radial-gradient(circle 3px at 20% 20%,#f472b6 0%,transparent 100%) 0 0/30px 30px,radial-gradient(circle 3px at 70% 70%,#93c5fd 0%,transparent 100%) 0 0/30px 30px,radial-gradient(circle 2px at 50% 50%,#fbbf24 0%,transparent 100%) 0 0/30px 30px,linear-gradient(135deg,#fce7f3 0%,#ede9fe 50%,#dbeafe 100%)" },
  { id: 101, name: "블랙 팝",       category: "팝 무드", bg: "radial-gradient(circle 12px at 50% 42%,#111 0%,transparent 100%) 0 0/36px 36px,radial-gradient(ellipse 8px 4px at 50% 56%,#fbbf24 0%,transparent 100%) 0 0/36px 36px #f0f0f0" },
];

const CATEGORIES = ["인기", "팝 무드", "우주", "파스텔", "공책", "패턴", "동물", "풍경", "마케팅", "디자인"];

export default function TemplatePage() {
  const { state } = useLocation() as {
    state: { workspace: Workspace; teamWorkspaces: Workspace[]; personalWorkspaces: Workspace[] };
  };
  const navigate = useNavigate();

  const savedWs    = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace  = state?.workspace ?? savedWs ?? { id: "", name: "워크스페이스", gradient: "#ccc" };
  const teamWs     = state?.teamWorkspaces     ?? [];
  const personalWs = state?.personalWorkspaces ?? [];
  const allWorkspaces = [...teamWs, ...personalWs];

  const [expandedId, setExpandedId]       = useState<string>(workspace.id);
  const [joinOpen, setJoinOpen]           = useState(false);
  const [selectedCat, setSelectedCat]     = useState<string>("전체");
  const [search, setSearch]               = useState("");
  const [applying, setApplying]           = useState(false);
  const [selectedGradient, setSelectedGradient] = useState<string | null>(null);

  const toggleSidebar = (id: string) =>
    setExpandedId((prev) => (prev === id ? "" : id));

  const navState = (ws: Workspace) => ({
    workspace: ws,
    teamWorkspaces: teamWs,
    personalWorkspaces: personalWs,
  });

  const handleApplyTemplate = async (gradient: string) => {
    const updated = { ...workspace, gradient };
    localStorage.setItem("clickedWorkspace", JSON.stringify(updated));
    if (workspace.id) {
      localStorage.setItem(`ws_gradient_${workspace.id}`, gradient);
    }

    if (workspace.id) {
      setApplying(true);
      try {
        await client.patch(`/workspaces/${workspace.id}`, {
          name: workspace.name,
          gradient,
        });
      } catch {
        // 로컬에 저장됨 - API 실패해도 계속 진행
      } finally {
        setApplying(false);
      }
    }

    navigate("/workspace-board", { state: { workspace: updated, workspaces: allWorkspaces } });
  };

  const renderSidebarItems = (list: Workspace[]) =>
    list.map((ws) => (
      <div key={ws.id}>
        <div className="sidebar-item" onClick={() => toggleSidebar(ws.id)}>
          <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
            {ws.name[0]}
          </div>
          <span className="sidebar-item-name">{ws.name}</span>
          <span className={`sidebar-arrow ${expandedId === ws.id ? "open" : ""}`}>▾</span>
        </div>
        <div className={`sidebar-submenu ${expandedId === ws.id ? "open" : ""}`}>
          <div className="sidebar-subitem" onClick={() => navigate("/workspace-board", { state: { workspace: ws, workspaces: allWorkspaces } })}>
            <LayoutDashboard className="subitem-icon" size={14} /> Board
          </div>
          <div className="sidebar-subitem" onClick={() => navigate("/members", { state: navState(ws) })}>
            <UsersRound className="subitem-icon" size={14} /> Members
          </div>
          <div className="sidebar-subitem" onClick={() => navigate("/settings", { state: navState(ws) })}>
            <Settings className="subitem-icon" size={14} /> Setting
          </div>
        </div>
      </div>
    ));

  return (
    <div className="workspace-page">
      <Header workspaces={allWorkspaces} />

      <div className="workspace-body">
        <aside className="sidebar">
          <div className="sidebar-menu-icon">≡</div>

          <div className="sidebar-section">
            <p className="sidebar-label">팀 워크스페이스</p>
            {renderSidebarItems(teamWs)}
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <p className="sidebar-label">개인 워크스페이스</p>
            {renderSidebarItems(personalWs)}
          </div>

          <div className="sidebar-bottom">
            <hr className="sidebar-divider" />
            <div className="sidebar-nav-item" onClick={() => navigate("/workspace")}>
              <Home size={15} />
              <span>Home</span>
            </div>
            <div className="sidebar-nav-item active">
              <LayoutDashboard className="nav-icon" size={15} />
              <span>Board</span>
            </div>
            <button className="join-btn" onClick={() => setJoinOpen(true)}>워크스페이스 참여 !</button>
          </div>
        </aside>

        <main className="template-main">
          <div className="template-top-bar">
            <h2 className="template-page-title">전체 템플릿</h2>
            <div className="template-search-wrap">
              <input
                className="template-search"
                placeholder="검색하여 찾기"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="template-search-icon" size={16} />
            </div>
          </div>

          <div className="template-filter-bar">
            <div className="template-cat-pills">
              {["전체", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  className={`template-cat-pill ${selectedCat === cat ? "active" : ""}`}
                  onClick={() => setSelectedCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="template-apply-bar">
              {selectedGradient && (
                <div className="template-preview-chip" style={{ background: selectedGradient }} />
              )}
              <button
                className="template-apply-btn"
                disabled={!selectedGradient || applying}
                onClick={() => selectedGradient && handleApplyTemplate(selectedGradient)}
              >
                {applying ? "적용 중..." : "적용하기"}
              </button>
            </div>
          </div>

          <hr className="template-page-divider" />

          <div className="template-grid-full">
            {TEMPLATES
              .filter((t) => selectedCat === "전체" || t.category === selectedCat)
              .filter((t) => t.name.includes(search))
              .map((t) => (
              <div
                key={t.id}
                className={`template-card-full ${selectedGradient === t.bg ? "selected" : ""}`}
                style={{ cursor: applying ? "wait" : "pointer" }}
                onClick={() => !applying && setSelectedGradient(t.bg)}
              >
                <div className="template-thumb-full" style={{ background: t.bg }} />
                <span className="template-name-full">{t.name}</span>
                <span className="template-apply-hint">
                  {selectedGradient === t.bg ? "선택됨 ✓" : "클릭하여 선택"}
                </span>
              </div>
            ))}
          </div>
        </main>
      </div>
      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}
    </div>
  );
}
