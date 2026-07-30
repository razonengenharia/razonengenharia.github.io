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
let TABELAS_C = {};
let LISTA_NG = [];
let NgAtual = 0;

// FUNÇÃO 1: INICIALIZAÇÃO
async function carregarDados() {
    try {
        const resA = await fetch('./data/tabelas_anexo_a.json');
        const resB = await fetch('./data/tabelas_anexo_b.json');
        const resC = await fetch('./data/tabelas_anexo_c.json');
        const resNg = await fetch('./data/municipios_ng.json');

        if (!resA.ok || !resB.ok || !resC.ok || !resNg.ok) throw new Error("Erro ao buscar arquivos JSON. Verifique as pastas.");

        TABELAS_A = await resA.json();
        TABELAS_B = await resB.json();
        TABELAS_C = await resC.json();
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

// FUNÇÃO 2: POPULAR FILTROS GLOBAIS + AUTOCOMPLETE DE MUNICÍPIO
function _normStr(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function filtrarMunicipios(q) {
    const lista = document.getElementById('municipio-sugestoes');
    if (!lista) return;
    const termo = _normStr(q.trim());
    if (!termo || termo.length < 2) { lista.classList.add('hidden'); return; }

    const resultados = [];
    for (let i = 0; i < LISTA_NG.length && resultados.length < 10; i++) {
        const item = LISTA_NG[i];
        if (_normStr(item.m).includes(termo)) resultados.push(item);
    }

    if (!resultados.length) { lista.classList.add('hidden'); return; }

    lista.innerHTML = resultados.map(r =>
        `<li class="px-4 py-2 cursor-pointer hover:bg-razon-copper/10 flex justify-between items-center"
             data-ng="${r.n}" data-label="${r.m} (${r.u})"
             onmousedown="selecionarMunicipio(this)">
            <span>${r.m}</span>
            <span class="text-[10px] text-slate-400 font-mono ml-2">${r.u} · Ng ${r.n}</span>
        </li>`
    ).join('');
    lista.classList.remove('hidden');
}

function selecionarMunicipio(el) {
    const input = document.getElementById('municipio-input');
    if (input) input.value = el.dataset.label;
    NgAtual = parseFloat(el.dataset.ng) || 0;
    const display = document.getElementById('ng-display');
    if (display) display.textContent = NgAtual;
    fecharSugestoes();
    calcularRiscos();
}

function fecharSugestoes() {
    const lista = document.getElementById('municipio-sugestoes');
    if (lista) lista.classList.add('hidden');
}

function popularFiltrosGlobais() {
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

    // Pré-seleciona Araçatuba (SP) como padrão
    const defaultItem = LISTA_NG.find(i => i.m === 'Araçatuba' && i.u === 'SP');
    if (defaultItem) {
        const input = document.getElementById('municipio-input');
        if (input) input.value = `${defaultItem.m} (${defaultItem.u})`;
        NgAtual = defaultItem.n;
        const display = document.getElementById('ng-display');
        if (display) display.textContent = NgAtual;
    }
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

// Textos de ajuda (Anexo C — NBR 5419-2:2026)
const TIPS_C = {
    nz: "Número de pessoas que ocupam esta zona (nz). Tabela C.1, Eq. C.1. Se a estrutura for uma zona única, nz/nt = 1.",
    nt: "Número total de pessoas na edificação (nt). Tabela C.1, Eq. C.1. Deve ser ≥ nz.",
    tz: "Horas de permanência das pessoas nesta zona por ano (máx. 8760). Tabela C.1, Eq. C.1.",
    rs: "Tabela C.7 — Fator de aumento conforme tipo de estrutura: madeira/alvenaria simples (rs=2) ou estrutura metálica/concreto armado (rs=1).",
    rt: "Tabela C.3 — Fator de redução pelo tipo de superfície do piso/solo da zona. Pisos isolantes (asfalto, madeira) reduzem fortemente o risco de choque.",
    rp: "Tabela C.4 — Fator de redução pelas providências de combate a incêndio da zona. Instalações automáticas têm fator menor (melhor proteção).",
    rf: "Tabela C.5 — Fator de redução em função do risco de incêndio ou explosão da zona. Zona sem risco tem rf=0.",
    hz: "Tabela C.6 — Fator de aumento pelo perigo especial de pânico ou dificuldade de evacuação. Sem perigo especial, hz=1.",
    lf_r1: "Tabela C.2 — Valor médio típico de LF (fração de vítimas por danos físicos/incêndio — D2) para cálculo do R1 (Vidas Humanas). LT é fixo em 0,01 para D1.",
    lo_r1: "Tabela C.2 — Valor médio típico de LO (fração de vítimas por falha de sistemas — D3) para cálculo do R1. Usado quando falha de sistema coloca vidas em risco (hospital, explosão).",
    lf_r4: "Tabela D.2 — Valor médio típico de LF (danos físicos/incêndio — D2) para cálculo do R4 (Risco Econômico). Simplificado com ca/ct = 1.",
    lo_r4: "Tabela D.2 — Valor médio típico de LO (falha de sistemas — D3) para cálculo do R4. Usado nos componentes RC, RM, RW, RZ do R4.",
    roteamento: "NBR 5419-2 item 6.4.5 — Com mesmo roteamento, calcule apenas a pior linha (geralmente sinal — menor Uw, maior CT). Com roteamentos diferentes, some as contribuições de cada linha."
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

    const UW_EN = '2.5';
    const UW_SI = '1.5';

    const optPLD_en = TABELAS_B.tabela_B8_PLD.map(c => {
        const v = c.valores_uw[UW_EN];
        return `<option value="${v}">${c.descricao} (${v})</option>`;
    }).join('');

    const optPLD_si = TABELAS_B.tabela_B8_PLD.map(c => {
        const v = c.valores_uw[UW_SI];
        return `<option value="${v}">${c.descricao} (${v})</option>`;
    }).join('');

    const optPLI_en = TABELAS_B.tabela_B9_PLI.energia.map(item =>
        `<option value="${item.valor}" ${String(item.uw) === UW_EN ? 'selected' : ''}>UN = ${item.uw} kV → PLI = ${item.valor}</option>`
    ).join('');

    const optPLI_si = TABELAS_B.tabela_B9_PLI.sinal.map(item =>
        `<option value="${item.valor}" ${String(item.uw) === UW_SI ? 'selected' : ''}>UN = ${item.uw} kV → PLI = ${item.valor}</option>`
    ).join('');

    // Opções Anexo C (carregadas de tabelas_anexo_c.json)
    const optRS   = TABELAS_C.tabela_C7_rs.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optRT   = TABELAS_C.tabela_C3_rt.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optRP   = TABELAS_C.tabela_C4_rp.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optRF   = TABELAS_C.tabela_C5_rf.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optHZ   = TABELAS_C.tabela_C6_hz.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optLF_C2 = TABELAS_C.tabela_C2_LF.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optLO_C2 = TABELAS_C.tabela_C2_LO.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optLF_D2 = TABELAS_C.tabela_D2_LF.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');
    const optLO_D2 = TABELAS_C.tabela_D2_LO.map(d => `<option value="${d.valor}">${d.descricao} (${d.valor})</option>`).join('');

    div.innerHTML = `
        <div class="bg-slate-100 rounded-t-2xl px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="bg-razon-dark text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">${numero}</span>
                <input type="text" id="nome-zona-${id}" value="Zona de Estudo ${numero}" class="font-bold text-lg text-razon-dark bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-razon-copper">
            </div>
            ${numero > 1 ? `<button onclick="removerZona(${id})" class="text-red-500 hover:text-red-700 text-sm font-bold bg-white px-3 py-1 rounded shadow-sm border border-red-200"><i class="fas fa-trash"></i> Excluir</button>` : ''}
        </div>

        <div class="p-6">

            <!-- Linha 1: Anexo B — 3 colunas iguais -->
            <div class="grid md:grid-cols-3 gap-6">

                <!-- Proteção Física da Zona -->
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

                <!-- Linha de Energia -->
                <div class="space-y-4 border-l pl-4 border-slate-100">
                    <h3 class="font-bold text-razon-dark border-b pb-1 text-sm"><i class="fas fa-bolt text-razon-copper mr-1"></i>Linha de Energia</h3>
                    ${campoTip('Medida choque (PTU)', TIPS_B.ptu,
                        `<select id="ptu-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPTU}</select>`)}
                    ${campoTip('DPS na linha (PEB)', TIPS_B.peb,
                        `<select id="peb-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPEB}</select>`)}
                    ${campoTip('Blindagem (CLD/CLI)', TIPS_B.cld,
                        `<select id="cld-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optCLD}</select>`)}
                    ${campoTip('Uw (kV) — fixo', TIPS_B.uw,
                        `<input type="number" id="uw-en-${id}" value="2.5" class="w-full p-2 border border-slate-200 rounded text-xs bg-slate-100 text-slate-500 cursor-not-allowed" readonly>`)}
                    ${campoTip('PLD (Tab. B.8)', TIPS_B.pld,
                        `<select id="pld-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPLD_en}</select>`)}
                    ${campoTip('PLI (Tab. B.9)', TIPS_B.pli,
                        `<select id="pli-en-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPLI_en}</select>`)}
                </div>

                <!-- Linha de Sinal -->
                <div class="space-y-4 border-l pl-4 border-slate-100">
                    <h3 class="font-bold text-razon-dark border-b pb-1 text-sm"><i class="fas fa-network-wired text-razon-copper mr-1"></i>Linha de Sinal</h3>
                    ${campoTip('Medida choque (PTU)', TIPS_B.ptu,
                        `<select id="ptu-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPTU}</select>`)}
                    ${campoTip('DPS na linha (PEB)', TIPS_B.peb,
                        `<select id="peb-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPEB}</select>`)}
                    ${campoTip('Blindagem (CLD/CLI)', TIPS_B.cld,
                        `<select id="cld-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optCLD}</select>`)}
                    ${campoTip('Uw (kV) — fixo', TIPS_B.uw,
                        `<input type="number" id="uw-si-${id}" value="1.5" class="w-full p-2 border border-slate-200 rounded text-xs bg-slate-100 text-slate-500 cursor-not-allowed" readonly>`)}
                    ${campoTip('PLD (Tab. B.8)', TIPS_B.pld,
                        `<select id="pld-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPLD_si}</select>`)}
                    ${campoTip('PLI (Tab. B.9)', TIPS_B.pli,
                        `<select id="pli-si-${id}" class="w-full p-2 bg-slate-50 border rounded text-[11px]" onchange="calcularRiscos()">${optPLI_si}</select>`)}
                </div>

            </div><!-- /grid 3 cols -->

            <!-- Linha 2: Anexo C — faixa horizontal completa -->
            <div class="mt-5 pt-4 border-t border-amber-200/60 bg-amber-50/30 rounded-xl px-4 pb-4">
                <h3 class="font-bold text-amber-700 pb-2 mb-3 text-sm border-b border-amber-200">
                    <i class="fas fa-chart-bar text-amber-600 mr-1"></i>Perdas e Riscos (Anexo C)
                </h3>

                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">

                    <!-- Col 1: Pessoas e exposição -->
                    <div class="space-y-3">
                        <p class="text-[9px] text-amber-700 font-semibold uppercase tracking-wide">Ocupação</p>
                        ${campoTip('Pes. Zona (nz)', TIPS_C.nz,
                            `<input type="number" id="nz-${id}" value="10" min="1" class="w-full p-2 border border-amber-200 rounded text-xs bg-white" oninput="calcularRiscos()">`)}
                        ${campoTip('Pes. Total (nt)', TIPS_C.nt,
                            `<input type="number" id="nt-${id}" value="10" min="1" class="w-full p-2 border border-amber-200 rounded text-xs bg-white" oninput="calcularRiscos()">`)}
                        ${campoTip('Tempo tz (h/ano)', TIPS_C.tz,
                            `<input type="number" id="tz-${id}" value="8760" min="1" max="8760" class="w-full p-2 border border-amber-200 rounded text-xs bg-white" oninput="calcularRiscos()">`)}
                        ${campoTip('Estrutura (rs, C.7)', TIPS_C.rs,
                            `<select id="rs-${id}" class="w-full p-2 bg-white border border-amber-200 rounded text-[11px]" onchange="calcularRiscos()">${optRS}</select>`)}
                    </div>

                    <!-- Col 2: Fatores de zona -->
                    <div class="space-y-3">
                        <p class="text-[9px] text-amber-700 font-semibold uppercase tracking-wide">Fatores da Zona</p>
                        ${campoTip('Piso/Solo (rt, C.3)', TIPS_C.rt,
                            `<select id="rt-${id}" class="w-full p-2 bg-white border border-amber-200 rounded text-[11px]" onchange="calcularRiscos()">${optRT}</select>`)}
                        ${campoTip('Contra fogo (rp, C.4)', TIPS_C.rp,
                            `<select id="rp-${id}" class="w-full p-2 bg-white border border-amber-200 rounded text-[11px]" onchange="calcularRiscos()">${optRP}</select>`)}
                        ${campoTip('Risco incêndio (rf, C.5)', TIPS_C.rf,
                            `<select id="rf-${id}" class="w-full p-2 bg-white border border-amber-200 rounded text-[11px]" onchange="calcularRiscos()">${optRF}</select>`)}
                        ${campoTip('Perigo especial (hz, C.6)', TIPS_C.hz,
                            `<select id="hz-${id}" class="w-full p-2 bg-white border border-amber-200 rounded text-[11px]" onchange="calcularRiscos()">${optHZ}</select>`)}
                    </div>

                    <!-- Col 3: Perdas R1 -->
                    <div class="space-y-3">
                        <p class="text-[9px] text-amber-700 font-semibold uppercase tracking-wide">Perdas R1 — Vidas</p>
                        <p class="text-[9px] text-slate-400 -mt-2">(Tab. C.2)</p>
                        ${campoTip('LF — danos físicos / incêndio', TIPS_C.lf_r1,
                            `<select id="lf-r1-${id}" class="w-full p-2 bg-white border border-amber-200 rounded text-[11px]" onchange="calcularRiscos()">${optLF_C2}</select>`)}
                        ${campoTip('LO — falha de sistemas', TIPS_C.lo_r1,
                            `<select id="lo-r1-${id}" class="w-full p-2 bg-white border border-amber-200 rounded text-[11px]" onchange="calcularRiscos()">${optLO_C2}</select>`)}
                    </div>

                    <!-- Col 4: Perdas R4 -->
                    <div class="space-y-3">
                        <p class="text-[9px] text-emerald-700 font-semibold uppercase tracking-wide">Perdas R4 — Econôm.</p>
                        <p class="text-[9px] text-slate-400 -mt-2">(Tab. D.2)</p>
                        ${campoTip('LF — danos físicos / incêndio', TIPS_C.lf_r4,
                            `<select id="lf-r4-${id}" class="w-full p-2 bg-white border border-emerald-200 rounded text-[11px]" onchange="calcularRiscos()">${optLF_D2}</select>`)}
                        ${campoTip('LO — falha de sistemas', TIPS_C.lo_r4,
                            `<select id="lo-r4-${id}" class="w-full p-2 bg-white border border-emerald-200 rounded text-[11px]" onchange="calcularRiscos()">${optLO_D2}</select>`)}
                    </div>

                    <!-- Col 5: Roteamento -->
                    <div class="space-y-3">
                        <p class="text-[9px] text-slate-500 font-semibold uppercase tracking-wide">Roteamento</p>
                        ${campoTip('Roteamento das linhas', TIPS_C.roteamento,
                            `<label class="flex items-start gap-2 cursor-pointer mt-1 p-3 bg-white border border-amber-200 rounded-lg">
                                <input type="checkbox" id="roteamento-${id}" class="accent-amber-600 w-4 h-4 mt-0.5 shrink-0" onchange="calcularRiscos()">
                                <span class="text-[10px] text-slate-700 leading-snug">Mesmo roteamento<br><span class="text-slate-400 text-[9px]">usa apenas a pior linha (NBR 6.4.5)</span></span>
                            </label>`)}
                    </div>

                </div>
            </div><!-- /anexo C -->

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

            <!-- Resultado Anexo C por Zona -->
            <div class="mt-4 pt-3 border-t border-slate-700/60">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] uppercase tracking-wider text-slate-400"><i class="fas fa-fire text-amber-400 mr-1"></i>Perdas e Riscos (Anexo C) — esta zona</span>
                    <span id="out-roteamento-${id}" class="text-[9px] italic text-slate-500">—</span>
                </div>
                <div class="grid grid-cols-3 gap-2 mb-2 text-center">
                    <div class="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                        <p class="text-[9px] text-slate-400 mb-0.5">LA = LU</p>
                        <span id="out-la-${id}" class="text-[11px] font-bold text-green-400">—</span>
                    </div>
                    <div class="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                        <p class="text-[9px] text-slate-400 mb-0.5">LB = LV</p>
                        <span id="out-lb-${id}" class="text-[11px] font-bold text-amber-400">—</span>
                    </div>
                    <div class="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                        <p class="text-[9px] text-slate-400 mb-0.5">LC – LZ</p>
                        <span id="out-lc-${id}" class="text-[11px] font-bold text-slate-300">—</span>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-amber-900/30 p-2.5 rounded-lg border border-amber-700/40">
                        <p class="text-[9px] text-amber-400/80 font-semibold uppercase mb-0.5">R1 Zona</p>
                        <span id="out-r1-zona-${id}" class="text-sm font-bold text-amber-300">—</span>
                    </div>
                    <div class="bg-sky-900/30 p-2.5 rounded-lg border border-sky-700/40">
                        <p class="text-[9px] text-sky-400/80 font-semibold uppercase mb-0.5">F Zona</p>
                        <span id="out-f-zona-${id}" class="text-sm font-bold text-sky-300">—</span>
                    </div>
                    <div class="bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-700/40">
                        <p class="text-[9px] text-emerald-400/80 font-semibold uppercase mb-0.5">R4 Zona</p>
                        <span id="out-r4-zona-${id}" class="text-sm font-bold text-emerald-300">—</span>
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
    // NgAtual é atualizado por selecionarMunicipio(); só relê se já estiver definido
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

        // Guarda os resultados do Anexo B no estado
        zona.anexoB_resultado = { PA, PB, PSPD, energia: resEn, sinal: resSi };

        // ---------------------------------------------------------
        // 3. CÁLCULOS DO ANEXO C — Perdas e Riscos R1, F, R4
        // ---------------------------------------------------------
        const nz  = Math.max(parseFloat(document.getElementById(`nz-${id}`).value) || 1, 1);
        const nt  = Math.max(parseFloat(document.getElementById(`nt-${id}`).value) || nz, nz);
        const tz  = Math.min(parseFloat(document.getElementById(`tz-${id}`).value) || 8760, 8760);
        const rs  = parseFloat(document.getElementById(`rs-${id}`).value)  || 1;
        const rt  = parseFloat(document.getElementById(`rt-${id}`).value)  || 0.01;
        const rp  = parseFloat(document.getElementById(`rp-${id}`).value)  || 1;
        const rf  = parseFloat(document.getElementById(`rf-${id}`).value)  || 0.01;
        const hz  = parseFloat(document.getElementById(`hz-${id}`).value)  || 1;
        const LF_R1  = parseFloat(document.getElementById(`lf-r1-${id}`).value)  || 0.01;
        const LO_R1  = parseFloat(document.getElementById(`lo-r1-${id}`).value)  || 0;
        const LF_R4  = parseFloat(document.getElementById(`lf-r4-${id}`).value)  || 0.1;
        const LO_R4v = parseFloat(document.getElementById(`lo-r4-${id}`).value)  || 0.01;
        const mesmoRoteamento = document.getElementById(`roteamento-${id}`) ? document.getElementById(`roteamento-${id}`).checked : false;

        const LT = 0.01;
        const fatorPessoas = (nz / nt) * (tz / 8760);

        // Perdas R1 — Tabela C.1 (Eq. C.1 a C.4)
        const LA = rt * LT * fatorPessoas * rs;
        const LU = LA;
        const LB = rp * rf * hz * LF_R1 * fatorPessoas * rs;
        const LV = LB;
        const LC = LO_R1 * fatorPessoas * rs;

        // Perdas R4 — Tabela D.1 simplificada (ca/ct = 1, sem fatorPessoas, sem hz, sem rs)
        const LB_R4  = rp * rf * LF_R4;
        const LO_R4l = LO_R4v;

        // Helper: combina energia e sinal conforme roteamento
        const combinar = (en, si) => mesmoRoteamento ? Math.max(en, si) : en + si;

        const peb_en_val = parseFloat(document.getElementById(`peb-en-${id}`).value) || 1;
        const peb_si_val = parseFloat(document.getElementById(`peb-si-${id}`).value) || 1;

        // R1 — componentes (Tabela 6, NBR 5419-2)
        const RA = Nd * PA * LA;
        const RB = Nd * PB * LB;
        const RC = combinar(Nd * resEn.PC * LC,   Nd * resSi.PC * LC);
        const RM = combinar(Nm * resEn.PM * LC,   Nm * resSi.PM * LC);  // LM = LC (D3)
        const RU = combinar((Nl_en + Ndj_en) * resEn.PU * LU,  (Nl_si + Ndj_si) * resSi.PU * LU);
        const RV = combinar((Nl_en + Ndj_en) * resEn.PV * LV,  (Nl_si + Ndj_si) * resSi.PV * LV);
        const RW = combinar((Nl_en + Ndj_en) * resEn.PW * LC,  (Nl_si + Ndj_si) * resSi.PW * LC);  // LW = LC
        const RZ = combinar(Ni_en * resEn.PZ * LC,              Ni_si * resSi.PZ * LC);              // LZ = LC
        const R1_zona = RA + RB + RC + RM + RU + RV + RW + RZ;

        // F — frequência de dano a sistemas internos (Tabela 7, NBR 5419-2)
        const FB = Nd * PB;
        const FC = combinar(Nd * resEn.PC,   Nd * resSi.PC);
        const FM = combinar(Nm * resEn.PM,   Nm * resSi.PM);
        const FV = combinar((Nl_en + Ndj_en) * peb_en_val, (Nl_si + Ndj_si) * peb_si_val);
        const FW = combinar((Nl_en + Ndj_en) * resEn.PW,  (Nl_si + Ndj_si) * resSi.PW);
        const FZ = combinar(Ni_en * resEn.PZ,              Ni_si * resSi.PZ);
        const F_zona = FB + FC + FM + FV + FW + FZ;

        // R4 — risco econômico (Tabela 6, com perdas D.1/D.2 simplificadas)
        const RB_R4 = Nd * PB * LB_R4;
        const RC_R4 = combinar(Nd * resEn.PC * LO_R4l,  Nd * resSi.PC * LO_R4l);
        const RM_R4 = combinar(Nm * resEn.PM * LO_R4l,  Nm * resSi.PM * LO_R4l);
        const RV_R4 = combinar((Nl_en + Ndj_en) * resEn.PV * LB_R4,   (Nl_si + Ndj_si) * resSi.PV * LB_R4);
        const RW_R4 = combinar((Nl_en + Ndj_en) * resEn.PW * LO_R4l,  (Nl_si + Ndj_si) * resSi.PW * LO_R4l);
        const RZ_R4 = combinar(Ni_en * resEn.PZ * LO_R4l,              Ni_si * resSi.PZ * LO_R4l);
        const R4_zona = RB_R4 + RC_R4 + RM_R4 + RV_R4 + RW_R4 + RZ_R4;

        // Atualiza outputs do console por zona
        setVal(`out-la-${id}`,           formatProb(LA));
        setVal(`out-lb-${id}`,           formatProb(LB));
        setVal(`out-lc-${id}`,           formatProb(LC));
        setVal(`out-r1-zona-${id}`,      formatProb(R1_zona));
        setVal(`out-f-zona-${id}`,       formatProb(F_zona));
        setVal(`out-r4-zona-${id}`,      formatProb(R4_zona));
        setVal(`out-roteamento-${id}`,   mesmoRoteamento ? 'Mesmo roteamento — pior linha' : 'Roteamentos diferentes — soma');

        zona.anexoC_resultado = { R1: R1_zona, F: F_zona, R4: R4_zona };
    });

    // ---------------------------------------------------------
    // 4. TOTAIS GLOBAIS — R1, F, R4 (soma de todas as zonas)
    // ---------------------------------------------------------
    let R1_total = 0, F_total = 0, R4_total = 0;
    AnaliseRisco.zonas.forEach(z => {
        if (z.anexoC_resultado) {
            R1_total += z.anexoC_resultado.R1;
            F_total  += z.anexoC_resultado.F;
            R4_total += z.anexoC_resultado.R4;
        }
    });

    const RT_R1 = 1e-5, RT_R4 = 1e-3;
    const ftRadio = document.querySelector('input[name="ft-tipo"]:checked');
    const RT_F = ftRadio ? parseFloat(ftRadio.value) : 1;
    const ftLabel = document.getElementById('f-ft-label');
    if (ftLabel) ftLabel.textContent = `FT = ${RT_F}`;

    const atualizarPainel = (base, valor, toleravel) => {
        const elVal    = document.getElementById(`${base}-valor`);
        const elStatus = document.getElementById(`${base}-status`);
        const elBar    = document.getElementById(`${base}-bar`);
        if (!elVal) return;

        const excede = valor > toleravel;
        elVal.textContent = valor !== 0 ? valor.toExponential(2) : '0';
        elStatus.textContent  = excede ? '⚠ EXCEDE RT — proteção necessária' : '✓ Dentro do limite tolerável';
        elStatus.className    = excede
            ? 'text-xs font-bold text-red-500 mt-1'
            : 'text-xs font-bold text-emerald-600 mt-1';
        if (elBar) {
            elBar.style.width = `${Math.min((valor / toleravel) * 100, 100)}%`;
            elBar.className = `h-full rounded-full transition-all duration-500 ${excede ? 'bg-red-500' : 'bg-emerald-500'}`;
        }
    };

    atualizarPainel('r1', R1_total, RT_R1);
    atualizarPainel('f',  F_total,  RT_F);
    atualizarPainel('r4', R4_total, RT_R4);

    // Atualiza interpretação de % no card R4
    const r4Pct         = document.getElementById('r4-percentual');
    const r4PctVal      = document.getElementById('r4-pct-valor');
    const r4Placeholder = document.getElementById('r4-percentual-placeholder');
    if (r4Pct && r4PctVal) {
        if (R4_total > 0) {
            const pct = (R4_total * 100).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            r4PctVal.textContent = `${pct}% ao ano`;
            r4Pct.classList.remove('hidden');
            if (r4Placeholder) r4Placeholder.classList.add('hidden');
        } else {
            r4Pct.classList.add('hidden');
            if (r4Placeholder) r4Placeholder.classList.remove('hidden');
        }
    }

    // Roda o simulador de R$ caso o usuário já tenha preenchido o campo
    calcularPerdaR4();
}

function calcularPerdaR4() {
    const input = document.getElementById('r4-patrimonio');
    const box   = document.getElementById('r4-perda-reais');
    const elVal = document.getElementById('r4-perda-valor');
    const elCtx = document.getElementById('r4-perda-contexto');
    if (!input || !box || !elVal) return;

    let patrimonio = parseFloat(input.value);
    if (!patrimonio || patrimonio < 100) { box.classList.add('hidden'); return; }
    if (patrimonio > 1_000_000_000) { input.value = 1_000_000_000; patrimonio = 1_000_000_000; }

    // Busca o R4 total calculado pelo último forEach
    const R4 = AnaliseRisco.zonas.reduce((s, z) => s + (z.anexoC_resultado?.R4 || 0), 0);
    if (R4 <= 0) { box.classList.add('hidden'); return; }

    const perdaAnual = R4 * patrimonio;
    const perdaFmt   = perdaAnual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

    elVal.textContent = perdaFmt;

    // Contexto: quanto tempo para perder 1% do patrimônio
    const anosParaUmPct = (0.01 / R4);
    elCtx.textContent = anosParaUmPct >= 2
        ? `Equivale a 1% do patrimônio a cada ${anosParaUmPct.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} anos`
        : `Equivale a ${(R4 * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% do patrimônio por ano`;

    box.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', carregarDados);