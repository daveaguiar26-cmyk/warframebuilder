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
- No editor, a lista `polarities` do catálogo é associada por ordem aos primeiros
	slots. O pacote não fornece índices separados para essa lista; confirmar a
	ordem no jogo antes de tratar a contagem de Formas como exacta.

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

## Warframes (verificação: 23/11/2026)

- Ranque fixo em 30 por decisão do utilizador. Os dados `@wfcd/items` trazem os
	valores de ranque 0. No ranque 30 somam-se +100 de vida, +100 de escudo e +50
	de energia: "For a total of +100 Health, +100 Shields and +50 Energy capacity
	at Rank 30" ([Warframes](https://wiki.warframe.com/w/Warframes), secção
	Leveling Up). A armadura não muda. Confirmado nas infoboxes de
	[Mesa](https://wiki.warframe.com/w/Mesa) (365→465, 180→280, 100→150),
	[Excalibur](https://wiki.warframe.com/w/Excalibur),
	[Inaros](https://wiki.warframe.com/w/Inaros) e
	[Nidus](https://wiki.warframe.com/w/Nidus). Um Warframe sem escudo continua
	com 0.
- Excepções ("Rank-Up Exceptions", mesma página) modeladas em
	`rankUpExceptions`: Baruuk, Chroma Prime, Dante, Garuda, Grendel, Hildryn,
	Inaros, Koumei, Kullervo, Lavos, Narin, Nezha e Nidus (Nidus também ganha
	+15% de Força). **A tabela só foi lida até ao Nidus.** Os Warframes que vêm
	depois na ordem alfabética podem ter excepções ainda em falta.
- Os mods de vida, escudo, armadura e energia aplicam-se ao valor do ranque 30:
	`base30 * (1 + soma dos bónus)` (mesma regra de
	[Calculating Bonuses](https://wiki.warframe.com/w/Calculating_Bonuses)).
- Força, Duração, Alcance e Eficiência: `100% + soma dos bónus`
	([Ability Duration](https://wiki.warframe.com/w/Ability_Duration): "Final
	Ability Duration = Base Ability Duration × Ability Duration bonus").
- Custo de energia: `custo * max(200% − Eficiência, 25%)`, limitado também a
	um máximo de 175% ([Ability Efficiency](https://wiki.warframe.com/w/Ability_Efficiency)).
	As habilidades canalizadas não estão modeladas.
- Força, Duração e Alcance não têm limites mínimos aplicados. A wiki consultada
	não indica valores: falta confirmar.
- Os valores concretos de cada habilidade (dano, segundos, metros, custo base)
	não existem nos dados. Mostra-se o multiplicador que os mods aplicam a cada
	habilidade (opção A). Os valores concretos ficam para o Nível 2, escritos à mão.
- Aura: segue as regras de capacidade já descritas acima. O slot Exilus aceita
	apenas mods com `isExilus` e custa capacidade como um slot normal.
- Arcanes: só os efeitos percentuais fixos entram no cálculo. Os efeitos
	condicionais ("On Damaged", etc.) aparecem como ignorados.

## Companheiros (verificação: 23/11/2026)

- Ranque fixo em 30, como nos Warframes. Desde o Update 34.0, os companheiros
	recebem os valores de ranque 30 logo no ranque 0: "simply given Companions
	what would end up being their Rank 30 values at Rank 0"
	([Companion](https://wiki.warframe.com/w/Companion)). Os valores do catálogo
	são usados directamente (ex.: [Carrier](https://wiki.warframe.com/w/Carrier)
	560 / 250 / 80).
- A wiki tem conflitos internos na armadura de algumas bestas (ex.:
	[Adarza Kavat](https://wiki.warframe.com/w/Adarza_Kavat): a infobox diz 300 e
	a nota do Update 34 diz 200). Usa-se o valor do catálogo `@wfcd/items`; falta
	confirmar no jogo.
- Mods de vida, escudo e armadura (Enhanced Vitality, Calculated Redirection,
	Metal Fiber): `base * (1 + soma dos bónus)`. Preceitos, Link e efeitos
	condicionais aparecem como ignorados.
- Dez slots de mods, capacidade 30, ou 60 com Reactor. Falta confirmar no jogo o
	número de slots.
- Compatibilidade aproximada pelo caminho do mod: as sentinelas não usam mods de
	bestas (`/Sentinel/Kubrow/`) nem preceitos de bestas (`/Friendly/Pets/`); as
	bestas não usam preceitos de sentinela. Preceitos exclusivos de um
	companheiro específico ainda não são filtrados.
- Armas por tipo de companheiro:
	- Sentinelas e MOA escolhem uma arma robótica: todas as armas de companheiro
		do catálogo, excepto as de Hound. A wiki diz que Cryotra, Helstrum, Tazicor e
		Vulcax são "Robotic weapons" que servem MOA e sentinelas
		([MOA (Companion)](https://wiki.warframe.com/w/MOA_(Companion))). A Multron
		foi incluída por estar na mesma pasta de dados; falta confirmar.
	- Hound: a arma é definida pelo modelo: Bhaira → Lacerten, Dorma → Batoten,
		Hec → Akaten ([Hound (Companion)](https://wiki.warframe.com/w/Hound_(Companion))).
	- Bestas: garras escritas à mão em `src/data/companionData.ts`, a partir de
		[Claws (Beast)](https://wiki.warframe.com/w/Claws_(Beast)). A página não
		indica a velocidade de ataque, por isso não há DPS de referência. Na
		Pharaoh Predasite, a tabela diz 324 e as notas do Update 37 dizem 325;
		usa-se a tabela.
	- Mods das armas robóticas e de Hound: tabela em `companionWeaponClasses`,
		a partir da frase de cada página da wiki ("This weapon accepts Rifle Mods",
		ex.: [Laser Rifle](https://wiki.warframe.com/w/Laser_Rifle)). Sweeper usa
		mods de caçadeira, Burst Laser de pistola, Vulklok de espingarda e sniper,
		Deconstructor de corpo a corpo, e as restantes de espingarda. Akaten,
		Batoten e Lacerten são "Melee" nos dados da página, mas a wiki não tem a
		frase; assumiu-se corpo a corpo. As variantes Prime/Prisma usam a classe
		da base. Assumiram-se 8 slots, capacidade 30 e Catalyst, como nas outras
		armas; falta confirmar.
	- Garras de bestas: são uma arma com mods próprios. Os mods de garras
		(Bite, Maul, Swipe...; pasta `/Sentinel/Kubrow/`) vão para os slots das
		garras e deixam de aparecer nos slots do companheiro. "Each weapon features
		a slot for Posture Mods, functioning similarly to Stances"
		([Claws (Beast)](https://wiki.warframe.com/w/Claws_(Beast))): o slot de
		Postura aceita mods `Posture Mod` e dá capacidade como uma Stance.
		Assumiram-se 8 slots normais; falta confirmar no jogo.
	- A arma vai no mesmo código (item `arma-companheiro`, com slots e Catalyst)
		e é calculada pelo motor das armas.
- MOA ([MOA (Companion)](https://wiki.warframe.com/w/MOA_(Companion))): base
	350 / 350 / 350; o núcleo e o giroscópio somam percentagens. Usam-se as
	tabelas-resumo da página, que valem o dobro da lista: com elas o total dá
	sempre 1190, como a página indica, e os intervalos batem certo (vida
	367–473). Isto corresponde ao estado gilded, obrigatório no ranque 30. O
	modelo só muda os preceitos; o suporte (bracket) acrescenta uma polaridade.
- Hound ([Hound (Companion)](https://wiki.warframe.com/w/Hound_(Companion))): o
	núcleo define a base (Adlet 350/450/350, Garmr 350/350/450, Raiju
	450/350/350) e o suporte aplica percentagens gilded (valores duplicados).
	Confirmado com a tabela da página: Adlet + Cela = 420 / 585 / 315. O
	estabilizador acrescenta uma polaridade.
- MOA e Hound: 4 polaridades Penjaga mais a do suporte ou do estabilizador.
	Usam as regras de mods das sentinelas, e cada um só vê os seus preceitos.

## Slots Exilus e Stance das armas (23/11/2026)

- Exilus: aceita só mods com `isUtility` nos dados `@wfcd/items`, e gasta
	capacidade como um slot normal.
- Stance (só armas corpo a corpo): dá capacidade como a Aura, com as mesmas
	regras de polaridade descritas acima. A polaridade de fábrica vem de
	`stancePolarity`. Os dados não indicam a classe da arma (ex.: "Dual Swords"),
	por isso o slot aceita qualquer Stance. A Stance não altera as estatísticas
	calculadas.
- Os códigos WFB1 de armas passam a ter 10 slots (8 normais, Exilus e Stance).
	Os códigos antigos, com 8 slots, continuam a abrir.
