

## Plan: Naprawienie błędów TypeScript blokujących build

### Problem

Aplikacja nie buduje się z powodu błędów TypeScript. Funkcja `hrApi<T = unknown>()` domyślnie zwraca `unknown`, a wiele wywołań nie podaje parametru typu. TypeScript nie pozwala wywoływać `.filter()`, `.map()`, `.length` na typie `unknown`.

### Zmiany

#### 1. `src/contexts/AuthContext.tsx` (linia 76)

Dodać type assertion dla wyniku `hrApi('check_is_reviewer')`:
```typescript
const reviewerCheck = await hrApi<{ is_reviewer: boolean }>('check_is_reviewer');
```

#### 2. `src/pages/Applications.tsx`

Linia 159 — dodać typ `Job` do query job:
```typescript
hrApi<{ title: string }>('get_job', { id: jobId })
```

Linia 251, 257, 274, 329 — query applications zwraca `unknown`. Dodać typ:
```typescript
hrApi<any[]>('list_applications', { job_id: jobId })
```

#### 3. `src/pages/SettingsPage.tsx`

Linia 47 — `list_reviewers`:
```typescript
hrApi<any[]>('list_reviewers')
```

Linia 53 — `list_team_members`:
```typescript
hrApi<any[]>('list_team_members')
```

#### 4. `src/components/applications/CandidateDrawer.tsx`

Linia 161 — `teamMembers` z query `list_team_members` — dodać typ `any[]`:
```typescript
hrApi<any[]>('list_team_members')
```

Linia 376, 380 — `statusHistory` z query — dodać typ `any[]`:
```typescript
hrApi<any[]>('get_status_history', ...)
```

### Efekt

Po tych zmianach build przejdzie poprawnie, strona `/jobs` i reszta aplikacji załadują się bez problemów.

