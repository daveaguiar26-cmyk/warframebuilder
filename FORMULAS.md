# Fórmulas verificadas

Verificação documental: 31/10/2026. Não foi feita confirmação in-game nesta
sessão. As divergências e aproximações estão assinaladas junto de cada regra.

## Capacidade e drain

- Custo base de um mod no rank `r`: `baseDrain + r`. `baseDrain` e o limite de
	rank vêm do catálogo `@wfcd/items`; não são valores codificados por mod.
- Polaridade igual: `ceil(drain / 2)`.
- Polaridade diferente: `drain + round(drain * 0.25)`, segundo a tabela do
	briefing: 0-1 não aumenta; 2-5 aumenta 1; 6-9 aumenta 2; 10-13 aumenta 3.
	A página [Polarity](https://wiki.warframe.com/w/Polarity) diz arredondar
	sempre para cima. Por decisão do utilizador, esta implementação segue a
	tabela do briefing, também descrita em [Mods](https://wiki.warframe.com/w/Mod).
- Omni/universal iguala qualquer polaridade excepto Umbra.
- Capacidade base: rank do item; Reactor/Catalyst duplica. Foi escolhida a regra
	do briefing, sem a capacidade mínima dependente de Mastery Rank descrita na
	página Mods actual.
- Aura/Stance: o drain passa a capacidade concedida; polaridade igual duplica e
	incompatível concede `round(bonus * 0.8)`. A wiki diverge entre redução de 20%
	([Polarity](https://wiki.warframe.com/w/Polarity)) e 25%
	([Mods](https://wiki.warframe.com/w/Mod)). Por decisão do utilizador, foi
	escolhido 20%; falta confirmar in-game.
- Forma necessária: uma por slot cuja polaridade actual difere da polaridade de
	fábrica. A aplicação apenas conta Formas; não simula o reset de rank.

## Estatísticas e dano de armas

- Bónus percentuais do mesmo atributo acumulam-se: `base * (1 + soma dos
	bónus)`, de acordo com
	[Calculating Bonuses](https://wiki.warframe.com/w/Calculating_Bonuses).
- Dano base: aplica o bónus geral ao dano base; bónus físicos afectam apenas o
	tipo correspondente. Bónus elementais são calculados sobre o dano base já
	modificado. Elementos primários combinam aos pares segundo a ordem dos slots;
	dano elemental inato entra no fim, conforme
	[Damage](https://wiki.warframe.com/w/Damage) e
	[Calculating Bonuses](https://wiki.warframe.com/w/Calculating_Bonuses).
- Chance crítica: `base * (1 + soma dos bónus relativos)`. Dano crítico segue a
	mesma regra. Dano crítico médio: `1 + chanceCritica * (multCritico - 1)`,
	incluindo chances superiores a 100%, conforme
	[Critical Hit](https://wiki.warframe.com/w/Critical_Hit).
- Chance de estado por tipo é distribuída proporcionalmente ao dano desse tipo:
	`chanceEstado * danoTipo / danoTotal`, conforme
	[Status Effect](https://wiki.warframe.com/w/Status_Effect). Não se simula
	inimigo nem efeitos de estado.
- DPS de referência: `danoTotal * multiplicadorCriticoMedio * multishot *
	cadencia`. É uma comparação teórica sem recarga ou inimigo, como definido no
	briefing. Para corpo a corpo, multishot é 1 quando não existir no item.
- Não se aplica quantização 1/32 do dano: a página
	[Damage/Calculation](https://wiki.warframe.com/w/Damage/Calculation) está
	marcada como incompleta e assinala informação contraditória sobre a
	quantização de bónus. Os resultados são valores teóricos não quantizados.
- Só são calculados efeitos percentuais explícitos reconhecidos pelo motor.
	Efeitos condicionais ou desconhecidos são devolvidos como ignorados e não
	alteram os resultados.
