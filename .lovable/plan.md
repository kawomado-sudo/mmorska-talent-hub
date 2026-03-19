

## Plan: Kolumna recenzenta (inicjały) + weryfikacja zapisu recenzji

### Co robimy

1. **Dodanie kolumny "Recenzent" w tabeli kandydatur** — wyświetla inicjały przypisanego recenzenta (np. "JK" dla Jan Kowalski).
2. **Weryfikacja flow zapisu recenzji** — upewnienie się, że `submit_review` poprawnie zapisuje dane.

### Zmiany

#### 1. Edge Function `supabase/functions/hr-api/index.ts` — `list_applications`

Aktualnie `list_applications` zwraca surowe dane z `hr.applications`, w tym `assigned_reviewer_id`, ale **nie rozwiązuje go na imię/nazwisko**. Trzeba:

- Po pobraniu aplikacji, zebrać unikalne `assigned_reviewer_id`.
- Pobrać odpowiadające rekordy z `team_members_public` (po `id` i `auth_user_id`).
- Dołączyć do każdej aplikacji pole `reviewer_name` z pełnym imieniem recenzenta.

#### 2. `src/pages/Applications.tsx`

- Dodać kolumnę **"Recenzent"** w nagłówku tabeli (po "Status", przed "Dopasowanie AI").
- Wyświetlać inicjały z `reviewer_name` (np. "Jan Kowalski" → "JK") w okrągłym badge/avatar.
- Jeśli brak recenzenta — wyświetlić "—".
- Zaktualizować `colSpan` w pustym wierszu.

#### 3. Weryfikacja zapisu recenzji

`submit_review` zapisuje do `hr.applications`:
- `status` → `accepted` lub `rejected`
- `recruiter_notes` → notatka recenzenta
- `reviewed_by` → UUID recenzenta
- `reviewed_at` → timestamp

Oraz do `hr.application_status_log`:
- `old_status`, `new_status`, `changed_by`

To wygląda poprawnie — dane trafiają do tych dwóch tabel w schemacie `hr`.

### Szczegóły techniczne

**Generowanie inicjałów:**
```typescript
const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};
```

**Rozszerzenie `list_applications` — mapowanie recenzentów:**
```typescript
// Po pobraniu data z applications:
const reviewerIds = [...new Set(data.filter(a => a.assigned_reviewer_id).map(a => a.assigned_reviewer_id))];
// Pobierz nazwy z team_members_public
// Dołącz reviewer_name do każdego rekordu
```

