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
    └── tabelas_anexo_c.json   # Tabelas C2–C7 e D2 (rt, rp, rf, hz, rs, LF, LO)
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
let TABELAS_C = {};   // carregado de tabelas_anexo_c.json
let LISTA_NG  = [];   // carregado de municipios_ng.json
let NgAtual   = 0;    // Ng do município selecionado
```

Cada zona no array possui:
- Inputs (ids dinâmicos): `pta-{id}`, `pb-{id}`, `pspd-{id}`, `wm1-{id}`, `wm2-{id}`, `ks3-{id}`, e por linha (`en`/`si`): `uw-{prefixo}-{id}`, `cld-{prefixo}-{id}`, `ptu-{prefixo}-{id}`, `peb-{prefixo}-{id}`, `pld-{prefixo}-{id}`, `pli-{prefixo}-{id}`, e do Anexo C: `nz-{id}`, `tz-{id}`, `rs-{id}`, `rt-{id}`, `rp-{id}`, `rf-{id}`, `hz-{id}`, `lf-r1-{id}`, `lo-r1-{id}`, `lf-r4-{id}`, `lo-r4-{id}`, `roteamento-{id}`.
- `nt` é **global** (id `nt-global`, na seção de dados da edificação) — não pertence a cada zona.
- `nome-zona-{id}`: campo de texto editável no cabeçalho de cada zona (maxlength=40), exibido como `Zona X: [nome]`.
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

Ndj = Ng × Adj × Cdj × Ct × 10⁻⁶  # Impactos diretos na estrutura adjacente (S1 adj.)
Nl  = Ng × Al × Ci × Ct × Ce × 10⁻⁶  # Impactos diretos na linha (S3)
Ni  = Ng × Ai × Ci × Ct × Ce × 10⁻⁶  # Impactos induzidos próximos à linha (S4)
```

Calculados separadamente para **linha de energia** (`en`, Uw fixo = 2,5 kV) e **linha de sinal** (`si`, Uw fixo = 1,5 kV).

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
LB = LV = rp × rf × hz × LF × fatorPessoas × rs # D2 — incêndio/explosão (Eq. C.3)
LC = LM = LW = LZ = LO × fatorPessoas × rs      # D3 — falha de sistemas (Eq. C.4)

LT = 0,01  (fixo, Tabela C.2 — todos os tipos)
LF = Tabela C.2 (conforme uso da zona — R1)
LO = Tabela C.2 (conforme uso da zona — R1)
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
| C.2 | LT, LF, LO | Valores típicos de perda para R1 (D1: LT=0,01; D2: LF por uso; D3: LO por uso) |
| C.3 | rt | Fator de redução pelo tipo de piso/solo (terra a asfalto: 0,01 a 0,000001) |
| C.4 | rp | Fator de redução pelas providências anti-incêndio (1 / 0,5 / 0,2) |
| C.5 | rf | Fator de redução pelo risco de incêndio/explosão da zona (0,0 a 1,0) |
| C.6 | hz | Fator de aumento pelo perigo de pânico ou dificuldade de evacuação (1 a 10) |
| C.7 | rs | Fator pelo tipo de estrutura: simples=2 (madeira/alvenaria), robusta=1 (metálica/armado) |
| D.2 | LF, LO | Valores típicos de perda para R4 (maiores que C.2, pois são perdas patrimoniais) |

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

### Estrutura Adjacente
- Quando há uma edificação adjacente conectada por linha, `Ndj` é calculado com a geometria da adjacente e o `Ct` da linha.
- `Ndj` entra somado a `Nl` nos componentes S3 (RU, RV, RW) e em FV.

### Roteamento das Linhas (item 6.4.5)
- **Mesmo roteamento**: usar somente a linha de pior característica (geralmente sinal, por ter menor Uw e CT=1 sem atenuação de transformador). Não somar.
- **Roteamentos diferentes**: calcular os componentes independentemente para cada linha e somar.

### Nomeação de Zonas
- O cabeçalho de cada zona exibe o título fixo **"Zona N"** (negrito, não editável) e, abaixo dele, um input de texto secundário (`nome-zona-{id}`, maxlength=40, placeholder `"Clique para nomear esta zona…"`).
- O título fixo deixa clara a numeração; o campo de nome é opcional e serve para identificação descritiva (ex.: "Sala de Servidores") — usado pelo futuro módulo de relatório.
- Sem valor padrão — campo inicia vazio.

### CLD → PLD — travamento automático (Tabela B.8)
- Quando `CLD = 1` (não blindada), `PLD` é travado em `1` e o select fica desabilitado (`disabled`, visual opacified). Isso reflete a Tabela B.8 da norma, onde a linha "não blindada" (RS → ∞) resulta em PLD = 1 para qualquer Uw.
- Implementado pela função `sincronizarCLD(cldEl, id, prefixo)` chamada no `onchange` dos selects de CLD.
- Quando CLD ≠ 1 (blindada ou duto), PLD fica livre.

### nt — campo global (Fator de pessoas)
- `nt` (total de pessoas na edificação) é **global**, na seção de dados gerais ao lado de L/W/H/Ng.
- Cada zona mantém `nz` (pessoas naquela zona).
- `calcularRiscos()` lê `nt` de `#nt-global`. O fator de pessoas por zona é `(nz/nt) × (tz/8760)`.
- Validação em tempo real: a soma dos `nz` é exibida ao lado de `nt`; se divergir, alerta visual `≠ nt — revise a distribuição por zona`.

### Uw e as linhas de energia vs. sinal
- **Energia (BT)**: Uw = 2,5 kV (categoria III, Tab. 31 da NBR 5410).
- **Sinal**: Uw = 1,5 kV (categoria II).
- PLD (Tabela B.8) é lido para o Uw específico de cada linha a partir da resistência de blindagem RS do cabo.
- PLI (Tabela B.9) é lido para o Uw de cada linha com tabelas separadas por tipo (energia / sinal).

### Restrições dos fatores KS
- KS1 e KS2 são limitados a **1** (máximo), conforme NBR 5419-2:2026 item B.4.13.
- KS1 = 0 quando Wm1 = 0 → na prática é tratado como **1** (sem blindagem = sem redução).

### RC, RM, RW, RZ em R1
- Estes componentes de sistemas internos **só entram em R1 se a falha do sistema coloca vidas em risco direto** (hospitais, UTI, áreas com risco de explosão).
- Para estruturas comuns, R1 é praticamente composto por RA + RB + RU + RV.
- O software inclui todos os componentes por padrão (abordagem conservadora).

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

### 8.6 O que é necessário para começar (pendente para amanhã)

- [ ] **String de conexão do Neon** — formato `postgresql://user:pass@host/dbname?sslmode=require`
- [ ] **Login no Vercel** — rodar `npx vercel login` e `npx vercel link` na pasta do projeto
- [ ] Criar tabelas no Neon (script acima em 8.2)
- [ ] Criar usuário proprietário manualmente via SQL
- [ ] Implementar `/api/login.js`, `/api/me.js`, middleware de proteção de rota
- [ ] Substituir `bypassLogin()` no HTML pelo fluxo real
