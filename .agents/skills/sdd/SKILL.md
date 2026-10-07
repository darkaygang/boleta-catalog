# Skill: sdd

## Propósito
Ejecutar cambios siguiendo requisitos, plan, tareas y pruebas.

## Lecturas obligatorias
docs/constitution.md
AGENTS.md
MEMORY.md
specs/catalogo-telegram/spec.md
specs/catalogo-telegram/plan.md
specs/catalogo-telegram/tasks.md

## EARS
Cada requisito lleva un identificador RF-xx.

- Ubiquitous: El sistema deberá [comportamiento].
- Event-driven: CUANDO [evento], el sistema deberá [respuesta].
- State-driven: MIENTRAS [estado], el sistema deberá [respuesta].
- Unwanted behavior: SI [condición no deseada], el sistema deberá
  [respuesta segura].
- Optional: DONDE [función aplicable], el sistema deberá [comportamiento].

## Disciplina
1. Mapear cada tarea a requisitos y pruebas.
2. Antes de cambiar alcance, actualizar spec y plan.
3. Ante ambigüedad, registrar revisión; no inventar.
4. Implementar por incrementos pequeños y verificables.
5. Mantener entrada inmutable y salida pública separada.
6. Marcar [x] solo con evidencia de aceptación.
7. Documentar bloqueos y siguiente acción en MEMORY.md.
8. Detenerse en aprobación humana cuando la spec lo exija.
