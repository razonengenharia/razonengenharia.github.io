/* smartcable.js - Lógica e Regras de Negócio NBR 5410 */

// Tabela de Condutores de Cobre Comerciais (Baixa Tensão)
const cabosComerciais = [
    { s: 0.75, d: 1.00, ext: 2.40, app: "Circuitos de sinalização e comando" },
    { s: 1.0,  d: 1.15, ext: 2.60, app: "Circuitos de sinalização e comando" },
    { s: 1.5,  d: 1.40, ext: 2.90, app: "Iluminação" },
    { s: 2.5,  d: 1.90, ext: 3.50, app: "Tomadas de uso geral (TUGs)" },
    { s: 4.0,  d: 2.40, ext: 4.20, app: "Circuitos de força, chuveiros menores" },
    { s: 6.0,  d: 2.90, ext: 4.80, app: "Chuveiros potentes, ar-condicionado" },
    { s: 10.0, d: 3.90, ext: 6.40, app: "Quadros de distribuição, bombas" },
    { s: 16.0, d: 4.90, ext: 8.20, app: "Alimentação principal residencial" },
    { s: 25.0, d: 6.20, ext: 10.40, app: "Entrada de energia, quadros maiores" },
    { s: 35.0, d: 7.40, ext: 11.50, app: "Circuitos industriais" },
    { s: 50.0, d: 8.80, ext: 13.40, app: "Alimentação industrial / QTA" }
];

// Regras de Tensão por Sistema
const vnomOptionsMono = [
    { val: 127, text: "127 V" },
    { val: 220, text: "220 V" }
];

const vnomOptionsBiTri = [
    { val: 220, text: "220 V" },
    { val: 380, text: "380 V" }
];

// Fatores de Harmônica
const fhOptionsMonoBi = [
    { val: 1, text: "1,00 - Fornos, chuveiros, resistores" },
    { val: 1.15, text: "1,15 - Mix leve de escritório" },
    { val: 1.19, text: "1,19 - Escritórios padrão (PCs)" },
    { val: 1.23, text: "1,23 - Estações de trabalho" },
    { val: 1.27, text: "1,27 - Servidores e Telecom" },
    { val: 1.30, text: "1,30 - TI crítica e No-breaks (UPS)" },
    { val: 1.34, text: "1,34 - Data Centers de média densidade" },
    { val: 1.38, text: "1,38 - Storages e Processamento" },
    { val: 1.41, text: "1,41 (√2) - Data Center Alta Dens. / Padrão Seguro" }
];

const fhOptionsTri = [
    { val: 1, text: "1,00 - Fornos, chuveiros, resistores" },
    { val: 1.15, text: "1,15 - Mix leve de escritório" },
    { val: 1.19, text: "1,19 - Escritórios padrão (PCs)" },
    { val: 1.24, text: "1,24 - Estações de trabalho" },
    { val: 1.35, text: "1,35 - Servidores e Telecom" },
    { val: 1.45, text: "1,45 - TI crítica e No-breaks (UPS)" },
    { val: 1.55, text: "1,55 - Data Centers de média densidade" },
    { val: 1.64, text: "1,64 - Storages e Processamento" },
    { val: 1.73, text: "1,73 (√3) - Data Center Alta Dens. / Padrão Seguro" }
];

document.addEventListener('DOMContentLoaded', () => {
    // Popula o select de cabos
    const selectCabo = document.getElementById('cabo_inst');
    cabosComerciais.forEach(cabo => {
        let opt = document.createElement('option');
        opt.value = cabo.s;
        opt.textContent = `${cabo.s} mm² - ${cabo.app}`;
        selectCabo.appendChild(opt);
    });

    // Inicializa campos dependentes
    atualizarDependenciasSistema();

    // Listeners
    document.getElementById('sys_type').addEventListener('change', atualizarDependenciasSistema);
    document.getElementById('calc_target').addEventListener('change', atualizarVisibilidade);
});

function atualizarDependenciasSistema() {
    const sysType = document.getElementById('sys_type').value;
    const vNomSelect = document.getElementById('v_nom');
    const fhSelect = document.getElementById('fh');
    
    // Salva tensão atual para tentar manter a seleção se possível (ex: mudando de Mono pra Bi mantendo 220v)
    const currentVnom = vNomSelect.value;
    
    vNomSelect.innerHTML = '';
    fhSelect.innerHTML = '';

    // Atualiza Tensão Nominal
    let vOptions = (sysType === 'mono') ? vnomOptionsMono : vnomOptionsBiTri;
    vOptions.forEach(opt => {
        let el = document.createElement('option');
        el.value = opt.val;
        el.textContent = opt.text;
        vNomSelect.appendChild(el);
    });
    
    // Restaura seleção anterior se existir nas novas opções
    if (Array.from(vNomSelect.options).some(opt => opt.value == currentVnom)) {
        vNomSelect.value = currentVnom;
    }

    // Atualiza Fator de Harmônica (fh)
    let fOptions = (sysType === 'tri') ? fhOptionsTri : fhOptionsMonoBi;
    fOptions.forEach(opt => {
        let el = document.createElement('option');
        el.value = opt.val;
        el.textContent = opt.text;
        fhSelect.appendChild(el);
    });
}

function atualizarVisibilidade() {
    const target = document.getElementById('calc_target').value;
    
    // Reseta todos para escondido
    document.getElementById('group_L').classList.add('hidden');
    document.getElementById('group_dU').classList.add('hidden');
    document.getElementById('group_S').classList.add('hidden');

    if(target === 'S') {
        document.getElementById('group_L').classList.remove('hidden');
        document.getElementById('group_dU').classList.remove('hidden');
    } else if (target === 'dU') {
        document.getElementById('group_L').classList.remove('hidden');
        document.getElementById('group_S').classList.remove('hidden');
    } else if (target === 'L') {
        document.getElementById('group_S').classList.remove('hidden');
        document.getElementById('group_dU').classList.remove('hidden');
    }
}

function toggleModal(modalID){
    document.getElementById(modalID).classList.toggle("hidden");
    document.getElementById(modalID).classList.toggle("flex");
}

function calcular() {
    // 1. Coleta e Validação Base
    const target = document.getElementById('calc_target').value;
    const type = document.getElementById('sys_type').value;
    const vnom = parseFloat(document.getElementById('v_nom').value);
    const p = parseFloat(document.getElementById('pot').value);
    const fp = parseFloat(document.getElementById('fp').value) || 1;
    const fh = parseFloat(document.getElementById('fh').value) || 1;
    const dUmax = parseFloat(document.getElementById('du_max').value);
    const L = parseFloat(document.getElementById('len').value);

    // Validações de Limite
    if (!p || p < 1 || p > 200000) {
        alert("Por favor, preencha a Potência (W). O valor deve estar entre 1 e 200000 W.");
        return;
    }
    if (fp < 0.1 || fp > 1) {
        alert("O Fator de Potência (FP) deve estar entre 0.1 e 1.");
        return;
    }
    if ((target === 'S' || target === 'dU') && (!L || L < 0.1 || L > 1000)) {
        alert("Por favor, preencha o Comprimento (m). O valor deve estar entre 0.1 e 1000 m.");
        return;
    }
    if ((target === 'S' || target === 'L') && (dUmax > 4 || dUmax <= 0)) {
        alert("A queda de tensão máxima permitida (ΔU%) deve ser no máximo 4% e maior que 0.");
        return;
    }

    // 2. Variáveis de Norma
    const rho = 0.021;
    const kv = (type === 'tri') ? Math.sqrt(3) : 2;
    const kp = (type === 'tri') ? Math.sqrt(3) : 1;

    // 3. Correntes
    const ib = p / (kp * vnom * fp);
    const i = ib * fh;

    // Prepara Relatório
    document.getElementById('empty_state').classList.add('hidden');
    document.getElementById('result_display').classList.remove('hidden');
    
    document.getElementById('res_ib').innerText = ib.toFixed(2) + " A";
    document.getElementById('res_i').innerText = i.toFixed(2) + " A";

    const alertBox = document.getElementById('alert_box');
    const alertIcon = document.getElementById('alert_icon');
    const alertText = document.getElementById('alert_text');

    // 4. Executa o cálculo com base no target
    if (target === 'S') {
        const s_calc = (kv * rho * L * i * 100) / (dUmax * vnom);
        
        // Acha o cabo comercial imediatamente superior
        const caboIdeal = cabosComerciais.find(c => c.s >= s_calc) || cabosComerciais[cabosComerciais.length - 1];

        atualizarCardUI("Seção Comercial Recomendada", caboIdeal.s, "mm²", s_calc.toFixed(3) + " mm²", caboIdeal);
        
        configurarAlerta(alertBox, alertIcon, alertText, "success", `Com o cabo de ${caboIdeal.s}mm², a queda será garantida abaixo de ${dUmax}%.`);

    } else if (target === 'dU') {
        const S_instalado = parseFloat(document.getElementById('cabo_inst').value);

        const dU_calc = (kv * rho * L * i * 100) / (S_instalado * vnom);
        const caboInfo = cabosComerciais.find(c => c.s == S_instalado);

        atualizarCardUI("Queda de Tensão (ΔU%)", dU_calc.toFixed(2), "%", dU_calc.toFixed(4) + " %", caboInfo);

        if (dU_calc <= 4.0) {
            configurarAlerta(alertBox, alertIcon, alertText, "success", `Aprovado! A queda de ${dU_calc.toFixed(2)}% atende o limite da NBR 5410 (4%).`);
        } else {
            configurarAlerta(alertBox, alertIcon, alertText, "danger", `Reprovado! A queda de ${dU_calc.toFixed(2)}% ultrapassa o limite da norma (4%). Aumente a seção do cabo.`);
        }

    } else if (target === 'L') {
        const S_instalado = parseFloat(document.getElementById('cabo_inst').value);
        
        const l_calc = (dUmax * S_instalado * vnom) / (kv * rho * i * 100);
        const caboInfo = cabosComerciais.find(c => c.s == S_instalado);

        atualizarCardUI("Comprimento Máximo Permitido", Math.floor(l_calc), "metros", l_calc.toFixed(2) + " m", caboInfo);
        
        configurarAlerta(alertBox, alertIcon, alertText, "success", `Esta é a distância máxima para que a queda não ultrapasse ${dUmax}%.`);
    }
}

// Funções Auxiliares de Interface
function atualizarCardUI(titulo, valorPrincipal, unidade, valorExato, caboObj) {
    document.getElementById('res_title').innerText = titulo;
    document.getElementById('res_main_val').innerText = valorPrincipal;
    document.getElementById('res_main_unit').innerText = unidade;
    document.getElementById('res_exact').innerText = valorExato;
    document.getElementById('res_app').innerText = caboObj.app;
    document.getElementById('res_d').innerText = caboObj.d + " mm";
    document.getElementById('res_ext').innerText = caboObj.ext + " mm";
}

function configurarAlerta(caixa, icone, textoElem, tipo, mensagem) {
    caixa.classList.remove('hidden', 'bg-green-500/20', 'text-green-400', 'bg-red-500/20', 'text-red-400');
    icone.className = 'fas mt-0.5 ';
    
    if (tipo === "success") {
        caixa.classList.add('bg-green-500/20', 'text-green-400');
        icone.classList.add('fa-check-circle');
    } else {
        caixa.classList.add('bg-red-500/20', 'text-red-400');
        icone.classList.add('fa-exclamation-triangle');
    }
    textoElem.innerText = mensagem;
}