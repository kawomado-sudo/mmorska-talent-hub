

## Plan: Przypisywanie recenzentów z bazy pracowników + powiadomienie email

### Co się zmienia

Obecnie rekruter przypisuje recenzenta z puli `hr_reviewers` (zarządzanej w Ustawieniach). Chcesz móc wybrać dowolnego pracownika z bazy (`team_members_public`) bezpośrednio przy przypisywaniu kandydata — i automatycznie dodać go do puli recenzentów jeśli jeszcze go tam nie ma. Dodatkowo recenzent dostaje email z powiadomieniem o przypisaniu.

### Zmiany

#### 1. `CandidateDrawer.tsx` — select z team_members zamiast hr_reviewers
- Zmiana query w reviewer select: zamiast `list_reviewers` używamy `list_team_members` (zwraca wszystkich aktywnych pracowników)
- Dzięki temu manager może wybrać dowolnego pracownika, nie tylko tych dodanych do puli

#### 2. `hr-api/index.ts` — rozszerzenie `assign_reviewer`
- Po przypisaniu recenzenta sprawdza czy pracownik jest już w `hr_reviewers` — jeśli nie, automatycznie go dodaje (upsert)
- Po pomyślnym przypisaniu wysyła email z powiadomieniem do recenzenta

#### 3. Nowa edge function `supabase/functions/send-reviewer-notification/index.ts`
- Prosta funkcja wysyłająca email do recenzenta za pomocą Lovable Email API (LOVABLE_API_KEY jest już dostępny)
- Treść: imię i nazwisko kandydata, link do aplikacji, nazwa ogłoszenia
- Wywoływana z `assign_reviewer` w `hr-api`

Alternatywnie — email można wysłać bezpośrednio z `hr-api` bez osobnej funkcji, korzystając z Resend API lub innego providera.

#### 4. Wymagana konfiguracja email
Projekt nie ma jeszcze skonfigurowanej infrastruktury email (brak domeny, brak Resend API key). Mamy dwie opcje:

**Opcja A — Resend API** (najprostsza): Dodajemy secret `RESEND_API_KEY`, wysyłamy email bezpośrednio z `hr-api` przez Resend REST API. Emails wysyłane z domeny Resend (np. `onboarding@resend.dev` na początek).

**Opcja B — Lovable Email Infrastructure**: Konfigurujemy domenę email przez Cloud → Emails, co daje pełną infrastrukturę z kolejką, retries i branding.

### Rekomendacja
Opcja A (Resend) jest najszybsza — wymaga tylko API key. Mogę poprosić o dodanie sekretu `RESEND_API_KEY` i zaimplementować wysyłkę w jednym kroku.

### Podsumowanie zmian plików
- **`CandidateDrawer.tsx`**: select z `list_team_members` zamiast `list_reviewers`
- **`hr-api/index.ts`**: `assign_reviewer` auto-dodaje do `hr_reviewers` + wywołuje wysyłkę email
- **Secret**: `RESEND_API_KEY` (do dodania)
- Opcjonalnie: osobna edge function do emaili lub inline w hr-api

