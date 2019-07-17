'use strict';

/**
 * Cadastrar novo exame
 * @param {com.ita.stagiopbd.NovoExame} novoExame
 * @transaction
 */
function novoExameTransaction(novoExame) {
    console.log('cadastrar novo exame')
    var factory = getFactory();

    novoExame.exame.status = 'PENDENTE'
    novoExame.exame.dataSolicitacao = new Date()
    novoExame.exame.paciente = novoExame.paciente;
    novoExame.exame.medico = novoExame.medico;

    var result = getAssetRegistry('com.ita.stagiopbd.Exame')
        .then(function (assetRegistry) {
            return assetRegistry.update(novoExame.exame);
        });

    if (result) {
        console.log('exame cadastrado')
        var novoExameEvent = factory.newEvent('com.ita.stagiopbd', 'NovoExameEvent');
        novoExameEvent.exame = novoExame.exame;
        console.log('emitindo novoExameEvent')
        emit(novoExameEvent);
    } else {
        console.log('erro ao cadastrar exame', result)
    }

    return result;
}

/**
 * Iniciar processamento exame
 * @param {com.ita.stagiopbd.ExameIniciado} exameIniciado
 * @transaction
 */
function exameIniciadoTransaction(exameIniciado) {
    atualizarStatusExame(exameIniciado, 'EM_PROCESSAMENTO', 'ExameIniciadoEvent')
}

/**
 * Exame finalizado
 * @param {com.ita.stagiopbd.ExameFinalizado} exameFinalizado
 * @transaction
 */
function exameFinalizadoTransaction(exameFinalizado) {
    atualizarStatusExame(exameFinalizado, 'PROCESSADO', 'ExameFinalizadoEvent', true)
}


/**
 * Marcar Consulta
 * @param {com.ita.stagiopbd.MarcarConsulta} novaConsulta
 * @transaction
 */
function marcarConsultaTransaction(novaConsulta) {
    console.log('marcar nova consulta')
    var factory = getFactory();

    novaConsulta.consulta.status = 'MARCADA'
    novaConsulta.consulta.dataConsulta = new Date()
    novaConsulta.consulta.paciente = novaConsulta.paciente;
    novaConsulta.consulta.medico = novaConsulta.medico;

    var result = getAssetRegistry('com.ita.stagiopbd.Consulta')
        .then(function (assetRegistry) {
            return assetRegistry.update(novaConsulta.consulta);
        });

    if (result) {
        console.log('consulta marcada')
        var marcarConsultaEvent = factory.newEvent('com.ita.stagiopbd', 'MarcarConsultaEvent');
        marcarConsultaEvent.consulta = novaConsulta.consulta;
        console.log('emitindo marcarConsultaEvent')
        emit(marcarConsultaEvent);
    } else {
        console.log('erro ao marcar consulta', result)
    }

    return result;
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
    var factory = getFactory();
    exameTransaction.exame.status = status
    if (updateDataResultado) {
        exameTransaction.exame.dataResultado = new Date()
    }
    var result = getAssetRegistry('com.ita.stagiopbd.Exame')
        .then(function (assetRegistry) {
            return assetRegistry.update(exameTransaction.exame);
        });
    if (result) {
        console.log(`Exame ${exameTransaction.exame.exameId} atualizado`)
        var exameEvent = factory.newEvent('com.ita.stagiopbd', evento);
        exameEvent.exame = exameTransaction.exame;
        console.log(`emitindo ${evento}`)
        emit(exameEvent);
    } else {
        console.log(`Erro ao atualizar exame ${exameTransaction.exame.exameId}`)
    }
}

function atualizarStatusConsulta(consultaTransaction, status, evento) {
    console.log(`consulta ${consultaTransaction.consulta.consultaId} ${status}`)
    var factory = getFactory();
    consultaTransaction.consulta.status = status

    var result = getAssetRegistry('com.ita.stagiopbd.Consulta')
        .then(function (assetRegistry) {
            return assetRegistry.update(consultaTransaction.consulta);
        });
    if (result) {
        console.log(`Consulta ${consultaTransaction.consulta.consultaId} atualizada`)
        var consultaEvent = factory.newEvent('com.ita.stagiopbd', evento);
        consultaEvent.consulta = consultaTransaction.consulta;
        console.log(`emitindo ${evento}`)
        emit(consultaEvent);
    } else {
        console.log(`Erro ao atualizar consulta ${consultaTransaction.consulta.consultaId}`)
    }
}