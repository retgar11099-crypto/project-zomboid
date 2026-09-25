import { useEffect, useRef, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVER_IP = 'play.mantani.gg'
const SERVER_PORT = '16261'
const LS_USERS = 'mantani_users'
const LS_SESSION = 'mantani_session'
const LS_NEWS = 'mantani_news'
const LS_PROFILES = 'mantani_profiles'

// ─── Types ────────────────────────────────────────────────────────────────────
type User = { username: string; password: string; joinDate: string }
type Profile = { avatar: string; bio: string }
type NewsItem = { id: string; title: string; body: string; date: string; author: string; authorAvatar?: string }

// ─── Storage ──────────────────────────────────────────────────────────────────
const load = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
const save = (key: string, val: unknown) => localStorage.setItem(key, JSON.stringify(val))

const loadUsers = (): User[] => load(LS_USERS, [])
const saveUsers = (u: User[]) => save(LS_USERS, u)
const loadSession = (): string | null => {
  const username = localStorage.getItem(LS_SESSION)
  if (username && loadUsers().some(user => user.username === username)) return username
  localStorage.removeItem(LS_SESSION)
  return null
}
const saveSession = (u: string | null) => u ? localStorage.setItem(LS_SESSION, u) : localStorage.removeItem(LS_SESSION)
const loadNews = (): NewsItem[] => load(LS_NEWS, [])
const loadProfiles = (): Record<string, Profile> => load(LS_PROFILES, {})
const saveProfiles = (p: Record<string, Profile>) => save(LS_PROFILES, p)

function getProfile(username: string): Profile {
  return loadProfiles()[username] ?? { avatar: '', bio: '' }
}
function setProfile(username: string, p: Profile) {
  const all = loadProfiles()
  all[username] = p
  saveProfiles(all)
}

// ─── Clocks ───────────────────────────────────────────────────────────────────
function getMskTime() {
  return new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function useMskClock() {
  const [t, setT] = useState(getMskTime)
  useEffect(() => { const id = setInterval(() => setT(getMskTime()), 1000); return () => clearInterval(id) }, [])
  return t
}
function useGameClock() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(id) }, [])
  return `${String(Math.floor((tick / 6) % 24)).padStart(2, '0')}:${String((tick * 10) % 60).padStart(2, '0')}`
}

// ─── Static data ──────────────────────────────────────────────────────────────
const features = [
  { tag: '01', title: 'Хардкорный лут', body: 'Экстремально редкие припасы, замедленный респавн, ускоренная эрозия. Каждая консерва — это решение остаться в живых или пойти дальше.' },
  { tag: '02', title: 'Живая экономика', body: 'Торговые аванпосты игроков, валюта на крышках, чёрный рынок оружия. Репутация решает, откроют ли тебе ворота.' },
  { tag: '03', title: 'Фракции и войны', body: 'Захват территорий, осады баз, дипломатия и предательство. Администрация не вмешивается — выживает сильнейший.' },
  { tag: '04', title: 'Кастомная орда', body: 'Мигрирующие толпы, сирены, метеоусловия ломают маршруты. Спринтеры выходят только ночью. Спать хочется всем.' },
]
const mods = {
  Геймплей: [['Brita’s Armor & Weapons', 'Арсенал'], ['Superb Survivors', 'NPC-выжившие'], ['Fear the Rain', 'Кислотный дождь'], ['Expanded Helicopter Events', 'События']],
  Транспорт: [['Filibuster’s Vehicles', '40+ машин'], ['Autotsar Tankcrafting', 'Броневики'], ['Working Bicycles', 'Велосипеды'], ['Fuel Side Indicator', 'QoL']],
  Карты: [['Bedford Falls', 'Мегаполис'], ['Raven Creek', 'Тёмный город'], ['Grapeseed', 'Ферма'], ['Eerie Country', 'Глушь']],
  Интерфейс: [['Common Sense', 'Взаимодействие'], ['Simple Overhaul: Traits', 'Черты'], ['Cryogenic Storage', 'Респ базы'], ['Change Sandbox Options', 'Тонкая настройка']],
} as const
const rules = [
  { q: 'Никакого читерства и эксплойтов', a: 'Использование сторонних программ, дюп предметов и абуз багов карается перманентным баном без предупреждения.' },
  { q: 'RP-конфликт разрешён, токсичность — нет', a: 'Грабь, воюй, предавай в рамках игры. Но оскорбления, дискриминация и травля в общих каналах = мут, затем бан.' },
  { q: 'Спам-базы под запретом', a: 'Возведение стен ради лагов сервера и захват спавн-зон запрещены. Администрация вправе снести объект без компенсации.' },
  { q: 'Один аккаунт — один игрок', a: 'Альт-аккаунты для шпионажа за фракциями и обхода банов ведут к блокировке всех связанных профилей.' },
]

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({ src, username, size = 40, className = '' }: { src: string; username: string; size?: number; className?: string }) {
  if (src) return <img src={src} alt={username} style={{ width: size, height: size }} className={`object-cover ${className}`} />
  const initial = username[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ width: size, height: size }} className={`grid place-items-center bg-[#1d2013] font-display text-[var(--hazard)] ${className}`}>
      {initial}
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'register'
function AuthModal({ onClose, onAuth }: { onClose: () => void; onAuth: (u: string) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const u = username.trim(); const p = password
    if (!u || !p) { setError('Заполни все поля'); return }
    if (mode === 'login') {
      const found = loadUsers().find(x => x.username.toLowerCase() === u.toLowerCase() && x.password === p)
      if (!found) { setError('Неверный логин или пароль'); return }
      onAuth(found.username)
    } else {
      if (u.length < 3) { setError('Логин минимум 3 символа'); return }
      if (p.length < 6) { setError('Пароль минимум 6 символов'); return }
      const users = loadUsers()
      if (users.find(x => x.username.toLowerCase() === u.toLowerCase())) { setError('Логин уже занят'); return }
      const joinDate = new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' })
      users.push({ username: u, password: p, joinDate })
      saveUsers(users)
      onAuth(u)
    }
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={e => { if (e.target === overlayRef.current) onClose() }}>
      <div className="w-full max-w-sm border border-[var(--line)] bg-[#0e100b]">
        <div className="hazard-tape h-1.5 w-full" />
        <div className="p-7">
          <div className="mb-5 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--bone-dim)]">{mode === 'login' ? '// авторизация' : '// регистрация'}</span>
            <button onClick={onClose} className="font-mono text-lg text-[var(--bone-dim)] hover:text-[var(--bone)]">×</button>
          </div>
          <div className="mb-5 flex gap-px border border-[var(--line)] bg-[var(--line)]">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} className={`flex-1 py-2 font-cond text-xs font-600 uppercase tracking-[0.2em] transition-colors ${mode === m ? 'bg-[var(--hazard)] text-[#0b0d09]' : 'bg-[#12140d] text-[var(--bone-dim)] hover:text-[var(--bone)]'}`}>
                {m === 'login' ? 'Войти' : 'Регистрация'}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Логин" autoComplete="username"
              className="w-full border border-[var(--line)] bg-[#12140d] px-4 py-3 font-mono text-sm text-[var(--bone)] placeholder-[var(--bone-dim)] outline-none focus:border-[var(--hazard)]" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full border border-[var(--line)] bg-[#12140d] px-4 py-3 font-mono text-sm text-[var(--bone)] placeholder-[var(--bone-dim)] outline-none focus:border-[var(--hazard)]" />
            {error && <p className="font-mono text-[11px] text-[var(--rust)]">⚠ {error}</p>}
            <button type="submit" className="w-full border border-[var(--hazard)] bg-[var(--hazard)] py-3 font-cond text-sm font-700 uppercase tracking-[0.2em] text-[#0b0d09] transition-colors hover:bg-[#f2b452]">
              {mode === 'login' ? 'Войти в сектор' : 'Создать профиль'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Profile modal ────────────────────────────────────────────────────────────
type ProfileTab = 'info' | 'avatar' | 'password'

function ProfileModal({ username, onClose, onLogout, onProfileChange }: {
  username: string; onClose: () => void; onLogout: () => void; onProfileChange: () => void
}) {
  const [tab, setTab] = useState<ProfileTab>('info')
  const [profile, setProfileState] = useState<Profile>(() => getProfile(username))
  const overlayRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // join date
  const joinDate = loadUsers().find(u => u.username === username)?.joinDate ?? '—'

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  function saveProfileChange(p: Profile) {
    setProfileState(p)
    setProfile(username, p)
    onProfileChange()
  }

  // ── Bio form
  const [bio, setBio] = useState(profile.bio)
  const [bioSaved, setBioSaved] = useState(false)
  function saveBio() {
    saveProfileChange({ ...profile, bio })
    setBioSaved(true)
    setTimeout(() => setBioSaved(false), 1800)
  }

  // ── Avatar
  const [avatarError, setAvatarError] = useState('')
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setAvatarError('Файл слишком большой (макс. 2 МБ)'); return }
    if (!file.type.startsWith('image/')) { setAvatarError('Только изображения'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      saveProfileChange({ ...profile, avatar: result })
    }
    reader.readAsDataURL(file)
  }
  function removeAvatar() { saveProfileChange({ ...profile, avatar: '' }) }

  // ── Password
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passError, setPassError] = useState('')
  const [passSaved, setPassSaved] = useState(false)
  function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPassError('')
    if (newPass.length < 6) { setPassError('Новый пароль минимум 6 символов'); return }
    if (newPass !== confirmPass) { setPassError('Пароли не совпадают'); return }
    const users = loadUsers()
    const idx = users.findIndex(u => u.username === username)
    if (idx === -1 || users[idx].password !== oldPass) { setPassError('Неверный текущий пароль'); return }
    users[idx].password = newPass
    saveUsers(users)
    setOldPass(''); setNewPass(''); setConfirmPass('')
    setPassSaved(true)
    setTimeout(() => setPassSaved(false), 2000)
  }

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'info', label: 'Профиль' },
    { id: 'avatar', label: 'Аватар' },
    { id: 'password', label: 'Пароль' },
  ]

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={e => { if (e.target === overlayRef.current) onClose() }}>
      <div className="w-full max-w-lg border border-[var(--line)] bg-[#0e100b]">
        <div className="hazard-tape h-1.5 w-full" />

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[var(--line)] px-6 py-5">
          <Avatar src={profile.avatar} username={username} size={52} className="border border-[var(--line)]" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl uppercase text-[var(--bone)]">{username}</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--bone-dim)]">
              Присоединился: {joinDate}
            </div>
          </div>
          <button onClick={onClose} className="font-mono text-xl text-[var(--bone-dim)] hover:text-[var(--bone)]">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-px border-b border-[var(--line)] bg-[var(--line)]">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 font-cond text-xs font-600 uppercase tracking-[0.2em] transition-colors ${tab === t.id ? 'bg-[#12140d] text-[var(--hazard)]' : 'bg-[#0e100b] text-[var(--bone-dim)] hover:text-[var(--bone)]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {tab === 'info' && (
          <div className="p-6 space-y-5">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--bone-dim)]">Логин</label>
              <div className="border border-[var(--line)] bg-[#12140d] px-4 py-3 font-mono text-sm text-[var(--bone-dim)]">{username}</div>
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--bone-dim)]">Статус / О себе</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Напиши что-нибудь о себе..." rows={3}
                className="w-full border border-[var(--line)] bg-[#12140d] px-4 py-3 font-cond text-sm leading-relaxed text-[var(--bone)] placeholder-[var(--bone-dim)] outline-none focus:border-[var(--hazard)] resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveBio} className="border border-[var(--hazard)] bg-[var(--hazard)] px-5 py-2.5 font-cond text-xs font-700 uppercase tracking-[0.2em] text-[#0b0d09] hover:bg-[#f2b452] transition-colors">
                {bioSaved ? '✓ Сохранено' : 'Сохранить'}
              </button>
            </div>
            <div className="border-t border-[var(--line)] pt-5">
              <div className="grid grid-cols-2 gap-px border border-[var(--line)] bg-[var(--line)]">
                <div className="bg-[#12140d] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--bone-dim)]">Роль</div>
                  <div className="mt-1 font-cond text-sm text-[var(--bone)]">Выживший</div>
                </div>
                <div className="bg-[#12140d] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--bone-dim)]">Дата вступления</div>
                  <div className="mt-1 font-cond text-sm text-[var(--bone)]">{joinDate}</div>
                </div>
              </div>
            </div>
            <div className="border-t border-[var(--line)] pt-5">
              <button onClick={() => { onLogout(); onClose() }}
                className="w-full border border-[var(--rust)] py-2.5 font-cond text-xs font-600 uppercase tracking-[0.2em] text-[var(--rust)] hover:bg-[var(--rust)] hover:text-[var(--bone)] transition-colors">
                Выйти из аккаунта
              </button>
            </div>
          </div>
        )}

        {/* Tab: Avatar */}
        {tab === 'avatar' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <Avatar src={profile.avatar} username={username} size={120} className="border-2 border-[var(--line)]" />
                {profile.avatar && (
                  <button onClick={removeAvatar}
                    className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center border border-[var(--rust)] bg-[#0e100b] font-mono text-xs text-[var(--rust)] hover:bg-[var(--rust)] hover:text-[var(--bone)] transition-colors">
                    ×
                  </button>
                )}
              </div>
              <div className="text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--bone-dim)]">
                  {profile.avatar ? 'Загружено · нажми × чтобы удалить' : 'Аватарка не установлена'}
                </div>
              </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

            <div className="space-y-3">
              <button onClick={() => fileRef.current?.click()}
                className="w-full border border-[var(--hazard)] bg-[var(--hazard)] py-3 font-cond text-sm font-700 uppercase tracking-[0.2em] text-[#0b0d09] hover:bg-[#f2b452] transition-colors">
                {profile.avatar ? 'Заменить фото' : 'Загрузить фото'}
              </button>
              {profile.avatar && (
                <button onClick={removeAvatar}
                  className="w-full border border-[var(--line)] py-3 font-cond text-sm uppercase tracking-[0.2em] text-[var(--bone-dim)] hover:border-[var(--rust)] hover:text-[var(--rust)] transition-colors">
                  Удалить аватарку
                </button>
              )}
            </div>

            {avatarError && <p className="font-mono text-[11px] text-[var(--rust)]">⚠ {avatarError}</p>}

            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--bone-dim)]">
              Допустимые форматы: JPG, PNG, GIF, WEBP · Макс. 2 МБ
            </p>
          </div>
        )}

        {/* Tab: Password */}
        {tab === 'password' && (
          <div className="p-6">
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--bone-dim)]">Текущий пароль</label>
                <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                  className="w-full border border-[var(--line)] bg-[#12140d] px-4 py-3 font-mono text-sm text-[var(--bone)] placeholder-[var(--bone-dim)] outline-none focus:border-[var(--hazard)]" />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--bone-dim)]">Новый пароль</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Минимум 6 символов" autoComplete="new-password"
                  className="w-full border border-[var(--line)] bg-[#12140d] px-4 py-3 font-mono text-sm text-[var(--bone)] placeholder-[var(--bone-dim)] outline-none focus:border-[var(--hazard)]" />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--bone-dim)]">Повторить пароль</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Повтори новый пароль" autoComplete="new-password"
                  className="w-full border border-[var(--line)] bg-[#12140d] px-4 py-3 font-mono text-sm text-[var(--bone)] placeholder-[var(--bone-dim)] outline-none focus:border-[var(--hazard)]" />
              </div>
              {passError && <p className="font-mono text-[11px] text-[var(--rust)]">⚠ {passError}</p>}
              {passSaved && <p className="font-mono text-[11px] text-[var(--toxic)]">✓ Пароль успешно изменён</p>}

              {/* Strength indicator */}
              {newPass && (
                <div className="space-y-1">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--bone-dim)]">Надёжность</div>
                  <div className="flex gap-1">
                    {[6, 8, 12].map((len, i) => (
                      <div key={len} className={`h-1 flex-1 transition-colors ${newPass.length >= len ? ['bg-[var(--rust)]', 'bg-[var(--hazard)]', 'bg-[var(--toxic)]'][i] : 'bg-[var(--line)]'}`} />
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full border border-[var(--hazard)] bg-[var(--hazard)] py-3 font-cond text-sm font-700 uppercase tracking-[0.2em] text-[#0b0d09] hover:bg-[#f2b452] transition-colors">
                Сменить пароль
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [copied, setCopied] = useState(false)
  const [activeMod, setActiveMod] = useState<keyof typeof mods>('Геймплей')
  const [openRule, setOpenRule] = useState<number | null>(0)

  const [clockMode, setClockMode] = useState<'msk' | 'game'>('msk')
  const mskTime = useMskClock()
  const gameTime = useGameClock()
  const displayTime = clockMode === 'msk' ? mskTime : gameTime

  const [currentUser, setCurrentUser] = useState<string | null>(() => loadSession())
  const [showAuth, setShowAuth] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profileVersion, setProfileVersion] = useState(0)

  const currentProfile = currentUser ? getProfile(currentUser) : null

  const [news] = useState<NewsItem[]>(() => loadNews())

  function handleAuth(u: string) { saveSession(u); setCurrentUser(u); setShowAuth(false) }
  function handleLogout() { saveSession(null); setCurrentUser(null) }

  const copyIp = () => {
    navigator.clipboard?.writeText(`${SERVER_IP}:${SERVER_PORT}`).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="grain relative min-h-screen">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} />}
      {showProfile && currentUser && (
        <ProfileModal
          username={currentUser}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
          onProfileChange={() => setProfileVersion(v => v + 1)}
        />
      )}

      {/* ── NAV ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[#0b0d09]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center border-2 border-[var(--hazard)] text-[var(--hazard)]">
              <span className="font-display text-lg leading-none">M</span>
            </span>
            <span className="font-cond text-sm font-600 uppercase tracking-[0.35em] text-[var(--bone)]">Mantani</span>
          </a>
          <nav className="hidden items-center gap-8 font-cond text-xs uppercase tracking-[0.2em] text-[var(--bone-dim)] md:flex">
            {[['О сервере', '#about'], ['Механики', '#features'], ['Моды', '#mods'], ['Правила', '#rules'], ['Новости', '#news']].map(([l, h]) => (
              <a key={h} href={h} className="transition-colors hover:text-[var(--hazard)]">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button key={profileVersion} onClick={() => setShowProfile(true)} className="flex items-center gap-2 border border-[var(--line)] py-1.5 pl-1.5 pr-3 transition-colors hover:border-[var(--hazard)]">
                <Avatar src={currentProfile?.avatar ?? ''} username={currentUser} size={28} className="border border-[var(--line)]" />
                <span className="font-cond text-xs font-600 uppercase tracking-[0.1em] text-[var(--bone)]">
                  {currentUser}
                </span>
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="border border-[var(--line)] px-4 py-2 font-cond text-xs uppercase tracking-[0.15em] text-[var(--bone-dim)] transition-colors hover:border-[var(--bone)] hover:text-[var(--bone)]">
                Войти
              </button>
            )}
            <a href="#join" className="hazard-tape border border-[#16180f] px-4 py-2 font-cond text-xs font-700 uppercase tracking-[0.2em] text-[#0b0d09] transition-transform hover:-translate-y-0.5">
              <span className="bg-[#0b0d09] px-2 py-1 text-[var(--hazard)]">Подключиться</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section id="top" className="relative flex min-h-screen items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[#0b0d09] bg-cover bg-center" style={{ backgroundImage: "linear-gradient(180deg, rgba(11,13,9,0.55) 0%, rgba(11,13,9,0.82) 55%, #0b0d09 100%), url('https://images.unsplash.com/photo-1601654152371-0ceae53a92c7?w=1600&h=1200&fit=crop&auto=format')" }} aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,161,58,0.10),transparent_45%)]" aria-hidden />
        <div className="relative mx-auto w-full max-w-4xl px-5 py-20">
          <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--bone-dim)]">// project mantani · project zomboid</div>
          <h1 className="font-display text-[clamp(3.2rem,11vw,8.5rem)] uppercase leading-[0.85] text-[var(--bone)]">
            Project<br /><span className="flicker text-[var(--hazard)]">Mantani</span>
          </h1>
          <p className="mt-6 max-w-xl font-cond text-lg font-400 leading-relaxed text-[var(--bone-dim)]">
            Хардкорный выделенный сервер по <span className="text-[var(--bone)]">Project Zomboid</span>. Ты проснулся один. Найди своих — или стань кормом для орды.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button onClick={copyIp} className="flex items-center gap-3 border border-[var(--hazard)] bg-[var(--hazard)] px-6 py-3 font-cond text-sm font-700 uppercase tracking-[0.15em] text-[#0b0d09] transition-all hover:bg-[#f2b452]">
              <span className="font-mono">{SERVER_IP}:{SERVER_PORT}</span>
              <span className="border-l border-[#0b0d09]/40 pl-3">{copied ? 'Скопировано' : 'Копировать'}</span>
            </button>
            <a href="#join" className="border border-[var(--line)] px-6 py-3 font-cond text-sm font-600 uppercase tracking-[0.15em] text-[var(--bone)] transition-colors hover:border-[var(--bone)] hover:bg-white/5">Как зайти →</a>
          </div>
          <div className="mt-10 inline-flex items-stretch border border-[var(--line)] bg-[#12140d]/80">
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--bone-dim)]">{clockMode === 'msk' ? 'МСК' : 'Игровое'}</span>
              <span className="font-mono text-2xl tabular-nums text-[var(--hazard)]">{displayTime}</span>
            </div>
            <button onClick={() => setClockMode(m => m === 'msk' ? 'game' : 'msk')} className="border-l border-[var(--line)] px-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--bone-dim)] transition-colors hover:bg-[var(--line)] hover:text-[var(--bone)]" title="Переключить">
              {clockMode === 'msk' ? 'ИГР' : 'МСК'}
            </button>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="hazard-tape overflow-hidden border-y border-[#0b0d09] py-2" id="about">
        <div className="whitespace-nowrap font-display text-lg uppercase tracking-[0.25em] text-[#0b0d09]">
          {'Останься в живых · Собери фракцию · Не выходи ночью · '.repeat(4)}
        </div>
      </div>

      {/* ── ABOUT ── */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionLabel n="00">Досье выжившего</SectionLabel>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.9] text-[var(--bone)]">Это не сервер.<br />Это диагноз.</h2>
          </div>
          <div className="space-y-6 font-cond text-lg leading-relaxed text-[var(--bone-dim)]">
            <p><span className="text-[var(--bone)]">Mantani</span> — русскоязычный проект для тех, кому надоели «казуальные» сервера с бесконечным лутом и вечным миром. Здесь смерть окончательна, база горит от одной вылазки мародёров, а зима убивает надёжнее орды.</p>
            <p>Мы держим стабильный тик, ежедневные бэкапы и активную администрацию, которая<span className="text-[var(--hazard)]"> не</span> раздаёт предметы и не разнимает конфликты. Мир жесток и честен ко всем одинаково.</p>
            <div className="border border-[var(--line)] bg-[#12140d] p-4 text-center">
              <div className="font-display text-2xl text-[var(--bone)]">0</div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--bone-dim)]">подаренных лутбоксов</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="border-t border-[var(--line)] bg-[#0e100b]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <SectionLabel n="01">Механики выживания</SectionLabel>
          <div className="mt-10 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {features.map(f => (
              <article key={f.tag} className="group relative bg-[#12140d] p-8 transition-colors hover:bg-[#16180f]">
                <span className="font-mono text-xs text-[var(--rust)]">{f.tag}</span>
                <div className="mt-3 h-px w-10 bg-[var(--hazard)] transition-all group-hover:w-20" />
                <h3 className="mt-5 font-display text-2xl uppercase text-[var(--bone)]">{f.title}</h3>
                <p className="mt-3 font-cond text-[15px] leading-relaxed text-[var(--bone-dim)]">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODS ── */}
      <section id="mods" className="mx-auto max-w-6xl px-5 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel n="02">Модпак</SectionLabel>
            <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] uppercase leading-[0.9] text-[var(--bone)]">Установка в один клик</h2>
          </div>
          <p className="max-w-sm font-cond text-sm leading-relaxed text-[var(--bone-dim)]">Полный сборник в Steam Workshop. Подпишись на коллекцию — Steam докачает всё автоматически при входе.</p>
        </div>
        <div className="mt-10 flex flex-wrap gap-2">
          {(Object.keys(mods) as Array<keyof typeof mods>).map(cat => (
            <button key={cat} onClick={() => setActiveMod(cat)} className={`border px-5 py-2 font-cond text-xs font-600 uppercase tracking-[0.2em] transition-colors ${activeMod === cat ? 'border-[var(--hazard)] bg-[var(--hazard)] text-[#0b0d09]' : 'border-[var(--line)] text-[var(--bone-dim)] hover:border-[var(--bone)] hover:text-[var(--bone)]'}`}>{cat}</button>
          ))}
        </div>
        <div className="mt-6 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
          {mods[activeMod].map(([name, note]) => (
            <div key={name} className="flex items-center justify-between gap-4 bg-[#12140d] p-5 transition-colors hover:bg-[#1d2013]">
              <div className="flex items-center gap-3"><span className="font-mono text-[var(--toxic)]">▸</span><span className="font-cond text-base text-[var(--bone)]">{name}</span></div>
              <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--bone-dim)]">{note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── RULES ── */}
      <section id="rules" className="border-y border-[var(--line)] bg-[#0e100b]">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionLabel n="03">Кодекс сектора</SectionLabel>
            <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] uppercase leading-[0.9] text-[var(--bone)]">Четыре правила.<br />Нарушишь — вылет.</h2>
            <p className="mt-5 font-cond text-sm leading-relaxed text-[var(--bone-dim)]">Мы держим правил ровно столько, сколько нужно, чтобы игра оставалась игрой. Остальное решают выжившие между собой.</p>
          </div>
          <div className="border border-[var(--line)]">
            {rules.map((r, i) => (
              <div key={r.q} className="border-b border-[var(--line)] last:border-b-0">
                <button onClick={() => setOpenRule(openRule === i ? null : i)} className="flex w-full items-center gap-4 bg-[#12140d] px-5 py-4 text-left transition-colors hover:bg-[#16180f]">
                  <span className="font-mono text-sm text-[var(--hazard)]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 font-cond text-lg uppercase tracking-wide text-[var(--bone)]">{r.q}</span>
                  <span className={`font-display text-xl text-[var(--bone-dim)] transition-transform ${openRule === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                <div className="grid overflow-hidden transition-all duration-300" style={{ gridTemplateRows: openRule === i ? '1fr' : '0fr' }}>
                  <div className="min-h-0"><p className="bg-[#0e100b] px-5 pb-5 pl-14 pt-1 font-cond text-[15px] leading-relaxed text-[var(--bone-dim)]">{r.a}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWS ── */}
      <section id="news" className="mx-auto max-w-6xl px-5 py-24">
        <SectionLabel n="04">Сводка выживших</SectionLabel>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] uppercase leading-[0.9] text-[var(--bone)]">Новости сектора</h2>
          {!currentUser && (
            <button onClick={() => setShowAuth(true)} className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--bone-dim)] underline underline-offset-4 hover:text-[var(--hazard)]">Войди, чтобы читать</button>
          )}
        </div>

        <div className="mt-8 space-y-px">
          {news.length === 0 ? (
            <div className="border border-dashed border-[var(--line)] p-10 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--bone-dim)]">// записей нет</p>
            </div>
          ) : news.map(item => (
            <article key={item.id} className="group border border-[var(--line)] bg-[#12140d] p-6 transition-colors hover:bg-[#16180f]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Avatar src={item.authorAvatar ?? ''} username={item.author} size={24} className="border border-[var(--line)]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--hazard)]">★ {item.author}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--bone-dim)]">{item.date}</span>
                  </div>
                  <h3 className="font-display text-xl uppercase text-[var(--bone)]">{item.title}</h3>
                  <p className="mt-3 font-cond text-[15px] leading-relaxed text-[var(--bone-dim)]">{item.body}</p>
                </div>

              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── JOIN ── */}
      <section id="join" className="relative overflow-hidden border-t border-[var(--line)]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(180deg, rgba(11,13,9,0.88), rgba(11,13,9,0.94)), url('https://images.unsplash.com/photo-1641667838410-b257ca266e38?w=1600&h=1000&fit=crop&auto=format')" }} aria-hidden />
        <div className="relative mx-auto max-w-4xl px-5 py-28 text-center">
          <SectionLabel n="05" center>Развёртывание</SectionLabel>
          <h2 className="mt-5 font-display text-[clamp(2.5rem,7vw,5.5rem)] uppercase leading-[0.85] text-[var(--bone)]">Готов проснуться<br /><span className="text-[var(--hazard)]">в Ноксвилле?</span></h2>
          <ol className="mx-auto mt-12 grid max-w-2xl gap-px border border-[var(--line)] bg-[var(--line)] text-left sm:grid-cols-3">
            {[['Подпишись', 'на коллекцию модов в Steam Workshop'], ['Открой PZ', 'вкладка «Join» → «Favorites» → добавь IP'], ['Выживай', 'создай персонажа и не умри в первый день']].map(([t, d], i) => (
              <li key={t} className="bg-[#12140d] p-5">
                <div className="font-display text-3xl text-[var(--hazard)]">0{i + 1}</div>
                <div className="mt-2 font-cond text-base uppercase tracking-wide text-[var(--bone)]">{t}</div>
                <div className="mt-1 font-cond text-[13px] leading-snug text-[var(--bone-dim)]">{d}</div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button onClick={copyIp} className="flex items-center gap-3 border border-[var(--hazard)] bg-[var(--hazard)] px-7 py-4 font-cond text-base font-700 uppercase tracking-[0.15em] text-[#0b0d09] transition-all hover:bg-[#f2b452]">
              <span className="font-mono">{SERVER_IP}:{SERVER_PORT}</span>
              <span className="border-l border-[#0b0d09]/40 pl-3">{copied ? '✓ Готово' : 'Копировать IP'}</span>
            </button>
            <a href="#top" className="border border-[var(--line)] px-7 py-4 font-cond text-base font-600 uppercase tracking-[0.15em] text-[var(--bone)] transition-colors hover:border-[var(--bone)] hover:bg-white/5">Discord сообщества</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[var(--line)] bg-[#0b0d09]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center border border-[var(--hazard)] font-display text-sm text-[var(--hazard)]">M</span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--bone-dim)]">Project Mantani · PZ Server</span>
          </div>
          <p className="font-mono text-[11px] text-[var(--bone-dim)]">Не аффилирован с The Indie Stone. Build 41+ · © 2026</p>
        </div>
      </footer>
    </div>
  )
}

function SectionLabel({ n, children, center }: { n: string; children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--bone-dim)] ${center ? 'justify-center' : ''}`}>
      <span className="text-[var(--hazard)]">[{n}]</span>
      <span>{children}</span>
      <span className="h-px w-10 bg-[var(--line)]" />
    </div>
  )
}
