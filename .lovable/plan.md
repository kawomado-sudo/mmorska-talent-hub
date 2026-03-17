## Problem

Email jest hardcoded w `hr-api/index.ts` (linie 300-318):

- Nadawca: `hr@mmorska.pl` (przez Maileroo HTTP API)
- Treść HTML: hardcoded w template string

User chce:

- Nadawca: `app.assistant@mmorska.eu`
- Wysyłka przez SMTP (`smtp.maileroo.com:465`) z hasłem `76c8d120707fb6a6dc0033c5`

## Analiza

Maileroo wspiera **dwa sposoby** wysyłki:

1. **HTTP API** (`https://smtp.maileroo.com/api/v2/emails`) — obecne podejście, używa `X-API-Key`
2. **SMTP** — wymaga klienta SMTP w Deno (biblioteka `denomailer`)

Zostajemy przy HTTP API ale zmienić adres nadawcy na `app.assistant@mmorska.eu`. Maileroo HTTP API pozwala ustawić dowolny `from` jeśli domena jest zweryfikowana. sending key: 4ba9757e1f8ca2984c5ebc28b62afc1bbd140076e859a24228613e64ae3733d8  
identifier : **talent_app_lovable**

## Rozwiązanie

### Opcja rekomendowana: HTTP API ze zmienionym nadawcą

#### 1. `supabase/functions/hr-api/index.ts` — zmiana adresu nadawcy

- Linia 307: zmienić `hr@mmorska.pl` → `app.assistant@mmorska.eu`
- Zmienić `display_name` na np. `"MMorska Rekrutacja"`



### Bezpieczeństwo

- Hasło SMTP NIE będzie hardcoded — zapisane jako Supabase secret
- Deploy edge function po zmianie

### Treść emaila

Pozostaje bez zmian (chyba że user chce zmodyfikować):

- Subject: `Nowe zadanie: ocena kandydata — {imię nazwisko}`
- Body: informacja o przypisaniu do recenzji z nazwą kandydata i stanowiska  
w emailu imie i nazwisko kandydata powinno byc w polowie zamienione na kroki, bo to dane wrazliwe