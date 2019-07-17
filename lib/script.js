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


function atualizarStatusExame(exameTransaction, status, evento) {
    console.log(`exame ${exameTransaction.exame.exameId} ${status}`)
    var factory = getFactory();
    exameTransaction.exame.status = status
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
    atualizarStatusExame(exameFinalizado, 'PROCESSADO', 'ExameFinalizadoEvent')
}