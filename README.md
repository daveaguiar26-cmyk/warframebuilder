# Warframe Builder

Aplicação web local-first para pesquisar armas e mods de Warframe. A Fase 2
acrescenta um motor TypeScript puro para capacidade, polaridades, dano e DPS de
referência. O editor ainda não está ligado ao motor; isso fica para a Fase 3.

## Requisitos

- Node.js 22 ou superior
- npm

## Executar

```bash
npm install
npm run update-data
npm run dev
```

O catálogo reduzido é gerado em `public/data/catalog.json` a partir do pacote
`@wfcd/items`. Volta a executar `npm run update-data` quando quiser actualizar
os dados do jogo. A aplicação carrega esse ficheiro estático e não consulta uma
API durante a utilização.

O motor de cálculo está em `src/engine/`; as fórmulas, fontes e limitações estão
documentadas em `FORMULAS.md`.

## Verificações

```bash
npm test
npm run build
```

## GitHub Pages

O workflow em `.github/workflows/deploy.yml` constrói e publica a aplicação ao
fazer push para `main`. Nas definições do repositório, seleccionar **Settings >
Pages > Build and deployment > GitHub Actions**.
