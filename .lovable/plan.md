

## Analiza obecnego stanu

**Strona `/jobs` jest powiazana z tabelą `hr.jobs`** -- ale schemat `hr` nie istnieje w Supabase. Tabele `hr.jobs`, `hr.applications`, `hr.application_status_log`, `hr.form_config` i `hr.hr_user_access` nie zostaly jeszcze utworzone. Klient Supabase (`supabase`) jest skonfigurowany na `schema: 'hr'`, wiec wszystkie zapytania trafiaja w pustkę.

Takze nie ma bucketa storage na pliki CV.

## Plan implementacji

### 1. Utworzenie schematu `hr` i tabel w Supabase

Migracja SQL tworząca:
- `CREATE SCHEMA IF NOT EXISTS hr;`
- Dodanie `hr` do exposed schemas (wymaga ręcznej konfiguracji w Supabase Dashboard)
- `hr.jobs` — id (uuid PK), title, department, description, responsibilities (text[]), requirements (text[]), status (text, default 'draft'), created_by (uuid), created_at, published_at, closed_at
- `hr.applications` — id (uuid PK), job_id (FK -> hr.jobs), first_name, last_name, email, phone, cover_letter, cv_url, cv_link, status (text, default 'new'), ai_summary, ai_rating (integer, 0-100), recruiter_notes, reviewed_by, reviewed_at, created_at, updated_at
- `hr.application_status_log` — id, application_id (FK), old_status, new_status, changed_by, changed_at, note
- `hr.form_config` — id, key (unique), value, updated_at
- RLS policies (authenticated users full CRUD)
- Storage bucket `hr-cvs` do uploadowania plików CV

### 2. Przebudowa `/jobs` na dashboard z kafelkami

Zamiast tabeli — grid kafelków (Card) z:
- Nazwa stanowiska (title)
- Dział (department)
- Badge statusu (draft/active/closed) z kolorami
- Liczba kandydatur
- Data utworzenia
- Przycisk edycji/usunięcia
- Kliknięcie kafelka → `/jobs/:id/applications`

Tylko ogłoszenia z `status = 'active'` wyświetlane domyślnie, z filtrem na inne statusy.

### 3. Przebudowa `/jobs/:id/applications` — upload CV z AI

Dodanie strefy drag & drop / przycisku uploadu pliku PDF:
- Plik trafia do bucketa `hr-cvs` w Supabase Storage
- Po uploadzie → wywołanie edge function `parse-cv` (Gemini API)
- Edge function:
  - Pobiera PDF z storage
  - Wysyła do Google Gemini API z promptem: "Wyciągnij dane kandydata (imię, nazwisko, email, telefon) i oceń dopasowanie do stanowiska [opis z hr.jobs] w skali 0-100"
  - Zwraca JSON: `{ first_name, last_name, email, phone, ai_summary, ai_rating }`
- Tworzenie nowego rekordu w `hr.applications` z wyciągniętymi danymi
- Wyświetlenie ratingu dopasowania jako badge/progress bar na liście

### 4. Edge function `parse-cv`

```text
supabase/functions/parse-cv/index.ts
```

- Przyjmuje: `{ job_id, cv_storage_path }`
- Pobiera opis stanowiska z `hr.jobs`
- Pobiera plik PDF z storage
- Wysyła do Gemini API (klucz użytkownika przechowywany w Supabase Secrets)
- Zwraca sparsowane dane + rating
- Tworzy rekord w `hr.applications`

### 5. Klucz Gemini API

Użytkownik posiada własny klucz Google Gemini. Trzeba go dodać jako secret `GOOGLE_GEMINI_API_KEY` w Supabase.

### Szczegóły techniczne

- **Schemat hr** — musi być dodany do Exposed Schemas w Supabase Dashboard ręcznie
- **Klient Supabase** — `supabase` (schema: 'hr') do tabel HR, `supabaseAuth` do auth — bez zmian
- **Upload CV** — react-dropzone lub natywny input type=file, upload do `hr-cvs` bucket
- **Gemini API** — wywoływana przez edge function, nie z frontendu (bezpieczeństwo klucza)
- **Rating AI** — nowa kolumna `ai_rating` (integer) w `hr.applications`

