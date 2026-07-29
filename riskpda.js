// Variáveis Globais de Estado
let AnaliseRisco = { anexoA: {} };
let TABELAS_NORMA = {};
let LISTA_NG = [];
let NgAtual = 0;

// FUNÇÃO 1: Inicialização e Carregamento Seguro dos Dados
async function carregarDados() {
    try {
        // Usa o "./" para garantir que a busca comece da mesma pasta onde está o riskpda.html
        const resTabelas = await fetch('./data/tabelas_anexo_a.json');
        const resNg = await fetch('./data/municipios_ng.json');

        // Validação de segurança: Verifica se o GitHub Pages não retornou uma página de erro 404
        if (!resTabelas.ok) throw new Error(`Arquivo tabelas_anexo_a.json não encontrado (HTTP ${resTabelas.status}). Verifique o nome e a pasta.`);
        if (!resNg.ok) throw new Error(`Arquivo municipios_ng.json não encontrado (HTTP ${resNg.status}). Verifique o nome e a pasta.`);

        // Extrai o JSON
        TABELAS_NORMA = await resTabelas.json();
        LISTA_NG = await resNg.json();

        popularInterface();
    } catch (erro) {
        console.error("Detalhes do Erro de Carregamento:", erro);
        // Agora o alerta te mostra a causa exata do problema!
        alert(`Erro Crítico:\n${erro.message}\n\n(Dica: Se o erro for de 'Unexpected token' ou 'JSON', há um erro de digitação/vírgula dentro dos seus arquivos .json).`);
    }
}

// FUNÇÃO 2: Popular os selects com base no JSON
function popularInterface() {
    // 1. Popular Datalist de Municípios
    const datalist = document.getElementById('lista-municipios');
    datalist.innerHTML = ''; // Limpa antes de preencher
    LISTA_NG.forEach(item => {
        const option = document.createElement('option');
        option.value = `${item.municipio}, ${item.uf}`;
        datalist.appendChild(option);
    });

    // 2. Função auxiliar para preencher Selects genéricos
    const preencherSelect = (idSelect, dadosArray) => {
        const select = document.getElementById(idSelect);
        select.innerHTML = ''; 
        if(dadosArray && dadosArray.length > 0) {
            dadosArray.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.valor;
                opt.textContent = `${item.descricao} (${item.valor})`;
                select.appendChild(opt);
            });
        }
    };

    // Preenche as Tabelas (A.1, A.2, A.3, A.4)
    preencherSelect('fator-cd', TABELAS_NORMA.tabela_A1_CD);
    preencherSelect('fator-cdj', TABELAS_NORMA.tabela_A1_CD);

    preencherSelect('linha-en-ci', TABELAS_NORMA.tabela_A2_CI);
    preencherSelect('linha-en-ct', TABELAS_NORMA.tabela_A3_CT);
    preencherSelect('linha-en-ce', TABELAS_NORMA.tabela_A4_CE);

    preencherSelect('linha-si-ci', TABELAS_NORMA.tabela_A2_CI);
    preencherSelect('linha-si-ct', TABELAS_NORMA.tabela_A3_CT);
    preencherSelect('linha-si-ce', TABELAS_NORMA.tabela_A4_CE);
    
    // Inicia com valores padrão da norma
    if(document.getElementById('linha-si-ct').options.length > 0) {
        document.getElementById('linha-si-ct').value = "1";
    }
    if(document.getElementById('linha-en-ct').options.length > 0) {
        document.getElementById('linha-en-ct').value = "0.2";
    }

    calcularAnexoA(); // Dispara o cálculo inicial
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
        setTimeout(() => bloco.classList.remove('opacity-50'), 50);
        inputs.forEach(i => i.disabled = false);
    } else {
        bloco.classList.add('opacity-50');
        setTimeout(() => bloco.classList.add('hidden'), 300);
        inputs.forEach(i => i.disabled = true);
        
        document.getElementById('adj-l').value = '';
        document.getElementById('adj-w').value = '';
        document.getElementById('adj-h').value = '';
    }
    calcularAnexoA();
}

// FUNÇÃO 4: Motor Matemático NBR 5419-2 (Anexo A)
function calcularAnexoA() {
    const buscaNg = document.getElementById('ng-search').value;
    const municipioEncontrado = LISTA_NG.find(m => `${m.municipio}, ${m.uf}` === buscaNg);
    
    NgAtual = municipioEncontrado ? municipioEncontrado.ng : 0;
    document.getElementById('ng-display').textContent = NgAtual;

    const L = parseFloat(document.getElementById('dim-l').value) || 0;
    const W = parseFloat(document.getElementById('dim-w').value) || 0;
    const H = parseFloat(document.getElementById('dim-h').value) || 0;
    const Cd = parseFloat(document.getElementById('fator-cd').value) || 1;

    const L_adj = parseFloat(document.getElementById('adj-l').value) || 0;
    const W_adj = parseFloat(document.getElementById('adj-w').value) || 0;
    const H_adj = parseFloat(document.getElementById('adj-h').value) || 0;
    const Cdj = parseFloat(document.getElementById('fator-cdj').value) || 1;

    const En_LL = parseFloat(document.getElementById('linha-en-ll').value) || 0;
    const En_Ci = parseFloat(document.getElementById('linha-en-ci').value) || 1;
    const En_Ct = parseFloat(document.getElementById('linha-en-ct').value) || 1;
    const En_Ce = parseFloat(document.getElementById('linha-en-ce').value) || 1;

    const Si_LL = parseFloat(document.getElementById('linha-si-ll').value) || 0;
    const Si_Ci = parseFloat(document.getElementById('linha-si-ci').value) || 1;
    const Si_Ct = parseFloat(document.getElementById('linha-si-ct').value) || 1;
    const Si_Ce = parseFloat(document.getElementById('linha-si-ce').value) || 1;

    // Constante Fator de Risco 10^-6
    const fatorDeRisco = Math.pow(10, -6);

    const Ad = (L * W) + (2 * (3 * H) * (L + W)) + (Math.PI * Math.pow(3 * H, 2));
    const Am = (2 * 500 * (L + W)) + (Math.PI * Math.pow(500, 2));
    const Nd = NgAtual * Ad * Cd * fatorDeRisco;
    const Nm = NgAtual * Am * fatorDeRisco;

    let Ndj = 0;
    if (document.getElementById('toggle-adjacente').checked) {
        const Adj = (L_adj * W_adj) + (2 * (3 * H_adj) * (L_adj + W_adj)) + (Math.PI * Math.pow(3 * H_adj, 2));
        Ndj = NgAtual * Adj * Cdj * fatorDeRisco;
    }

    const Al_en = 40 * En_LL;
    const Ai_en = 4000 * En_LL;
    const Nl_en = NgAtual * Al_en * En_Ci * En_Ct * En_Ce * fatorDeRisco;
    const Ni_en = NgAtual * Ai_en * En_Ci * En_Ct * En_Ce * fatorDeRisco;

    const Al_si = 40 * Si_LL;
    const Ai_si = 4000 * Si_LL;
    const Nl_si = NgAtual * Al_si * Si_Ci * Si_Ct * Si_Ce * fatorDeRisco;
    const Ni_si = NgAtual * Ai_si * Si_Ci * Si_Ct * Si_Ce * fatorDeRisco;

    // Atualiza o Objeto de Estado Local
    AnaliseRisco.anexoA = {
        Nd, Nm, Ndj,
        linhas: {
            energia: { LL: En_LL, Ci: En_Ci, Ct: En_Ct, Ce: En_Ce, Nl: Nl_en, Ni: Ni_en },
            sinal: { LL: Si_LL, Ci: Si_Ci, Ct: Si_Ct, Ce: Si_Ce, Nl: Nl_si, Ni: Ni_si }
        }
    };

    // Imprime na Interface
    document.getElementById('out-nd').innerText = Nd.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-nm').innerText = Nm.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-ndj').innerText = Ndj.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-nl-en').innerText = Nl_en.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-ni-en').innerText = Ni_en.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-nl-si').innerText = Nl_si.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    document.getElementById('out-ni-si').innerText = Ni_si.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
}

document.addEventListener('DOMContentLoaded', carregarDados);