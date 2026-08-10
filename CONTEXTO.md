# CONTEXTO — Folio / pdf-studio (sagrado)

> **Este ficheiro é a memória viva do projeto.**  
> Qualquer agente/assistente **deve lê-lo no início** de trabalho neste repo e **atualizá-lo** quando o estado mudar (arquitetura, decisões, bugs abertos, próximos passos).  
> Não duplicar segredos aqui (`.env`, chaves Stripe, dados pessoais).

**Última atualização:** 2026-08-10 (inline cell edit)  
**Repo:** https://github.com/JoaoPauloMartins072/pdf-studio  
**Local:** `c:\Users\Lenovo\Desktop\pdf-studio`  
**Branch:** `main`

---

## O que é o produto

**Folio** — editor/ferramentas PDF no browser (Next.js + TypeScript + Tailwind + pdf.js + pdf-lib + Stripe).  
Monetização MVP: **€0.99 por ficheiro** desbloqueado.

---

## Onde paramos (estado atual)

### Feito (inclui trabalho local a commit/push nesta sessão)
- Arquitetura estrutural **Stages 0–7** em `src/core/`
- Calibração bboxes + `coverColor` (barras payslip) + RGB 0–255
- **Edição inline estilo Excel** (`InlineTextCellEditor`): click em Edit text / double-click em Select; Enter confirma, Esc cancela, blur confirma — sem `window.prompt`
- Smoke: `npm run core:smoke`

### Ainda aberto
1. Validar no browser payslip (caixas + header + inline edit)
2. Docs README / `docs/FOLIO-ROADMAP.md` ainda fracos sobre a arquitetura nova
3. Extração monorepo `packages/folio-core` + `packages/folio-ui` — **adiada**
4. Phase 1 ship: Stripe live, tokens, Vercel, analytics

### Honestidade técnica (não mentir no roadmap)
- Text replace no serializer ainda é **cover + write glyphs**, não rewrite de content-stream
- Parser/interpreter nativos em `src/core/parser|interpreter` são stubs; ingestão real passa por **pdf.js** (`buildDisplayListFromPdfJs`)
- Fontes embutidas do PDF ainda não são reutilizadas no export (Helvetica/Noto + `fontFamily` no preview)

---

## Arquitetura (mental model)

```
PDF bytes
  → pdf.js (bridge app) → Display List
  → Editable Document Model (source of truth)
  → CommandEngine (todas as mutações)
  → FolioModelRenderer (preview dirty) + FolioPdfLibSerializer (export)
```

| Camada | Onde |
|--------|------|
| Core (futuro folio-core) | `src/core/**` |
| UI / sessão editor | `src/hooks/useFolioPdfWorkspace.ts`, `src/components/editor/**` |
| Inline text cell | `src/components/editor/InlineTextCellEditor.tsx` |
| Bridge pdf.js | `src/lib/pdf/buildDisplayListFromPdfJs.ts` |
| Roadmap curto | `ROADMAP.md` |

**Regra de produto:** overlay/white-rect **não** é a arquitetura default; OCR/visual-fallback só com `editability` explícita.  
**UX texto:** nunca `window.prompt` para editar células do modelo — só input inline.

---

## Como trabalhar neste repo

- Ler **este** `CONTEXTO.md` antes de planear/implementar
- Heed `AGENTS.md` / Next.js local em `node_modules/next/dist/docs/`
- Não commitiar `CONTEXTO-HANDOFF.md` se tiver dados pessoais (payslips, PPS, etc.)
- Commit/push **só** quando o utilizador pedir
- Após marco relevante: atualizar secções “Onde paramos”, decisões e próximos passos neste ficheiro

---

## Decisões fechadas

- Modelo editável + commands > anotações legacy como path principal
- `src/core` primeiro; packages monorepo depois
- Export só via serializer oficial (não chamar `bakeEditsIntoPdf` no editor)
- Edição de texto estrutural = célula inline (Excel-like)

## Próximos passos sugeridos (por prioridade)

1. Smoke manual no payslip com inline edit
2. Se OK: tipografia embutida ou content-stream rewrite
3. Phase 1 monetização/deploy quando o editor estiver “bom o suficiente”

---

## Notas rápidas para o agente

- Payslips de teste em `C:\Users\Lenovo\Downloads\Payslip_*.pdf` (Threadstone)
- Ao editar header azul: cover ~`(148,206,222)`, texto preto (não forçar branco em fundo claro)
- `CONTEXTO-HANDOFF.md` = handoff antigo pontual; **não** substitui este ficheiro
