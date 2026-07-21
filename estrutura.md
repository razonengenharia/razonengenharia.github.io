# Documentação da Estrutura do Site - Razon Engenharia

## 1. Visão Geral
O site institucional da **Razon Engenharia** foi desenvolvido no formato híbrido (One-Page principal + subpáginas de ferramentas), focado em conversão e apresentação clara de autoridade técnica. O design é minimalista, moderno e orientado a resultados[cite: 12].

## 2. Tecnologias Utilizadas
* **HTML5:** Estrutura semântica das páginas[cite: 12].
* **Tailwind CSS:** Framework utilitário de CSS via CDN para estilização rápida e responsiva[cite: 12].
* **Vanilla JavaScript:** Manipulação de DOM para interatividade (menu mobile e ferramentas de cálculo) sem dependência de bibliotecas externas[cite: 13, 15].
* **FontAwesome (v6.0.0):** Biblioteca de ícones[cite: 12].

## 3. Identidade Visual e Paleta de Cores
As cores foram definidas estritamente no arquivo de configuração do Tailwind e no `style.css`[cite: 12, 16]:
* **Azul Escuro Corporativo (`#1A2E46`):** Cor de fundo principal para áreas de destaque (Hero, rodapé, cabeçalho de relatórios) e botões de ação (CTA). Representa solidez e confiança[cite: 16].
* **Cobre (`#B87333`):** Cor temática de engenharia elétrica. Usada para destaques, ícones, links com efeito hover e tipografia secundária[cite: 16].
* **Claro/Gelo (`#F8F9FA` e `bg-slate-50`):** Fundo predominante para manter o minimalismo, legibilidade e aspecto profissional das seções de conteúdo[cite: 12, 16].

## 4. Mapa do Site (Sitemap)

### 4.1. Página Inicial (`index.html`)
Página principal focada em atrair clientes e segmentar os serviços. É dividida nas seguintes seções (com navegação via âncoras locais)[cite: 12]:
* **Header:** Barra de navegação fixa com vidro fosco (backdrop-blur) e botão de CTA[cite: 12].
* **Hero Section:** Gradiente radial e linear com a proposta de valor principal ("Engenharia de Precisão. Resultados Reais") e dois botões de ação[cite: 12, 16].
* **Serviços (`#servicos`):** Dividida estrategicamente em dois níveis de prioridade[cite: 12]:
  * **Nível 1 (Pilares Principais):** 3 cards com imagem de fundo (Projetos BIM, SPDA, Sistemas Solares Off-Grid)[cite: 12].
  * **Nível 2 (Diagnóstico e Eficiência):** 3 cards compactos (Qualidade de Energia, Termografia, Projetos Luminotécnicos)[cite: 12].
* **Sobre (`#sobre`):** Apresentação do Engenheiro Fernando Freire, destacando a filosofia da empresa e o registro no CREA-SP[cite: 12].
* **Contato (`#contato`):** Card de conversão com botão direto para WhatsApp e opção de e-mail[cite: 12].

### 4.2. Hub de Ferramentas (`ferramentas.html`)
Página dedicada a hospedar aplicações web desenvolvidas pela Razon[cite: 11].
* Conta com um grid adaptável para múltiplas ferramentas[cite: 11].
* Atualmente exibe o card da aplicação **SmartCable** com botão de acesso direto[cite: 11].

### 4.3. Aplicação SmartCable (`smartcable.html`)
Página da ferramenta interativa de cálculos elétricos (documentação lógica separada)[cite: 14]. Layout dividido em formulário de entrada (esquerda) e relatório técnico de saída (direita)[cite: 14].

## 5. Estrutura de Arquivos Estáticos
* `style.css`: Contém animações customizadas (`@keyframes float`), efeitos de hover (bordas, linhas inferiores nos links) e gradientes técnicos[cite: 16].
* `script.js`: Script base do site, responsável atualmente pelo toggle do menu mobile[cite: 13].
* `/assets/`: Diretório de imagens (logos, fotos do engenheiro, banners, representações de serviços e ferramentas)[cite: 12, 14].