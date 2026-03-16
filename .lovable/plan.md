

## Plan: Logo → Tekst + Kontrola dostępu

### 1. Logo → "MMorska Talent Hub"

**`src/components/AppLayout.tsx`**:
- Usunąć import `morskaLogo` i tag `<img>`
- Wstawić `<span className="font-heading text-lg font-bold">MMorska Talent Hub</span>`

**`src/pages/Login.tsx`**:
- Usunąć import `morskaLogo` i tag `<img>`
- Wstawić `<h1 className="font-heading text-2xl font-bold">MMorska Talent Hub</h1>`

### 2. Kontrola dostępu — hardcoded admin emails

**`src/contexts/AuthContext.tsx`**:
- Dodać stałą `ADMIN_EMAILS = ['support@mmorska.pl', 'dobrochna.mankowska@mmorska.pl']`
- W `loadProfile`: jeśli email jest na liście ADMIN_EMAILS → rola `admin`, `isAdmin = true`, `has_hr_access = true`
- Jeśli email NIE jest na liście → sprawdzić czy jest recenzentem (`check_is_reviewer`). Jeśli tak → rola `reviewer`, widzi tylko przypisane kandydatury. Jeśli nie → rola `viewer`, `has_hr_access = false`
- Usunąć sprawdzanie `hr_user_access` z Supabase (zastępujemy hardcoded listą)

**`src/components/ProtectedRoute.tsx`**:
- Dodać sprawdzenie `profile.has_hr_access` — jeśli `false`, przekieruj na stronę "Brak dostępu" lub wyświetl komunikat

**`src/pages/Jobs.tsx`**:
- Recenzent nie powinien widzieć przycisków tworzenia/edycji/usuwania ogłoszeń — dodać warunek `isAdmin`
- Recenzent widzi listę ogłoszeń ale bez akcji zarządzania

**`src/pages/Applications.tsx`**:
- Recenzent: ukryty upload CV (już zaimplementowane), widzi tylko przypisane kandydatury (już zaimplementowane via `reviewer_only` flag)

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `AppLayout.tsx` | Logo → tekst "MMorska Talent Hub" |
| `Login.tsx` | Logo → tekst "MMorska Talent Hub" |
| `AuthContext.tsx` | Hardcoded admin emails, uproszczona logika ról |
| `ProtectedRoute.tsx` | Blokada dostępu dla użytkowników bez `has_hr_access` |
| `Jobs.tsx` | Ukrycie przycisków zarządzania dla recenzentów |

