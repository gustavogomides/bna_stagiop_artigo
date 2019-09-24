## STAGIOP-BD

Link: [Hyperledger Composer Playground](https://composer-playground.mybluemix.net)

### Missão Atribuída

1. **Paciente** **MarcarConsulta** com o **Medico** no **Hospital**
2. No dia da consulta, o **Medico** **InicarConsulta**
3. Durante a consulta, o **Medico** **SolicitarExame** de sarampo
4. Ao final da consulta, o **Medico** **FinalizarConsulta**
5. **Hospital** recebe **Notificacao** de novo exame e **ContratarFornecedor** para realizar o **Exame**
6. **Fornecedor** verifica que possui novo exame e **IniciarExame**
7. Depois de algumas horas **Fornecedor** **FinalizarExame** e avisa **Hospital**
8. **Hospital** **SolicitarAcessoDados** ao paciente para informar resultado
9. **Paciente** **AutorizarAcessoDados** e verifica o resultado do exame
10. Como resultado foi positivo para sarampo **AutoridadePublica** é notificada

### Passo a Passo

- Acesse o [Hyperledger Composer Playground](https://composer-playground.mybluemix.net)
- Clique em "**Deploy a new business network**"
- Clique em "**Drop here to upload or browse**"
- Envie o arquivo **stagiop-bd.bna**
- Clique em "**Deploy**"
- Após o carregamento, clique em "**Connect now**" na business network "**stagiop-bd**"
- Clique em "**Test**" (aba superior)
- Clique em "**Submit Transaction**"
- Em "**Transaction Type**" escolha "**SetupDemo**"
- Preencha o JSON com a quantidade de cada participante, por exemplo:
```json
{
  "$class": "br.ita.stagiopbd.SetupDemo",
  "qtdPacientes": 3,
  "qtdMedicos": 3,
  "qtdFornecedores": 3,
  "especialidade": "EXAME_SANGUE",
  "qtdHospitais": 3
}
```
- Em seguida clique em "**Submit**"
- Após o processamento, todos os participantes foram criados
- Para executar a missão atribuída é necessário submeter as transações de cada etapa informando os IDs de cada participante


