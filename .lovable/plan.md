

## Problem

Schema `hr` nie jest w Exposed Schemas PostgREST, wiec klient Supabase z `db: { schema: 'hr' }` nie moze odpytywac tabel `hr.jobs` ani `hr.applications` z frontendu. Tabele istnieja, ale sa niedostepne dla API REST.

## Rozwiazanie: Edge function `hr-api`

Jedna edge function `hr-api` jako proxy do schematu `hr`, uzywajaca `service_role_key`. Frontend wywoluje ja zamiast bezposrednich zapytan.

### Edge function `hr-api`

Obsluguje akcje przez parametr `action`:

| Action | Opis |
|---|---|
| `list_jobs` | SELECT * FROM hr.jobs + count applications |
| `get_job` | SELECT single job by id |
| `create_job` | INSERT INTO hr.jobs |
| `update_job` | UPDATE hr.jobs WHERE id = ... |
| `delete_job` | DELETE FROM hr.jobs WHERE id = ... |
| `list_applications` | SELECT * FROM hr.applications WHERE job_id = ... |
| `get_application` | SELECT single application by id |
| `update_application` | UPDATE hr.applications (status, notes) |

Edge function weryfikuje JWT recznie (z headera Authorization) i uzywa `service_role_key` do zapytan.

### Zmiany w frontendzie

1. **Nowy helper** `src/lib/hr-api.ts` — wrapper do wywolywania edge function:
```typescript
export async function hrApi(action: string, params?: any) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/hr-api`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  return response.json();
}
```

2. **Jobs.tsx** — zamiana `supabase.from('jobs')` na `hrApi('list_jobs')`, `hrApi('delete_job', { id })`

3. **JobFormDialog.tsx** — zamiana insert/update na `hrApi('create_job', payload)` / `hrApi('update_job', { id, ...payload })`; zamiana pol Obowiazki/Wymagania na Textarea (jeden na kazde)

4. **Applications.tsx** — zamiana `supabase.from('applications')` na `hrApi('list_applications', { job_id })`, `hrApi('get_job', { id })`

5. **CandidateDrawer.tsx** — zamiana update na `hrApi('update_application', { id, ... })`

6. **Klient supabase** — usunac klienta `supabase` (schema hr) bo nie jest juz potrzebny; zostaje `supabaseAuth` i `supabasePublic`

### Parse-cv edge function

Juz dziala poprawnie — uzywa `service_role_key` z `db: { schema: 'hr' }`, wiec nie wymaga zmian.

### Config

Dodac `hr-api` do `supabase/config.toml` z `verify_jwt = false` (weryfikacja reczna w kodzie).

