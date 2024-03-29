'use strict'

const NS = 'br.ita.stagiopbd'

/**
 * Cadastrar novo exame
 * @param {br.ita.stagiopbd.SolicitarExame} novoExame
 * @transaction
 */
async function novoExameTransaction(novoExame) {
    console.log('cadastrar novo exame')
    let factory = getFactory()
    console.log(novoExame)

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

        var exame = factory.newResource(NS, 'Exame', new Date().getTime().toString())
        exame.nome = novoExame.nome
        exame.especialidade = novoExame.especialidade
        exame.status = 'PENDENTE'
        exame.dataSolicitacao = new Date()
        exame.medico = factory.newRelationship(NS, 'Medico', novoExame.medico.pessoaId)
        exame.paciente = factory.newRelationship(NS, 'Paciente', novoExame.paciente.pessoaId)
        exame.hospital = factory.newRelationship(NS, 'Hospital', novoExame.hospital.hospitalId)
        exame.fornecedor = factory.newRelationship(NS, 'Fornecedor', fornecedores[0].$identifier)

        await exameRegistry.add(exame)

        novoExame.exame = factory.newRelationship(NS, 'Exame', exame.exameId)

        console.log('exame cadastrado')

        return criarNotificacao(NS, factory, {
            tipo: 'novo_exame',
            origem: 'medico',
            destino: 'hospital',
            titulo: 'Novo Exame'
        })
    } else {
        throw new Error('Não existe fornecedor para realizar este exame!')
    }

}

/**
 * Iniciar processamento exame
 * @param {br.ita.stagiopbd.IniciarExameFornecedor} exameIniciado
 * @transaction
 */
function exameIniciadoTransaction(exameIniciado) {
    return atualizarStatusExame(exameIniciado, 'EM_PROCESSAMENTO')
}

/**
 * Exame finalizado
 * @param {br.ita.stagiopbd.FinalizarExameFornecedor} exameFinalizado
 * @transaction
 */
function exameFinalizadoTransaction(exameFinalizado) {
    return atualizarStatusExame(exameFinalizado, 'PROCESSADO', true)
}


/**
 * Marcar Consulta
 * @param {br.ita.stagiopbd.MarcarConsulta} novaConsulta
 * @transaction
 */
async function marcarConsultaTransaction(novaConsulta) {
    console.log('marcar nova consulta')

    let factory = getFactory()

    let consultaRegistry = await getAssetRegistry(`${NS}.Consulta`)
    let consultas = await consultaRegistry.getAll()

    let hasExists = false

    if (consultas.length != 0) {
        hasExists = consultas.filter(c => {
            return c.medico.$identifier === novaConsulta.medico.pessoaId && c.dataConsulta.getTime() === novaConsulta.dataConsulta.getTime()
        }).length !== 0
    }
    if (hasExists) {
        throw new Error('Médico não disponível nesse dia e horário!')
    } else {
        var consulta = factory.newResource(NS, 'Consulta', new Date().getTime().toString())
        consulta.status = 'MARCADA'
        consulta.dataConsulta = novaConsulta.dataConsulta
        consulta.tipo = novaConsulta.tipo

        consulta.medico = factory.newRelationship(NS, 'Medico', novaConsulta.medico.pessoaId)
        consulta.paciente = factory.newRelationship(NS, 'Paciente', novaConsulta.paciente.pessoaId)
        consulta.hospital = factory.newRelationship(NS, 'Hospital', novaConsulta.hospital.hospitalId)
        await consultaRegistry.add(consulta)

        novaConsulta.consulta = factory.newRelationship(NS, 'Consulta', consulta.consultaId)

        console.log('consulta marcada')
        return criarNotificacao(NS, factory, {
            tipo: 'nova_consulta',
            origem: 'paciente',
            destino: 'hospital',
            titulo: 'Nova Consulta'
        })
    }
}

/**
 * Iniciar consulta
 * @param {br.ita.stagiopbd.IniciarConsulta} consultaPendente
 * @transaction
 */
function iniciarConsultaTransaction(consultaPendente) {
    return atualizarStatusConsulta(consultaPendente, 'EM_EXECUCAO')
}

/**
 * Finalizar consulta
 * @param {br.ita.stagiopbd.FinalizarConsulta} consultaIniciada
 * @transaction
 */
function finalizarConsultaTransaction(consultaIniciada) {
    return atualizarStatusConsulta(consultaIniciada, 'FINALIZADA')
}

async function atualizarStatusExame(exameTransaction, status, updateDataResultado = false) {
    console.log(`exame ${exameTransaction.exame.exameId} ${status}`)
    let factory = getFactory()
    let assetRegistry = await getAssetRegistry(`${NS}.Exame`)

    let exameBlock = await assetRegistry.get(exameTransaction.exame.exameId)
    let msg = `Exame ${exameTransaction.exame.exameId} já está`
    if (exameBlock.status === status) {
        throw new Error(`${msg} ${status}`)
    } else if (exameBlock.status === 'PROCESSADO') {
        throw new Error(`${msg} PROCESSADO`)
    }

    if (exameBlock.fornecedor.$identifier === exameTransaction.fornecedor.$identifier) {
        let factory = getFactory()
        exameTransaction.exame.status = status
        if (updateDataResultado) {
            var resultadoExame = factory.newConcept(NS, 'ResultadoExame')
            resultadoExame.descricao = exameTransaction.descricao
            resultadoExame.status = exameTransaction.status
            resultadoExame.dataResultado = new Date()
            exameTransaction.exame.resultado = resultadoExame
        }
        await assetRegistry.update(exameTransaction.exame)

        console.log(`Exame ${exameTransaction.exame.exameId} atualizado`)
        return criarNotificacao(NS, factory, {
            tipo: 'atualizacao_status_exame',
            origem: 'fornecedor',
            destino: 'hospital',
            titulo: `Exame ${status}`
        })
    } else {
        throw new Error(`Fornecedor ${exameTransaction.fornecedor.$identifier} não é responsável pelo exame ${exameTransaction.exame.exameId}`)
    }

}

async function atualizarStatusConsulta(consultaTransaction, status) {
    console.log(`consulta ${consultaTransaction.consulta.consultaId} ${status}`)
    let factory = getFactory()
    let assetRegistry = await getAssetRegistry(`${NS}.Consulta`)

    let consultaBlock = await assetRegistry.get(consultaTransaction.consulta.consultaId)
    let msg = `Consulta ${consultaTransaction.consulta.consultaId} já está`
    if (consultaBlock.status === status) {
        throw new Error(`${msg} ${status}`)
    } else if (consultaBlock.status === 'FINALIZADA') {
        throw new Error(`${msg} FINALIZADA`)
    }

    consultaTransaction.consulta.status = status

    if (status === 'FINALIZADA') {
        consultaTransaction.consulta.sintomasPaciente = consultaTransaction.sintomasPaciente
        consultaTransaction.consulta.observacoesMedico = consultaTransaction.observacoesMedico
    }

    await assetRegistry.update(consultaTransaction.consulta)

    console.log(`Consulta ${consultaTransaction.consulta.consultaId} atualizada`)
    return criarNotificacao(NS, factory, {
        tipo: 'atualizacao_status_consulta',
        origem: 'medico',
        destino: 'hospital',
        titulo: `Consulta ${status}`
    })
}

/**
 * Contratar Fornecedor
 * @param {br.ita.stagiopbd.ContratarFornecedor} novoContrato
 * @transaction
 */
async function contratarFornecedorTransaction(novoContrato) {
    console.log('novo contrato')
    let factory = getFactory()
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
        return criarNotificacao(NS, factory, {
            tipo: 'contratar_fornecedor',
            origem: 'hospital',
            destino: 'hospital',
            titulo: 'Novo Fornecedor contratado'
        })
    }
}


/**
 * Setup Demo
 * @param {br.ita.stagiopbd.SetupDemo} setupDemo
 * @transaction
 */
async function setupDemoTransaction(setupDemo) {
    try {

        let factory = getFactory()

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

/**
 * SolicitarAcessoDados
 * @param {br.ita.stagiopbd.SolicitarAcessoDados} solicitacao
 * @transaction
 */
async function solicitacaoTransaction(solicitacao) {
    try {
        console.log('nova solicitacao')
        let factory = getFactory()
        let solicitacaoRegistry = await getAssetRegistry(`${NS}.AutorizacoesPacientes`)
        let solicitacoes = await solicitacaoRegistry.getAll()
        let ativas = solicitacoes.filter(s => {
            return s.paciente.$identifier === solicitacao.paciente.pessoaId
                && s.hospital.$identifier === solicitacao.hospital.hospitalId
                && s.status === 'ATIVA'
        })
        let pendentes = solicitacoes.filter(s => {
            return s.paciente.$identifier === solicitacao.paciente.pessoaId
                && s.hospital.$identifier === solicitacao.hospital.hospitalId
                && s.status === 'PENDENTE'
        })
        let inativas = solicitacoes.filter(s => {
            return s.paciente.$identifier === solicitacao.paciente.pessoaId
                && s.hospital.$identifier === solicitacao.hospital.hospitalId
                && s.status === 'INATIVA'
        })
        if ((ativas.length > 0 || pendentes.length > 0) && inativas.length >= 0) {
            throw new Error("Solicitação já enviada anteriormente ou já autorizada!")
        } else {
            var novaSolicitacao = factory.newResource(NS, 'AutorizacoesPacientes', new Date().getTime().toString())
            novaSolicitacao.dataSolicitacao = new Date()
            novaSolicitacao.status = 'PENDENTE'
            novaSolicitacao.paciente = factory.newRelationship(NS, 'Paciente', solicitacao.paciente.pessoaId)
            novaSolicitacao.hospital = factory.newRelationship(NS, 'Hospital', solicitacao.hospital.hospitalId)
            await solicitacaoRegistry.add(novaSolicitacao)
            return criarNotificacao(NS, factory, {
                tipo: 'solicitacao_acesso',
                origem: 'hospital',
                destino: 'paciente',
                titulo: 'Nova solicitacao'
            })
        }

    } catch (err) {
        console.log(err)
        throw new Error(`Erro na transaction: ${err}`)
    }
}

/**
 * AutorizarAcessoDados
 * @param {br.ita.stagiopbd.AutorizarAcessoDados} autorizacao
 * @transaction
 */
async function autorizacaoTransaction(autorizacao) {
    try {
        console.log('nova autorizacao')
        let autorizacaoRegistry = await getAssetRegistry(`${NS}.AutorizacoesPacientes`)
        let autorizacaoes = await autorizacaoRegistry.getAll()
        let autorizacoesPaciente = autorizacaoes.filter(s => {
            return s.paciente.$identifier === autorizacao.paciente.pessoaId
                && s.hospital.$identifier === autorizacao.hospital.hospitalId
                && s.status === 'PENDENTE'
        })
        if (autorizacoesPaciente.length > 0) {
            autorizacoesPaciente.map(async aut => {
                aut.status = 'ATIVA'
                aut.dataAutorizacao = new Date()
                await autorizacaoRegistry.update(aut)
            })
            criarNotificacao(NS, factory, {
                tipo: 'autorizacao_acesso',
                origem: 'paciente',
                destino: 'hospital',
                titulo: 'Nova autorizacao'
            })
        } else {
            throw new Error("Não existe solicitação pendente ou autorização já condedida anteriormente!")
        }

    } catch (err) {
        console.log(err)
        throw new Error(`Erro na transaction: ${err}`)
    }
}

/**
 * RevogarAcessoDados
 * @param {br.ita.stagiopbd.RevogarAcessoDados} revogacao
 * @transaction
 */
async function revogacaoTransaction(revogacao) {
    try {
        console.log('nova revogacao')
        let revogacaoRegistry = await getAssetRegistry(`${NS}.AutorizacoesPacientes`)
        let revogacoes = await revogacaoRegistry.getAll()
        let autorizacoesPaciente = revogacoes.filter(s => {
            return s.paciente.$identifier === revogacao.paciente.pessoaId
                && s.hospital.$identifier === revogacao.hospital.hospitalId
                && s.status !== 'INATIVA'
        })
        if (autorizacoesPaciente.length > 0) {
            autorizacoesPaciente.map(async aut => {
                aut.status = 'INATIVA'
                aut.dataRevogacao = new Date()
                await revogacaoRegistry.update(aut)
            })
            criarNotificacao(NS, factory, {
                tipo: 'revogação_acesso',
                origem: 'paciente',
                destino: 'hospital',
                titulo: 'Nova revogação'
            })
        } else {
            throw new Error("Não existe autorização pendente ou ativa!")
        }
    } catch (err) {
        console.log(err)
        throw new Error(`Erro na transaction: ${err}`)
    }
}

function randomName(length = 20) {
    let result = ''
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

function geraRandom(n) {
    return Math.round(Math.random() * n)
}

function mod(dividendo, divisor) {
    return Math.round(dividendo - (Math.floor(dividendo / divisor) * divisor))
}

function randomCpf() {
    var n = 9
    var n1 = geraRandom(n)
    var n2 = geraRandom(n)
    var n3 = geraRandom(n)
    var n4 = geraRandom(n)
    var n5 = geraRandom(n)
    var n6 = geraRandom(n)
    var n7 = geraRandom(n)
    var n8 = geraRandom(n)
    var n9 = geraRandom(n)
    var d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10
    d1 = 11 - (mod(d1, 11))
    if (d1 >= 10) d1 = 0
    var d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11
    d2 = 11 - (mod(d2, 11))
    if (d2 >= 10) d2 = 0

    return '' + n1 + n2 + n3 + '.' + n4 + n5 + n6 + '.' + n7 + n8 + n9 + '-' + d1 + d2
}
function randomCnpj() {
    var n = 9
    var n1 = geraRandom(n)
    var n2 = geraRandom(n)
    var n3 = geraRandom(n)
    var n4 = geraRandom(n)
    var n5 = geraRandom(n)
    var n6 = geraRandom(n)
    var n7 = geraRandom(n)
    var n8 = geraRandom(n)
    var n9 = 0
    var n10 = 0
    var n11 = 0
    var n12 = 1
    var d1 = n12 * 2 + n11 * 3 + n10 * 4 + n9 * 5 + n8 * 6 + n7 * 7 + n6 * 8 + n5 * 9 + n4 * 2 + n3 * 3 + n2 * 4 + n1 * 5
    d1 = 11 - (mod(d1, 11))
    if (d1 >= 10) d1 = 0
    var d2 = d1 * 2 + n12 * 3 + n11 * 4 + n10 * 5 + n9 * 6 + n8 * 7 + n7 * 8 + n6 * 9 + n5 * 2 + n4 * 3 + n3 * 4 + n2 * 5 + n1 * 6
    d2 = 11 - (mod(d2, 11))
    if (d2 >= 10) d2 = 0

    return '' + n1 + n2 + '.' + n3 + n4 + n5 + '.' + n6 + n7 + n8 + '/' + n9 + n10 + n11 + n12 + '-' + d1 + d2
}

function randomDate() {
    const start = new Date(1900, 1, 1)
    return new Date(start.getTime() + Math.random() * (new Date().getTime() - start.getTime()))
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
    var endereco = factory.newConcept(NS, 'Endereco')
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
        newId = Math.max.apply(Math, pessoasAntigas.map(function (o) { return o.pessoaId })) + 1
    }

    let pessoas = []

    for (let i = 0; i < qtdPessoa; i++) {
        var pessoa = factory.newResource(NS, tipoPessoa, newId.toString())
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
        newId = Math.max.apply(Math, hospitaisAntigos.map(function (o) { return o.hospitalId })) + 1
    }

    let hospitais = []
    for (let i = 0; i < qtdHospital; i++) {
        var hospital = factory.newResource(NS, 'Hospital', newId.toString())
        hospital.nome = randomName()
        hospital.cnpj = randomCnpj()
        hospital.telefone = randomTelefone()
        hospital.endereco = criarEndereco(NS, factory)
        hospitais.push(hospital)
        newId++
    }
    return hospitalRegistry.addAll(hospitais)

}
async function criarNotificacao(NS, factory, notificacaoInfo) {
    console.log('criando notificacao')
    let notificacaoRegistry = await getParticipantRegistry(`${NS}.Notificacao`)

    var notificacao = factory.newResource(NS, 'Notificacao', new Date().getTime().toString())
    Object.keys(notificacaoInfo).map(key => {
        notificacao[key] = notificacaoInfo[key]
    })

    notificacao.data = new Date()

    if (notificacaoInfo.msg === undefined) {
        notificacao.msg = notificacaoInfo.tipo
    }

    return notificacaoRegistry.add(notificacao)
}