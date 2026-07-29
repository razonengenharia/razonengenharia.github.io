// Variáveis para armazenar os dados dos JSONs
let TABELAS_NORMA = {};
let LISTA_NG = [];
let NgAtual = 0; // Valor padrão inicial

// FUNÇÃO 1: Inicialização e Carregamento dos Dados
async function carregarDados() {
    try {
        // Carrega simultaneamente os dois arquivos JSON (Certifique-se de estar rodando em Live Server/localhost)
        const [resTabelas, resNg] = await Promise.all([
            fetch('data/tabelas_anexo_a.json'),
            fetch('data/municipios_ng.json')
        ]);

        TABELAS_NORMA = await resTabelas.json();
        LISTA_NG = await resNg.json();

        popularInterface();
    } catch (erro) {
        console.error("Erro ao carregar arquivos JSON:", erro);
        alert("Erro ao carregar as tabelas da NBR 5419. Verifique os arquivos na pasta /data.");
    }
}

// FUNÇÃO 2: Popular os selects com base no JSON
function popularInterface() {
    // 1. Popular Datalist de Municípios
    const datalist = document.getElementById('lista-municipios');
    LISTA_NG.forEach(item => {
        const option = document.createElement('option');
        option.value = `${item.municipio}, ${item.uf}`; // Ex: Araçatuba, SP
        datalist.appendChild(option);
    });

    // 2. Função auxiliar para preencher Selects genéricos
    const preencherSelect = (idSelect, dadosArray) => {
        const select = document.getElementById(idSelect);
        select.innerHTML = ''; // Limpar
        dadosArray.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.valor;
            opt.textContent = `${item.descricao} (${item.valor})`;
            select.appendChild(opt);
        });
    };

    // Tabela A.1 (Cd e Cdj)
    preencherSelect('fator-cd', TABELAS_NORMA.tabela_A1_CD);
    preencherSelect('fator-cdj', TABELAS_NORMA.tabela_A1_CD);

    // Tabelas de Linhas (Energia)
    preencherSelect('linha-en-ci', TABELAS_NORMA.tabela_A2_CI);
    preencherSelect('linha-en-ct', TABELAS_NORMA.tabela_A3_CT);
    preencherSelect('linha-en-ce', TABELAS_NORMA.tabela_A4_CE);

    // Tabelas de Linhas (Sinal)
    preencherSelect('linha-si-ci', TABELAS_NORMA.tabela_A2_CI);
    preencherSelect('linha-si-ct', TABELAS_NORMA.tabela_A3_CT);
    preencherSelect('linha-si-ce', TABELAS_NORMA.tabela_A4_CE);
    
    // Inicia com valor CT 1.0 para sinal por padrão
    document.getElementById('linha-si-ct').value = "1";
    document.getElementById('linha-en-ct').value = "0.2"; // Padrão Energia AT

    calcularAnexoA(); // Executa o cálculo inicial (tudo 0)
}

// FUNÇÃO 3: Controle Visual
function bypassLogin() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');
}

function toggleAdjacente() {
    const isAtivo = document.getElementById('toggle-adjacente').checked;
    const bloco = document.getElementById('bloco-adjacente');
    const inputs = bloco.querySelectorAll('input, select');
    
    if(isAtivo) {
        bloco.classList.remove('hidden');
        setTimeout(() => bloco.classList.remove('opacity-50'), 50); // Efeito fade-in
        inputs.forEach(i => i.disabled = false);
    } else {
        bloco.classList.add('opacity-50');
        setTimeout(() => bloco.classList.add('hidden'), 300);
        inputs.forEach(i => i.disabled = true);
        
        // Zera os valores para não impactar cálculo
        document.getElementById('adj-l').value = '';
        document.getElementById('adj-w').value = '';
        document.getElementById('adj-h').value = '';
    }
    calcularAnexoA();
}

// FUNÇÃO 4: Motor Matemático NBR 5419-2 (Anexo A)
function calcularAnexoA() {
    // 1. Busca do Ng baseado no Input Text
    const buscaNg = document.getElementById('ng-search').value;
    const municipioEncontrado = LISTA_NG.find(m => `${m.municipio}, ${m.uf}` === buscaNg);
    
    NgAtual = municipioEncontrado ? municipioEncontrado.ng : 0;
    document.getElementById('ng-display').textContent = NgAtual;

    // 2. Parâmetros Estrutura Principal
    const L = parseFloat(document.getElementById('dim-l').value) || 0;
    const W = parseFloat(document.getElementById('dim-w').value) || 0;
    const H = parseFloat(document.getElementById('dim-h').value) || 0;
    const Cd = parseFloat(document.getElementById('fator-cd').value) || 1;

    // 3. Parâmetros Adjacente
    const L_adj = parseFloat(document.getElementById('adj-l').value) || 0;
    const W_adj = parseFloat(document.getElementById('adj-w').value) || 0;
    const H_adj = parseFloat(document.getElementById('adj-h').value) || 0;
    const Cdj = parseFloat(document.getElementById('fator-cdj').value) || 1;

    // 4. Parâmetros Linhas
    const En_LL = parseFloat(document.getElementById('linha-en-ll').value) || 0;
    const En_Ci = parseFloat(document.getElementById('linha-en-ci').value) || 1;
    const En_Ct = parseFloat(document.getElementById('linha-en-ct').value) || 1;
    const En_Ce = parseFloat(document.getElementById('linha-en-ce').value) || 1;

    const Si_LL = parseFloat(document.getElementById('linha-si-ll').value) || 0;
    const Si_Ci = parseFloat(document.getElementById('linha-si-ci').value) || 1;
    const Si_Ct = parseFloat(document.getElementById('linha-si-ct').value) || 1;
    const Si_Ce = parseFloat(document.getElementById('linha-si-ce').value) || 1;

    // --- CÁLCULOS (Matemática da Norma) --- //
    const fatorDeRisco = Math.pow(10, -6);

    // Estrutura
    const Ad = (L * W) + (2 * (3 * H) * (L + W)) + (Math.PI * Math.pow(3 * H, 2));
    const Am = (2 * 500 * (L + W)) + (Math.PI * Math.pow(500, 2));
    const Nd = NgAtual * Ad * Cd * fatorDeRisco;
    const Nm = NgAtual * Am * fatorDeRisco;

    // Adjacente
    let Ndj = 0;
    if (document.getElementById('toggle-adjacente').checked) {
        const Adj = (L_adj * W_adj) + (2 * (3 * H_adj) * (L_adj + W_adj)) + (Math.PI * Math.pow(3 * H_adj, 2));
        Ndj = NgAtual * Adj * Cdj * fatorDeRisco;
    }

    // Linha Energia (AL = 40*L, AI = 4000*L)
    const Al_en = 40 * En_LL;
    const Ai_en = 4000 * En_LL;
    const Nl_en = NgAtual * Al_en * En_Ci * En_Ct * En_Ce * fatorDeRisco;
    const Ni_en = NgAtual * Ai_en * En_Ci * En_Ct * En_Ce * fatorDeRisco;

    // Linha Sinal
    const Al_si = 40 * Si_LL;
    const Ai_si = 4000 * Si_LL;
    const Nl_si = NgAtual * Al_si * Si_Ci * Si_Ct * Si_Ce * fatorDeRisco;
    const Ni_si = NgAtual * Ai_si * Si_Ci * Si_Ct * Si_Ce * fatorDeRisco;

    // Total de Linhas
    const Nl_total = Nl_en + Nl_si;
    const Ni_total = Ni_en + Ni_si;

    // 5. Atualizar Interface
    document.getElementById('out-nd').innerText = Nd.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-nm').innerText = Nm.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-ndj').innerText = Ndj.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-nl').innerText = Nl_total.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-ni').innerText = Ni_total.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
}

// Disparar carregamento ao iniciar o JS
document.addEventListener('DOMContentLoaded', carregarDados);