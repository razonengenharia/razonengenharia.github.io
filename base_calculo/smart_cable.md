# Documentação de Ferramentas - Razon Engenharia

## 1. Visão Geral
Este documento descreve as regras de negócio, validações matemáticas e fluxo de dados das aplicações de cálculo desenvolvidas pela Razon Engenharia.

---

## 2. Ferramenta: SmartCable (NBR 5410)
O **SmartCable** é um utilitário avançado para dimensionamento e validação de condutores de cobre (Baixa Tensão) com base na NBR 5410. Ele permite calcular Seção Mínima, Queda de Tensão ou Comprimento Máximo.

### 2.1. Variáveis e Constantes Globais (Base JS)
* **rho:** Resistividade do cobre a 70°C. Valor fixo de 0.021.
* **kv:** Fator dependente do tipo de sistema (`type`). Se trifásico vale raiz de 3 (1.732), senão vale 2.
* **kp:** Fator de potência da configuração (`type`). Se trifásico vale raiz de 3 (1.732), senão vale 1.

### 2.2. Parâmetros de Entrada e Limites
* **target:** Alvo do cálculo. Pode ser 'S' (Seção), 'dU' (Queda de Tensão) ou 'L' (Comprimento).
* **type:** Sistema selecionado. Pode ser 'mono', 'bi' ou 'tri'.
* **vnom:** Tensão nominal. Opções dependem do sistema (127V, 220V, 380V).
* **p:** Potência em Watts. Limite de 1 a 200000.
* **fp:** Fator de potência. Limite de 0.1 a 1.
* **fh:** Fator de harmônica. Seleção via menu (1 a 1.73).
* **L:** Comprimento em metros. Limite de 0.1 a 1000.
* **dUmax:** Queda de tensão máxima aceitável. Limite de 4 (maior que 0).
* **S_instalado:** Seção comercial do cabo instalado (de 0.75 a 50).
* **cabosComerciais:** Array contendo as seções de cabos disponíveis para comparação e recomendação.

### 2.3. Fórmulas de Cálculo (Core Lógico)

**Cálculos Base de Corrente:**
* Corrente de Projeto: `ib = p / (kp * vnom * fp)`
* Corrente Corrigida: `i = ib * fh`

**Cálculos por Alvo (target):**
* **target === 'S' (Seção Mínima):**
  Fórmula: `s_calc = (kv * rho * L * i * 100) / (dUmax * vnom)`
  *Nota: Após o cálculo, o sistema varre o array `cabosComerciais` e seleciona a primeira seção maior ou igual ao `s_calc`.*

* **target === 'dU' (Queda de Tensão):**
  Fórmula: `dU_calc = (kv * rho * L * i * 100) / (S_instalado * vnom)`

* **target === 'L' (Comprimento Máximo):**
  Fórmula: `l_calc = (dUmax * S_instalado * vnom) / (kv * rho * i * 100)`

### 2.4. Validação Baseada em Cálculos Manuais
As fórmulas codificadas foram validadas contra exercícios físicos de dimensionamento.

**Exemplo Prático 1 (Queda de Tensão - Forno Elétrico)**
* **Entradas:** type = 'mono', vnom = 127, p = 4445, fp = 1, L = 25, S_instalado = 10.
* **Processamento:**
  * ib = 4445 / (1 * 127 * 1) = 35 A
  * dU_calc = (2 * 0.021 * 25 * 35 * 100) / (10 * 127) = 3675 / 1270 = ~2.89%
* **Status:** Aprovado (menor que 4%).

**Exemplo Prático 2 (Seção de Condutor - Rack Alta Densidade)**
* **Entradas:** type = 'tri', vnom = 220, p = 7000, fp = 0.9, fh = 1.73, L = 40, dUmax = 4.
* **Processamento:**
  * ib = 7000 / (1.732 * 220 * 0.9) = ~20.41 A
  * i = 20.41 * 1.73 = ~35.31 A
  * s_calc = (1.732 * 0.021 * 40 * 35.31 * 100) / (4 * 220) = ~5.84 mm²
* **Status:** O sistema buscará no array `cabosComerciais` e recomendará o cabo de 6 mm² para garantir uma queda de tensão abaixo de 4%.