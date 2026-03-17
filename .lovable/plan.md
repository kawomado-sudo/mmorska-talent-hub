

## Problem

Tabela `hr.hr_reviewers` ma dwa problemy blokujące poprawne przypisanie recenzenta i wysyłkę emaila:

1. Kolumna `auth_user_id` ma constraint `NOT NULL` — uniemożliwia dodanie pracownika który jeszcze się nie zalogował
2. Brak `UNIQUE` constraint na kolumnie `email` — `ON CONFLICT (email)` w upsert nie działa

Przez te błędy, flow `assign_reviewer` loguje errory i pomija wysyłkę emaila (bo upsert/insert do hr_reviewers failuje, ale jest w try/catch więc nie przerywa całej funkcji — jednak email jest wysyłany dopiero po tym bloku i zależy od poprawnego lookupu member).

## Rozwiązanie

### 1. Migracja SQL na tabeli `hr.hr_reviewers`
```sql
-- Pozwól na NULL w auth_user_id
ALTER TABLE hr.hr_reviewers ALTER COLUMN auth_user_id DROP NOT NULL;

-- Dodaj unique constraint na email (potrzebny dla ON CONFLICT)
ALTER TABLE hr.hr_reviewers ADD CONSTRAINT hr_reviewers_email_unique UNIQUE (email);
```

### 2. Brak zmian w Edge Function
Kod w `hr-api/index.ts` jest już poprawny — robi `ON CONFLICT (email)` i wstawia `auth_user_id: null`. Po naprawieniu constraintów w bazie, upsert zadziała i email zostanie wysłany przez Maileroo.

