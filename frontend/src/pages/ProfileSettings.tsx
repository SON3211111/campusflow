import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Globe2, GraduationCap, IdCard, LockKeyhole, Mail, Moon, Palette, ShieldCheck, Sun, UserRound } from "lucide-react";
import Header from "../components/Header";
import PixelAvatar, { AVATAR_OPTIONS, getStoredAvatar, type AvatarConfig } from "../components/PixelAvatar";
import client from "../api/client";
import { LANGUAGES, getLanguageMeta, getStoredLanguage, saveLanguage, type AppLanguage } from "../utils/appLanguage";
import { getStoredTheme, saveTheme, type AppTheme } from "../utils/appTheme";
import "./ProfileSettings.css";

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  createdAt?: string;
}

type ProfileCopy = {
  back: string;
  eyebrow: string;
  title: string;
  desc: string;
  displayName: string;
  role: string;
  joined: string;
  professor: string;
  student: string;
  themeTitle: string;
  themeDesc: string;
  light: string;
  dark: string;
  languageTitle: string;
  languageDesc: string;
  avatarTitle: string;
  avatarDesc: string;
  skin: string;
  hair: string;
  shirt: string;
  bg: string;
  colorSelect: string;
  infoTitle: string;
  infoDesc: string;
  name: string;
  email: string;
  noEmail: string;
  passwordTitle: string;
  passwordDesc: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  workspace: string;
  save: string;
  saving: string;
  saved: string;
  nameRequired: string;
  passwordRequired: string;
  passwordLength: string;
  passwordMismatch: string;
  saveFailed: string;
};

const profileCopy = {
  ko: {
    back: "돌아가기",
    eyebrow: "ACCOUNT SETTINGS",
    title: "개인정보 설정",
    desc: "로그인 정보와 계정 표시 이름을 관리합니다.",
    displayName: "표시 이름",
    role: "계정 역할",
    joined: "가입일",
    professor: "교수",
    student: "학생",
    themeTitle: "화면 모드",
    themeDesc: "작업 화면의 밝기를 원하는 분위기로 바꿉니다.",
    light: "라이트",
    dark: "다크",
    languageTitle: "언어",
    languageDesc: "랜딩페이지와 개인정보 설정에서 사용할 표시 언어를 선택합니다.",
    avatarTitle: "픽셀 학생 아바타",
    avatarDesc: "프로필에서 사용할 학생 캐릭터를 꾸며보세요.",
    skin: "피부",
    hair: "머리",
    shirt: "상의",
    bg: "배경",
    colorSelect: "색상 선택",
    infoTitle: "기본 정보",
    infoDesc: "팀원들에게 표시되는 이름을 수정할 수 있습니다.",
    name: "이름",
    email: "이메일",
    noEmail: "이메일 정보 없음",
    passwordTitle: "비밀번호",
    passwordDesc: "비밀번호를 바꾸지 않으려면 아래 항목은 비워두세요.",
    currentPassword: "현재 비밀번호",
    newPassword: "새 비밀번호",
    confirmPassword: "새 비밀번호 확인",
    workspace: "내 워크스페이스",
    save: "저장",
    saving: "저장 중...",
    saved: "개인정보가 저장되었습니다.",
    nameRequired: "이름을 입력해주세요.",
    passwordRequired: "비밀번호를 변경하려면 모든 비밀번호 항목을 입력해주세요.",
    passwordLength: "새 비밀번호는 8자 이상이어야 합니다.",
    passwordMismatch: "새 비밀번호 확인이 일치하지 않습니다.",
    saveFailed: "저장에 실패했습니다.",
  },
  en: {
    back: "Back",
    eyebrow: "ACCOUNT SETTINGS",
    title: "Profile settings",
    desc: "Manage your login details and display name.",
    displayName: "Display name",
    role: "Account role",
    joined: "Joined",
    professor: "Professor",
    student: "Student",
    themeTitle: "Display mode",
    themeDesc: "Choose the brightness for your workspace.",
    light: "Light",
    dark: "Dark",
    languageTitle: "Language",
    languageDesc: "Choose the language used on the landing page and profile settings.",
    avatarTitle: "Pixel student avatar",
    avatarDesc: "Customize the student character used in your profile.",
    skin: "Skin",
    hair: "Hair",
    shirt: "Top",
    bg: "Background",
    colorSelect: "color option",
    infoTitle: "Basic info",
    infoDesc: "Edit the name shown to your teammates.",
    name: "Name",
    email: "Email",
    noEmail: "No email info",
    passwordTitle: "Password",
    passwordDesc: "Leave these fields empty if you do not want to change your password.",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    workspace: "My workspace",
    save: "Save",
    saving: "Saving...",
    saved: "Profile settings saved.",
    nameRequired: "Please enter your name.",
    passwordRequired: "Fill in all password fields to change your password.",
    passwordLength: "New password must be at least 8 characters.",
    passwordMismatch: "Password confirmation does not match.",
    saveFailed: "Failed to save.",
  },
  zh: {
    back: "返回",
    eyebrow: "账号设置",
    title: "个人信息设置",
    desc: "管理登录信息和账号显示名称。",
    displayName: "显示名称",
    role: "账号角色",
    joined: "加入日期",
    professor: "教授",
    student: "学生",
    themeTitle: "显示模式",
    themeDesc: "选择工作界面的亮度。",
    light: "浅色",
    dark: "深色",
    languageTitle: "语言",
    languageDesc: "选择在首页和个人信息设置中使用的显示语言。",
    avatarTitle: "像素学生头像",
    avatarDesc: "自定义个人资料中使用的学生角色。",
    skin: "肤色",
    hair: "头发",
    shirt: "上衣",
    bg: "背景",
    colorSelect: "颜色选择",
    infoTitle: "基本信息",
    infoDesc: "修改显示给团队成员的名称。",
    name: "名称",
    email: "邮箱",
    noEmail: "无邮箱信息",
    passwordTitle: "密码",
    passwordDesc: "如果不修改密码，请留空以下项目。",
    currentPassword: "当前密码",
    newPassword: "新密码",
    confirmPassword: "确认新密码",
    workspace: "我的工作区",
    save: "保存",
    saving: "保存中...",
    saved: "个人信息已保存。",
    nameRequired: "请输入名称。",
    passwordRequired: "修改密码时请填写所有密码项目。",
    passwordLength: "新密码至少需要 8 个字符。",
    passwordMismatch: "新密码确认不一致。",
    saveFailed: "保存失败。",
  },
  ja: {
    back: "戻る",
    eyebrow: "アカウント設定",
    title: "個人情報設定",
    desc: "ログイン情報と表示名を管理します。",
    displayName: "表示名",
    role: "アカウント権限",
    joined: "登録日",
    professor: "教授",
    student: "学生",
    themeTitle: "表示モード",
    themeDesc: "作業画面の明るさを選択します。",
    light: "ライト",
    dark: "ダーク",
    languageTitle: "言語",
    languageDesc: "ランディングページと個人情報設定で使う表示言語を選びます。",
    avatarTitle: "ピクセル学生アバター",
    avatarDesc: "プロフィールで使う学生キャラクターをカスタマイズします。",
    skin: "肌",
    hair: "髪",
    shirt: "トップ",
    bg: "背景",
    colorSelect: "色を選択",
    infoTitle: "基本情報",
    infoDesc: "チームメンバーに表示される名前を編集できます。",
    name: "名前",
    email: "メール",
    noEmail: "メール情報なし",
    passwordTitle: "パスワード",
    passwordDesc: "変更しない場合は下の項目を空欄にしてください。",
    currentPassword: "現在のパスワード",
    newPassword: "新しいパスワード",
    confirmPassword: "新しいパスワード確認",
    workspace: "マイワークスペース",
    save: "保存",
    saving: "保存中...",
    saved: "個人情報を保存しました。",
    nameRequired: "名前を入力してください。",
    passwordRequired: "パスワード変更にはすべての項目を入力してください。",
    passwordLength: "新しいパスワードは 8 文字以上にしてください。",
    passwordMismatch: "パスワード確認が一致しません。",
    saveFailed: "保存に失敗しました。",
  },
  ru: {
    back: "Назад",
    eyebrow: "НАСТРОЙКИ АККАУНТА",
    title: "Настройки профиля",
    desc: "Управляйте данными входа и отображаемым именем.",
    displayName: "Отображаемое имя",
    role: "Роль аккаунта",
    joined: "Дата регистрации",
    professor: "Профессор",
    student: "Студент",
    themeTitle: "Режим экрана",
    themeDesc: "Выберите яркость рабочего интерфейса.",
    light: "Светлый",
    dark: "Темный",
    languageTitle: "Язык",
    languageDesc: "Выберите язык для лендинга и настроек профиля.",
    avatarTitle: "Пиксельный аватар студента",
    avatarDesc: "Настройте персонажа для своего профиля.",
    skin: "Кожа",
    hair: "Волосы",
    shirt: "Верх",
    bg: "Фон",
    colorSelect: "выбор цвета",
    infoTitle: "Основная информация",
    infoDesc: "Измените имя, которое видят участники команды.",
    name: "Имя",
    email: "Email",
    noEmail: "Нет email",
    passwordTitle: "Пароль",
    passwordDesc: "Оставьте поля пустыми, если не хотите менять пароль.",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    confirmPassword: "Подтвердите пароль",
    workspace: "Мой workspace",
    save: "Сохранить",
    saving: "Сохранение...",
    saved: "Настройки профиля сохранены.",
    nameRequired: "Введите имя.",
    passwordRequired: "Для смены пароля заполните все поля.",
    passwordLength: "Новый пароль должен быть не короче 8 символов.",
    passwordMismatch: "Подтверждение пароля не совпадает.",
    saveFailed: "Не удалось сохранить.",
  },
  de: {
    back: "Zurück",
    eyebrow: "KONTOEINSTELLUNGEN",
    title: "Profileinstellungen",
    desc: "Verwalte Login-Daten und Anzeigenamen.",
    displayName: "Anzeigename",
    role: "Kontorolle",
    joined: "Beitrittsdatum",
    professor: "Professor",
    student: "Student",
    themeTitle: "Anzeigemodus",
    themeDesc: "Wähle die Helligkeit deiner Arbeitsoberfläche.",
    light: "Hell",
    dark: "Dunkel",
    languageTitle: "Sprache",
    languageDesc: "Wähle die Sprache für Landingpage und Profileinstellungen.",
    avatarTitle: "Pixel-Studentenavatar",
    avatarDesc: "Passe den Charakter an, der in deinem Profil verwendet wird.",
    skin: "Haut",
    hair: "Haare",
    shirt: "Oberteil",
    bg: "Hintergrund",
    colorSelect: "Farbe auswählen",
    infoTitle: "Basisdaten",
    infoDesc: "Bearbeite den Namen, den Teammitglieder sehen.",
    name: "Name",
    email: "E-Mail",
    noEmail: "Keine E-Mail-Info",
    passwordTitle: "Passwort",
    passwordDesc: "Lass die Felder leer, wenn du dein Passwort nicht ändern möchtest.",
    currentPassword: "Aktuelles Passwort",
    newPassword: "Neues Passwort",
    confirmPassword: "Passwort bestätigen",
    workspace: "Mein Workspace",
    save: "Speichern",
    saving: "Speichern...",
    saved: "Profileinstellungen gespeichert.",
    nameRequired: "Bitte gib deinen Namen ein.",
    passwordRequired: "Fülle alle Passwortfelder aus, um das Passwort zu ändern.",
    passwordLength: "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
    passwordMismatch: "Die Passwortbestätigung stimmt nicht überein.",
    saveFailed: "Speichern fehlgeschlagen.",
  },
} satisfies Record<AppLanguage, ProfileCopy>;

export default function ProfileSettings() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId") ?? "";
  const fallbackName = localStorage.getItem("userName") ?? "사용자";
  const fallbackRole = localStorage.getItem("role") ?? "STUDENT";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState(fallbackName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatar, setAvatar] = useState<AvatarConfig>(() => getStoredAvatar(userId));
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme());
  const [language, setLanguage] = useState<AppLanguage>(() => getStoredLanguage());
  const copy = profileCopy[language];
  const selectedLanguage = getLanguageMeta(language);

  useEffect(() => {
    if (!userId) return;
    client.get(`/users/${userId}`)
      .then((res) => {
        const data = res.data.data as UserProfile;
        setProfile(data);
        setName(data.name ?? fallbackName);
      })
      .catch(() => {
        setProfile({
          userId,
          name: fallbackName,
          email: "",
          role: fallbackRole,
        });
      })
      .finally(() => setLoading(false));
  }, [userId, fallbackName, fallbackRole]);

  const roleLabel = useMemo(() => {
    const role = profile?.role ?? fallbackRole;
    if (role === "PROFESSOR") return copy.professor;
    return copy.student;
  }, [profile?.role, fallbackRole, copy.professor, copy.student]);

  const joinedDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-";
  const hasPasswordInput = currentPassword || newPassword || confirmPassword;

  const handleThemeChange = (nextTheme: AppTheme) => {
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    saveLanguage(nextLanguage);
  };

  const handleAvatarChange = (nextAvatar: AvatarConfig) => {
    setAvatar(nextAvatar);
    if (!userId) return;
    localStorage.setItem(`pixel_avatar_${userId}`, JSON.stringify(nextAvatar));
    window.dispatchEvent(new CustomEvent("profile-avatar-change", { detail: { userId, avatar: nextAvatar } }));
  };

  const handleSave = async () => {
    setError("");
    setMessage("");

    if (!name.trim()) {
      setError(copy.nameRequired);
      return;
    }
    if (hasPasswordInput) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError(copy.passwordRequired);
        return;
      }
      if (newPassword.length < 8) {
        setError(copy.passwordLength);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(copy.passwordMismatch);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = { name: name.trim() };
      if (hasPasswordInput) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await client.patch(`/users/${userId}`, payload);
      const updated = res.data.data as UserProfile;
      setProfile(updated);
      setName(updated.name);
      localStorage.setItem("userName", updated.name);
      window.dispatchEvent(new CustomEvent("profile-name-change", { detail: { userId, name: updated.name } }));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      localStorage.setItem(`pixel_avatar_${userId}`, JSON.stringify(avatar));
      setMessage(copy.saved);
    } catch (err: any) {
      setError(err.response?.data?.message ?? copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <Header showSearch={false} />

      <main className="profile-main">
        <button className="profile-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          {copy.back}
        </button>

        <section className="profile-hero">
          <PixelAvatar config={avatar} name={name} size="lg" />
          <div>
            <p className="profile-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p>{copy.desc}</p>
          </div>
        </section>

        <section className="profile-summary-grid">
          <div className="profile-summary-item">
            <UserRound size={18} />
            <div><strong>{profile?.name ?? fallbackName}</strong><span>{copy.displayName}</span></div>
          </div>
          <div className="profile-summary-item">
            <ShieldCheck size={18} />
            <div><strong>{roleLabel}</strong><span>{copy.role}</span></div>
          </div>
          <div className="profile-summary-item">
            <IdCard size={18} />
            <div><strong>{joinedDate}</strong><span>{copy.joined}</span></div>
          </div>
        </section>

        <section className="profile-panel profile-theme-panel">
          <div className="profile-panel-head">
            <div>
              <h2>{copy.themeTitle}</h2>
              <p>{copy.themeDesc}</p>
            </div>
            {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
          </div>

          <div className="profile-theme-toggle" role="group" aria-label={copy.themeTitle}>
            <button
              type="button"
              className={`profile-theme-option ${theme === "light" ? "active" : ""}`}
              onClick={() => handleThemeChange("light")}
            >
              <Sun size={16} />
              {copy.light}
            </button>
            <button
              type="button"
              className={`profile-theme-option ${theme === "dark" ? "active" : ""}`}
              onClick={() => handleThemeChange("dark")}
            >
              <Moon size={16} />
              {copy.dark}
            </button>
          </div>
        </section>

        <section className="profile-panel profile-language-panel">
          <div className="profile-panel-head">
            <div>
              <h2>{copy.languageTitle}</h2>
              <p>{copy.languageDesc}</p>
            </div>
            <Globe2 size={20} />
          </div>

          <div className="profile-language-grid" role="group" aria-label={copy.languageTitle}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`profile-language-option ${language === lang.code ? "active" : ""}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <span className="profile-language-native">{lang.native}</span>
                <span className="profile-language-label">{lang.label}</span>
              </button>
            ))}
          </div>
          <p className="profile-language-current">{selectedLanguage.native}</p>
        </section>

        <section className="profile-panel profile-avatar-panel">
          <div className="profile-panel-head">
            <div>
              <h2>{copy.avatarTitle}</h2>
              <p>{copy.avatarDesc}</p>
            </div>
            <GraduationCap size={21} />
          </div>

          <div className="avatar-editor">
            <PixelAvatar config={avatar} name={name} size="xl" />
            <div className="avatar-controls">
              {[
                { key: "skin", label: copy.skin, icon: <UserRound size={14} /> },
                { key: "hair", label: copy.hair, icon: <Palette size={14} /> },
                { key: "shirt", label: copy.shirt, icon: <GraduationCap size={14} /> },
                { key: "bg", label: copy.bg, icon: <Palette size={14} /> },
              ].map((group) => (
                <div className="avatar-control-row" key={group.key}>
                  <span className="avatar-control-label">{group.icon}{group.label}</span>
                  <div className="avatar-swatches">
                    {AVATAR_OPTIONS[group.key as keyof typeof AVATAR_OPTIONS].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`avatar-swatch ${avatar[group.key as keyof AvatarConfig] === color ? "active" : ""}`}
                        style={{ background: color }}
                        onClick={() => handleAvatarChange({ ...avatar, [group.key]: color })}
                        aria-label={`${group.label} ${copy.colorSelect}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="profile-panel">
          <div className="profile-panel-head">
            <div>
              <h2>{copy.infoTitle}</h2>
              <p>{copy.infoDesc}</p>
            </div>
          </div>

          <label className="profile-field">
            <span>{copy.name}</span>
            <div className="profile-input-shell">
              <UserRound size={17} />
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>
          </label>

          <label className="profile-field">
            <span>{copy.email}</span>
            <div className="profile-input-shell readonly">
              <Mail size={17} />
              <input value={profile?.email ?? ""} readOnly placeholder={copy.noEmail} />
            </div>
          </label>
        </section>

        <section className="profile-panel">
          <div className="profile-panel-head">
            <div>
              <h2>{copy.passwordTitle}</h2>
              <p>{copy.passwordDesc}</p>
            </div>
            <LockKeyhole size={20} />
          </div>

          <div className="profile-password-grid">
            <label className="profile-field">
              <span>{copy.currentPassword}</span>
              <input className="profile-plain-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </label>
            <label className="profile-field">
              <span>{copy.newPassword}</span>
              <input className="profile-plain-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <label className="profile-field">
              <span>{copy.confirmPassword}</span>
              <input className="profile-plain-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </label>
          </div>
        </section>

        {(message || error) && (
          <div className={`profile-feedback ${error ? "error" : "success"}`}>
            {error ? null : <Check size={15} />}
            {error || message}
          </div>
        )}

        <div className="profile-actions">
          <button className="profile-secondary-btn" onClick={() => navigate("/workspace")}>{copy.workspace}</button>
          <button className="profile-save-btn" onClick={handleSave} disabled={saving || loading}>
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      </main>
    </div>
  );
}
