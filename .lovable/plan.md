

## Plan: Naprawa ładowania CV (PDF) — obsługa błędów + signed URL via Edge Function

### Diagnoza

Logi błędów zostały wyczyszczone, ale analiza kodu wskazuje na prawdopodobne przyczyny:

1. **`createSignedUrl` wywoływany klientem anon** — bucket `hr-cv` jest prywatny, a `supabase` client używa anon key. Jeśli nie ma odpowiedniej polityki RLS na storage pozwalającej authenticated users generować signed URLs, request się nie powiedzie.
2. **Brak obsługi błędów** — `.then()` bez `.catch()` powoduje ciche połykanie błędów. Użytkownik widzi puste okno bez informacji.
3. **iframe może blokować PDF** — niektóre nagłówki Content-Disposition mogą uniemożliwiać renderowanie.

### Zmiany

#### 1. Edge Function `hr-api` — nowa akcja `get_cv_signed_url`

Generowanie signed URL po stronie serwera z `service_role_key` — obchodzi problemy z RLS na storage:
- Przyjmuje `application_id`
- Pobiera `cv_url` z `hr.applications`
- Generuje signed URL z `service_role_key` (3600s)
- Zwraca `{ signed_url: "..." }`

#### 2. `CandidateDrawer.tsx` — obsługa błędów + nowa metoda pobierania URL

- Zamienić bezpośrednie `supabase.storage.createSignedUrl()` na wywołanie `hrApi('get_cv_signed_url', { application_id })`.
- Dodać `.catch()` i toast z informacją o błędzie ładowania CV.
- Dodać stan ładowania (spinner) podczas generowania URL.

#### 3. Fallback i UX

- Jeśli signed URL nie zadziała — wyświetlić komunikat "Nie udało się załadować podglądu CV" zamiast pustego iframe.
- Przycisk "Pobierz CV" jako fallback zawsze dostępny (download link).

### Szczegóły techniczne

**Nowa akcja w hr-api:**
```typescript
case "get_cv_signed_url": {
  const { data: app } = await db.from("applications").select("cv_url").eq("id", params.application_id).single();
  const storageClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data } = await storageClient.storage.from("hr-cv").createSignedUrl(app.cv_url, 3600);
  return json({ signed_url: data.signedUrl });
}
```

**W CandidateDrawer — zastąpienie:**
```typescript
// Zamiast: supabase.storage.from('hr-cv').createSignedUrl(...)
// Użyj: hrApi('get_cv_signed_url', { application_id: application.id })
```

