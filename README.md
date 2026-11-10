# Jobbrev

macOS-app som skriver personliga brev grundade i ditt faktiska CV.

Klistra in jobbannonsen, läs in ditt CV en gång, och appen plockar ut kraven,
matchar dem mot CV:t och skriver två brevförslag som du kan redigera, förfina
och exportera.

## Stack

Tauri 2 · React 19 · TypeScript · Vite · Tailwind 4 · Google Gemini
(`@google/genai`). Ingen server, ingen databas — allt körs lokalt.

## Kom igång

```bash
npm install
cp .env.example .env    # lägg in din Gemini-nyckel i VITE_GEMINI_API_KEY
npm run tauri dev
```

Nyckeln hämtas i [Google AI Studio](https://aistudio.google.com/apikey).
`.env` är gitignorerad.

Appen letar efter nyckeln i den här ordningen:

1. `VITE_GEMINI_API_KEY` i `.env`
2. macOS Nyckelhanterare (tjänsten `jobbrev`), som du fyller i via Inställningar

Att veta om `.env`: Vite bakar in värdet i frontend-bundlen vid bygget, så
nyckeln följer med in i `Jobbrev.app`. Det är rimligt för en app som bara du
kör på din egen maskin. Vill du hellre att nyckeln aldrig lämnar
Nyckelhanteraren — lämna `VITE_GEMINI_API_KEY` tom och spara nyckeln i
Inställningar i stället.

Bygg en app att dubbelklicka på:

```bash
npm run tauri build
# → src-tauri/target/release/bundle/macos/Jobbrev.app
```

## Så fungerar det

1. **Annonsen** analyseras till strukturerade fakta: krav, meriterande,
   ansvar, deadline, kontaktperson, nyckelord.
2. **CV:t** läses in från PDF, Word (.docx) eller text och struktureras.
   PDF:er skickas till Gemini som fil, eftersom modellen läser kolumnlayout
   bättre än en lokal textextraktion gör.
3. **Matchningen** går igenom krav för krav och sätter `matchad`, `delvis`
   eller `saknas` — med ett ordagrant citat ur CV:t som belägg.
4. **Brevet** skrivs med matchningen som underlag, med en hård regel i prompten
   att ingenting får påstås som inte går att härleda ur CV:t. Krav du inte
   uppfyller formuleras som lärvilja, aldrig som påhittad erfarenhet.

Två varianter genereras: *Meriterna först* och *Motivationen först*. Samma
fakta, olika upplägg.

## Var saker sparas

| Vad | Var |
|---|---|
| API-nyckel | `.env`, eller macOS Nyckelhanterare (`jobbrev` / `gemini-api-key`) |
| CV-profil | `~/Library/Application Support/com.jonaslarsson.jobbrev/cv/profile.json` |
| Inställningar | samma mapp, `settings.json` |
| Brev | dit du väljer att spara dem |

## Granska alltid brevet

Språkmodeller glider. Läs igenom brevet och kontrollera att varje påstående
finns i ditt CV innan du skickar det.
