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

## Biblioteca de builds

A aba Biblioteca lê, por omissão, `public/data/builds.json`:

```json
{
  "builds": [
    { "nome": "Braton crítico", "autor": "David", "descricao": "Opcional", "codigo": "WFB1:..." }
  ]
}
```

Para usar uma folha do Google Sheets em vez do ficheiro:

1. Crie colunas `nome`, `autor`, `descricao` e `codigo` (pode haver outras).
2. Ficheiro → Partilhar → Publicar na Web → a folha em formato **CSV**.
3. Defina o link em `VITE_LIBRARY_CSV_URL` (ficheiro `.env.local` para desenvolvimento, ou variável `LIBRARY_CSV_URL` do repositório no GitHub para o deploy).

Linhas sem nome ou com código que não comece por `WFB1:` são ignoradas.
