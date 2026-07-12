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

// Tabela de Perfis de Carga
const perfisCarga = [
    { id: "resistivo", nome: "Carga Resistiva", fp: 1.00, fh: 1.00, equipamentos: "Chuveiros, Fornos, Torneiras Elétricas, Lâmpadas Incandescentes." },
    { id: "ar_cond", nome: "Ar Condicionado", fp: 0.80, fh: 1.00, equipamentos: "Aparelhos de Ar Condicionado, Geladeiras, Freezers." },
    { id: "motores", nome: "Motores e Bombas", fp: 0.85, fh: 1.00, equipamentos: "Bombas d'água, Lavadoras, Compressores de ar, Motores em geral." },
    { id: "eletronicos", nome: "Eletrônicos e LED", fp: 0.95, fh: 0.80, equipamentos: "Iluminação LED, Computadores, TVs, Fontes chaveadas." },
    { id: "fluorescente", nome: "Iluminação Fluorescente", fp: 0.92, fh: 1.00, equipamentos: "Lâmpadas tubulares com reator eletrônico." }
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

    // Popula o select de Perfil de Carga
    const selectPerfil = document.getElementById('carga_perfil');
    perfisCarga.forEach((perfil, index) => {
        let opt = document.createElement('option');
        opt.value = index; 
        opt.textContent = perfil.nome;
        selectPerfil.appendChild(opt);
    });

    // Inicia os listeners
    document.getElementById('calc_target').addEventListener('change', atualizarVisibilidade);
    
    // Atualiza os estados iniciais das dinâmicas de interface
    atualizarTipCarga(); 
    atualizarTensoes();
});

// Função para atualizar as TENSÕES baseadas no SISTEMA
function atualizarTensoes() {
    const sysType = document.getElementById('sys_type').value;
    const vnomSelect = document.getElementById('v_nom');
    const currentVnom = vnomSelect.value || '220'; // Padrão

    // Limpa as opções atuais
    vnomSelect.innerHTML = '';

    // Monofásico, Bifásico e Trifásico sempre têm 127V e 220V no Brasil
    vnomSelect.add(new Option('127 V', '127'));
    vnomSelect.add(new Option('220 V', '220'));

    // Se NÃO for monofásico, libera a opção 380V (pois Monofásico não faz 380V)
    if (sysType !== 'mono') {
        vnomSelect.add(new Option('380 V', '380'));
    }

    // Tenta preservar a seleção do usuário se for válida
    if (sysType === 'mono' && currentVnom === '380') {
        vnomSelect.value = '220'; // Rebaixa para 220V em caso de bloqueio do 380V
    } else {
        vnomSelect.value = currentVnom;
    }
}

function atualizarTipCarga() {
    const index = document.getElementById('carga_perfil').value;
    const perfil = perfisCarga[index];
    
    document.getElementById('tip_equipamentos').innerText = "Exemplos: " + perfil.equipamentos;
    document.getElementById('tip_valores').innerText = `FP: ${perfil.fp.toFixed(2)} | fh: ${perfil.fh.toFixed(2)}`;
}

function atualizarVisibilidade() {
    const target = document.getElementById('calc_target').value;
    
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

function calcular() {
    // 1. Coleta base
    const target = document.getElementById('calc_target').value;
    const type = document.getElementById('sys_type').value;
    const vnom = parseFloat(document.getElementById('v_nom').value);
    const p = parseFloat(document.getElementById('pot').value);
    
    const perfilSelecionado = perfisCarga[document.getElementById('carga_perfil').value];
    const fp = perfilSelecionado.fp;
    const fh = perfilSelecionado.fh;

    // VALIDAÇÕES DE SEGURANÇA E LIMITES
    if (!p || p <= 0) {
        return alert("Por favor, insira uma Potência (W) válida maior que zero.");
    }
    if (p > 200000) {
        return alert("A potência informada excede o limite máximo permitido de 200.000 W (200 kW).");
    }

    // 2. Constantes e Fatores
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

    // 4. Lógica por Alvo
    if (target === 'S') {
        const L = parseFloat(document.getElementById('len').value);
        const dUmax = parseFloat(document.getElementById('du_max').value);
        
        if (!L || L <= 0) return alert("Insira um comprimento válido maior que zero.");
        if (L > 1000) return alert("O comprimento excede o limite máximo permitido de 1000 m.");
        
        if (!dUmax || dUmax <= 0) return alert("O valor de queda de tensão (ΔU%) deve ser maior que zero.");
        if (dUmax > 4.0) return alert("Erro: Para este cálculo, o ΔU% máximo permitido pela NBR 5410 é de 4%.");

        const s_calc = (kv * rho * L * i * 100) / (dUmax * vnom);
        
        const caboIdeal = cabosComerciais.find(c => c.s >= s_calc) || cabosComerciais[cabosComerciais.length - 1];

        atualizarCardUI("Seção Comercial Recomendada", caboIdeal.s, "mm²", s_calc.toFixed(3) + " mm²", caboIdeal);
        configurarAlerta(alertBox, alertIcon, alertText, "success", `Com o cabo de ${caboIdeal.s}mm², a queda será garantida abaixo de ${dUmax}%.`);

    } else if (target === 'dU') {
        const L = parseFloat(document.getElementById('len').value);
        const S_instalado = parseFloat(document.getElementById('cabo_inst').value);
        
        if (!L || L <= 0) return alert("Insira um comprimento válido maior que zero.");
        if (L > 1000) return alert("O comprimento excede o limite máximo permitido de 1000 m.");

        const dU_calc = (kv * rho * L * i * 100) / (S_instalado * vnom);
        const caboInfo = cabosComerciais.find(c => c.s == S_instalado);

        atualizarCardUI("Queda de Tensão (ΔU%)", dU_calc.toFixed(2), "%", dU_calc.toFixed(4) + " %", caboInfo);

        if (dU_calc <= 4.0) {
            configurarAlerta(alertBox, alertIcon, alertText, "success", `Aprovado! A queda de ${dU_calc.toFixed(2)}% atende o limite da NBR 5410 (4%).`);
        } else {
            configurarAlerta(alertBox, alertIcon, alertText, "danger", `Reprovado! A queda de ${dU_calc.toFixed(2)}% ultrapassa o limite da norma (4%). Aumente a seção do cabo.`);
        }

    } else if (target === 'L') {
        const dUmax = parseFloat(document.getElementById('du_max').value);
        const S_instalado = parseFloat(document.getElementById('cabo_inst').value);
        
        if (!dUmax || dUmax <= 0) return alert("O valor de queda de tensão (ΔU%) deve ser maior que zero.");
        if (dUmax > 4.0) return alert("Erro: Para este cálculo, o ΔU% máximo permitido pela NBR 5410 é de 4%.");
        
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