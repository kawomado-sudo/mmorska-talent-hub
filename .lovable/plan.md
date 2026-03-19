

## Plan: Zapobieganie duplikatom + usuwanie kandydatów (RODO)

### Zmiany

#### 1. Edge Function `supabase/functions/parse-cv/index.ts` — sprawdzanie duplikatów

Przed insertem do `hr.applications` sprawdzić, czy kandydat o tym samym emailu (lub imię+nazwisko jeśli brak emaila) już istnieje dla danego `job_id`. Jeśli tak — zwrócić błąd 409 z komunikatem "Kandydat z tym adresem email już aplikował na to stanowisko".

#### 2. Edge Function `supabase/functions/hr-api/index.ts` — nowa akcja `delete_application`

Nowa akcja, która:
- Pobiera aplikację po ID (w tym `cv_url`)
- Usuwa plik CV z bucketu `hr-cv` (jeśli istnieje)
- Usuwa powiązane wpisy z `hr.application_status_log`
- Usuwa rekord z `hr.applications`
- Zwraca `{ ok: true }`

Dostępna tylko dla adminów/managerów (nie recenzentów).

#### 3. UI `src/pages/Applications.tsx` — przycisk usunięcia

Dodać ikonę kosza (Trash2) w każdym wierszu tabeli (widoczną tylko dla nie-recenzentów). Po kliknięciu — dialog potwierdzenia z informacją RODO ("Dane kandydata zostaną trwale usunięte zgodnie z RODO"). Po potwierdzeniu — wywołanie `delete_application`.

#### 4. UI `src/components/applications/CandidateDrawer.tsx` — przycisk usunięcia w drawerze

Dodać przycisk "Usuń kandydaturę" na dole drawera (tylko admin). Dialog potwierdzenia jak wyżej.

### Szczegóły techniczne

**Duplikaty — logika w parse-cv:**
```typescript
// Przed insertem:
const { data: existing } = await supabase
  .from("applications")
  .select("id")
  .eq("job_id", job_id)
  .eq("email", parsed.email)
  .maybeSingle();
if (existing) return error 409 "Duplikat"
```

**Usuwanie — cascade:**
```
1. DELETE FROM hr.application_status_log WHERE application_id = X
2. DELETE FROM hr.applications WHERE id = X
3. supabase.storage.from('hr-cv').remove([cv_url])
```

