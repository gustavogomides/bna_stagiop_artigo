'use strict';

/**
 * Cadastrar novo exame
 * @param {com.ita.stagiopbd.MarcarExame} novoExame
 * @transaction
 */
async function novoExameTransaction(novoExame) {
    console.log('cadastrar novo exame')
    let factory = getFactory();

    const NS = 'com.ita.stagiopbd'

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
    await exameRegistry.add(exame);

    novoExame.exame = factory.newRelationship(NS, 'Exame', exame.exameId);

    console.log('exame cadastrado')
    let novoExameEvent = factory.newEvent('com.ita.stagiopbd', 'MarcarExameEvent');
    novoExameEvent.exame = factory.newRelationship(NS, 'Exame', exame.exameId);
    console.log('emitindo novoExameEvent')
    emit(novoExameEvent);

    return novoExame;
}

/**
 * Iniciar processamento exame
 * @param {com.ita.stagiopbd.IniciarExame} exameIniciado
 * @transaction
 */
function exameIniciadoTransaction(exameIniciado) {
    atualizarStatusExame(exameIniciado, 'EM_PROCESSAMENTO', 'IniciarExameEvent')
}

/**
 * Exame finalizado
 * @param {com.ita.stagiopbd.FinalizarExame} exameFinalizado
 * @transaction
 */
function exameFinalizadoTransaction(exameFinalizado) {
    atualizarStatusExame(exameFinalizado, 'PROCESSADO', 'FinalizarExameEvent', true)
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

function atualizarStatusExame(exameTransaction, status, evento, updateDataResultado = false) {
    console.log(`exame ${exameTransaction.exame.exameId} ${status}`)
    let factory = getFactory();
    exameTransaction.exame.status = status
    if (updateDataResultado) {
        exameTransaction.exame.dataResultado = new Date()
    }
    let result = getAssetRegistry('com.ita.stagiopbd.Exame')
        .then(function (assetRegistry) {
            return assetRegistry.update(exameTransaction.exame);
        });
    if (result) {
        console.log(`Exame ${exameTransaction.exame.exameId} atualizado`)
        let exameEvent = factory.newEvent('com.ita.stagiopbd', evento);
        exameEvent.exame = exameTransaction.exame;
        console.log(`emitindo ${evento}`)
        emit(exameEvent);
    } else {
        console.log(`Erro ao atualizar exame ${exameTransaction.exame.exameId}`)
    }
}

function atualizarStatusConsulta(consultaTransaction, status, evento) {
    console.log(`consulta ${consultaTransaction.consulta.consultaId} ${status}`)
    let factory = getFactory();
    consultaTransaction.consulta.status = status

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
// function randomName(length) {
//     let result = '';
//     let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let charactersLength = characters.length;
//     for (let i = 0; i < length; i++) {
//         result += characters.charAt(Math.floor(Math.random() * charactersLength));
//     }
//     return result;
// }

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