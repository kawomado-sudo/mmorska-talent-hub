

## Plan: Naprawa widoku recenzenta + status "U recenzenta" + notyfikacja email

### Problemy do rozwiązania

1. **Recenzent nie widzi kandydatów** — `check_is_reviewer` szuka tylko po `auth_user_id` w `hr_reviewers`, ale przy przypisywaniu recenzenta `auth_user_id` może być NULL (pracownik jeszcze się nie logował). Po zalogowaniu, dopasowanie nie następuje. Trzeba szukać też po emailu.
2. **Status po przypisaniu** — ma być "U recenzenta" zamiast "W ocenie".
3. **Recenzent musi zostawić notatkę i zmienić status** — obecnie notatki i status to osobne akcje. Recenzent powinien móc zapisać wszystko jednym przyciskiem.
4. **Email do admina po recenzji** — brak powiadomienia gdy recenzent zakończy ocenę.

### Zmiany

#### 1. Edge Function `supabase/functions/hr-api/index.ts`

- **`check_is_reviewer`**: Dodać sprawdzenie po emailu — pobrać email użytkownika z `team_members_public` i dopasować do `hr_reviewers.email`.
- **`assign_reviewer`**: Zmienić status z `"reviewing"` na `"reviewing"` (bez zmian w bazie), ale zmienić etykietę w UI.
- **`list_applications`** (reviewer filter): Dodać dopasowanie po emailu oprócz ID — pobrać email z `team_members_public`, znaleźć odpowiedni `hr_reviewers` rekord, i filtrować `assigned_reviewer_id` po obu wartościach (auth_user_id i team_member_id).
- **Nowa akcja `submit_review`**: Przyjmuje `application_id`, `status` (accepted/rejected), `notes`. Atomowo aktualizuje status + notatki, loguje zmianę statusu, wysyła email do adminów (ADMIN_EMAILS) z informacją o decyzji recenzenta.

#### 2. `src/pages/Applications.tsx`

- Zmienić etykietę statusu `reviewing` z "W ocenie" na "U recenzenta" (zarówno w filtrach jak i w badge).

#### 3. `src/components/applications/CandidateDrawer.tsx`

- Dla recenzenta: dodać pole notatki + przyciski Akceptuj/Odrzuć w jednym bloku. Kliknięcie przycisku wysyła `submit_review` (notatki + status razem).
- Po zatwierdzeniu: toast + zamknięcie drawera.

#### 4. `src/contexts/AuthContext.tsx`

- W `check_is_reviewer` fallback: jeśli nie znaleziono po `auth_user_id`, sprawdzić po emailu (ta logika przeniesiona do edge function).

### Szczegóły techniczne

**`check_is_reviewer` — nowa logika:**
```
1. Szukaj w hr_reviewers po auth_user_id
2. Jeśli brak → pobierz email z team_members_public po auth_user_id
3. Szukaj w hr_reviewers po email
4. Jeśli znaleziono → zaktualizuj auth_user_id w hr_reviewers (auto-link)
```

**`submit_review` — flow:**
```
1. Pobierz aplikację (stary status, dane kandydata, job_id)
2. UPDATE applications: status, recruiter_notes, reviewed_by, reviewed_at
3. INSERT application_status_log
4. Pobierz dane recenzenta (full_name)
5. Pobierz tytuł stanowiska
6. Wyślij email do ADMIN_EMAILS via Maileroo z informacją:
   - Kto ocenił (recenzent)
   - Jakiego kandydata (zamaskowane imię)
   - Jaka decyzja (accepted/rejected)
   - Notatka recenzenta
```

**Zmiana etykiety statusu:** Tylko w UI — wartość w bazie pozostaje `"reviewing"`, ale wyświetla się jako "U recenzenta".

