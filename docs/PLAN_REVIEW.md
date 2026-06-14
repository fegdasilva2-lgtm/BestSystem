# Avaliacao do sistema contra o estudo da plataforma

## Veredito

O repositorio implementa um piloto coerente com a tese do estudo, mas nao tenta entregar a stack final imediatamente. Essa e uma decisao correta: o estudo recomenda Kotlin, Spring Modulith e Android nativo para a V1 madura; o workspace atual usa Next.js, Supabase e PWA para validar rapidamente os fluxos centrais antes de assumir custo operacional maior.

## Pontos alinhados ao estudo

- O contrato aparece como eixo de produto: onboarding segue cliente -> contrato -> site -> ativo, e o PWA demonstra OS, SLA, medicao, portal e auditoria.
- O piloto ja considera multi-tenancy com `tenant_id`, Supabase RLS, funcoes de claims e testes de isolamento.
- O app de campo funciona offline-first com IndexedDB/Dexie, outbox, fila de upload e sincronizacao incremental.
- O roadmap preserva a migracao para Spring Modulith, Android Kotlin, S3, RabbitMQ/Kafka, OpenSearch e read model quando houver validacao comercial.
- O escopo inicial segue o ciclo recomendado: contrato -> cronograma -> execucao -> medicao -> aceite -> RGM.

## Lacunas prioritarias

- **RGM configuravel ainda nao esta materializado.** O estudo trata RGM como diferencial central; no piloto ele aparece no roadmap, mas falta uma tela ou esqueleto funcional do report builder.
- **Medicao ainda e basica.** O plano pede glosas, versoes imutaveis, aceite formal e ligacao futura com fatura/NFS-e. O piloto deve evitar aprovar medicao sem trilha de contestacao/glosa.
- **SLA precisa evoluir de indicador para motor.** O estudo especifica calendario, pausas, escalonamento e tempos de reconhecimento/mobilizacao/solucao.
- **Portal do cliente deve ganhar mais peso visual e funcional.** O diferencial comercial depende do aceite, evidencias, medicao e RGM acessiveis pelo cliente.
- **ABAC e permissoes finas sao V2, mas o modelo deve deixar ganchos.** A matriz RBAC local e boa para o piloto, mas os cadastros ja devem evitar acoplamento a perfis fixos.
- **IA deve continuar como rascunho assistido, nao decisao automatica.** O primeiro uso recomendado e resumo executivo do RGM e triagem de chamados com revisao humana.

## Melhorias aplicadas nesta rodada

- Modernizacao do layout web com uma direcao visual mais premium e operacional: fundo tipo blueprint, cartoes com vidro fosco, trilho de navegacao, KPIs e chamadas para contrato, RGM, RLS e offline.
- Padronizacao visual das paginas de onboarding e formularios usando classes globais em vez de estilos inline repetidos.
- Refinamento do visual da PWA com gradientes industriais, cartoes mais atuais, bordas arredondadas e estados de interacao melhores.

## Proximos incrementos recomendados

1. Criar `/admin/rgm` com selecao de contrato, periodo, blocos do relatorio e previa do resumo executivo.
2. Criar fluxo de medicao com glosa/contestacao antes do aceite final.
3. Extrair uma entidade/tabela de regras de SLA para deixar de ser apenas KPI calculado.
4. Adicionar uma tela de portal do cliente web focada em aprovacao de servicos, medicao e download do RGM.
5. Adicionar testes de autorizacao para acoes criticas: aceite de medicao, alteracao de contrato e upload/download de documentos.
