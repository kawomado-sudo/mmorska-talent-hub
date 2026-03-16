

## Problem

Komponent przypisywania recenzenta istnieje w `CandidateDrawer.tsx`, ale ma dwa problemy:

1. **Ukryty flow** — panel przypisywania pojawia się dopiero po kliknięciu przycisku "W ocenie", co jest nieintuicyjne. Użytkownik nie wie, że ma tam kliknąć.

2. **Brak danych `auth_user_id`** — większość pracowników w `team_members_public` nie ma ustawionego `auth_user_id` (jest `null`). Komponent `SelectItem` używa `m.auth_user_id` jako wartości, co powoduje że te osoby albo się nie wyświetlają, albo łamią Select.

## Zmiany

### 1. `CandidateDrawer.tsx` — osobna sekcja "Przypisz recenzenta"

- Wydzielić przypisywanie recenzenta jako **stałą, widoczną sekcję** w drawerze (nie ukrytą za kliknięciem "W ocenie")
- Sekcja widoczna dla managerów/adminów (`!isReviewer`), z selektem pracownika i przyciskiem "Przypisz"
- Filtrować `teamMembers` tak, żeby pokazywać **tylko tych z `auth_user_id` != null** (bez konta w systemie nie mogą się zalogować jako recenzent)
- Używać `m.auth_user_id` jako value w Select (bezpieczne po filtrze)
- Wyświetlić aktualnie przypisanego recenzenta jeśli istnieje (`application.assigned_reviewer_id`)
- Usunąć ukryty flow z `showReviewerSelect` / handleStatusClick

### 2. Bez zmian w backend

Edge function `assign_reviewer` działa poprawnie — przyjmuje `reviewer_id` (auth_user_id) i przypisuje recenzenta + wysyła email. Nie wymaga zmian.

### Podsumowanie UI

Nowa sekcja pojawi się pomiędzy "Notatki rekrutera" a "Zmień status":
- Nagłówek "Przypisz recenzenta" z ikoną UserCheck
- Select z listą aktywnych pracowników (filtr: `auth_user_id != null`)
- Przycisk "Przypisz" (zmienia status na "reviewing" automatycznie)
- Info o aktualnie przypisanym recenzencie jeśli jest

