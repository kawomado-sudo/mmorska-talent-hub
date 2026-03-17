

## Problem

Dropdown recenzentów w CandidateDrawer filtruje pracowników po `auth_user_id != null`. Z 6 aktywnych pracowników w `team_members_public` tylko 1 (Dobrochna Mańkowska) ma ustawiony `auth_user_id`, dlatego widzisz tylko siebie.

## Rozwiazanie

Pokazac wszystkich aktywnych pracownikow w dropdown, niezaleznie od `auth_user_id`. Gdy pracownik bez `auth_user_id` zostanie przypisany, użyjemy jego `id` z tabeli `team_members_public`. Gdy ten pracownik zaloguje sie po raz pierwszy (trigger `handle_new_user_azure` ustawi `auth_user_id`), system automatycznie je dopasuje.

### Zmiany

#### 1. `src/components/applications/CandidateDrawer.tsx`
- Usunac filtr `auth_user_id != null` (linia 123)
- Uzyc `m.id` jako value w `SelectItem` zamiast `m.auth_user_id`
- Wyswietlic `full_name (email)` w dropdown

#### 2. `supabase/functions/hr-api/index.ts` — akcja `assign_reviewer`
- Zmiana: przyjmowac `reviewer_id` jako ID z `team_members_public` (nie `auth_user_id`)
- Lookup pracownika po `id` zamiast `auth_user_id`
- W `applications.assigned_reviewer_id` zapisywac `auth_user_id` jezeli istnieje, a jesli nie — zapisac `team_member_id` i oznaczyc do pozniejszego dopasowania
- Upsert do `hr_reviewers` po `email` zamiast `auth_user_id`

#### 3. `supabase/functions/hr-api/index.ts` — akcja `list_applications` (reviewer_only)
- Rozszerzyc filtr: sprawdzac `assigned_reviewer_id = userId` LUB sprawdzic czy team_member powiazany z `userId` jest przypisany

To zapewni ze:
- Wszyscy aktywni pracownicy sa widoczni w dropdown
- Przypisanie dziala nawet jesli pracownik jeszcze sie nie zalogowal
- Recenzent po zalogowaniu zobaczy swoje przypisane kandydatury

