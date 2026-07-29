# Arquitetura e Regras de Negócio - RiskPDA (NBR 5419-2026)

## 1. Visão Geral do Produto
O **RiskPDA** é um módulo avançado de Análise de Risco para Sistemas de Proteção contra Descargas Atmosféricas (SPDA) e Medidas de Proteção contra Surtos (MPS), desenvolvido para a plataforma da **Razon Engenharia**.

O objetivo da ferramenta é substituir planilhas complexas por um software web intuitivo, modular, de altíssimo desempenho e focado em produtividade para o engenheiro, com arquitetura preparada para futura comercialização (SaaS).

---

## 2. Autenticação e Controle de Acesso (Login & Segurança)

### 2.1. Estratégia de Acesso ao Card
Para proteger a propriedade intelectual dos algoritmos e viabilizar a monetização futura, o card do **RiskPDA** é protegido por um portal de autenticação (Login e Senha).

* **Modo de Desenvolvimento:** A verificação de sessão pode ser mantida com *bypass* (modo de teste livre) enquanto ajustamos os cálculos dos Anexos A, B e C.
* **Modo de Produção:** O acesso ao formulário e aos relatórios só é liberado após a validação do token do usuário.

### 2.2. Tecnologias de Segurança
* **Neon Auth / JWT (JSON Web Tokens):** Gerenciamento seguro de sessões de usuário.
* **Criptografia:** Senhas armazenadas no banco de dados utilizando hash seguro (`bcrypt` / `argon2`).
* **Proteção de Rotas (Middleware/Guard):** Redirecionamento automático para a tela de login se o usuário tentar acessar a URL do `riskpda.html` diretamente sem estar autenticado.

---

## 3. Stack Tecnológica e Infraestrutura

### Frontend (Interface & Domínio)
* **HTML5 + Tailwind CSS:** Interface responsiva, limpa e padronizada com a identidade da Razon Engenharia (`#1A2E46` e `#B87333`).
* **Vanilla JavaScript (ES6+):** Execução do motor de cálculo de domínio no cliente, garantindo resposta em tempo real (0ms de latência visual).
* **Hospedagem:** GitHub Pages (estático, ultrasseguro e de custo zero).

### Backend & Persistência (Ponte de Segurança)
* **Banco de Dados:** Neon PostgreSQL Serverless.
* **Camada Intermediária:** Vercel Serverless Functions / Node.js API (para isolar a string de conexão e senhas do banco de dados longe do código do cliente).
* **Autenticação:** Gerenciada nativamente com suporte a usuários/sessões para venda de acessos.

### 3.1. Estratégia de Versionamento do Banco de Dados
* **Fase MVP / Desenvolvimento:** Gerenciamento via script SQL consolidado (`01_schema_inicial.sql`). Sem frameworks de migration (Knex/Prisma) para evitar overhead.
* **Fase Pós-Lançamento (SaaS):** Adoção de scripts de alteração incremental (`ALTER TABLE`) ou ferramenta leve de migrations à medida que dados de produção precisem ser preservados.
---

## 4. Conceito da Análise de Risco (NBR 5419-2)

### 4.1. A Equação Mestre
O risco (R) mede a perda média anual provável na estrutura. Cada componente de risco (Rx) é o produto de três pilares:

Rx = Nx x Px x Lx

Onde:
* **Nx (Anexo A):** Frequência de eventos perigosos por ano (ameaça externa).
* **Px (Anexo B):** Probabilidade de dano real dado o evento (vulnerabilidade do sistema).
* **Lx (Anexo C):** Magnitude da perda gerada pelo dano (consequência/impacto).

### 4.2. Os Tipos de Risco
1. **R1 (Perda de Vida Humana):** Limite Tolerável (RT) = 10^-5 (0.00001).
2. **F / R2 (Perda de Serviço ao Público):** Foco em disponibilidade e continuidade de negócios.
3. **R3 (Perda de Patrimônio Cultural):** Limite Tolerável (RT) = 10^-4 (0.0001).
4. **R4 (Perda de Valor Econômico):** Análise opcional de custo-benefício.

### 4.3. Divisão por Zonas e Soma Final
* **Escopo Global (Estrutura):** O Anexo A (Nx) avalia a geometria da edificação, o entorno (Cd) e as linhas que chegam até ela.
* **Escopo Zonal (Ambientes):** Os Anexos B (Px) e C (Lx) variam para cada Zona de Estudo (Zs).
* **Risco Total (R):** É o somatório do risco de todas as zonas. Se R_Total > RT, o sistema reprova e exige novas medidas de proteção.

---

## 5. Arquitetura de Dados em JavaScript (Objeto de Estado)

Para abstrair as planilhas sem criar código confuso, a ferramenta utiliza um estado centralizado e reativo em JS:

```javascript
const AnaliseRisco = {
    // SESSÃO E SEGURANÇA
    usuario: {
        autenticado: false,
        token: null,
        email: ""
    },

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