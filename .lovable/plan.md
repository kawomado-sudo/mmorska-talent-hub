

## Workflow: Przypisanie kandydata do recenzenta

### Opis procesu
1. Admin w Ustawieniach zarządza pulą recenzentów (pracowników z `team_members_public` którzy mogą oceniać kandydatów)
2. Rekruter przy zmianie statusu na "W ocenie" wybiera recenzenta z listy
3. Recenzent loguje się do tej samej aplikacji, ale widzi **tylko przypisane do niego** kandydatury
4. Recenzent akceptuje → status zmienia się na "accepted", odrzuca → "rejected"

### Zmiany w bazie danych

#### 1. Tabela `hr.hr_reviewers` — pula recenzentów
```sql
CREATE TABLE hr.hr_reviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (auth_user_id)
);
```

#### 2. Kolumna `assigned_reviewer_id` w `hr.applications`
```sql
ALTER TABLE hr.applications 
  ADD COLUMN assigned_reviewer_id uuid REFERENCES auth.users(id);
```

### Zmiany w Edge Function `hr-api`

Nowe akcje:
- `list_reviewers` — zwraca aktywnych recenzentów (do selecta)
- `add_reviewer` / `remove_reviewer` — zarządzanie pulą (admin)
- `list_my_reviews` — zwraca kandydatury przypisane do zalogowanego użytkownika (dla recenzenta)
- `assign_reviewer` — przypisanie recenzenta do kandydatury (zmiana statusu na "reviewing" + ustawienie `assigned_reviewer_id`)

Modyfikacja `list_applications` — jeśli użytkownik jest recenzentem (nie adminem/managerem), filtrować wyniki po `assigned_reviewer_id = userId`.

### Zmiany w UI

#### 1. Strona `/settings` — sekcja "Recenzenci"
- Lista aktywnych recenzentów (imię, email, przycisk usuń)
- Select z pracownikami z `team_members_public` + przycisk "Dodaj"

#### 2. `CandidateDrawer.tsx` — przypisanie recenzenta
- Przy kliknięciu "W ocenie" pojawia się select z listą recenzentów
- Po wyborze → `assign_reviewer` (update status + assigned_reviewer_id + log)

#### 3. Widok recenzenta
- Recenzent widzi ten sam layout, ale `list_applications` zwraca mu tylko przypisane kandydatury
- W drawerze widzi tylko przyciski "Akceptuj" i "Odrzuć" (bez pełnego zestawu statusów)
- Sidebar: recenzent widzi tylko "Ogłoszenia" (bez "Ustawienia")

#### 4. `AppLayout.tsx` — warunkowy sidebar
- Sprawdzenie roli z `AuthContext`: admin/manager widzi Ustawienia, recenzent nie

#### 5. `AuthContext.tsx` — rozpoznawanie recenzenta
- `loadProfile` sprawdza też `hr.hr_reviewers` — jeśli user jest recenzentem, ustawia `role: 'reviewer'`

### Podsumowanie zmian plików
- **Migracja SQL**: tabela `hr.hr_reviewers`, kolumna `assigned_reviewer_id`
- **`hr-api/index.ts`**: 5 nowych akcji
- **`SettingsPage.tsx`**: sekcja zarządzania recenzentami
- **`CandidateDrawer.tsx`**: select recenzenta przy "W ocenie"
- **`Applications.tsx`**: filtrowanie dla recenzenta
- **`AppLayout.tsx`**: warunkowy sidebar
- **`AuthContext.tsx`**: wykrywanie roli recenzenta

