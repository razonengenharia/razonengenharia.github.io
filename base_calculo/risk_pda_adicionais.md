7. Fluxo de Interface (UX/UI Strategy)
A interface abandona a estética de planilha e adota um Gateway de Login + Wizard em 3 Passos:

Gateway de Acesso (Modal / Tela de Login)
Formulário limpo de E-mail e Senha.

Botão de login com persistência de sessão.

Passo 1: Parâmetros Globais (Anexo A)
Inputs de dimensões (L, W, H).

Seletor visual para o Fator de Localização (Cd).

Cadastro dinâmico das linhas de energia e telecomunicações.

Passo 2: Gestão de Zonas de Estudo (Anexos B e C)
Criação dinâmica de zonas via botão "+ Adicionar Zona".

Cards em formato Accordion (Sanfona) contendo os dropdowns de revestimento de solo (rt), proteção contra incêndio (rf, rp) e população (nz/nt).

Passo 3: Dashboard de Resultados & Diagnóstico
Indicador visual de APROVADO (verde) ou REPROVADO (vermelho).

Gráfico de barras simples mostrando a contribuição de risco de cada zona, orientando onde aplicar melhorias técnicas (DPS, SPDA, extintores).

8. Roteiro de Desenvolvimento (Roadmap)
[ ] Etapa 1: Implementação do Motor de Cálculo do Anexo A (Nd, Nm, Ndj, Nl, Ni).

[ ] Etapa 2: Implementação do Motor do Anexo B (Probabilidades P) e Anexo C (Perdas L).

[ ] Etapa 3: Criação do Gerenciador de Zonas de Estudo e somatório do Risco Total (R1).

[ ] Etapa 4: Construção da Interface HTML/Tailwind em formato de Wizard.

[ ] Etapa 5: Modal de Login/Senha e integração da rota de autenticação.

[ ] Etapa 6: Conexão do estado local com a API e o Neon Postgres para persistência e relatórios.

9. Variáveis Específicas por Zona de Estudo (Zs)
As variáveis que mudam para cada Zona de Estudo (Zs) são aquelas que descrevem as características internas de proteção, o tipo de solo e o uso do espaço. Diferente do Anexo A, que foca na estrutura como um todo, as variáveis abaixo permitem que o risco seja "refinado" para cada ambiente.

Aqui estão as principais variáveis divididas por anexo:

Relacionadas ao Anexo B (Probabilidades - P)
Estas variáveis definem a chance de um raio causar dano real naquela zona específica:

rt (Resistividade do solo/piso): Indica o tipo de revestimento (ex: asfalto, grama, concreto) que reduz o risco de choque por tensão de passo e toque naquela zona.

P_SPD / KS: Eficiência dos DPS coordenados e da blindagem magnética (como telas metálicas ou armaduras) instaladas especificamente para proteger os equipamentos daquela zona.

Relacionadas ao Anexo C (Perdas - L)
Estas variáveis quantificam o "tamanho do prejuízo" se um evento ocorrer na zona:

nz / nt: Relação entre o número de pessoas na zona e o total da edificação.

tz: Tempo (em horas/ano) que as pessoas permanecem dentro daquela zona específica.

rf (Risco de incêndio): Define se a zona tem carga de incêndio alta, média ou baixa (ex: um almoxarifado vs. um hall de entrada).

rp (Medidas contra incêndio): Presença de extintores, hidrantes ou sistemas automáticos exclusivos daquela área.

hz (Perigo especial): Fator que aumenta a perda se houver dificuldade de evacuação ou risco de pânico na zona (ex: hospitais ou escolas).

O Anexo A não muda por zona?
Geralmente não. O Anexo A define o número de raios que atingem a estrutura (ND) ou as linhas (NL), e esses valores costumam ser fixos para o prédio inteiro. A divisão por zonas serve justamente para aplicar as probabilidades (P) e perdas (L) locais sobre esse "perigo externo" constante.