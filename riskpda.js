// VARIÁVEIS GLOBAIS DE ESTADO
let AnaliseRisco = { 
    anexoA: {}, 
    zonas: [] 
};
let TABELAS_A = {};
let TABELAS_B = {};
let LISTA_NG = [];
let NgAtual = 0;

// FUNÇÃO 1: INICIALIZAÇÃO
async function carregarDados() {
    try {
        const resA = await fetch('./data/tabelas_anexo_a.json');
        const resB = await fetch('./data/tabelas_anexo_b.json');
        const resNg = await fetch('./data/municipios_ng.json');

        if (!resA.ok || !resB.ok || !resNg.ok) throw new Error("Erro ao buscar arquivos JSON. Verifique as pastas.");

        TABELAS_A = await resA.json();
        TABELAS_B = await resB.json();
        LISTA_NG = await resNg.json();

        popularFiltrosGlobais();
        configurarLimitesInputs();
        
        // Inicia primeira zona
        adicionarZona(); 
    } catch (erro) {
        console.error(erro);
        alert(`Erro de Inicialização:\n${erro.message}`);
    }
}

// FUNÇÃO 2: POPULAR SELECTS ANEXO A
function popularFiltrosGlobais() {
    const estadoSelect = document.getElementById('estado-select');
    const municipioSelect = document.getElementById('municipio-select');
    
    // Agrupa e Ordena UFs
    const ufs = [...new Set(LISTA_NG.map(item => item.uf))].sort();
    
    estadoSelect.innerHTML = '<option value="">Selecione o Estado</option>';
    ufs.forEach(uf => {
        const opt = document.createElement('option');
        opt.value = uf;
        opt.textContent = uf;
        estadoSelect.appendChild(opt);
    });

    estadoSelect.addEventListener('change', (e) => {
        const uf = e.target.value;
        municipioSelect.innerHTML = '<option value="">Selecione a Cidade</option>';
        if (!uf) { 
            municipioSelect.disabled = true; 
            NgAtual = 0;
            calcularRiscos();
            return; 
        }

        const cidades = LISTA_NG.filter(item => item.uf === uf).sort((a,b) => a.municipio.localeCompare(b.municipio));
        cidades.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.ng;
            opt.dataset.nome = m.municipio;
            opt.textContent = m.municipio;
            municipioSelect.appendChild(opt);
        });
        
        municipioSelect.disabled = false;
        NgAtual = 0;
        calcularRiscos();
    });

    municipioSelect.addEventListener('change', () => calcularRiscos());

    const preencherSelect = (id, dados) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = '';
        dados.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.valor;
            opt.textContent = `${d.descricao} (${d.valor})`;
            el.appendChild(opt);
        });
    };

    preencherSelect('fator-cd', TABELAS_A.tabela_A1_CD);
    preencherSelect('fator-cdj', TABELAS_A.tabela_A1_CD);
    preencherSelect('linha-en-ci', TABELAS_A.tabela_A2_CI);
    preencherSelect('linha-en-ct', TABELAS_A.tabela_A3_CT);
    preencherSelect('linha-en-ce', TABELAS_A.tabela_A4_CE);
    preencherSelect('linha-si-ci', TABELAS_A.tabela_A2_CI);
    preencherSelect('linha-si-ct', TABELAS_A.tabela_A3_CT);
    preencherSelect('linha-si-ce', TABELAS_A.tabela_A4_CE);
    
    if(document.getElementById('linha-si-ct').options.length > 0) document.getElementById('linha-si-ct').value = "1";
    if(document.getElementById('linha-en-ct').options.length > 0) document.getElementById('linha-en-ct').value = "0.2";

    estadoSelect.value = "SP";
    estadoSelect.dispatchEvent(new Event('change'));
    
    setTimeout(() => {
        const ara = Array.from(municipioSelect.options).find(o => o.dataset.nome === 'Araçatuba');
        if(ara) {
            municipioSelect.value = ara.value;
            calcularRiscos();
        }
    }, 150);
}

// FUNÇÃO 3: CONTROLE DE LIMITES E UI
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
        el.addEventListener('input', () => {
            let v = parseFloat(el.value);
            if (v > lim.max) { el.value = lim.max; calcularRiscos(); }
        });
        el.addEventListener('blur', () => {
            let v = parseFloat(el.value);
            if (isNaN(v) || v < lim.min) { el.value = lim.min; calcularRiscos(); }
        });
    });
}

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
    calcularRiscos();
}

// FUNÇÃO 4: GERENCIADOR DE ZONAS (CRIAÇÃO INTELIGENTE)
function adicionarZona() {
    if (AnaliseRisco.zonas.length >= 4) return;
    
    const id = Date.now();
    const numero = AnaliseRisco.zonas.length + 1;
    AnaliseRisco.zonas.push({ id, numero, nome: `Zona de Estudo ${numero}` });
    
    const container = document.getElementById('zonas-container');
    const div = document.createElement('div');
    div.id = `zona-card-${id}`;
    div.className = "bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden relative";

    const optPTA = TABELAS_B.tabela_B1_PTA.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optPB = TABELAS_B.tabela_B2_PB.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optPSPD = TABELAS_B.tabela_B3_PSPD.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optCLD = TABELAS_B.tabela_B4_CLD_CLI.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optKS3 = TABELAS_B.tabela_B5_KS3.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optPTU = TABELAS_B.tabela_B6_PTU.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optPEB = TABELAS_B.tabela_B7_PEB.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');

    div.innerHTML = `
        <div class="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="bg-razon-dark text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">${numero}</span>
                <input type="text" id="nome-zona-${id}" value="Zona de Estudo ${numero}" class="font-bold text-lg text-razon-dark bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-razon-copper">
            </div>
            ${numero > 1 ? `<button onclick="removerZona(${id})" class="text-red-500 hover:text-red-700 text-sm font-bold bg-white px-3 py-1 rounded shadow-sm border border-red-200"><i class="fas fa-trash"></i> Excluir</button>` : ''}
        </div>
        
        <div class="p-6 grid md:grid-cols-4 gap-6">
            <!-- Anexo B: Estrutura -->
            <div class="space-y-4">
                <h3 class="font-bold text-razon-dark border-b pb-1 text-sm"><i class="fas fa-shield-alt text-razon-copper mr-1"></i>Proteção Física</h3>
                <div><label class="text-[11px] font-semibold text-slate-700">Contra choque (PTA)</label><select id="pta-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPTA}</select></div>
                <div><label class="text-[11px] font-semibold text-slate-700">Nível do SPDA (PB)</label><select id="pb-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPB}</select></div>
                <div><label class="text-[11px] font-semibold text-slate-700">DPS Coord. (PSPD)</label><select id="pspd-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPSPD}</select></div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="text-[10px] font-semibold text-slate-700">Wm1 (m)</label><input type="number" id="wm1-${id}" value="0" min="0" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()"></div>
                    <div><label class="text-[10px] font-semibold text-slate-700">Wm2 (m)</label><input type="number" id="wm2-${id}" value="0" min="0" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()"></div>
                </div>
                <div><label class="text-[11px] font-semibold text-slate-700">Fiação Int. (KS3)</label><select id="ks3-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optKS3}</select></div>
            </div>

            <!-- Anexo B: Energia -->
            <div class="space-y-4 border-l pl-4 border-slate-100">
                <h3 class="font-bold text-razon-dark border-b pb-1 text-sm"><i class="fas fa-bolt text-razon-copper mr-1"></i>Linha Energia</h3>
                <div><label class="text-[11px] font-semibold text-slate-700">Medida choque (PTU)</label><select id="ptu-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPTU}</select></div>
                <div><label class="text-[11px] font-semibold text-slate-700">DPS Linha (PEB)</label><select id="peb-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPEB}</select></div>
                <div><label class="text-[11px] font-semibold text-slate-700">Blindagem (CLD/CLI)</label><select id="cld-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optCLD}</select></div>
                <div class="grid grid-cols-3 gap-1">
                    <div><label class="text-[10px] font-bold text-slate-700">Uw(kV)</label><input type="number" id="uw-en-${id}" value="2.5" step="0.5" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()"></div>
                    <div><label class="text-[10px] font-bold text-slate-700">PLD</label><input type="number" id="pld-en-${id}" value="1" step="0.1" max="1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()"></div>
                    <div><label class="text-[10px] font-bold text-slate-700">PLI</label><input type="number" id="pli-en-${id}" value="0.3" step="0.1" max="1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()"></div>
                </div>
            </div>

            <!-- Anexo B: Sinal -->
            <div class="space-y-4 border-l pl-4 border-slate-100">
                <h3 class="font-bold text-razon-dark border-b pb-1 text-sm"><i class="fas fa-network-wired text-razon-copper mr-1"></i>Linha Sinal</h3>
                <div><label class="text-[11px] font-semibold text-slate-700">Medida choque (PTU)</label><select id="ptu-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPTU}</select></div>
                <div><label class="text-[11px] font-semibold text-slate-700">DPS Linha (PEB)</label><select id="peb-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPEB}</select></div>
                <div><label class="text-[11px] font-semibold text-slate-700">Blindagem (CLD/CLI)</label><select id="cld-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optCLD}</select></div>
                <div class="grid grid-cols-3 gap-1">
                    <div><label class="text-[10px] font-bold text-slate-700">Uw(kV)</label><input type="number" id="uw-si-${id}" value="1.5" step="0.5" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()"></div>
                    <div><label class="text-[10px] font-bold text-slate-700">PLD</label><input type="number" id="pld-si-${id}" value="1" step="0.1" max="1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()"></div>
                    <div><label class="text-[10px] font-bold text-slate-700">PLI</label><input type="number" id="pli-si-${id}" value="0.5" step="0.1" max="1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()"></div>
                </div>
            </div>

            <!-- Preparações Anexo C (Perdas) -->
            <div class="space-y-4 border-l pl-4 border-slate-100 bg-slate-50 rounded-r-xl p-3">
                <h3 class="font-bold text-razon-copper border-b border-slate-200 pb-1 text-sm"><i class="fas fa-fire-extinguisher mr-1"></i>Fatores Perda (Anx. C)</h3>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="text-[10px] font-semibold text-slate-700">Pes. Zona (nz)</label><input type="number" id="nz-${id}" value="10" min="1" class="w-full p-2 border border-slate-300 rounded text-xs" oninput="calcularRiscos()"></div>
                    <div><label class="text-[10px] font-semibold text-slate-700">Pes. Total (nt)</label><input type="number" id="nt-${id}" value="50" min="1" class="w-full p-2 border border-slate-300 rounded text-xs" oninput="calcularRiscos()"></div>
                </div>
                <div><label class="text-[10px] font-semibold text-slate-700">Tempo (tz) horas/ano</label><input type="number" id="tz-${id}" value="8760" min="1" max="8760" class="w-full p-2 border border-slate-300 rounded text-xs" oninput="calcularRiscos()"></div>
                
                <div class="mt-2 pt-2 border-t border-slate-200">
                    <p class="text-[9px] text-slate-500 italic mb-1">Aguardando tabelas normativas:</p>
                    <div class="grid grid-cols-2 gap-1">
                        <input type="number" id="rt-${id}" placeholder="rt" class="w-full p-1 border rounded text-[10px]" disabled title="Resistividade do Piso">
                        <input type="number" id="rf-${id}" placeholder="rf" class="w-full p-1 border rounded text-[10px]" disabled title="Risco Incêndio">
                        <input type="number" id="rp-${id}" placeholder="rp" class="w-full p-1 border rounded text-[10px]" disabled title="Medidas Incêndio">
                        <input type="number" id="hz-${id}" placeholder="hz" class="w-full p-1 border rounded text-[10px]" disabled title="Perigo Especial">
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-razon-dark p-3 flex flex-wrap gap-4 text-white text-xs font-mono justify-around border-t border-slate-700">
            <div>PA: <span id="out-pa-${id}" class="text-razon-copper font-bold">0.0000</span></div>
            <div>PB: <span id="out-pb-${id}" class="text-razon-copper font-bold">0.0000</span></div>
            <div>PC: <span id="out-pc-${id}" class="font-bold">0.0000</span></div>
            <div>PM(En): <span id="out-pm-${id}" class="font-bold">0.0000</span></div>
            <div class="border-l border-slate-600 pl-4">PU(En): <span id="out-pu-en-${id}" class="text-blue-300 font-bold">0.0000</span></div>
            <div>PV(En): <span id="out-pv-en-${id}" class="text-blue-300 font-bold">0.0000</span></div>
            <div>PW(En): <span id="out-pw-en-${id}" class="font-bold">0.0000</span></div>
            <div>PZ(En): <span id="out-pz-en-${id}" class="font-bold">0.0000</span></div>
        </div>
    `;
    
    // Injeta a div no HTML sem usar innerHTML+=, preservando as outras zonas
    container.appendChild(div);

    if (AnaliseRisco.zonas.length >= 4) {
        document.getElementById('btn-add-zona').classList.add('hidden');
    }
    
    calcularRiscos();
}

function removerZona(id) {
    AnaliseRisco.zonas = AnaliseRisco.zonas.filter(z => z.id !== id);
    document.getElementById(`zona-card-${id}`).remove();
    
    // Renumera as tags visuais
    AnaliseRisco.zonas.forEach((z, idx) => {
        z.numero = idx + 1;
        // Pula atualizar o nome se o usuário digitou, atualiza apenas lógica.
    });

    document.getElementById('btn-add-zona').classList.remove('hidden');
    calcularRiscos();
}

// FUNÇÃO 5: O GRANDE MOTOR DE CÁLCULO UNIFICADO
function calcularRiscos() {
    // ---------------------------------------------------------
    // 1. CÁLCULOS DO ANEXO A (ESTRUTURA GLOBAL)
    // ---------------------------------------------------------
    const selectMunicipio = document.getElementById('municipio-select');
    NgAtual = parseFloat(selectMunicipio.value) || 0;
    
    const display = document.getElementById('ng-display');
    if(display) display.textContent = NgAtual;

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

    const fatorDeRisco = Math.pow(10, -6);

    const Ad = (L * W) + (2 * (3 * H) * (L + W)) + (Math.PI * Math.pow(3 * H, 2));
    const Am = (2 * 500 * (L + W)) + (Math.PI * Math.pow(500, 2));
    const Nd = NgAtual * Ad * Cd * fatorDeRisco;
    const Nm = NgAtual * Am * fatorDeRisco;

    let Ndj_en = 0, Ndj_si = 0;
    if (document.getElementById('toggle-adjacente') && document.getElementById('toggle-adjacente').checked) {
        const Adj = (L_adj * W_adj) + (2 * (3 * H_adj) * (L_adj + W_adj)) + (Math.PI * Math.pow(3 * H_adj, 2));
        Ndj_en = NgAtual * Adj * Cdj * En_Ct * fatorDeRisco;
        Ndj_si = NgAtual * Adj * Cdj * Si_Ct * fatorDeRisco;
    }

    const Al_en = 40 * En_LL, Ai_en = 4000 * En_LL;
    const Nl_en = NgAtual * Al_en * En_Ci * En_Ct * En_Ce * fatorDeRisco;
    const Ni_en = NgAtual * Ai_en * En_Ci * En_Ct * En_Ce * fatorDeRisco;

    const Al_si = 40 * Si_LL, Ai_si = 4000 * Si_LL;
    const Nl_si = NgAtual * Al_si * Si_Ci * Si_Ct * Si_Ce * fatorDeRisco;
    const Ni_si = NgAtual * Ai_si * Si_Ci * Si_Ct * Si_Ce * fatorDeRisco;

    // Output Anexo A
    const formata = num => num.toLocaleString('pt-BR', {minimumFractionDigits: 5, maximumFractionDigits: 5});
    const setVal = (elId, val) => { const el = document.getElementById(elId); if(el) el.innerText = val; };

    setVal('out-nd', formata(Nd)); setVal('out-nm', formata(Nm));
    setVal('out-ndj-en', formata(Ndj_en)); setVal('out-nl-en', formata(Nl_en)); setVal('out-ni-en', formata(Ni_en));
    setVal('out-ndj-si', formata(Ndj_si)); setVal('out-nl-si', formata(Nl_si)); setVal('out-ni-si', formata(Ni_si));


    // ---------------------------------------------------------
    // 2. CÁLCULOS DO ANEXO B E C (POR ZONA)
    // ---------------------------------------------------------
    AnaliseRisco.zonas.forEach(zona => {
        const id = zona.id;
        if(!document.getElementById(`pta-${id}`)) return; 

        // Probabilidades base da Estrutura
        const PTA = parseFloat(document.getElementById(`pta-${id}`).value) || 1;
        const PB  = parseFloat(document.getElementById(`pb-${id}`).value) || 1;
        const PSPD = parseFloat(document.getElementById(`pspd-${id}`).value) || 1;
        const PA = PTA * PB;

        // Fatores KS (Blindagem magnética)
        const wm1 = parseFloat(document.getElementById(`wm1-${id}`).value) || 0;
        const wm2 = parseFloat(document.getElementById(`wm2-${id}`).value) || 0;
        let ks1 = wm1 > 0 ? 0.12 * wm1 : 1; ks1 = Math.min(ks1, 1);
        let ks2 = wm2 > 0 ? 0.12 * wm2 : 1; ks2 = Math.min(ks2, 1);
        const ks3 = parseFloat(document.getElementById(`ks3-${id}`).value) || 1;

        // Parâmetros Linha Energia
        const Uw_en = parseFloat(document.getElementById(`uw-en-${id}`).value) || 2.5;
        const cld_en = parseFloat(document.getElementById(`cld-en-${id}`).value) || 1;
        const cli_en = cld_en; // Ligados no Anexo B.4
        
        const ptu_en = parseFloat(document.getElementById(`ptu-en-${id}`).value) || 1;
        const peb_en = parseFloat(document.getElementById(`peb-en-${id}`).value) || 1;
        const pld_en = parseFloat(document.getElementById(`pld-en-${id}`).value) || 1;
        const pli_en = parseFloat(document.getElementById(`pli-en-${id}`).value) || 1;

        const ks4_en = 1 / Uw_en;
        const pms_en = Math.pow(ks1 * ks2 * ks3 * ks4_en, 2);
        
        const PM_en = PSPD * pms_en;
        const PC_en = PSPD * cld_en;
        const PU_en = ptu_en * peb_en * pld_en * cld_en;
        const PV_en = peb_en * pld_en * cld_en;
        const PW_en = PSPD * pld_en * cld_en;
        const PZ_en = PSPD * pli_en * cli_en;

        // Atualiza Outputs da Zona (Formatando 4 casas decimais para as probabilidades do Anexo B)
        setVal(`out-pa-${id}`, PA.toFixed(4));
        setVal(`out-pb-${id}`, PB.toFixed(4));
        setVal(`out-pc-${id}`, PC_en.toFixed(4));
        setVal(`out-pm-${id}`, PM_en.toFixed(4));
        setVal(`out-pu-en-${id}`, PU_en.toFixed(4));
        setVal(`out-pv-en-${id}`, PV_en.toFixed(4));
        setVal(`out-pw-en-${id}`, PW_en.toFixed(4));
        setVal(`out-pz-en-${id}`, PZ_en.toFixed(4));
        
        // (A linha de sinal será calculada aqui da mesma forma quando chegarmos na composição do R1)
    });
}

document.addEventListener('DOMContentLoaded', carregarDados);