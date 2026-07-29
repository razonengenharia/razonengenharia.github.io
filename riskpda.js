// =============================================================
// RiskPDA - Motor de Cálculo (NBR 5419-2:2026)
// Anexo A: NÃO ALTERADO (mantido 100% igual à versão em produção)
// Anexo B: reescrito e corrigido (energia + sinal funcionais)
// Anexo C: estrutura de dados/UI preparada, cálculo ainda em branco
// =============================================================

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

        const cidades = LISTA_NG.filter(item => item.uf === uf).sort((a, b) => a.municipio.localeCompare(b.municipio));
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
        if (!el) return;
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

    if (document.getElementById('linha-si-ct').options.length > 0) document.getElementById('linha-si-ct').value = "1";
    if (document.getElementById('linha-en-ct').options.length > 0) document.getElementById('linha-en-ct').value = "0.2";

    estadoSelect.value = "SP";
    estadoSelect.dispatchEvent(new Event('change'));

    setTimeout(() => {
        const ara = Array.from(municipioSelect.options).find(o => o.dataset.nome === 'Araçatuba');
        if (ara) {
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
        if (!el) return;
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

    if (isAtivo) {
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
// ================= FIM DO BLOCO ANEXO A (NÃO ALTERADO) =================


// =============================================================
// UTILITÁRIOS DE INTERFACE - TOOLTIPS (Anexo B e C)
// =============================================================

// Gera um campo com rótulo + ícone de ajuda (tooltip) + controle (select/input)
// Usa as classes .has-tooltip / .tooltip-box já definidas no <style> do riskpda.html
function campoTip(label, tooltip, controlHtml, extraLabelClass = '') {
    return `
        <div>
            <label class="text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1 ${extraLabelClass}">
                <span>${label}</span>
                <span class="has-tooltip relative inline-flex cursor-help align-middle">
                    <i class="fas fa-circle-info text-slate-400 hover:text-razon-copper text-[10px] transition"></i>
                    <div class="tooltip-box absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-razon-dark text-white text-[10px] leading-snug p-2.5 rounded-lg shadow-xl normal-case font-normal">
                        ${tooltip}
                        <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-razon-dark"></div>
                    </div>
                </span>
            </label>
            ${controlHtml}
        </div>`;
}

// Textos de ajuda (Anexo B - NBR 5419-2:2026)
const TIPS_B = {
    pta: "Tabela B.1 – Medida adicional contra choque elétrico (tensão de passo/toque) nesta zona: isolação, avisos, malha de equipotencialização ou restrições físicas.",
    pb: "Tabela B.2 – Probabilidade de falha do sistema de captação/descida (SPDA) conforme o nível de proteção que protege esta zona.",
    pspd: "Tabela B.3 – Eficácia do sistema coordenado de DPS (Dispositivos de Proteção contra Surtos) instalado para proteger os equipamentos desta zona.",
    wm1: "Largura da malha da blindagem espacial (telas/gaiola) desta zona, em metros. Usada no cálculo de KS1 (Eq. B.5). Deixe 0 se não houver blindagem espacial.",
    wm2: "Largura da malha do SPDA (captores/descidas) que envolve esta zona, em metros. Usada no cálculo de KS2 (Eq. B.5). Deixe 0 se não houver.",
    ks3: "Tabela B.5 – Característica da fiação interna da zona: tamanho dos laços induzidos formados pelo roteamento dos cabos (quanto maior o laço, maior o risco).",
    ptu: "Tabela B.6 – Medida de proteção contra choque por tensão de passo/toque associada a esta linha.",
    peb: "Tabela B.7 – Eficácia do DPS instalado na entrada desta linha (equipotencialização de serviço).",
    cld: "Tabela B.4 – Fator de blindagem da linha (blindada ou não) e sua interligação ao barramento de equipotencialização. Afeta tanto o impacto direto (CLD) quanto a indução (CLI).",
    uw: "Tensão suportável de impulso dos equipamentos alimentados por esta linha, em kV. Usada para calcular KS4 = 1 / Uw (Eq. B.7).",
    pld: "Tabela B.8 – Probabilidade de falha de sistemas internos por surto conduzido devido a impacto direto na linha (fonte S3).",
    pli: "Tabela B.9 – Probabilidade de falha de sistemas internos por surto induzido devido a impacto próximo à linha (fonte S4)."
};

// Textos de ajuda (Anexo C - ainda não calculado, apenas coleta de dados)
const TIPS_C = {
    nz: "Número de pessoas que ocupam esta zona. Usado no Anexo C (Perda de Vida Humana) — cálculo ainda não implementado.",
    nt: "Número total de pessoas na edificação. Usado no Anexo C — cálculo ainda não implementado.",
    tz: "Tempo de permanência das pessoas nesta zona, em horas/ano (máx. 8760). Usado no Anexo C — cálculo ainda não implementado.",
    rt: "Fator de redução conforme o tipo de piso/revestimento da zona (ex: asfalto, brita, mármore). Tabela do Anexo C — aguardando normativa.",
    rf: "Fator de redução dependente do risco de incêndio/explosão da zona. Tabela do Anexo C — aguardando normativa.",
    rp: "Fator de redução pelas providências de combate a incêndio (extintores, hidrantes). Tabela do Anexo C — aguardando normativa.",
    hz: "Fator de agravamento por perigo especial (dificuldade de evacuação ou pânico). Tabela do Anexo C — aguardando normativa."
};

// Formata probabilidades: usa notação científica quando o valor é muito pequeno
function formatProb(v) {
    if (!isFinite(v)) return '0.0000';
    if (v !== 0 && Math.abs(v) < 0.0001) return v.toExponential(2);
    return v.toFixed(4);
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
    div.className = "bg-white rounded-2xl shadow-sm border border-slate-300 relative";

    const optPTA = TABELAS_B.tabela_B1_PTA.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optPB = TABELAS_B.tabela_B2_PB.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optPSPD = TABELAS_B.tabela_B3_PSPD.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optCLD = TABELAS_B.tabela_B4_CLD_CLI.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optKS3 = TABELAS_B.tabela_B5_KS3.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optPTU = TABELAS_B.tabela_B6_PTU.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optPEB = TABELAS_B.tabela_B7_PEB.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');

    div.innerHTML = `
        <div class="bg-slate-100 rounded-t-2xl px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="bg-razon-dark text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">${numero}</span>
                <input type="text" id="nome-zona-${id}" value="Zona de Estudo ${numero}" class="font-bold text-lg text-razon-dark bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-razon-copper">
            </div>
            ${numero > 1 ? `<button onclick="removerZona(${id})" class="text-red-500 hover:text-red-700 text-sm font-bold bg-white px-3 py-1 rounded shadow-sm border border-red-200"><i class="fas fa-trash"></i> Excluir</button>` : ''}
        </div>

        <div class="p-6 grid md:grid-cols-4 gap-6">
            <!-- Anexo B: Estrutura / Zona -->
            <div class="space-y-4">
                <h3 class="font-bold text-razon-dark border-b pb-1 text-sm"><i class="fas fa-shield-alt text-razon-copper mr-1"></i>Proteção Física da Zona</h3>

                ${campoTip('Contra choque (PTA)', TIPS_B.pta,
                    `<select id="pta-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPTA}</select>`)}

                ${campoTip('Nível do SPDA (PB)', TIPS_B.pb,
                    `<select id="pb-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPB}</select>`)}

                ${campoTip('DPS Coordenado (PSPD)', TIPS_B.pspd,
                    `<select id="pspd-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPSPD}</select>`)}

                <div class="grid grid-cols-2 gap-2">
                    ${campoTip('Wm1 (m)', TIPS_B.wm1,
                        `<input type="number" id="wm1-${id}" value="0" min="0" step="0.1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()">`)}
                    ${campoTip('Wm2 (m)', TIPS_B.wm2,
                        `<input type="number" id="wm2-${id}" value="0" min="0" step="0.1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()">`)}
                </div>

                ${campoTip('Fiação Interna (KS3)', TIPS_B.ks3,
                    `<select id="ks3-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optKS3}</select>`)}
            </div>

            <!-- Anexo B: Energia -->
            <div class="space-y-4 border-l pl-4 border-slate-100">
                <h3 class="font-bold text-razon-dark border-b pb-1 text-sm"><i class="fas fa-bolt text-razon-copper mr-1"></i>Linha de Energia</h3>

                ${campoTip('Medida choque (PTU)', TIPS_B.ptu,
                    `<select id="ptu-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPTU}</select>`)}

                ${campoTip('DPS na linha (PEB)', TIPS_B.peb,
                    `<select id="peb-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPEB}</select>`)}

                ${campoTip('Blindagem (CLD/CLI)', TIPS_B.cld,
                    `<select id="cld-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optCLD}</select>`)}

                <div class="grid grid-cols-3 gap-1">
                    ${campoTip('Uw (kV)', TIPS_B.uw,
                        `<input type="number" id="uw-en-${id}" value="2.5" step="0.5" min="0.1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()">`)}
                    ${campoTip('PLD', TIPS_B.pld,
                        `<input type="number" id="pld-en-${id}" value="1" step="0.1" min="0" max="1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()">`)}
                    ${campoTip('PLI', TIPS_B.pli,
                        `<input type="number" id="pli-en-${id}" value="0.3" step="0.1" min="0" max="1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()">`)}
                </div>
            </div>

            <!-- Anexo B: Sinal -->
            <div class="space-y-4 border-l pl-4 border-slate-100">
                <h3 class="font-bold text-razon-dark border-b pb-1 text-sm"><i class="fas fa-network-wired text-razon-copper mr-1"></i>Linha de Sinal</h3>

                ${campoTip('Medida choque (PTU)', TIPS_B.ptu,
                    `<select id="ptu-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPTU}</select>`)}

                ${campoTip('DPS na linha (PEB)', TIPS_B.peb,
                    `<select id="peb-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPEB}</select>`)}

                ${campoTip('Blindagem (CLD/CLI)', TIPS_B.cld,
                    `<select id="cld-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optCLD}</select>`)}

                <div class="grid grid-cols-3 gap-1">
                    ${campoTip('Uw (kV)', TIPS_B.uw,
                        `<input type="number" id="uw-si-${id}" value="1.5" step="0.5" min="0.1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()">`)}
                    ${campoTip('PLD', TIPS_B.pld,
                        `<input type="number" id="pld-si-${id}" value="1" step="0.1" min="0" max="1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()">`)}
                    ${campoTip('PLI', TIPS_B.pli,
                        `<input type="number" id="pli-si-${id}" value="0.5" step="0.1" min="0" max="1" class="w-full p-2 border rounded text-xs" oninput="calcularRiscos()">`)}
                </div>
            </div>

            <!-- Anexo C: Perdas (em branco por enquanto) -->
            <div class="space-y-4 border-l pl-4 border-slate-100 bg-slate-50 rounded-r-xl p-3">
                <h3 class="font-bold text-razon-copper border-b border-slate-200 pb-1 text-sm"><i class="fas fa-fire-extinguisher mr-1"></i>Fatores de Perda (Anexo C)</h3>

                <div class="grid grid-cols-2 gap-2">
                    ${campoTip('Pes. Zona (nz)', TIPS_C.nz,
                        `<input type="number" id="nz-${id}" value="10" min="1" class="w-full p-2 border border-slate-300 rounded text-xs" oninput="calcularRiscos()">`)}
                    ${campoTip('Pes. Total (nt)', TIPS_C.nt,
                        `<input type="number" id="nt-${id}" value="50" min="1" class="w-full p-2 border border-slate-300 rounded text-xs" oninput="calcularRiscos()">`)}
                </div>

                ${campoTip('Tempo (tz) horas/ano', TIPS_C.tz,
                    `<input type="number" id="tz-${id}" value="8760" min="1" max="8760" class="w-full p-2 border border-slate-300 rounded text-xs" oninput="calcularRiscos()">`)}

                <div class="mt-2 pt-2 border-t border-slate-200">
                    <p class="text-[9px] text-slate-500 italic mb-1">Aguardando tabelas normativas (cálculo ainda não ativo):</p>
                    <div class="grid grid-cols-2 gap-2">
                        ${campoTip('rt', TIPS_C.rt, `<input type="number" id="rt-${id}" placeholder="—" class="w-full p-1.5 border rounded text-[10px] bg-slate-100 text-slate-400" disabled>`, 'text-slate-400')}
                        ${campoTip('rf', TIPS_C.rf, `<input type="number" id="rf-${id}" placeholder="—" class="w-full p-1.5 border rounded text-[10px] bg-slate-100 text-slate-400" disabled>`, 'text-slate-400')}
                        ${campoTip('rp', TIPS_C.rp, `<input type="number" id="rp-${id}" placeholder="—" class="w-full p-1.5 border rounded text-[10px] bg-slate-100 text-slate-400" disabled>`, 'text-slate-400')}
                        ${campoTip('hz', TIPS_C.hz, `<input type="number" id="hz-${id}" placeholder="—" class="w-full p-1.5 border rounded text-[10px] bg-slate-100 text-slate-400" disabled>`, 'text-slate-400')}
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-razon-dark rounded-b-2xl p-4 text-white text-xs font-mono">
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-700/60">
                <span class="text-[10px] uppercase tracking-wider text-slate-400"><i class="fas fa-calculator text-razon-copper mr-1"></i>Probabilidades de Dano — Anexo B</span>
                <div class="flex gap-4">
                    <span>PA: <b id="out-pa-${id}" class="text-razon-copper">0.0000</b></span>
                    <span>PB: <b id="out-pb-${id}">0.0000</b></span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-[10px] text-amber-400/90 font-bold uppercase mb-1"><i class="fas fa-bolt mr-1"></i>Linha de Energia</p>
                    <div class="grid grid-cols-3 gap-x-2 gap-y-1 text-center bg-slate-800/60 rounded-lg p-2 border border-slate-700/50">
                        <div><p class="text-[9px] text-slate-400">PM</p><span id="out-pm-en-${id}" class="font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PC</p><span id="out-pc-en-${id}" class="font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PU</p><span id="out-pu-en-${id}" class="text-blue-300 font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PV</p><span id="out-pv-en-${id}" class="text-blue-300 font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PW</p><span id="out-pw-en-${id}" class="font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PZ</p><span id="out-pz-en-${id}" class="font-bold">0.0000</span></div>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] text-sky-300/90 font-bold uppercase mb-1"><i class="fas fa-network-wired mr-1"></i>Linha de Sinal</p>
                    <div class="grid grid-cols-3 gap-x-2 gap-y-1 text-center bg-slate-800/60 rounded-lg p-2 border border-slate-700/50">
                        <div><p class="text-[9px] text-slate-400">PM</p><span id="out-pm-si-${id}" class="font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PC</p><span id="out-pc-si-${id}" class="font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PU</p><span id="out-pu-si-${id}" class="text-blue-300 font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PV</p><span id="out-pv-si-${id}" class="text-blue-300 font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PW</p><span id="out-pw-si-${id}" class="font-bold">0.0000</span></div>
                        <div><p class="text-[9px] text-slate-400">PZ</p><span id="out-pz-si-${id}" class="font-bold">0.0000</span></div>
                    </div>
                </div>
            </div>
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
    // 1. CÁLCULOS DO ANEXO A (ESTRUTURA GLOBAL) — NÃO ALTERADO
    // ---------------------------------------------------------
    const selectMunicipio = document.getElementById('municipio-select');
    NgAtual = parseFloat(selectMunicipio.value) || 0;

    const display = document.getElementById('ng-display');
    if (display) display.textContent = NgAtual;

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
    const formata = num => num.toLocaleString('pt-BR', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.innerText = val; };

    setVal('out-nd', formata(Nd)); setVal('out-nm', formata(Nm));
    setVal('out-ndj-en', formata(Ndj_en)); setVal('out-nl-en', formata(Nl_en)); setVal('out-ni-en', formata(Ni_en));
    setVal('out-ndj-si', formata(Ndj_si)); setVal('out-nl-si', formata(Nl_si)); setVal('out-ni-si', formata(Ni_si));

    // ---------------------------------------------------------
    // 2. CÁLCULOS DO ANEXO B (POR ZONA) — CORRIGIDO E COMPLETO
    //    Fórmulas conforme "Anexo B cálculos.txt" (Eq. B.1 a B.11)
    // ---------------------------------------------------------
    AnaliseRisco.zonas.forEach(zona => {
        const id = zona.id;
        if (!document.getElementById(`pta-${id}`)) return;

        // ---- Probabilidades base da Zona (fontes S1/S2 - Eq. B.1) ----
        const PTA = parseFloat(document.getElementById(`pta-${id}`).value) || 1;
        const PB = parseFloat(document.getElementById(`pb-${id}`).value) || 1;
        const PSPD = parseFloat(document.getElementById(`pspd-${id}`).value) || 1;
        const PA = PTA * PB; // Eq. B.1

        // ---- Fatores KS (blindagem magnética da zona - Eq. B.5) ----
        // KS1/KS2 = 0,12 x Wm (ou 1 se não houver blindagem/SPDA correspondente), limitado a 1
        const wm1 = parseFloat(document.getElementById(`wm1-${id}`).value) || 0;
        const wm2 = parseFloat(document.getElementById(`wm2-${id}`).value) || 0;
        let ks1 = wm1 > 0 ? 0.12 * wm1 : 1; ks1 = Math.min(ks1, 1);
        let ks2 = wm2 > 0 ? 0.12 * wm2 : 1; ks2 = Math.min(ks2, 1);
        const ks3 = parseFloat(document.getElementById(`ks3-${id}`).value) || 1; // Tabela B.5

        // Função auxiliar: calcula todo o bloco de probabilidades de uma linha (energia ou sinal)
        const calcularLinha = (prefixo) => {
            const Uw = parseFloat(document.getElementById(`uw-${prefixo}-${id}`).value) || (prefixo === 'en' ? 2.5 : 1.5);
            const cld = parseFloat(document.getElementById(`cld-${prefixo}-${id}`).value) || 1; // Tabela B.4 (serve para CLD e CLI)
            const cli = cld;

            const ptu = parseFloat(document.getElementById(`ptu-${prefixo}-${id}`).value) || 1; // Tabela B.6
            const peb = parseFloat(document.getElementById(`peb-${prefixo}-${id}`).value) || 1; // Tabela B.7
            const pld = parseFloat(document.getElementById(`pld-${prefixo}-${id}`).value) || 1;  // Tabela B.8
            const pli = parseFloat(document.getElementById(`pli-${prefixo}-${id}`).value) || 1;  // Tabela B.9

            const ks4 = 1 / Uw;                                    // Eq. B.7
            const pms = Math.pow(ks1 * ks2 * ks3 * ks4, 2);        // Eq. B.4

            const PM = PSPD * pms;             // Eq. B.3 - Falha de sistemas (surto por indução na zona)
            const PC = PSPD * cld;             // Eq. B.2 - Falha por corte/centelhamento
            const PU = ptu * peb * pld * cld;  // Eq. B.8 - Probabilidade de choque final
            const PV = peb * pld * cld;        // Eq. B.9 - Probabilidade de incêndio final
            const PW = PSPD * pld * cld;       // Eq. B.10 - Falha de sistemas (impacto direto na linha - S3)
            const PZ = PSPD * pli * cli;       // Eq. B.11 - Falha de sistemas (indução próxima à linha - S4)

            return { PM, PC, PU, PV, PW, PZ };
        };

        const resEn = calcularLinha('en');
        const resSi = calcularLinha('si');

        // ---- Atualiza Outputs da Zona ----
        setVal(`out-pa-${id}`, formatProb(PA));
        setVal(`out-pb-${id}`, formatProb(PB));

        setVal(`out-pm-en-${id}`, formatProb(resEn.PM));
        setVal(`out-pc-en-${id}`, formatProb(resEn.PC));
        setVal(`out-pu-en-${id}`, formatProb(resEn.PU));
        setVal(`out-pv-en-${id}`, formatProb(resEn.PV));
        setVal(`out-pw-en-${id}`, formatProb(resEn.PW));
        setVal(`out-pz-en-${id}`, formatProb(resEn.PZ));

        setVal(`out-pm-si-${id}`, formatProb(resSi.PM));
        setVal(`out-pc-si-${id}`, formatProb(resSi.PC));
        setVal(`out-pu-si-${id}`, formatProb(resSi.PU));
        setVal(`out-pv-si-${id}`, formatProb(resSi.PV));
        setVal(`out-pw-si-${id}`, formatProb(resSi.PW));
        setVal(`out-pz-si-${id}`, formatProb(resSi.PZ));

        // Guarda os resultados no estado (útil para futura composição do R1 - Anexo C)
        zona.anexoB_resultado = { PA, PB, PSPD, energia: resEn, sinal: resSi };

        // ---------------------------------------------------------
        // 3. ANEXO C (PERDAS) — ainda em branco, apenas coleta dados
        // ---------------------------------------------------------
        // Os campos nz, nt, tz já são coletados na interface para uso futuro.
        // Os campos rt, rf, rp, hz permanecem desabilitados até a definição
        // das tabelas normativas correspondentes.
    });
}

document.addEventListener('DOMContentLoaded', carregarDados);