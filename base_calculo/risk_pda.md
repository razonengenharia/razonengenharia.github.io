# RiskPDA — Documentação Técnica
**NBR 5419-2:2026 | Razon Engenharia**

---

## 1. O que é o RiskPDA

Módulo de **Análise de Risco para Proteção contra Descargas Atmosféricas (SPDA)** baseado na norma ABNT NBR 5419-2:2026. Substitui planilhas complexas por um formulário web reativo que calcula, em tempo real, as frequências de eventos (Anexo A), as probabilidades de dano (Anexo B), as perdas e os riscos finais (Anexo C), produzindo os resultados R1, F e R4 com veredicto automático de conformidade.

**Status atual:** cálculos dos Anexos A, B e C implementados e funcionais. Validação com o engenheiro em andamento. Banco de dados Neon (já criado) integrado somente após a validação dos cálculos.

---

## 2. Arquitetura de Arquivos

```
razonengenharia.github.io/
├── riskpda.html               # Interface completa (layout, painel de resultados)
├── riskpda.js                 # Motor de cálculo único (Anexos A, B, C)
└── data/
    ├── municipios_ng.json     # Ng por município: 5557 registros, chaves compactas {m, u, n}
    ├── tabelas_anexo_a.json   # Tabelas A1 (Cd), A2 (Ci), A3 (Ct), A4 (Ce)
    ├── tabelas_anexo_b.json   # Tabelas B1–B9 (PTA, PB, PSPD, CLD, KS3, PTU, PEB, PLD, PLI)
    ├── tabelas_anexo_c.json   # Tabelas C2–C7 (rt, rp, rf, hz, rs; LF e LO para R1)
    └── tabelas_anexo_d.json   # Tabelas D1 (fórmulas) e D2 (LT, LF, LO para R4)
```

### municipios_ng.json — estrutura

Fonte: Tabela da NBR 5419-2:2026 — todos os 5557 municípios brasileiros com Ng definido. Gerado em duas etapas: (1) importação da planilha `ng.xlsx` (~A até início do M, parcialmente corrompida); (2) leitura visual (Claude Vision) das páginas 97–182 do PDF `Caderno-2-pt-2.pdf` para preenchimento dos municípios ausentes, totalizando cobertura completa do alfabeto.

```json
[{"m":"Araçatuba","u":"SP","n":14}, ...]
```

- `m`: nome do município (UTF-8, NFC normalizado)
- `u`: UF (2 letras maiúsculas)
- `n`: Ng em raios/km²/ano (sempre par, entre 0 e 32)
- Ordenado alfabeticamente por nome normalizado (NFKD lowercase) para busca eficiente

**Busca no cliente:** autocomplete text input (`#municipio-input`) com `filtrarMunicipios()` — normaliza a string via `NFD` + strip diacríticos para busca accent-insensitive. Exibe até 10 sugestões. Ao selecionar, atualiza `NgAtual` e dispara `calcularRiscos()`.

### Estado global em JS

```javascript
let AnaliseRisco = {
    anexoA: {},   // preenchido por calcularRiscos() a cada mudança de input
    zonas: []     // array de zonas; cada zona recebe .anexoB_resultado e .anexoC_resultado
};

let TABELAS_A = {};   // carregado de tabelas_anexo_a.json
let TABELAS_B = {};   // carregado de tabelas_anexo_b.json
let TABELAS_C = {};   // carregado de tabelas_anexo_c.json (C2–C7: fatores de R1)
let TABELAS_D = {};   // carregado de tabelas_anexo_d.json (D1 fórmulas, D2: fatores de R4)
let LISTA_NG  = [];   // carregado de municipios_ng.json
let NgAtual   = 0;    // Ng do município selecionado
```

Cada zona no array possui:
- Inputs (ids dinâmicos): `pta-{id}`, `pb-{id}`, `pspd-{id}`, `wm1-{id}`, `wm2-{id}`, `ks3-{id}`, e por linha (`en`/`si`): `uw-{prefixo}-{id}`, `cld-{prefixo}-{id}`, `ptu-{prefixo}-{id}`, `peb-{prefixo}-{id}`, `pld-{prefixo}-{id}`, `pli-{prefixo}-{id}`, e do Anexo C: `nz-{id}`, `tz-{id}`, `rs-{id}`, `rt-{id}`, `rp-{id}`, `rf-{id}`, `hz-{id}`, `lf-r1-{id}`, `lo-r1-{id}`, `lf-r4-{id}`, `lo-r4-{id}`, `roteamento-{id}`.
- `nt` é **global** (id `nt-global`, na seção de dados da edificação) — não pertence a cada zona.
- `nome-zona-{id}`: campo de texto editável abaixo do título fixo **"Zona N"** (maxlength=40, placeholder `"Clique para nomear esta zona…"`). Inicia vazio.
- **Inputs numéricos iniciam em branco**: todos os campos de entrada numérica (`nz-{id}`, `tz-{id}`, `L`, `W`, `H`, `LL` das linhas, etc.) não têm valor padrão — o campo começa vazio. Exceção: `wm1-{id}` e `wm2-{id}` iniciam em `0` (bloqueados — ver seção Wm1 e Wm2).
- `.anexoB_resultado`: `{ PA, PB, PSPD, energia: { PM, PC, PU, PV, PW, PZ }, sinal: { PM, PC, PU, PV, PW, PZ } }`
- `.anexoC_resultado`: `{ R1, F, R4 }`

---

## 3. Cálculos — Anexo A: Frequências de Eventos (N)

Todos os N são **anuais** e representam quantas vezes por ano aquele tipo de evento perigoso atinge a estrutura ou suas linhas.

### Áreas de captura

```
Ad = (L × W) + (2 × 3H × (L + W)) + (π × (3H)²)     # Área de captura da estrutura
Am = (2 × 500 × (L + W)) + (π × 500²)                 # Área de captura próxima (500 m)
Al = 40 × Ll                                           # Área de captura da linha (por unidade)
Ai = 4000 × Ll                                         # Área de captura por indução próxima
```

### Frequências de impacto

```
Nd  = Ng × Ad × Cd × 10⁻⁶          # Impactos diretos na estrutura (S1)
Nm  = Ng × Am × 10⁻⁶               # Impactos próximos à estrutura (S2)

Ndj_en = Ng × Adj × Cdj × Ct_en × 10⁻⁶  # Impactos via linha de energia (S3 adj.)
Ndj_si = Ng × Adj × Cdj × Ct_si × 10⁻⁶  # Impactos via linha de sinal  (S3 adj.)
Nl  = Ng × Al × Ci × Ct × Ce × 10⁻⁶  # Impactos diretos na linha (S3)
Ni  = Ng × Ai × Ci × Ct × Ce × 10⁻⁶  # Impactos induzidos próximos à linha (S4)
```

Calculados separadamente para **linha de energia** (`en`) e **linha de sinal** (`si`). O Uw de cada linha é selecionável por zona via dropdown (padrão: 2,5 kV para energia — Categoria III da NBR 5410 Tab. 31; 1,5 kV para sinal — Categoria II).

### Tabelas de suporte (Anexo A)

| Tabela | Variável | Descrição |
|--------|----------|-----------|
| A.1 | Cd | Fator de localização da estrutura (entorno exposto, normal, protegido) |
| A.2 | Ci | Fator de instalação da linha (aérea, subterrânea, etc.) |
| A.3 | Ct | Fator de transformação da linha (AT→BT, CT=1 para sinal sem transformador) |
| A.4 | Ce | Fator de ambiente externo da linha |

---

## 4. Cálculos — Anexo B: Probabilidades de Dano (P)

Calculadas **por zona** e **por linha** (energia e sinal independentemente).

### Fatores de blindagem magnética da zona

```
KS1 = 0,12 × Wm1    (ou 1 se não houver blindagem espacial)     — limitado a 1
KS2 = 0,12 × Wm2    (ou 1 se não houver SPDA correspondente)    — limitado a 1
KS3 = valor da Tabela B.5 (tipo de fiação interna / laço induzido)
KS4 = 1 / Uw                                                    — por linha
```

### Probabilidades de dano

```
PA  = PTA × PB                          # Probabilidade de choque — S1 (zona)
PB  = valor da Tabela B.2 (nível SPDA)  # Probabilidade de incêndio — S1 (zona)

PM  = PSPD × (KS1 × KS2 × KS3 × KS4)² # Falha de sistemas por LEMP (S2) — por linha
PC  = PSPD × CLD                        # Falha de sistemas por centelhamento (S1) — por linha

PU  = PTU × PEB × PLD × CLD            # Probabilidade de choque via linha (S3)
PV  = PEB × PLD × CLD                  # Probabilidade de incêndio via linha (S3)
PW  = PSPD × PLD × CLD                 # Falha de sistemas por impacto direto na linha (S3)
PZ  = PSPD × PLI × CLI                 # Falha de sistemas por indução próxima à linha (S4)
```

> **CLI = CLD** (mesmo fator de blindagem serve para impacto direto e condução induzida).

### Tabelas de suporte (Anexo B)

| Tabela | Variável | Descrição |
|--------|----------|-----------|
| B.1 | PTA | Medida contra choque (isolação, avisos, malha equipotencial) |
| B.2 | PB  | Probabilidade de falha do SPDA conforme nível de proteção (I a IV / sem SPDA) |
| B.3 | PSPD | Eficácia do sistema coordenado de DPS na zona |
| B.4 | CLD / CLI | Fator de blindagem e interligação da linha (blindada, não blindada, duto) |
| B.5 | KS3 | Tipo de fiação interna (laços grandes, cabos segregados, blindados) |
| B.6 | PTU | Medida de proteção contra tensão de passo/toque na linha |
| B.7 | PEB | Eficácia do DPS de entrada (equipotencialização de serviço) |
| B.8 | PLD | Probabilidade de falha por surto direto — função de RS (blindagem do cabo) e Uw |
| B.9 | PLI | Probabilidade de falha por surto induzido — função de Uw e tipo de linha |

---

## 5. Cálculos — Anexo C: Perdas (L) e Riscos (R1, F, R4)

### 5.1 Fator de pessoas e perdas por zona

```
Fator de pessoas = (nz / nt) × (tz / 8760)     # Eq. C.1

LA = LU = rt × LT × fatorPessoas × rs           # D1 — choque (Eq. C.1 e C.2)
LB = LV = rp × rf × hz × LF_R1 × fatorPessoas × rs # D2 — incêndio/explosão (Eq. C.3)
LC = LM = LW = LZ = LO_R1 × fatorPessoas × rs   # D3 — falha de sistemas (Eq. C.4)

LT    = 0,01  (constante normativa, hardcoded — não há input para LT)
LF_R1 = Tabela C.2 (dropdown por uso da zona — R1: Vidas)
LO_R1 = Tabela C.2 (dropdown por uso da zona — R1: Vidas)
        → Visível e ativo APENAS para estrutura Crítica/Explosiva
        → Para estrutura Comum: campo oculto e valor forçado a 0 no cálculo
          (fundamento: NBR 5419-2:2026, item 4.3.1 e Tabela 2, Nota "a")
```

### 5.2 Perdas econômicas R4 (Tabela D.1, simplificada com ca/ct = 1)

```
LB_R4 = rp × rf × LF_D2         # D2 econômico — sem fatorPessoas, sem hz, sem rs
LO_R4 = LO_D2                   # D3 econômico — direto da Tabela D.2
```

> **Por que sem fatorPessoas no R4?** A perda econômica é sobre o patrimônio, não sobre pessoas. O fator de ocupação humana (nz/nt × tz/8760) não se aplica aqui. Com ca/ct = 1, a nota da Tabela D.1 da NBR 5419-2:2026 dispensa o levantamento financeiro real.

### 5.3 Regra de roteamento das linhas (item 6.4.5)

```
Mesmo roteamento  →  usar apenas a pior linha:  combinar(en, si) = max(en, si)
Roteamentos dif.  →  somar contribuições:        combinar(en, si) = en + si
```

A "pior linha" é quase sempre o **sinal** (menor Uw = 1,5 kV, CT = 1 sem redutor de transformador → maiores Nl e Ni).

### 5.4 Componentes de R1 — Perda de Vida Humana (Tabela 6)

```
RA = Nd  × PA  × LA                          # Choque — S1 (estrutura)
RB = Nd  × PB  × LB                          # Incêndio — S1 (estrutura)
RC = Nd  × PC  × LC         (por linha)      # Sistemas — S1
RM = Nm  × PM  × LC         (por linha)      # Sistemas — S2 (LEMP próximo)
RU = (Nl + Ndj) × PU × LU  (por linha)      # Choque — S3 (linha)
RV = (Nl + Ndj) × PV × LV  (por linha)      # Incêndio — S3 (linha)
RW = (Nl + Ndj) × PW × LC  (por linha)      # Sistemas — S3 (linha)
RZ = Ni  × PZ  × LC         (por linha)      # Sistemas — S4 (indução)

R1_zona = RA + RB + RC + RM + RU + RV + RW + RZ
R1_total = Σ R1_zona  (todas as zonas)
```

> **Nota normativa:** RC, RM, RW e RZ só impactam R1 quando a falha do sistema coloca vidas em risco direto (hospitais, risco de explosão). Para estruturas comuns, R1 é dominado por RA, RB, RU e RV.

### 5.5 Componentes de F — Frequência de Dano a Sistemas Internos (Tabela 7)

```
FB = Nd  × PB               # Equipamentos no topo — S1
FC = Nd  × PC  (por linha)  # LEMP interno — S1
FM = Nm  × PM  (por linha)  # LEMP próximo — S2
FV = (Nl + Ndj) × PEB  (por linha)   # Linha — S3 direto (usa PEB, não PV)
FW = (Nl + Ndj) × PW   (por linha)   # Linha — S3 surto
FZ = Ni  × PZ  (por linha)           # Linha — S4 induzido

F_zona = FB + FC + FM + FV + FW + FZ
F_total = Σ F_zona
```

### 5.6 Componentes de R4 — Risco Econômico (Tabela 6 + Tabela D.1/D.2)

```
RB_R4 = Nd  × PB  × LB_R4               # Incêndio — S1
RC_R4 = Nd  × PC  × LO_R4  (por linha)  # Sistemas — S1
RM_R4 = Nm  × PM  × LO_R4  (por linha)  # Sistemas — S2
RV_R4 = (Nl + Ndj) × PV × LB_R4  (por linha)   # Incêndio — S3
RW_R4 = (Nl + Ndj) × PW × LO_R4  (por linha)   # Sistemas — S3
RZ_R4 = Ni  × PZ  × LO_R4  (por linha)          # Sistemas — S4

R4_zona = RB_R4 + RC_R4 + RM_R4 + RV_R4 + RW_R4 + RZ_R4
R4_total = Σ R4_zona
```

> **Nota:** R4 não possui RA nem RU (risco de choque em pessoas não é perda econômica patrimonial).

### 5.7 Tabelas de suporte (Anexo C e D)

| Tabela | Variável | Descrição |
|--------|----------|-----------|
| C.2 | LF_R1, LO_R1 | Fatores de perda de **vidas** (R1): LF — dano físico/incêndio; LO — falha de sistemas (apenas estrutura crítica) |
| C.3 | rt | Fator de redução pelo tipo de piso/solo (terra a asfalto: 0,01 a 0,000001) |
| C.4 | rp | Fator de redução pelas providências anti-incêndio (1 / 0,5 / 0,2) |
| C.5 | rf | Fator de redução pelo risco de incêndio/explosão da zona (0,0 a 1,0) |
| C.6 | hz | Fator de aumento pelo perigo de pânico ou dificuldade de evacuação (1 a 10) |
| C.7 | rs | Fator pelo tipo de estrutura: simples=2 (madeira/alvenaria), robusta=1 (metálica/armado) |
| D.2 | LF_R4, LO_R4 | Fatores de perda **econômica** (R4): valores maiores que C.2 pois medem dano patrimonial, sem fator de pessoas |

---

## 6. Limites Toleráveis e Veredicto Final

| Risco | Descrição | Limite tolerável (RT) |
|-------|-----------|----------------------|
| **R1** | Perda de Vidas Humanas | 10⁻⁵ (0,00001 / ano) |
| **F** — sistemas não críticos | Dano a equipamentos | 1 evento / ano |
| **F** — sistemas críticos | Falha afeta comunidade ou vidas | 0,1 eventos / ano |
| **R3** | Perda de Patrimônio Cultural | 10⁻⁴ — *não implementado* |
| **R4** | Perda Econômica | 10⁻³ (0,001 / ano) |

Se **R_total > RT** para qualquer risco ativo → proteção adicional é necessária (SPDA, DPS, blindagem, compartimentação, etc.).

A seleção de FT para F (crítico ou não crítico) é feita pelo usuário diretamente no painel de resultados, conforme NBR 5419-2:2026 item 7.3.4.

---

## 7. Regras de Negócio da Norma

### Zonas de Estudo (Zs)
- A edificação pode ser dividida em até 4 zonas de estudo independentes.
- **Anexo A é global**: Nd, Nm, Nl, Ni são calculados uma vez para toda a estrutura e usados em todas as zonas.
- **Anexos B e C são zonais**: cada zona tem seus próprios fatores de proteção, uso e ocupação.
- O risco total é a **soma** dos riscos de todas as zonas.

### Filtro de Existência de Serviço — Fonte Externa e Estrutura Adjacente

#### Conceito geral

Cada linha (Energia e Sinal) pode receber surtos de até **duas fontes independentes**:

| Fonte | O que representa | Frequência gerada |
|-------|-----------------|-------------------|
| **Fonte Externa** | Cabo vindo da concessionária (rede pública de energia ou telecom) ou de qualquer alimentação externa direta que não seja o prédio adjacente definido no bloco ADJ | `Nl` (impacto direto na linha) + `Ni` (indução próxima à linha) |
| **Estrutura Adjacente (ADJ)** | Cabo metálico vindo de outro prédio fisicamente interligado, cujas dimensões e localização são informadas no bloco ADJ | `Ndj` |

O risco de linha de cada zona usa a **soma** das duas fontes: `(Nl + Ndj)`. Cada parcela pode ser zero individualmente — o que muda é apenas a origem física do perigo, não a fórmula.

#### Os quatro interruptores de existência

| Interruptor | Localização na UI | Quando OFF — variáveis zeradas |
|-------------|------------------|---------------------------------|
| **Fonte Externa — Energia** | Toggle "Fonte Externa" no card Linha de Energia | `Nl_en = 0`, `Ni_en = 0` |
| **Fonte Externa — Sinal** | Toggle "Fonte Externa" no card Linha de Sinal | `Nl_si = 0`, `Ni_si = 0` |
| **ADJ — Energia** | Dropdown "Serviços interligados" → "Apenas Sinal" | `Ndj_en = 0` |
| **ADJ — Sinal** | Dropdown "Serviços interligados" → "Apenas Energia" | `Ndj_si = 0` |

**Estado padrão:** Fonte Externa ligada para ambas as linhas (concessionária presente); ADJ desativado.

#### Impacto nos cálculos de risco

O filtro é aplicado em `calcularRiscos()` após calcular `Nl`/`Ni`, **antes** de entrar nas fórmulas. Nenhuma fórmula muda — o efeito é obtido zerando as variáveis.

**Componentes S3 — afetados por `Nl` e `Ndj`:**

| Componente | Fórmula resumida |
|-----------|-----------------|
| RU | `(Nl + Ndj) × PU × LU` |
| RV | `(Nl + Ndj) × PV × LV` |
| RW | `(Nl + Ndj) × PW × LC` |
| FV | `(Nl + Ndj) × PEB` |
| FW | `(Nl + Ndj) × PW` |
| RV_R4 | `(Nl + Ndj) × PV × LB_R4` |
| RW_R4 | `(Nl + Ndj) × PW × LO_R4` |

**Componentes S4 — afetados apenas por `Ni` (Fonte Externa):**

| Componente | Fórmula resumida |
|-----------|-----------------|
| RZ | `Ni × PZ × LC` |
| FZ | `Ni × PZ` |
| RZ_R4 | `Ni × PZ × LO_R4` |

> Componentes **não afetados** pelos interruptores de linha: RA, RB, RC, RM, FB, FC, FM (fontes S1 e S2 — impacto na estrutura ou LEMP próximo, sem envolvimento de linhas condutoras).

#### Exemplos de configuração real

---

**Exemplo 1 — Edícula / Puxadinho (sem Fonte Externa, só ADJ Energia)**

> Edícula nos fundos do lote que não possui relógio de luz próprio. Recebe um cabo de energia vindo diretamente da casa principal. Não há nenhum cabo de dados.

| | Energia | Sinal |
|-|---------|-------|
| Fonte Externa | **OFF** | **OFF** |
| ADJ | **ON** | OFF |

**Resultado:** O risco de energia é calculado apenas com o surto que nasce na casa principal (`Ndj_en`) e viaja pelo cabo. `Nl_en = 0`, `Ni_en = 0` (sem ligação com a concessionária). Todos os componentes de sinal são zero — não há cabo de dados.

---

**Exemplo 2 — Galpão Industrial com Fibra Ótica e Interfone Metálico**

> Galpão industrial que recebe energia da concessionária. A comunicação com o prédio vizinho (escritório) é feita por **fibra ótica** (material dielétrico, não conduz surto). Existe também um **cabo de interfone metálico** entre os dois prédios.

| | Energia | Sinal |
|-|---------|-------|
| Fonte Externa | **ON** | **OFF** ← fibra ótica não conduz surto |
| ADJ | **OFF** ← sem ligação elétrica entre prédios | **ON** ← interfone metálico |

**Resultado:** O risco de energia vem exclusivamente da rua (`Nl_en`). O risco de sinal vem exclusivamente do prédio vizinho via interfone (`Ndj_si`). `Nl_si = 0` (fibra), `Ndj_en = 0` (sem ligação elétrica com o ADJ).

---

**Exemplo 3 — Ilha de Bombeamento Isolada (apenas ADJ Energia)**

> Bomba de recalque instalada em área rural afastada. Não há cabos de dados. Recebe apenas um cabo de força vindo do galpão principal, que é a estrutura adjacente.

| | Energia | Sinal |
|-|---------|-------|
| Fonte Externa | **OFF** | **OFF** |
| ADJ | **ON** | **OFF** |

**Resultado:** Todos os componentes S3 e S4 de sinal são zero — não existem cabos de sinal. O risco de energia é calculado exclusivamente com `Ndj_en` (Nl_en = 0, Ni_en = 0). Esta é a configuração normativamente mais simples: uma única fonte de perigo, vinda do galpão.

---

#### Matriz de combinações

| Fonte En | Fonte Si | ADJ En | ADJ Si | Nl_en | Ni_en | Nl_si | Ni_si | Ndj_en | Ndj_si |
|:--------:|:--------:|:------:|:------:|:-----:|:-----:|:-----:|:-----:|:------:|:------:|
| ON | ON | OFF | OFF | ✓ | ✓ | ✓ | ✓ | 0 | 0 |
| OFF | OFF | ON | ON | 0 | 0 | 0 | 0 | ✓ | ✓ |
| ON | OFF | OFF | ON | ✓ | ✓ | 0 | 0 | 0 | ✓ |
| OFF | OFF | ON | OFF | 0 | 0 | 0 | 0 | ✓ | 0 |

**Implementado por:** `toggleRua(prefixo)` (IDs `rua-energia`, `rua-sinal`; containers `linha-en-campos`, `linha-si-campos`). Quando OFF: `opacity-40 pointer-events-none` nos campos do card (valores preservados para reativação futura).

---

### Estrutura Adjacente

Ativada por toggle. Quando ativa, o usuário informa L/W/H e Cdj da edificação adjacente.

**Campo "Serviços interligados" (obrigatório quando ADJ ativo):**

Controla quais NDJ serão não-zero. Opções:

| Seleção | Efeito |
|---------|--------|
| `Energia + Sinal (Ambos)` | Calcula Ndj_en e Ndj_si normalmente |
| `Apenas Energia` | Ndj_si = 0; apenas Ndj_en calculado |
| `Apenas Sinal` | Ndj_en = 0; apenas Ndj_si calculado |

**Cálculo de Ndj — dois valores independentes por linha:**

```
Adj  = (L_adj × W_adj) + (2 × 3H_adj × (L_adj + W_adj)) + (π × (3H_adj)²)

Ndj_en = Ng × Adj × Cdj × Ct_energia × 10⁻⁶  (0 se "Apenas Sinal")
Ndj_si = Ng × Adj × Cdj × Ct_sinal   × 10⁻⁶  (0 se "Apenas Energia")
```

O `Ct` aplicado é o da **linha que conecta os dois prédios**: para a linha de energia usa-se `En_Ct` (fator de transformação da energia, ex: 0,0006 para AT→BT); para a linha de sinal usa-se `Si_Ct` (geralmente 1, sem transformador). Isso é correto normativamente — a linha que chega à edificação adjacente percorre o mesmo trajeto que `Nl`, portanto o mesmo `Ct` se aplica.

**Uso nos componentes de risco:**

`Ndj_en` e `Ndj_si` são somados a `Nl_en` e `Nl_si` respectivamente nos componentes S3 de cada risco (RU, RV, RW, FV, FW, RV_R4, RW_R4). Componentes S1, S2 e S4 não usam Ndj. Para as fórmulas detalhadas por linha (energia vs. sinal), ver seções 5.4, 5.5 e 5.6, e a tabela de impacto na seção "Filtro de Existência de Serviço" acima.

**Decisão de roteamento (por zona):**

O checkbox "Mesmo roteamento" da zona é a palavra final sobre como combinar os riscos de energia e sinal — incluindo as parcelas NDJ. A função `combinar(en, si)` aplica:
- Mesmo roteamento → `max(en, si)`
- Roteamentos diferentes → `en + si`

Isso vale para todos os componentes S3: RU, RV, RW, FV, FW, RV_R4, RW_R4. O roteamento da zona cobre todas as linhas (NL + NDJ) porque a norma avalia o risco por zona de estudo, não por origem do cabo.

### Roteamento das Linhas (item 6.4.5)
Ver seção 5.3 — a mesma regra aplica-se a todos os componentes S3, incluindo as parcelas `Ndj_en`/`Ndj_si` (ver Estrutura Adjacente acima).

### Tooltips de resultado — Anexo A (painel escuro global)

Os 8 labels de frequência anual no painel escuro do Anexo A possuem ícone `ⓘ` com tooltip ao hover:

| Label | Explicação |
|-------|-----------|
| **Nd** | Raios que atingem diretamente o prédio (Fonte S1) |
| **Nm** | Raios que caem perto do prédio → interferência magnética (Fonte S2) |
| **Ndj Energia** | Raios no prédio vizinho → viajam pelo cabo de energia (Fonte S3 adj.) |
| **Nl Energia** | Raios que atingem diretamente a fiação de energia da rua (Fonte S3) |
| **Ni Energia** | Raios perto da fiação de energia → surto induzido (Fonte S4) |
| **Ndj Sinal** | Raios no prédio vizinho → viajam pelo cabo de sinal (Fonte S3 adj.) |
| **Nl Sinal** | Raios que atingem diretamente a fiação de sinal da rua (Fonte S3) |
| **Ni Sinal** | Raios perto da fiação de sinal → surto induzido (Fonte S4) |

Implementado diretamente no HTML estático (não via `tipRes`) com o mesmo padrão `.has-tooltip`/`.tooltip-box`. Tooltip branco sobre fundo escuro.

### Tooltips de resultado — Anexo B/C (painel escuro por zona)

Cada célula de probabilidade (PM, PC, PU, PV, PW, PZ) e de perda (LA=LU, LB=LV, LC=LM=LW=LZ) no painel escuro de resultados possui um ícone `ⓘ` que exibe um tooltip explicativo ao passar o mouse.

Implementado via `tipRes(texto)` (retorna HTML inline compatível com `.has-tooltip`/`.tooltip-box`) e `TIPS_RES` (objeto com os textos). O tooltip usa fundo branco para contrastar com o painel escuro.

Textos:
- **PM**: raio próximo ao prédio → LEMP → falha de equipamentos
- **PC**: raio na própria estrutura → centelhamento → falha de equipamentos
- **PU**: raio na fiação externa → choque elétrico em pessoas
- **PV**: raio na fiação externa → incêndio/explosão
- **PW**: raio na fiação externa → surto conduzido → falha de equipamentos
- **PZ**: raio perto da fiação externa → indução → falha de equipamentos
- **LA=LU**: perda por choque elétrico — mesmo valor para S1 e S3
- **LB=LV**: perda por danos físicos — mesmo valor para S1 e S3
- **LC=LM=LW=LZ**: perda por falha de sistemas — mesmo valor para S1, S2, S3 e S4

### Nomeação de Zonas
- O cabeçalho de cada zona exibe o título fixo **"Zona N"** (negrito, não editável) e, abaixo dele, um input de texto secundário (`nome-zona-{id}`, maxlength=40, placeholder `"Clique para nomear esta zona…"`).
- O título fixo deixa clara a numeração; o campo de nome é opcional e serve para identificação descritiva (ex.: "Sala de Servidores") — usado pelo futuro módulo de relatório.
- Sem valor padrão — campo inicia vazio.

### CLD → PLD — travamento automático (Tabela B.8)
- Quando `CLD = 1` (não blindada), `PLD` é travado em `1` e o select fica desabilitado (`disabled`, visual opacified). Isso reflete a Tabela B.8 da norma, onde a linha "não blindada" (RS → ∞) resulta em PLD = 1 para qualquer Uw.
- Implementado pela função `sincronizarCLD(cldEl, id, prefixo)`, chamada no `onchange` dos selects de CLD e também em `adicionarZona()` logo após o `appendChild`, garantindo que o travamento seja aplicado já na criação da zona (não apenas na mudança manual).
- Quando CLD ≠ 1 (blindada ou duto), PLD fica livre.

### nt — campo global (Fator de pessoas)
- `nt` (total de pessoas na edificação) é **global**, na seção de dados gerais ao lado de L/W/H/Ng.
- Cada zona mantém `nz` (pessoas naquela zona).
- `calcularRiscos()` lê `nt` de `#nt-global`. O fator de pessoas por zona é `(nz/nt) × (tz/8760)`.
- Validação em tempo real: a soma dos `nz` é exibida abaixo do input de `nt`; se divergir, alerta visual `≠ nt — revise a distribuição por zona`.

### Uw e as linhas de energia vs. sinal
- **Energia (BT)**: Uw padrão = 2,5 kV (Categoria de Sobretensão III, Tab. 31 da NBR 5410) — editável por dropdown em cada zona.
- **Sinal**: Uw padrão = 1,5 kV (Categoria II) — editável por dropdown em cada zona.
- PLD (Tabela B.8) é lido para o Uw específico de cada linha a partir da resistência de blindagem RS do cabo.
- PLI (Tabela B.9) é lido para o Uw de cada linha com tabelas separadas por tipo (energia / sinal).
- Os valores padrão correspondem às categorias normativas mais comuns; o engenheiro pode alterá-los caso a instalação justifique outra categoria.

### Wm1 e Wm2 — bloqueio com desbloqueio manual
- Iniciam em **0** (bloqueados, readonly visual). A maioria das edificações não possui blindagem espacial nem malha de SPDA, portanto 0 é o padrão correto.
- Um link `editar` abaixo de cada campo chama `desbloquearWm(inputId, btn)`: remove o `disabled`, libera o estilo visual, foca o campo e some o botão.
- Uma vez desbloqueado, o campo permanece editável durante a sessão.

### Restrições dos fatores KS
- KS1 e KS2 são limitados a **1** (máximo), conforme NBR 5419-2:2026 item B.4.13.
- KS1 = 0 quando Wm1 = 0 → na prática é tratado como **1** (sem blindagem = sem redução).

### Tipo de estrutura — filtro de R1 (item 4.3.1 e Tabela 2)

O campo global **"Tipo de estrutura"** (Seção 1 da UI) controla duas coisas em R1, conforme NBR 5419-2:2026, item 4.3.1, Nota, e Tabela 2, Nota "a":

#### 1. Quais componentes entram no somatório de R1

| Tipo | R1 calculado | Exemplos |
|------|-------------|----------|
| **Comum** (padrão) | `RA + RB + RU + RV` | Residência, escritório, comércio, galpão, fazenda |
| **Crítica / Explosiva** | `RA + RB + RC + RM + RU + RV + RW + RZ` | Hospital, UTI, depósito de munições, controle de tráfego aéreo |

#### 2. Visibilidade e valor de LO_R1 por zona

| Tipo | Campo LO_R1 na UI | Valor usado no cálculo |
|------|-------------------|------------------------|
| **Comum** | Oculto | Forçado a **0** |
| **Crítica / Explosiva** | Visível — dropdown Tabela C.2 | Valor selecionado (Explosão / UTI / Outras partes de hospital) |

**Fundamento normativo:** A nota abaixo da fórmula de R1 no item 4.3.1 afirma que RC, RM, RW e RZ "aplicam-se somente às estruturas com risco de explosão e a outras estruturas onde falhas de sistemas internos possam **imediatamente** colocar em risco a vida humana". Como LO_R1 é o multiplicador que pondera esses componentes (via LC = LO_R1 × fatorPessoas × rs), forçá-lo a 0 em estrutura comum zera todos os quatro componentes de sistemas — conforme a restrição normativa.

**Exemplo prático:** Uma fazenda (estrutura comum) pode ter prejuízo financeiro com a queima do sistema de irrigação (calculado corretamente via LO_R4 em R4), mas a norma não contabiliza esse evento como risco de *morte* em R1. Sem esta separação, LO_R1 inflava R1 com perda de sistemas, gerando falso positivo de "Necessita Proteção".

**O que não muda:** F e R4 sempre incluem todos os componentes e LO_R4 é sempre habilitado — são métricas de dano patrimonial, independentes da classificação da estrutura.

**Implementado por:**
- `atualizarVisibilidadeLO_R1()` — oculta/exibe `#lo-r1-bloco-{id}` por zona; chamada no `onchange` do select `tipo-estrutura` e ao adicionar zona.
- `atualizarCorTipoEstrutura()` — aplica cor de fundo ao select `tipo-estrutura`: azul claro para Comum (`#EFF6FF`), vermelho claro para Crítica/Explosiva (`#FEF2F2`); chamada no mesmo `onchange` e com cor inicial definida por `style` inline no HTML.
- Em `calcularRiscos()`: `LO_R1 = incluiSistemas ? valor_do_select : 0` (defesa em profundidade, independente do estado do DOM).
- `tipoEstrutura` e `incluiSistemas` lidos antes do forEach de zonas.
- A nota do rodapé (`#nota-r1-texto`) atualiza dinamicamente para refletir a fórmula ativa.

### R3 — Patrimônio Cultural
- Previsto na norma (RT = 10⁻⁴) mas **não implementado** nesta versão do RiskPDA. Em stand-by até decisão de escopo.

---

## 8. Banco de Dados e Autenticação (Neon + Vercel — Pendente)

### 8.1 Decisão de arquitetura

A ferramenta será **separada do GitHub Pages** e hospedada no **Vercel** (free tier), com autenticação e persistência via **Neon PostgreSQL**. O restante do site institucional permanece no GitHub Pages.

Acesso futuro: `pda.razonengenharia.com.br` → Vercel (ou subdomínio do Vercel por enquanto).

### 8.2 Modelo multi-tenant (sustentável para comercialização futura)

O schema é projetado para suportar desde uso próprio até múltiplos clientes com planos e limites diferenciados, sem necessidade de refatoração futura.

```sql
-- Planos de acesso
CREATE TABLE planos (
    id           SERIAL PRIMARY KEY,
    nome         VARCHAR(50) NOT NULL,   -- 'proprietario', 'pro', 'free'
    limite_laudos INTEGER DEFAULT 100,   -- NULL = ilimitado
    ativo        BOOLEAN DEFAULT TRUE
);

-- Usuários / credenciais
CREATE TABLE usuarios (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) UNIQUE NOT NULL,
    senha_hash   VARCHAR(255) NOT NULL,  -- argon2id
    crea         VARCHAR(50),
    plano_id     INTEGER REFERENCES planos(id) DEFAULT 1,
    ativo        BOOLEAN DEFAULT TRUE,
    criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Laudos / análises salvas
CREATE TABLE laudos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nome         VARCHAR(255) NOT NULL,
    dados        JSONB NOT NULL,         -- snapshot completo da análise (inputs + resultados)
    criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> **Por que `dados JSONB` e não tabelas separadas por Anexo?**
> A análise completa é um documento coerente — salvar como JSONB permite versionar o snapshot exato sem joins complexos. As tabelas normalizadas (estruturas, zonas, linhas) seriam necessárias apenas para relatórios agregados entre laudos, que não é um requisito atual.

### 8.3 Fluxo de autenticação planejado

```
Browser → POST /api/login → Vercel Serverless Function
                          → valida email + senha contra Neon
                          → retorna JWT (httpOnly cookie, 7 dias)
Browser → GET /riskpda   → Vercel Edge Middleware verifica JWT
                          → redireciona para /login se inválido
```

- Senha: **argon2id** (mais seguro que bcrypt para senhas)
- Token: **JWT assinado** com `JWT_SECRET` (variável de ambiente no Vercel)
- Cookie: `httpOnly; Secure; SameSite=Strict` — inacessível ao JS do cliente

### 8.4 Stack técnica definida

| Camada | Tecnologia |
|--------|-----------|
| Host | Vercel (free) |
| Banco | Neon PostgreSQL (free tier) |
| Auth | JWT manual (sem Auth.js — mais simples para o escopo atual) |
| Hash de senha | `argon2` (Node.js) |
| API | Vercel Serverless Functions (`/api/*.js`) |
| Frontend | Mesmo HTML/JS atual, sem framework |

### 8.5 Limite de laudos por plano

```javascript
// Em /api/laudos/salvar.js
const usuario = await db.query('SELECT u.*, p.limite_laudos FROM usuarios u JOIN planos p ON p.id = u.plano_id WHERE u.id = $1', [userId]);
const total = await db.query('SELECT COUNT(*) FROM laudos WHERE usuario_id = $1', [userId]);

if (usuario.limite_laudos !== null && total.count >= usuario.limite_laudos) {
    return res.status(403).json({ erro: 'Limite de laudos atingido para seu plano.' });
}
```

### 8.6 O que é necessário para começar (pendente)

- [ ] **String de conexão do Neon** — formato `postgresql://user:pass@host/dbname?sslmode=require`
- [ ] **Login no Vercel** — rodar `npx vercel login` e `npx vercel link` na pasta do projeto
- [ ] Criar tabelas no Neon (script acima em 8.2)
- [ ] Criar usuário proprietário manualmente via SQL
- [ ] Implementar `/api/login.js`, `/api/me.js`, middleware de proteção de rota
- [ ] Substituir `bypassLogin()` no HTML pelo fluxo real
