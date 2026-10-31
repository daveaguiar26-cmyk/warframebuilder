# Warframe Builder

Aplicação web local-first para pesquisar armas e mods de Warframe. A primeira
fase prepara a interface, os dados estáticos e a publicação gratuita no GitHub
Pages; não inclui ainda cálculos de build.

## Requisitos

- Node.js 22 ou superior
- npm

## Executar

```bash
npm install
npm run update-data
npm run dev
```

O catálogo reduzido é gerado em `src/data/catalog.json` a partir do pacote
`@wfcd/items`. Volta a executar `npm run update-data` quando quiser atualizar
os dados do jogo. A aplicação não consulta uma API durante a utilização.

## Verificações

```bash
npm test
npm run build
```

## GitHub Pages

O workflow em `.github/workflows/deploy.yml` constrói e publica a aplicação ao
fazer push para `main`. Nas definições do repositório, seleccionar **Settings >
Pages > Build and deployment > GitHub Actions**.
