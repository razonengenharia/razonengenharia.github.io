// Variáveis Globais de Estado
let AnaliseRisco = { anexoA: {} };
let TABELAS_NORMA = {};
let LISTA_NG = [];
let NgAtual = 0;

// FUNÇÃO 1: Inicialização e Carregamento Seguro
async function carregarDados() {
    try {
        const resTabelas = await fetch('./data/tabelas_anexo_a.json');
        const resNg = await fetch('./data/municipios_ng.json');

        if (!resTabelas.ok) throw new Error(`Arquivo tabelas_anexo_a.json não encontrado (HTTP ${resTabelas.status}).`);
        if (!resNg.ok) throw new Error(`Arquivo municipios_ng.json não encontrado (HTTP ${resNg.status}).`);

        TABELAS_NORMA = await resTabelas.json();
        LISTA_NG = await resNg.json();

        popularInterface();
        configurarLimitesInputs();
    } catch (erro) {
        console.error("Detalhes do Erro de Carregamento:", erro);
        alert(`Erro Crítico:\n${erro.message}\n\n(Dica: Verifique digitação nos arquivos JSON ou pastas).`);
    }
}

// FUNÇÃO 2: Popular Selects e Filtros em Cascata
function popularInterface() {
    // 2.1 Filtro Cascata de Estado e Município
    const estadoSelect = document.getElementById('estado-select');
    const municipioSelect = document.getElementById('municipio-select');

    // Mapeia Estados Únicos e Ordena
    const ufs = [...new Set(LISTA_NG.map(item => item.uf))].sort();
    
    estadoSelect.innerHTML = '<option value="">Selecione o Estado</option>';
    ufs.forEach(uf => {
        const opt = document.createElement('option');
        opt.value = uf;
        opt.textContent = uf;
        estadoSelect.appendChild(opt);
    });

    // Listener de Mudança do Estado
    estadoSelect.addEventListener('change', (e) => {
        const ufSelecionada = e.target.value;
        municipioSelect.innerHTML = '<option value="">Selecione a Cidade</option>';
        
        if (!ufSelecionada) {
            municipioSelect.disabled = true;
            NgAtual = 0;
            document.getElementById('ng-display').textContent = NgAtual;
            calcularAnexoA();
            return;
        }

        const municipios = LISTA_NG.filter(item => item.uf === ufSelecionada).sort((a,b) => a.municipio.localeCompare(b.municipio));
        
        municipios.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.ng;
            opt.textContent = m.municipio;
            opt.dataset.nome = m.municipio; // Guarda nome para autoselect
            municipioSelect.appendChild(opt);
        });
        
        municipioSelect.disabled = false;
        
        // Zera o Ng ao trocar de estado
        NgAtual = 0; 
        document.getElementById('ng-display').textContent = NgAtual;
        calcularAnexoA();
    });

    // Listener de Mudança da Cidade
    municipioSelect.addEventListener('change', (e) => {
        NgAtual = parseFloat(e.target.value) || 0;
        document.getElementById('ng-display').textContent = NgAtual;
        calcularAnexoA();
    });

    // 2.2 Preencher Selects das Tabelas
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

    preencherSelect('fator-cd', TABELAS_NORMA.tabela_A1_CD);
    preencherSelect('fator-cdj', TABELAS_NORMA.tabela_A1_CD);
    preencherSelect('linha-en-ci', TABELAS_NORMA.tabela_A2_CI);
    preencherSelect('linha-en-ct', TABELAS_NORMA.tabela_A3_CT);
    preencherSelect('linha-en-ce', TABELAS_NORMA.tabela_A4_CE);
    preencherSelect('linha-si-ci', TABELAS_NORMA.tabela_A2_CI);
    preencherSelect('linha-si-ct', TABELAS_NORMA.tabela_A3_CT);
    preencherSelect('linha-si-ce', TABELAS_NORMA.tabela_A4_CE);
    
    // Inicia com valores padrão
    if(document.getElementById('linha-si-ct').options.length > 0) document.getElementById('linha-si-ct').value = "1";
    if(document.getElementById('linha-en-ct').options.length > 0) document.getElementById('linha-en-ct').value = "0.2";

    // Padrão de Inicialização Razon (SP -> Araçatuba)
    estadoSelect.value = "SP";
    estadoSelect.dispatchEvent(new Event('change'));
    
    const araOpt = Array.from(municipioSelect.options).find(o => o.dataset.nome === 'Araçatuba');
    if (araOpt) {
        municipioSelect.value = araOpt.value;
        municipioSelect.dispatchEvent(new Event('change'));
    } else {
        calcularAnexoA();
    }
}

// FUNÇÃO 3: Proteção de Limites Mínimos e Máximos de Input
function configurarLimitesInputs() {
    const limites = [
        { id: 'dim-l', min: 1, max: 1000 },
        { id: 'dim-w', min: 1, max: 1000 },
        { id: 'dim-h', min: 1, max: 100 },
        { id: 'adj-l', min: 1, max: 1000 },
        { id: 'adj-w', min: 1, max: 1000 },
        { id: 'adj-h', min: 1, max: 100 },
        { id: 'linha-en-ll', min: 1, max: 1000 },
        { id: 'linha-si-ll', min: 1, max: 1000 },
    ];

    limites.forEach(lim => {
        const el = document.getElementById(lim.id);
        if(!el) return;
        
        // Protege limite máximo dinamicamente durante digitação
        el.addEventListener('input', () => {
            let v = parseFloat(el.value);
            if (v > lim.max) { 
                el.value = lim.max; 
                calcularAnexoA(); 
            }
        });
        
        // Protege o limite mínimo ao sair do campo (para permitir apagar durante digitação)
        el.addEventListener('blur', () => {
            let v = parseFloat(el.value);
            if (isNaN(v) || v < lim.min) { 
                el.value = lim.min; 
                calcularAnexoA(); 
            }
        });
    });
}

// FUNÇÃO 4: Controles Visuais
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

// FUNÇÃO 5: Motor Matemático NBR 5419-2 (Anexo A)
function calcularAnexoA() {
    // Constante Fator de Risco 10^-6
    const fatorDeRisco = Math.pow(10, -6);

    // Variáveis da Estrutura
    const L = parseFloat(document.getElementById('dim-l').value) || 0;
    const W = parseFloat(document.getElementById('dim-w').value) || 0;
    const H = parseFloat(document.getElementById('dim-h').value) || 0;
    const Cd = parseFloat(document.getElementById('fator-cd').value) || 1;

    // Variáveis do Adjacente
    const L_adj = parseFloat(document.getElementById('adj-l').value) || 0;
    const W_adj = parseFloat(document.getElementById('adj-w').value) || 0;
    const H_adj = parseFloat(document.getElementById('adj-h').value) || 0;
    const Cdj = parseFloat(document.getElementById('fator-cdj').value) || 1;

    // Variáveis das Linhas
    const En_LL = parseFloat(document.getElementById('linha-en-ll').value) || 0;
    const En_Ci = parseFloat(document.getElementById('linha-en-ci').value) || 1;
    const En_Ct = parseFloat(document.getElementById('linha-en-ct').value) || 1;
    const En_Ce = parseFloat(document.getElementById('linha-en-ce').value) || 1;

    const Si_LL = parseFloat(document.getElementById('linha-si-ll').value) || 0;
    const Si_Ci = parseFloat(document.getElementById('linha-si-ci').value) || 1;
    const Si_Ct = parseFloat(document.getElementById('linha-si-ct').value) || 1;
    const Si_Ce = parseFloat(document.getElementById('linha-si-ce').value) || 1;

    // 1. Áreas da Estrutura
    const Ad = (L * W) + (2 * (3 * H) * (L + W)) + (Math.PI * Math.pow(3 * H, 2));
    const Am = (2 * 500 * (L + W)) + (Math.PI * Math.pow(500, 2));
    
    // Eventos da Estrutura
    const Nd = NgAtual * Ad * Cd * fatorDeRisco;
    const Nm = NgAtual * Am * fatorDeRisco;

    // 2. Cálculo do Ndj Desmembrado (Adjacente)
    let Ndj_en = 0;
    let Ndj_si = 0;
    if (document.getElementById('toggle-adjacente').checked) {
        const Adj = (L_adj * W_adj) + (2 * (3 * H_adj) * (L_adj + W_adj)) + (Math.PI * Math.pow(3 * H_adj, 2));
        
        // Pela Eq. A.4, o fator Ct da linha reduz o risco propagado da adjacente
        Ndj_en = NgAtual * Adj * Cdj * En_Ct * fatorDeRisco;
        Ndj_si = NgAtual * Adj * Cdj * Si_Ct * fatorDeRisco;
    }

    // 3. Cálculo Linha Energia Isolada
    const Al_en = 40 * En_LL;
    const Ai_en = 4000 * En_LL;
    const Nl_en = NgAtual * Al_en * En_Ci * En_Ct * En_Ce * fatorDeRisco;
    const Ni_en = NgAtual * Ai_en * En_Ci * En_Ct * En_Ce * fatorDeRisco;

    // 4. Cálculo Linha Sinal Isolada
    const Al_si = 40 * Si_LL;
    const Ai_si = 4000 * Si_LL;
    const Nl_si = NgAtual * Al_si * Si_Ci * Si_Ct * Si_Ce * fatorDeRisco;
    const Ni_si = NgAtual * Ai_si * Si_Ci * Si_Ct * Si_Ce * fatorDeRisco;

    // 5. Atualiza o Objeto de Estado Local
    AnaliseRisco.anexoA = {
        Nd, Nm,
        linhas: {
            energia: { LL: En_LL, Ci: En_Ci, Ct: En_Ct, Ce: En_Ce, Ndj: Ndj_en, Nl: Nl_en, Ni: Ni_en },
            sinal: { LL: Si_LL, Ci: Si_Ci, Ct: Si_Ct, Ce: Si_Ce, Ndj: Ndj_si, Nl: Nl_si, Ni: Ni_si }
        }
    };

    // 6. Imprime na Interface (8 Elementos do Console)
    const formata = num => num.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});

    document.getElementById('out-nd').innerText = formata(Nd);
    document.getElementById('out-nm').innerText = formata(Nm);
    
    document.getElementById('out-ndj-en').innerText = formata(Ndj_en);
    document.getElementById('out-nl-en').innerText = formata(Nl_en);
    document.getElementById('out-ni-en').innerText = formata(Ni_en);
    
    document.getElementById('out-ndj-si').innerText = formata(Ndj_si);
    document.getElementById('out-nl-si').innerText = formata(Nl_si);
    document.getElementById('out-ni-si').innerText = formata(Ni_si);
}

document.addEventListener('DOMContentLoaded', carregarDados);