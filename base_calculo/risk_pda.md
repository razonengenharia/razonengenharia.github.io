# Arquitetura e Regras de Negócio - RiskPDA (NBR 5419-2026)

## 1. Visão Geral do Produto
O **RiskPDA** é um módulo avançado de Análise de Risco para Sistemas de Proteção contra Descargas Atmosféricas (SPDA) e Medidas de Proteção contra Surtos (MPS), desenvolvido para a plataforma da **Razon Engenharia**.

O objetivo da ferramenta é substituir planilhas complexas por um software web intuitivo, modular, de altíssimo desempenho e focado em produtividade para o engenheiro, com arquitetura preparada para futura comercialização (SaaS).

---

## 2. Stack Tecnológica e Infraestrutura

### Frontend (Interface & Domínio)
* **HTML5 + Tailwind CSS:** Interface responsiva, limpa e padronizada com a identidade da Razon Engenharia (`#1A2E46` e `#B87333`).
* **Vanilla JavaScript (ES6+):** Execução do motor de cálculo de domínio no cliente, garantindo resposta em tempo real (0ms de latência visual).
* **Hospedagem:** GitHub Pages (estático, ultrasseguro e de custo zero).

### Backend & Persistência (Ponte de Segurança)
* **Banco de Dados:** Neon PostgreSQL Serverless.
* **Camada Intermediária:** Vercel Serverless Functions / Node.js API (para isolar a string de conexão e senhas do banco de dados longe do código do cliente).
* **Autenticação:** Gerenciada nativamente com suporte a usuários/sessões para venda de acessos.

---

## 3. Conceito da Análise de Risco (NBR 5419-2)

### 3.1. A Equação Mestre
O risco ($R$) mede a perda média anual provável na estrutura. Cada componente de risco ($R_x$) é o produto de três pilares:

$$R_x = N_x \times P_x \times L_x$$

Onde:
* **$N_x$ (Anexo A):** Frequência de eventos perigosos por ano (ameaça externa).
* **$P_x$ (Anexo B):** Probabilidade de dano real dado o evento (vulnerabilidade do sistema).
* **$L_x$ (Anexo C):** Magnitude da perda gerada pelo dano (consequência/impacto).

### 3.2. Os Tipos de Risco
1. **$R_1$ (Perda de Vida Humana):** Limite Tolerável ($R_T$) = $10^{-5}$ ($0.00001$).
2. **$F$ / $R_2$ (Perda de Serviço ao Público):** Foco em disponibilidade e continuidade de negócios.
3. **$R_3$ (Perda de Patrimônio Cultural):** Limite Tolerável ($R_T$) = $10^{-4}$ ($0.0001$).
4. **$R_4$ (Perda de Valor Econômico):** Análise opcional de custo-benefício.

### 3.3. Divisão por Zonas e Soma Final
* **Escopo Global (Estrutura):** O Anexo A ($N_x$) avalia a geometria da edificação, o entrono ($C_d$) e as linhas que chegam até ela.
* **Escopo Zonal (Ambientes):** Os Anexos B ($P_x$) e C ($L_x$) variam para cada Zona de Estudo ($Z_s$).
* **Risco Total ($R$):** É o somatório do risco de todas as zonas. Se $R_{Total} > R_T$, o sistema reprova e exige novas medidas de proteção.

---

## 4. Arquitetura de Dados em JavaScript (Objeto de Estado)

Para abstrair as planilhas sem criar código confuso, a ferramenta utiliza um estado centralizado e reativo em JS:

```javascript
const AnaliseRisco = {
    // DADOS GLOBAIS (ANEXO A)
    anexoA: {
        dimensoes: { L: 0, W: 0, H: 0 },
        densidadeRaios: { Ng: 0 },
        fatorLocalizacao: { Cd: 1 },
        adjacente: { temAdj: false, L_adj: 0, W_adj: 0, H_adj: 0, Cd_adj: 1 },
        linhasConectadas: [
            { id: 1, tipo: 'energia', Lc: 0, Ci: 1, Ct: 1, Ce: 1 }
        ],
        resultados: { Nd: 0, Nm: 0, Ndj: 0, Nl: 0, Ni: 0 }
    },

    // DADOS ZONAIS (ANEXOS B E C)
    zonas: [
        {
            id: 1,
            nome: "Zona 1 - Galpão Principal",
            anexoB: {
                rt: 0,       // Tipo de piso/solo
                p_spd: 1,    // Nível de SPDA
                p_eb: 1,     // Equipotencialização
                ks: 1        // Blindagem magnética
            },
            anexoC: {
                rf: 0.01,    // Risco de incêndio
                rp: 1,       // Proteção contra incêndio
                hz: 1,       // Perigo especial/pânico
                tz: 8760,    // Horas/ano de permanência
                nz: 10,      // Pessoas na zona
                nt: 50       // Total de pessoas na edificação
            },
            riscosCalculados: {
                RA: 0, RB: 0, RC: 0, RM: 0, RU: 0, RV: 0, RW: 0, RZ: 0,
                R1_zona: 0
            }
        }
    ],

    // CONSOLIDAÇÃO FINAL
    resultadoGlobal: {
        R1_total: 0,
        limite_R1: 0.00001,
        aprovado: false
    }
};

5. Modelo de Banco de Dados (PostgreSQL / Neon)

-- 1. Tabela de Análises
CREATE TABLE IF NOT EXISTS analises_pda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    nome_projeto VARCHAR(255) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Estrutura (Global - Anexo A)
CREATE TABLE IF NOT EXISTS estruturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analise_id UUID REFERENCES analises_pda(id) ON DELETE CASCADE,
    ng NUMERIC(6,2) NOT NULL,
    comprimento NUMERIC(8,2) NOT NULL,
    largura NUMERIC(8,2) NOT NULL,
    altura NUMERIC(8,2) NOT NULL,
    fator_cd NUMERIC(4,2) NOT NULL,
    tem_adjacente BOOLEAN DEFAULT FALSE,
    comprimento_adj NUMERIC(8,2) DEFAULT 0,
    largura_adj NUMERIC(8,2) DEFAULT 0,
    altura_adj NUMERIC(8,2) DEFAULT 0,
    fator_cda NUMERIC(4,2) DEFAULT 1
);

-- 3. Tabela de Linhas Conectadas
CREATE TABLE IF NOT EXISTS linhas_conectadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analise_id UUID REFERENCES analises_pda(id) ON DELETE CASCADE,
    tipo_linha VARCHAR(50) NOT NULL,
    comprimento_linha NUMERIC(8,2) NOT NULL,
    fator_ci NUMERIC(4,2) NOT NULL,
    fator_ct NUMERIC(4,2) NOT NULL,
    fator_ce NUMERIC(4,2) NOT NULL
);

-- 4. Tabela de Zonas de Estudo (Anexos B e C)
CREATE TABLE IF NOT EXISTS zonas_estudo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analise_id UUID REFERENCES analises_pda(id) ON DELETE CASCADE,
    nome_zona VARCHAR(100) NOT NULL,
    dados_anexo_b JSONB NOT NULL,
    dados_anexo_c JSONB NOT NULL,
    risco_r1_zona NUMERIC(12,9) NOT NULL
);

6. Fluxo de Interface (UX/UI Strategy)

A interface abandona a estética de planilha e adota um Wizard em 3 Passos:Passo 1: Parâmetros Globais (Anexo A)Inputs de dimensões ($L, W, H$).Seletor visual para o Fator de Localização ($C_d$).Cadastro dinâmico das linhas de energia e telecomunicações.Passo 2: Gestão de Zonas de Estudo (Anexos B e C)Criação dinâmica de zonas via botão + Adicionar Zona.Cards em formato Accordion (Sanfona) contendo os dropdowns de revestimento de solo ($r_t$), proteção contra incêndio ($r_f, r_p$) e população ($n_z/n_t$).Passo 3: Dashboard de Resultados & DiagnósticoIndicador visual de APROVADO (verde) ou REPROVADO (vermelho).Gráfico de barras simples mostrando a contribuição de risco de cada zona, orientando onde aplicar melhorias técnicas (DPS, SPDA, extintores).7. Roteiro de Desenvolvimento (Roadmap)[ ] Etapa 1: Implementação do Motor de Cálculo do Anexo A ($N_d, N_m, N_{dj}, N_l, N_i$).[ ] Etapa 2: Implementação do Motor do Anexo B (Probabilidades $P$) e Anexo C (Perdas $L$).[ ] Etapa 3: Criação do Gerenciador de Zonas de Estudo e somatório do Risco Total ($R_1$).[ ] Etapa 4: Construção da Interface HTML/Tailwind em formato de Wizard.[ ] Etapa 5: Conexão do estado local com a API e o Neon Postgres para persistência e relatórios.