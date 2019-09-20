## STAGIOP-BD

Link: [Hyperledger Composer Playground](https://composer-playground.mybluemix.net)

Passo a Passo:

- Deploy a new business network
- Drop here to upload or browse
- Enviar o arquivo stagiop-bd.bna
- Deploy

Para testar clicar em "Test" e submeter as transactions

### MISSÃO ATRIBUÍDA

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