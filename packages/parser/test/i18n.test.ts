import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/index.ts";

// The point of the rewrite: the parser is positional and language-agnostic, so
// Spanish/French CVs parse with NO parser changes — section titles and the
// period end-word are captured verbatim from the markdown.

const ES = `# Alex Morgan

Madrid, España · Disponible

alex@example.com · Portafolio: alex.es

## Ingeniero Senior

_Construyo sistemas._

## Sobre mí

Diseño servicios backend.

### Tecnologías seleccionadas

TypeScript, Node.js

---

## Experiencia Profesional

### Acme — Ingeniero Backend

_Madrid | 2020 – Presente_

- Hice cosas

---

## Educación

**Grado en Informática @ Universidad de Madrid**

_2017_

---

"Autorizo el tratamiento de mis datos."
`;

const FR = `# Alex Morgan

Paris, France · Disponible

alex@example.com

## Ingénieur Senior

_Je construis des systèmes._

## À propos

Je conçois des services backend.

### Technologies sélectionnées

TypeScript, Node.js

---

## Expérience professionnelle

### Acme — Ingénieur Backend

_Paris | 2020 – Présent_

- Fait des choses

---

## Formation

**Licence en Informatique @ Université de Paris**

_2017_

---

"J'autorise le traitement de mes données."
`;

describe("parse(cv) is language-agnostic", () => {
  it("parses a Spanish CV, capturing its labels + period verbatim", () => {
    const cv = parse(ES, "cv");
    assert.equal(cv.profile.name, "Alex Morgan");
    // Contact labels are captured verbatim — a Spanish "Portafolio" needs no
    // parser change, the proof that nothing about contacts is hardcoded.
    assert.deepEqual(cv.profile.contacts, [
      { label: "", value: "alex@example.com" },
      { label: "Portafolio", value: "alex.es" },
    ]);
    assert.deepEqual(cv.labels, {
      about: "Sobre mí",
      technologies: "Tecnologías seleccionadas",
      experience: "Experiencia Profesional",
      education: "Educación",
      projects: "",
    });
    assert.equal(cv.experiences[0].period.end, "Presente");
    assert.equal(cv.education[0].institution, "Universidad de Madrid");
  });

  it("parses a French CV", () => {
    const cv = parse(FR, "cv");
    assert.deepEqual(cv.labels, {
      about: "À propos",
      technologies: "Technologies sélectionnées",
      experience: "Expérience professionnelle",
      education: "Formation",
      projects: "",
    });
    assert.equal(cv.experiences[0].period.end, "Présent");
  });
});
