/**
 * JSON-scheman för Geminis strukturerade output (`responseJsonSchema`).
 * Alla fält är obligatoriska — det är enklare att hantera tomma strängar och
 * tomma listor i gränssnittet än att grena på `undefined` överallt.
 */

const strArray = { type: "array", items: { type: "string" } } as const;

export const jobAdSchema = {
  type: "object",
  properties: {
    company: { type: "string", description: "Arbetsgivarens namn, tom sträng om det inte framgår" },
    role: { type: "string", description: "Tjänstens titel" },
    location: { type: "string" },
    requirements: { ...strArray, description: "Skall-krav, ett kort kravpåstående per post" },
    niceToHave: { ...strArray, description: "Meriterande men inte obligatoriskt" },
    responsibilities: { ...strArray, description: "Vad rollen innebär" },
    tone: { type: "string", description: "Annonsens tonläge i några ord, t.ex. 'formell och teknisk'" },
    contactPerson: { type: "string" },
    deadline: { type: "string", description: "Sista ansökningsdag som den står i annonsen" },
    detectedLanguage: { type: "string", description: "Annonsens språk, t.ex. 'svenska'" },
    keywords: { ...strArray, description: "5-12 nyckelord/teknologier som annonsen trycker på" },
  },
  required: [
    "company",
    "role",
    "location",
    "requirements",
    "niceToHave",
    "responsibilities",
    "tone",
    "contactPerson",
    "deadline",
    "detectedLanguage",
    "keywords",
  ],
} as const;

export const cvProfileSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    headline: { type: "string", description: "Nuvarande roll eller yrkesidentitet i en rad" },
    email: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    summary: { type: "string", description: "2-4 meningar som sammanfattar profilen" },
    roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          period: { type: "string" },
          highlights: { ...strArray, description: "Konkreta arbetsuppgifter och resultat" },
        },
        required: ["title", "company", "period", "highlights"],
      },
    },
    skills: { ...strArray, description: "Kompetenser, verktyg, språk" },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          program: { type: "string" },
          school: { type: "string" },
          period: { type: "string" },
        },
        required: ["program", "school", "period"],
      },
    },
    achievements: { ...strArray, description: "Mätbara resultat, utmärkelser, certifikat" },
  },
  required: [
    "name",
    "headline",
    "email",
    "phone",
    "location",
    "summary",
    "roles",
    "skills",
    "education",
    "achievements",
  ],
} as const;

export const matchSchema = {
  type: "object",
  properties: {
    score: { type: "integer", description: "Matchningsgrad 0-100, viktad mot skall-kraven" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement: { type: "string", description: "Kravet så som det står i annonsen" },
          status: { type: "string", enum: ["matchad", "delvis", "saknas"] },
          evidence: {
            type: "string",
            description: "Ordagrant citat ur CV:t som styrker kravet. Tom sträng om inget stöd finns.",
          },
          comment: { type: "string", description: "En kort rad om hur det hänger ihop" },
        },
        required: ["requirement", "status", "evidence", "comment"],
      },
    },
    strengths: { ...strArray, description: "3-5 starkaste argumenten för just den här tjänsten" },
    missing: { ...strArray, description: "Det som faktiskt saknas i CV:t" },
  },
  required: ["score", "items", "strengths", "missing"],
} as const;
