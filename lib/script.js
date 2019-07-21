'use strict';

/**
 * Cadastrar novo exame
 * @param {com.ita.stagiopbd.SolicitarExame} novoExame
 * @transaction
 */
async function novoExameTransaction(novoExame) {
    console.log('cadastrar novo exame')
    let factory = getFactory();

    const NS = 'com.ita.stagiopbd'

    let hospitalRegistry = await getParticipantRegistry(`${NS}.Hospital`)
    let hospital = await hospitalRegistry.get(novoExame.hospital.hospitalId)

    let fornecedores = []
    if (hospital.fornecedores) {
        let fornecedorRegistry = await getParticipantRegistry(`${NS}.Fornecedor`)
        fornecedores = hospital.fornecedores.filter(async f => {
            let fornecedor = await fornecedorRegistry.get(f.$identifier)
            return fornecedor.especialidade === novoExame.especialidade
        })
    }
    if (fornecedores.length !== 0) {
        let exameRegistry = await getAssetRegistry(`${NS}.Exame`)
        let exames = await exameRegistry.getAll()

        let newId = exames.length + 1

        if (exames.length != 0) {
            newId = Math.max.apply(Math, exames.map(function (o) { return o.exameId; })) + 1
        }

        var exame = factory.newResource(NS, 'Exame', newId.toString());
        exame.nome = novoExame.nome
        exame.especialidade = novoExame.especialidade
        exame.status = 'PENDENTE'
        exame.dataSolicitacao = new Date()
        exame.medico = factory.newRelationship(NS, 'Medico', novoExame.medico.pessoaId);
        exame.paciente = factory.newRelationship(NS, 'Paciente', novoExame.paciente.pessoaId);
        exame.hospital = factory.newRelationship(NS, 'Hospital', novoExame.hospital.hospitalId);
        exame.fornecedor = factory.newRelationship(NS, 'Fornecedor', fornecedores[0].$identifier);

        await exameRegistry.add(exame);

        novoExame.exame = factory.newRelationship(NS, 'Exame', exame.exameId);

        console.log('exame cadastrado')
        let novoExameEvent = factory.newEvent('com.ita.stagiopbd', 'MarcarExameEvent');
        novoExameEvent.exame = factory.newRelationship(NS, 'Exame', exame.exameId);
        console.log('emitindo novoExameEvent')
        emit(novoExameEvent);
    } else {
        throw new Error('Não existe fornecedor para realizar este exame!')
    }

    return novoExame;
}

/**
 * Iniciar processamento exame
 * @param {com.ita.stagiopbd.IniciarExameFornecedor} exameIniciado
 * @transaction
 */
function exameIniciadoTransaction(exameIniciado) {
    return atualizarStatusExame(exameIniciado, 'PENDENTE', 'EM_PROCESSAMENTO', 'IniciarExameEvent')
}

/**
 * Exame finalizado
 * @param {com.ita.stagiopbd.FinalizarExameFornecedor} exameFinalizado
 * @transaction
 */
function exameFinalizadoTransaction(exameFinalizado) {
    return atualizarStatusExame(exameFinalizado, 'EM_PROCESSAMENTO', 'PROCESSADO', 'FinalizarExameEvent', true)
}


/**
 * Marcar Consulta
 * @param {com.ita.stagiopbd.MarcarConsulta} novaConsulta
 * @transaction
 */
async function marcarConsultaTransaction(novaConsulta) {
    console.log('marcar nova consulta')

    let factory = getFactory();
    const NS = 'com.ita.stagiopbd'

    let consultaRegistry = await getAssetRegistry(`${NS}.Consulta`)
    let consultas = await consultaRegistry.getAll()

    let newId = consultas.length + 1
    let hasExists = false

    if (consultas.length != 0) {
        hasExists = consultas.filter(c => {
            return c.medico.$identifier === novaConsulta.medico.pessoaId && c.dataConsulta.getTime() === novaConsulta.dataConsulta.getTime()
        }).length !== 0
        newId = Math.max.apply(Math, consultas.map(function (o) { return o.consultaId; })) + 1
    }
    if (hasExists) {
        throw new Error('Médico não disponível nesse dia e horário!')
    } else {
        var consulta = factory.newResource(NS, 'Consulta', newId.toString());
        consulta.status = 'MARCADA'
        consulta.dataConsulta = novaConsulta.dataConsulta
        consulta.tipo = novaConsulta.tipo

        consulta.medico = factory.newRelationship(NS, 'Medico', novaConsulta.medico.pessoaId);
        consulta.paciente = factory.newRelationship(NS, 'Paciente', novaConsulta.paciente.pessoaId);
        consulta.hospital = factory.newRelationship(NS, 'Hospital', novaConsulta.hospital.hospitalId);
        await consultaRegistry.add(consulta);

        novaConsulta.consulta = factory.newRelationship(NS, 'Consulta', consulta.consultaId);

        console.log('consulta marcada')
        let marcarConsultaEvent = factory.newEvent(NS, 'MarcarConsultaEvent');
        marcarConsultaEvent.consulta = factory.newRelationship(NS, 'Consulta', consulta.consultaId);
        console.log('emitindo marcarConsultaEvent')
        emit(marcarConsultaEvent);
    }

    return novaConsulta;
}

/**
 * Iniciar consulta
 * @param {com.ita.stagiopbd.IniciarConsulta} consultaPendente
 * @transaction
 */
function iniciarConsultaTransaction(consultaPendente) {
    atualizarStatusConsulta(consultaPendente, 'EM_EXECUCAO', 'IniciarConsultaEvent')
}

/**
 * Finalizar consulta
 * @param {com.ita.stagiopbd.FinalizarConsulta} consultaIniciada
 * @transaction
 */
function finalizarConsultaTransaction(consultaIniciada) {
    atualizarStatusConsulta(consultaIniciada, 'FINALIZADA', 'FinalizarConsultaEvent')
}

async function atualizarStatusExame(exameTransaction, statusAntigo, status, evento, updateDataResultado = false) {
    console.log(`exame ${exameTransaction.exame.exameId} ${status}`)
    let assetRegistry = await getAssetRegistry('com.ita.stagiopbd.Exame')

    let exameBlock = await assetRegistry.get(exameTransaction.exame.exameId)
    let msg = 'Exame já está'
    if (exameBlock.status === statusAntigo) {
        throw new Error(`${msg} ${statusAntigo}`)
    } else if (exameBlock.status === status) {
        throw new Error(`${msg} ${status}`)
    } else if (exameBlock.status === 'PROCESSADO') {
        throw new Error(`${msg} PROCESSADO`)
    }

    if (exameBlock.fornecedor.$identifier === exameTransaction.fornecedor.$identifier) {
        let factory = getFactory();
        exameTransaction.exame.status = status
        if (updateDataResultado) {
            exameTransaction.exame.dataResultado = new Date()
        }
        await assetRegistry.update(exameTransaction.exame)

        console.log(`Exame ${exameTransaction.exame.exameId} atualizado`)
        let exameEvent = factory.newEvent('com.ita.stagiopbd', evento);
        exameEvent.exame = exameTransaction.exame;
        console.log(`emitindo ${evento}`)
        emit(exameEvent);
    } else {
        throw new Error(`Fornecedor ${exameTransaction.fornecedor.$identifier} não é responsável pelo exame ${exameTransaction.exame.exameId}`)
    }

}

function atualizarStatusConsulta(consultaTransaction, status, evento) {
    console.log(`consulta ${consultaTransaction.consulta.consultaId} ${status}`)
    let factory = getFactory();
    consultaTransaction.consulta.status = status

    if (status === 'FINALIZADA') {
        consultaTransaction.consulta.sintomasPaciente = consultaTransaction.sintomasPaciente
        consultaTransaction.consulta.observacoesMedico = consultaTransaction.observacoesMedico
    }

    let result = getAssetRegistry('com.ita.stagiopbd.Consulta')
        .then(function (assetRegistry) {
            return assetRegistry.update(consultaTransaction.consulta);
        });
    if (result) {
        console.log(`Consulta ${consultaTransaction.consulta.consultaId} atualizada`)
        let consultaEvent = factory.newEvent('com.ita.stagiopbd', evento);
        consultaEvent.consulta = consultaTransaction.consulta;
        console.log(`emitindo ${evento}`)
        emit(consultaEvent);
    } else {
        console.log(`Erro ao atualizar consulta ${consultaTransaction.consulta.consultaId}`)
    }
}

/**
 * Contratar Fornecedor
 * @param {com.ita.stagiopbd.ContratarFornecedor} novoContrato
 * @transaction
 */
async function contratarFornecedorTransaction(novoContrato) {
    console.log('novo contrato')
    let factory = getFactory();
    const NS = 'com.ita.stagiopbd'

    let hospitalRegistry = await getParticipantRegistry(`${NS}.Hospital`)
    let hospital = await hospitalRegistry.get(novoContrato.hospital.hospitalId)
    if (hospital.fornecedores === undefined) {
        hospital.fornecedores = []
    }
    let hasExists = false
    if (hospital.fornecedores.length !== 0) {
        hasExists = hospital.fornecedores.filter(c => {
            return c.$identifier === novoContrato.fornecedor.pessoaId
        }).length !== 0
    }
    if (hasExists) {
        throw new Error('Fornecedor já contratado anteriormente!')
    } else {
        hospital.fornecedores.push(novoContrato.fornecedor)
        await hospitalRegistry.update(hospital)
    }
}


function randomName(length = 20) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function geraRandom(n) {
    return Math.round(Math.random() * n);
}

function mod(dividendo, divisor) {
    return Math.round(dividendo - (Math.floor(dividendo / divisor) * divisor));
}

function randomCpf() {
    var n = 9;
    var n1 = geraRandom(n);
    var n2 = geraRandom(n);
    var n3 = geraRandom(n);
    var n4 = geraRandom(n);
    var n5 = geraRandom(n);
    var n6 = geraRandom(n);
    var n7 = geraRandom(n);
    var n8 = geraRandom(n);
    var n9 = geraRandom(n);
    var d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
    d1 = 11 - (mod(d1, 11));
    if (d1 >= 10) d1 = 0;
    var d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
    d2 = 11 - (mod(d2, 11));
    if (d2 >= 10) d2 = 0;

    return '' + n1 + n2 + n3 + '.' + n4 + n5 + n6 + '.' + n7 + n8 + n9 + '-' + d1 + d2;
}
function randomCnpj() {
    var n = 9;
    var n1 = geraRandom(n);
    var n2 = geraRandom(n);
    var n3 = geraRandom(n);
    var n4 = geraRandom(n);
    var n5 = geraRandom(n);
    var n6 = geraRandom(n);
    var n7 = geraRandom(n);
    var n8 = geraRandom(n);
    var n9 = 0;
    var n10 = 0;
    var n11 = 0;
    var n12 = 1;
    var d1 = n12 * 2 + n11 * 3 + n10 * 4 + n9 * 5 + n8 * 6 + n7 * 7 + n6 * 8 + n5 * 9 + n4 * 2 + n3 * 3 + n2 * 4 + n1 * 5;
    d1 = 11 - (mod(d1, 11));
    if (d1 >= 10) d1 = 0;
    var d2 = d1 * 2 + n12 * 3 + n11 * 4 + n10 * 5 + n9 * 6 + n8 * 7 + n7 * 8 + n6 * 9 + n5 * 2 + n4 * 3 + n3 * 4 + n2 * 5 + n1 * 6;
    d2 = 11 - (mod(d2, 11));
    if (d2 >= 10) d2 = 0;

    return '' + n1 + n2 + '.' + n3 + n4 + n5 + '.' + n6 + n7 + n8 + '/' + n9 + n10 + n11 + n12 + '-' + d1 + d2;
}

function randomDate() {
    const start = new Date(1900, 1, 1)
    return new Date(start.getTime() + Math.random() * (new Date().getTime() - start.getTime()));
}

function randomTelefone() {
    let telefone = `(${geraRandom(9)}${geraRandom(9)})9`
    for (let i = 0; i <= 3; i++) {
        telefone += geraRandom(9)
    }
    telefone += '-'
    for (let i = 0; i <= 3; i++) {
        telefone += geraRandom(9)
    }
    return telefone
}

function criarEndereco(NS, factory) {
    var endereco = factory.newConcept(NS, 'Endereco');
    endereco.municipio = randomName()
    endereco.uf = randomName()
    endereco.logradouro = randomName()
    endereco.numero = randomName()
    endereco.bairro = randomName()
    endereco.cep = randomName()
    return endereco
}

async function criarPessoa(NS, factory, tipoPessoa, qtdPessoa, especialidade = '') {
    console.log(`criando ${qtdPessoa} ${tipoPessoa}`)
    let pessoaRegistry = await getParticipantRegistry(`${NS}.${tipoPessoa}`)
    let pessoasAntigas = await pessoaRegistry.getAll()

    let newId = pessoasAntigas.length + 1
    if (pessoasAntigas.length != 0) {
        newId = Math.max.apply(Math, pessoasAntigas.map(function (o) { return o.pessoaId; })) + 1
    }

    let pessoas = []

    for (let i = 0; i < qtdPessoa; i++) {
        var pessoa = factory.newResource(NS, tipoPessoa, newId.toString());
        pessoa.nome = randomName()
        pessoa.cpf_cnpj = randomCpf()
        pessoa.dataNascimento = randomDate()
        pessoa.email = `${randomName(7)}@${randomName(5)}.com`
        pessoa.endereco = criarEndereco(NS, factory)

        if (tipoPessoa === 'Medico') {
            pessoa.crm = randomCpf()
        } else if (tipoPessoa === 'Fornecedor') {
            pessoa.especialidade = especialidade
        }

        pessoas.push(pessoa)

        newId++
    }

    return pessoaRegistry.addAll(pessoas)
}

async function criarHospital(NS, factory, qtdHospital) {
    console.log(`criando ${qtdHospital} hospitais`)
    let hospitalRegistry = await getParticipantRegistry(`${NS}.Hospital`)
    let hospitaisAntigos = await hospitalRegistry.getAll()

    let newId = hospitaisAntigos.length + 1
    if (hospitaisAntigos.length != 0) {
        newId = Math.max.apply(Math, hospitaisAntigos.map(function (o) { return o.hospitalId; })) + 1
    }

    let hospitais = []
    for (let i = 0; i < qtdHospital; i++) {
        var hospital = factory.newResource(NS, 'Hospital', newId.toString());
        hospital.nome = randomName()
        hospital.cnpj = randomCnpj()
        hospital.telefone = randomTelefone()
        hospital.endereco = criarEndereco(NS, factory)
        hospitais.push(hospital)
        newId++
    }
    return hospitalRegistry.addAll(hospitais);

}

/**
 * Setup Demo
 * @param {com.ita.stagiopbd.SetupDemo} setupDemo
 * @transaction
 */
async function setupDemoTransaction(setupDemo) {
    try {

        let factory = getFactory();
        const NS = 'com.ita.stagiopbd'

        // criando três pacientes
        await criarPessoa(NS, factory, 'Paciente', setupDemo.qtdPacientes)

        // criando três médicos
        await criarPessoa(NS, factory, 'Medico', setupDemo.qtdMedicos)

        // criando três fornecedores
        await criarPessoa(NS, factory, 'Fornecedor', setupDemo.qtdFornecedores, setupDemo.especialidade)

        // criando três hospitais
        await criarHospital(NS, factory, setupDemo.qtdHospitais)

    } catch (err) {
        console.log(err)
        throw new Error(`Erro na transaction: ${err}`)
    }
}