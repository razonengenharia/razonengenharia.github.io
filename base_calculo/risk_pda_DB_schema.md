-- 1. Tabela de Usuários / Credenciais
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    crea VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Análises
CREATE TABLE IF NOT EXISTS analises_pda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_projeto VARCHAR(255) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Estrutura (Global - Anexo A)
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

-- 4. Tabela de Linhas Conectadas
CREATE TABLE IF NOT EXISTS linhas_conectadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analise_id UUID REFERENCES analises_pda(id) ON DELETE CASCADE,
    tipo_linha VARCHAR(50) NOT NULL,
    comprimento_linha NUMERIC(8,2) NOT NULL,
    fator_ci NUMERIC(4,2) NOT NULL,
    fator_ct NUMERIC(4,2) NOT NULL,
    fator_ce NUMERIC(4,2) NOT NULL
);

-- 5. Tabela de Zonas de Estudo (Anexos B e C)
CREATE TABLE IF NOT EXISTS zonas_estudo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analise_id UUID REFERENCES analises_pda(id) ON DELETE CASCADE,
    nome_zona VARCHAR(100) NOT NULL,
    dados_anexo_b JSONB NOT NULL,
    dados_anexo_c JSONB NOT NULL,
    risco_r1_zona NUMERIC(12,9) NOT NULL
);